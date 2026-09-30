const EmailLog = require("../models/EmailLog");
const Announcement = require("../models/Announcement");
const httpError = require("../utils/httpError");
const paginate = require("../utils/pagination");
const { sendExport } = require("../utils/exporters");
const { ORG_WIDE_ROLES, isAdmin } = require("../services/scope");

const MAX_EXPORT_ROWS = 5000;

const parseRange = (query) => {
  const range = {};
  if (query.from) {
    const d = new Date(query.from);
    if (Number.isNaN(d.getTime())) throw httpError(400, "Invalid 'from' date");
    range.$gte = d;
  }
  if (query.to) {
    const d = new Date(query.to);
    if (Number.isNaN(d.getTime())) throw httpError(400, "Invalid 'to' date");
    range.$lte = d;
  }
  return Object.keys(range).length ? range : undefined;
};

// ---------------- Emails ----------------

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const emailFilter = (req) => {
  const filter = isAdmin(req.user) ? {} : { sentBy: req.user._id };
  const range = parseRange(req.query);
  if (range) filter.createdAt = range;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.batch) filter["audience.batches"] = req.query.batch;
  if (req.query.program) filter["audience.programs"] = req.query.program;
  if (req.query.department) filter["audience.departments"] = req.query.department;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), "i");
    filter.$or = [{ "to.email": rx }, { subject: rx }];
  }
  return filter;
};

const EMAIL_COLUMNS = [
  { key: "to.email", label: "Recipient" },
  { key: "subject", label: "Subject" },
  { key: "type", label: "Type" },
  { key: "status", label: "Status" },
  { key: "attempts", label: "Attempts" },
  { key: "sentByName", label: "Sent By" },
  { key: "createdAt", label: "Created At" },
  { key: "sentAt", label: "Sent At" },
];

const withSentByName = (docs) =>
  docs.map((d) => ({ ...d, sentByName: d.sentBy ? `${d.sentBy.name} (${d.sentBy.role})` : "-" }));

// GET /api/reports/emails
const getEmailReport = async (req, res) => {
  const filter = emailFilter(req);
  const { page, limit, skip } = paginate(req.query);

  const [rows, total, byStatus, byType] = await Promise.all([
    EmailLog.find(filter).select("-html -text").populate("sentBy", "name role").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    EmailLog.countDocuments(filter),
    EmailLog.aggregate([{ $match: filter }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    EmailLog.aggregate([{ $match: filter }, { $group: { _id: "$type", count: { $sum: 1 } } }]),
  ]);

  res.json({
    success: true,
    total,
    page,
    pages: Math.ceil(total / limit),
    summary: {
      byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
      byType: Object.fromEntries(byType.map((s) => [s._id, s.count])),
    },
    emails: withSentByName(rows),
  });
};

// GET /api/reports/emails/export
const exportEmailReport = async (req, res) => {
  const filter = emailFilter(req);
  const rows = await EmailLog.find(filter)
    .select("-html -text")
    .populate("sentBy", "name role")
    .sort({ createdAt: -1 })
    .limit(MAX_EXPORT_ROWS)
    .lean();

  await sendExport(res, {
    format: req.query.format,
    filename: `email-report-${Date.now()}`,
    title: "Email Report",
    rows: withSentByName(rows),
    columns: EMAIL_COLUMNS,
  });
};

// ---------------- Announcements ----------------

const announcementFilter = (req) => {
  const filter = ORG_WIDE_ROLES.includes(req.user.role) ? {} : { createdBy: req.user._id };
  const range = parseRange(req.query);
  if (range) filter.createdAt = range;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.priority) filter.priority = req.query.priority;
  if (req.query.batch) filter["audience.batches"] = req.query.batch;
  if (req.query.program) filter["audience.programs"] = req.query.program;
  if (req.query.department) filter["audience.departments"] = req.query.department;
  if (req.query.q) filter.title = new RegExp(escapeRegex(req.query.q), "i");
  return filter;
};

const ANNOUNCEMENT_COLUMNS = [
  { key: "title", label: "Title" },
  { key: "priority", label: "Priority" },
  { key: "status", label: "Status" },
  { key: "audienceText", label: "Audience" },
  { key: "readCount", label: "Read Count" },
  { key: "createdByName", label: "Created By" },
  { key: "publishAt", label: "Publish At" },
  { key: "expiresAt", label: "Expires At" },
];

const describeAudience = (a) => {
  if (a.all) return "Everyone";
  const parts = [];
  if (a.roles?.length) parts.push(a.roles.join(", "));
  if (a.batches?.length) parts.push(`${a.batches.length} batch(es)`);
  if (a.programs?.length) parts.push(`${a.programs.length} program(s)`);
  if (a.departments?.length) parts.push(`${a.departments.length} department(s)`);
  return parts.join(" | ") || "-";
};

const enrichAnnouncements = (docs) =>
  docs.map((d) => ({
    ...d,
    readCount: (d.readBy || []).length,
    audienceText: describeAudience(d.audience || {}),
    createdByName: d.createdBy ? `${d.createdBy.name} (${d.createdBy.role})` : "-",
  }));

// GET /api/reports/announcements
const getAnnouncementReport = async (req, res) => {
  const filter = announcementFilter(req);
  const { page, limit, skip } = paginate(req.query);

  const [rows, total, byStatus, byPriority] = await Promise.all([
    Announcement.find(filter).populate("createdBy", "name role").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Announcement.countDocuments(filter),
    Announcement.aggregate([{ $match: filter }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    Announcement.aggregate([{ $match: filter }, { $group: { _id: "$priority", count: { $sum: 1 } } }]),
  ]);

  res.json({
    success: true,
    total,
    page,
    pages: Math.ceil(total / limit),
    summary: {
      byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
      byPriority: Object.fromEntries(byPriority.map((s) => [s._id, s.count])),
    },
    announcements: enrichAnnouncements(rows),
  });
};

// GET /api/reports/announcements/export
const exportAnnouncementReport = async (req, res) => {
  const filter = announcementFilter(req);
  const rows = await Announcement.find(filter).populate("createdBy", "name role").sort({ createdAt: -1 }).limit(MAX_EXPORT_ROWS).lean();

  await sendExport(res, {
    format: req.query.format,
    filename: `announcement-report-${Date.now()}`,
    title: "Announcement Report",
    rows: enrichAnnouncements(rows),
    columns: ANNOUNCEMENT_COLUMNS,
  });
};

// ---------------- Dashboard analytics ----------------

// Daily counts for the last N days, always including days with zero activity.
const dailySeries = async (Model, match, dateField = "createdAt", days = 14) => {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const rows = await Model.aggregate([
    { $match: { ...match, [dateField]: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: `$${dateField}` } }, count: { $sum: 1 } } },
  ]);
  const map = Object.fromEntries(rows.map((r) => [r._id, r.count]));

  const series = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    series.push({ date: key, count: map[key] || 0 });
  }
  return series;
};

// GET /api/reports/dashboard
const getDashboardAnalytics = async (req, res) => {
  const emailScope = isAdmin(req.user) ? {} : { sentBy: req.user._id };
  const annScope = ORG_WIDE_ROLES.includes(req.user.role) ? {} : { createdBy: req.user._id };

  const [emailByStatus, emailByType, annByStatus, annByPriority, emailsPerDay, announcementsPerDay] = await Promise.all([
    EmailLog.aggregate([{ $match: emailScope }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    EmailLog.aggregate([{ $match: emailScope }, { $group: { _id: "$type", count: { $sum: 1 } } }]),
    Announcement.aggregate([{ $match: annScope }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    Announcement.aggregate([{ $match: annScope }, { $group: { _id: "$priority", count: { $sum: 1 } } }]),
    dailySeries(EmailLog, emailScope, "createdAt", 14),
    dailySeries(Announcement, annScope, "createdAt", 14),
  ]);

  res.json({
    success: true,
    emails: {
      byStatus: Object.fromEntries(emailByStatus.map((s) => [s._id, s.count])),
      byType: Object.fromEntries(emailByType.map((s) => [s._id, s.count])),
      perDay: emailsPerDay,
    },
    announcements: {
      byStatus: Object.fromEntries(annByStatus.map((s) => [s._id, s.count])),
      byPriority: Object.fromEntries(annByPriority.map((s) => [s._id, s.count])),
      perDay: announcementsPerDay,
    },
  });
};

module.exports = {
  getEmailReport, exportEmailReport,
  getAnnouncementReport, exportAnnouncementReport,
  getDashboardAnalytics,
};
