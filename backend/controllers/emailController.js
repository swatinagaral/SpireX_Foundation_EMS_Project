const mongoose = require("mongoose");
const User = require("../models/User");
const EmailLog = require("../models/EmailLog");
const httpError = require("../utils/httpError");
const paginate = require("../utils/pagination");
const { isSmtpConfigured } = require("../services/mailer");
const { resolveContent, queueEmails, newBulkId } = require("../services/emailService");
const {
  ORG_WIDE_ROLES, isAdmin, parseAudience, hasTarget, enforceScope, resolveRecipients,
} = require("../services/scope");

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// admins see all emails, everybody else only the emails they sent
const scopeFilter = (user) => (isAdmin(user) ? {} : { sentBy: user._id });

const parseSchedule = (value) => {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw httpError(400, "Invalid scheduledAt date");
  return d;
};

// POST /api/emails/send  -> one recipient
const sendEmail = async (req, res) => {
  const { to, userId, templateId, templateKey, subject, body, variables, scheduledAt } = req.body;

  let recipient;
  if (userId) {
    if (!mongoose.isValidObjectId(userId)) throw httpError(400, "Invalid userId");
    const u = await User.findById(userId).select("name email");
    if (!u) throw httpError(404, "User not found");
    recipient = { email: u.email, name: u.name };
  } else if (to && EMAIL_RE.test(String(to).trim())) {
    recipient = { email: String(to).trim().toLowerCase() };
  } else {
    throw httpError(400, "Provide a valid 'to' email or a 'userId'");
  }

  // scope: coordinators can only email users of their own batches/programs
  if (!ORG_WIDE_ROLES.includes(req.user.role)) {
    const target = userId && (await User.findOne({
      _id: userId,
      $or: [{ batches: { $in: req.user.batches || [] } }, { programs: { $in: req.user.programs || [] } }],
    }).select("_id"));
    if (!target) throw httpError(403, "You can only email users in your own batches/programs");
  }

  const content = await resolveContent({ templateId, templateKey, subject, body });
  const [log] = await queueEmails({
    recipients: [recipient],
    ...content,
    variables: variables || {},
    type: "single",
    sentBy: req.user._id,
    scheduledAt: parseSchedule(scheduledAt),
  });

  res.status(202).json({ success: true, message: "Email queued", email: { id: log._id, status: log.status } });
};

// POST /api/emails/bulk  -> many recipients
const sendBulkEmail = async (req, res) => {
  const { recipients, templateId, templateKey, subject, body, variables, scheduledAt } = req.body;

  const audience = parseAudience(recipients);
  if (!hasTarget(audience)) throw httpError(400, "Select recipients (all / roles / batches / programs / userIds / emails)");
  enforceScope(req.user, audience);

  const list = await resolveRecipients(audience);
  const content = await resolveContent({ templateId, templateKey, subject, body });
  const bulkId = newBulkId();

  await queueEmails({
    recipients: list,
    ...content,
    variables: variables || {},
    type: "bulk",
    sentBy: req.user._id,
    scheduledAt: parseSchedule(scheduledAt),
    bulkId,
  });

  res.status(202).json({
    success: true,
    message: `${list.length} emails queued`,
    bulkId,
    recipients: list.length,
  });
};

// GET /api/emails/history
const getHistory = async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = scopeFilter(req.user);

  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.bulkId) filter.bulkId = String(req.query.bulkId);
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), "i");
    filter.$or = [{ "to.email": rx }, { subject: rx }];
  }
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }

  const [emails, total] = await Promise.all([
    EmailLog.find(filter).select("-html -text").populate("sentBy", "name role").sort({ createdAt: -1 }).skip(skip).limit(limit),
    EmailLog.countDocuments(filter),
  ]);

  res.json({ success: true, total, page, pages: Math.ceil(total / limit), emails });
};

// GET /api/emails/stats
const getStats = async (req, res) => {
  const base = scopeFilter(req.user);
  const statuses = ["queued", "sending", "sent", "failed", "cancelled"];
  const counts = await Promise.all(statuses.map((s) => EmailLog.countDocuments({ ...base, status: s })));
  const stats = Object.fromEntries(statuses.map((s, i) => [s, counts[i]]));
  stats.total = counts.reduce((a, b) => a + b, 0);

  res.json({ success: true, stats, smtpConfigured: isSmtpConfigured() });
};

const loadOwned = async (req) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpError(400, "Invalid email id");
  const email = await EmailLog.findOne({ _id: req.params.id, ...scopeFilter(req.user) });
  if (!email) throw httpError(404, "Email not found");
  return email;
};

// GET /api/emails/:id
const getEmail = async (req, res) => {
  res.json({ success: true, email: await loadOwned(req) });
};

// POST /api/emails/:id/retry  (failed -> queued again)
const retryEmail = async (req, res) => {
  const email = await loadOwned(req);
  if (email.status !== "failed") throw httpError(400, "Only failed emails can be retried");
  email.status = "queued";
  email.attempts = 0;
  email.lastError = undefined;
  email.scheduledAt = new Date();
  await email.save();
  res.json({ success: true, message: "Email queued again", email: { id: email._id, status: email.status } });
};

// POST /api/emails/:id/cancel  (queued -> cancelled)
const cancelEmail = async (req, res) => {
  const owned = await loadOwned(req);
  const email = await EmailLog.findOneAndUpdate(
    { _id: owned._id, status: "queued" },
    { $set: { status: "cancelled" } },
    { returnDocument: "after" }
  );
  if (!email) throw httpError(400, "Only queued emails can be cancelled");
  res.json({ success: true, message: "Email cancelled", email: { id: email._id, status: email.status } });
};

module.exports = { sendEmail, sendBulkEmail, getHistory, getStats, getEmail, retryEmail, cancelEmail };
