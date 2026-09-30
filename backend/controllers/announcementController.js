// const mongoose = require("mongoose");
// const Announcement = require("../models/Announcement");
// const httpError = require("../utils/httpError");
// const paginate = require("../utils/pagination");
// const { queueEmails } = require("../services/emailService");
// const {
//   ORG_WIDE_ROLES, parseAudience, hasTarget, enforceScope, resolveRecipients, visibleAnnouncementFilter,
// } = require("../services/scope");

// const PRIORITIES = ["normal", "important", "urgent"];
// const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// // admin / hr can manage everything, others only their own announcements
// const canManage = (user, ann) => ORG_WIDE_ROLES.includes(user.role) || String(ann.createdBy) === String(user._id);

// const toDate = (value, label) => {
//   if (value === undefined || value === null || value === "") return undefined;
//   const d = new Date(value);
//   if (Number.isNaN(d.getTime())) throw httpError(400, `Invalid ${label}`);
//   return d;
// };

// const loadById = async (id) => {
//   if (!mongoose.isValidObjectId(id)) throw httpError(400, "Invalid announcement id");
//   const ann = await Announcement.findById(id);
//   if (!ann) throw httpError(404, "Announcement not found");
//   return ann;
// };

// // Queues one email per audience member (only once per announcement)
// const queueAnnouncementEmails = async (ann, user) => {
//   if (ann.status !== "published" || !ann.sendEmail || ann.emailQueuedAt) return { emailsQueued: 0 };
//   try {
//     const recipients = await resolveRecipients(ann.audience);
//     if (!recipients.length) return { emailsQueued: 0 };

//     await queueEmails({
//       recipients,
//       subject: `[Announcement] ${ann.title}`,
//       body: '<h2 style="margin:0 0 12px">{{title}}</h2><p style="white-space:pre-wrap">{{content}}</p>',
//       variables: { title: ann.title, content: ann.content },
//       type: "announcement",
//       sentBy: user._id,
//       scheduledAt: ann.publishAt,
//       announcement: ann._id,
//     });
//     ann.emailQueuedAt = new Date();
//     await ann.save();
//     return { emailsQueued: recipients.length };
//   } catch (err) {
//     return { emailsQueued: 0, emailWarning: err.message };
//   }
// };

// // POST /api/announcements
// const createAnnouncement = async (req, res) => {
//   const { title, content, priority = "normal", isPinned = false, status = "published", sendEmail = false } = req.body;

//   if (!title || !content) throw httpError(400, "Title and content are required");
//   if (!PRIORITIES.includes(priority)) throw httpError(400, "Invalid priority");
//   if (!["draft", "published"].includes(status)) throw httpError(400, "Status must be draft or published");

//   const audience = parseAudience(req.body.audience);
//   if (!hasTarget(audience)) throw httpError(400, "Select an audience (all / roles / batches / programs)");
//   if (audience.userIds.length || audience.emails.length) throw httpError(400, "Announcements target roles, batches or programs only");
//   enforceScope(req.user, audience);

//   const publishAt = toDate(req.body.publishAt, "publishAt") || new Date();
//   const expiresAt = toDate(req.body.expiresAt, "expiresAt");
//   if (expiresAt && expiresAt <= publishAt) throw httpError(400, "expiresAt must be after publishAt");

//   const ann = await Announcement.create({
//     title, content, priority,
//     isPinned: Boolean(isPinned),
//     status,
//     publishAt, expiresAt,
//     sendEmail: Boolean(sendEmail),
//     audience: { all: audience.all, roles: audience.roles, batches: audience.batches, programs: audience.programs },
//     createdBy: req.user._id,
//   });

//   const emailInfo = await queueAnnouncementEmails(ann, req.user);
//   res.status(201).json({ success: true, message: "Announcement created", announcement: ann, ...emailInfo });
// };

// // GET /api/announcements  -> announcements visible to ME
// const getMyAnnouncements = async (req, res) => {
//   const { page, limit, skip } = paginate(req.query);
//   const filter = visibleAnnouncementFilter(req.user);
//   if (req.query.priority) filter.priority = req.query.priority;
//   if (req.query.unread === "true") filter["readBy.user"] = { $ne: req.user._id };

//   const [items, total] = await Promise.all([
//     Announcement.find(filter).sort({ isPinned: -1, publishAt: -1 }).skip(skip).limit(limit).populate("createdBy", "name role").lean(),
//     Announcement.countDocuments(filter),
//   ]);

//   const me = String(req.user._id);
//   const announcements = items.map(({ readBy, ...a }) => ({
//     ...a,
//     isRead: (readBy || []).some((r) => String(r.user) === me),
//   }));

//   res.json({ success: true, total, page, pages: Math.ceil(total / limit), announcements });
// };

// // GET /api/announcements/manage  -> announcements I can edit (all statuses)
// const getManageList = async (req, res) => {
//   const { page, limit, skip } = paginate(req.query);
//   const filter = ORG_WIDE_ROLES.includes(req.user.role) ? {} : { createdBy: req.user._id };
//   if (req.query.status) filter.status = req.query.status;
//   if (req.query.q) filter.title = new RegExp(escapeRegex(req.query.q), "i");

//   const [items, total] = await Promise.all([
//     Announcement.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("createdBy", "name role").lean(),
//     Announcement.countDocuments(filter),
//   ]);

//   const announcements = items.map(({ readBy, ...a }) => ({ ...a, readCount: (readBy || []).length }));
//   res.json({ success: true, total, page, pages: Math.ceil(total / limit), announcements });
// };

// // GET /api/announcements/unread-count
// const getUnreadCount = async (req, res) => {
//   const filter = { ...visibleAnnouncementFilter(req.user), "readBy.user": { $ne: req.user._id } };
//   res.json({ success: true, unread: await Announcement.countDocuments(filter) });
// };

// // GET /api/announcements/:id
// const getAnnouncement = async (req, res) => {
//   const ann = await loadById(req.params.id);

//   if (canManage(req.user, ann)) {
//     const obj = ann.toObject();
//     obj.readCount = obj.readBy.length;
//     delete obj.readBy;
//     return res.json({ success: true, announcement: obj });
//   }

//   const visible = await Announcement.findOne({ _id: ann._id, ...visibleAnnouncementFilter(req.user) }).lean();
//   if (!visible) throw httpError(404, "Announcement not found");
//   const { readBy, ...rest } = visible;
//   res.json({ success: true, announcement: { ...rest, isRead: (readBy || []).some((r) => String(r.user) === String(req.user._id)) } });
// };

// // PATCH /api/announcements/:id
// const updateAnnouncement = async (req, res) => {
//   const ann = await loadById(req.params.id);
//   if (!canManage(req.user, ann)) throw httpError(403, "You can only edit your own announcements");

//   const b = req.body;
//   if (b.title !== undefined) ann.title = b.title;
//   if (b.content !== undefined) ann.content = b.content;
//   if (b.priority !== undefined) {
//     if (!PRIORITIES.includes(b.priority)) throw httpError(400, "Invalid priority");
//     ann.priority = b.priority;
//   }
//   if (b.status !== undefined) {
//     if (!["draft", "published", "archived"].includes(b.status)) throw httpError(400, "Invalid status");
//     ann.status = b.status;
//   }
//   if (b.isPinned !== undefined) ann.isPinned = Boolean(b.isPinned);
//   if (b.sendEmail !== undefined) ann.sendEmail = Boolean(b.sendEmail);
//   if (b.publishAt !== undefined) ann.publishAt = toDate(b.publishAt, "publishAt") || new Date();
//   if (b.expiresAt !== undefined) ann.expiresAt = toDate(b.expiresAt, "expiresAt");
//   if (ann.expiresAt && ann.expiresAt <= ann.publishAt) throw httpError(400, "expiresAt must be after publishAt");

//   if (b.audience !== undefined) {
//     const audience = parseAudience(b.audience);
//     if (!hasTarget(audience)) throw httpError(400, "Select an audience");
//     if (audience.userIds.length || audience.emails.length) throw httpError(400, "Announcements target roles, batches or programs only");
//     enforceScope(req.user, audience);
//     ann.audience = { all: audience.all, roles: audience.roles, batches: audience.batches, programs: audience.programs };
//   }

//   await ann.save();
//   const emailInfo = await queueAnnouncementEmails(ann, req.user);
//   res.json({ success: true, message: "Announcement updated", announcement: ann, ...emailInfo });
// };

// // DELETE /api/announcements/:id
// const deleteAnnouncement = async (req, res) => {
//   const ann = await loadById(req.params.id);
//   if (!canManage(req.user, ann)) throw httpError(403, "You can only delete your own announcements");
//   await ann.deleteOne();
//   res.json({ success: true, message: "Announcement deleted" });
// };

// // POST /api/announcements/:id/read
// const markAsRead = async (req, res) => {
//   if (!mongoose.isValidObjectId(req.params.id)) throw httpError(400, "Invalid announcement id");
//   const visible = await Announcement.exists({ _id: req.params.id, ...visibleAnnouncementFilter(req.user) });
//   if (!visible) throw httpError(404, "Announcement not found");

//   await Announcement.updateOne(
//     { _id: req.params.id, "readBy.user": { $ne: req.user._id } },
//     { $push: { readBy: { user: req.user._id, readAt: new Date() } } }
//   );
//   res.json({ success: true, message: "Marked as read" });
// };

// module.exports = {
//   createAnnouncement, getMyAnnouncements, getManageList, getUnreadCount,
//   getAnnouncement, updateAnnouncement, deleteAnnouncement, markAsRead,
// };

const mongoose = require("mongoose");
const Announcement = require("../models/Announcement");
const httpError = require("../utils/httpError");
const paginate = require("../utils/pagination");
const { queueEmails } = require("../services/emailService");
const {
  ORG_WIDE_ROLES,
  parseAudience,
  hasTarget,
  enforceScope,
  resolveRecipients,
  visibleAnnouncementFilter,
} = require("../services/scope");

const PRIORITIES = ["low", "medium", "high", "urgent"];
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// admin / hr can manage everything, others only their own announcements
const canManage = (user, ann) =>
  ORG_WIDE_ROLES.includes(user.role) ||
  String(ann.createdBy) === String(user._id);

const toDate = (value, label) => {
  if (value === undefined || value === null || value === "") return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw httpError(400, `Invalid ${label}`);
  return d;
};

const loadById = async (id) => {
  if (!mongoose.isValidObjectId(id))
    throw httpError(400, "Invalid announcement id");
  const ann = await Announcement.findById(id);
  if (!ann) throw httpError(404, "Announcement not found");
  return ann;
};

// Queues one email per audience member (only once per announcement)
const queueAnnouncementEmails = async (ann, user) => {
  if (ann.status !== "published" || !ann.sendEmail || ann.emailQueuedAt)
    return { emailsQueued: 0 };
  try {
    const recipients = await resolveRecipients(ann.audience);
    if (!recipients.length) return { emailsQueued: 0 };

    await queueEmails({
      recipients,
      subject: `[Announcement] ${ann.title}`,
      body: '<h2 style="margin:0 0 12px">{{title}}</h2><p style="white-space:pre-wrap">{{content}}</p>',
      variables: { title: ann.title, content: ann.content },
      type: "announcement",
      sentBy: user._id,
      scheduledAt: ann.publishAt,
      announcement: ann._id,
      audience: {
        batches: ann.audience.batches,
        programs: ann.audience.programs,
        departments: ann.audience.departments,
      },
    });
    ann.emailQueuedAt = new Date();
    await ann.save();
    return { emailsQueued: recipients.length };
  } catch (err) {
    return { emailsQueued: 0, emailWarning: err.message };
  }
};

// POST /api/announcements
const createAnnouncement = async (req, res) => {
  const {
    title,
    content,
    priority = "medium",
    isPinned = false,
    status = "published",
    sendEmail = false,
  } = req.body;

  if (!title || !content)
    throw httpError(400, "Title and content are required");
  if (!PRIORITIES.includes(priority)) throw httpError(400, "Invalid priority");
  if (!["draft", "published"].includes(status))
    throw httpError(400, "Status must be draft or published");

  const audience = parseAudience(req.body.audience);
  if (!hasTarget(audience))
    throw httpError(
      400,
      "Select an audience (all / roles / batches / programs)",
    );
  if (audience.userIds.length || audience.emails.length)
    throw httpError(
      400,
      "Announcements target roles, batches, programs or departments only",
    );
  enforceScope(req.user, audience);

  const publishAt = toDate(req.body.publishAt, "publishAt") || new Date();
  const expiresAt = toDate(req.body.expiresAt, "expiresAt");
  if (expiresAt && expiresAt <= publishAt)
    throw httpError(400, "expiresAt must be after publishAt");

  const ann = await Announcement.create({
    title,
    content,
    priority,
    isPinned: Boolean(isPinned),
    status,
    publishAt,
    expiresAt,
    sendEmail: Boolean(sendEmail),
    audience: {
      all: audience.all,
      roles: audience.roles,
      batches: audience.batches,
      programs: audience.programs,
      departments: audience.departments,
    },
    createdBy: req.user._id,
  });

  const emailInfo = await queueAnnouncementEmails(ann, req.user);
  res
    .status(201)
    .json({
      success: true,
      message: "Announcement created",
      announcement: ann,
      ...emailInfo,
    });
};

// GET /api/announcements  -> announcements visible to ME
const getMyAnnouncements = async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = visibleAnnouncementFilter(req.user);
  if (req.query.priority) filter.priority = req.query.priority;
  if (req.query.unread === "true")
    filter["readBy.user"] = { $ne: req.user._id };

  const [items, total] = await Promise.all([
    Announcement.find(filter)
      .sort({ isPinned: -1, publishAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "name role")
      .lean(),
    Announcement.countDocuments(filter),
  ]);

  const me = String(req.user._id);
  const announcements = items.map(({ readBy, ...a }) => ({
    ...a,
    isRead: (readBy || []).some((r) => String(r.user) === me),
  }));

  res.json({
    success: true,
    total,
    page,
    pages: Math.ceil(total / limit),
    announcements,
  });
};

// GET /api/announcements/manage  -> announcements I can edit (all statuses)
const getManageList = async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = ORG_WIDE_ROLES.includes(req.user.role)
    ? {}
    : { createdBy: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.q) filter.title = new RegExp(escapeRegex(req.query.q), "i");

  const [items, total] = await Promise.all([
    Announcement.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "name role")
      .lean(),
    Announcement.countDocuments(filter),
  ]);

  const announcements = items.map(({ readBy, ...a }) => ({
    ...a,
    readCount: (readBy || []).length,
  }));
  res.json({
    success: true,
    total,
    page,
    pages: Math.ceil(total / limit),
    announcements,
  });
};

// GET /api/announcements/unread-count
const getUnreadCount = async (req, res) => {
  const filter = {
    ...visibleAnnouncementFilter(req.user),
    "readBy.user": { $ne: req.user._id },
  };
  res.json({
    success: true,
    unread: await Announcement.countDocuments(filter),
  });
};

// GET /api/announcements/:id
const getAnnouncement = async (req, res) => {
  const ann = await loadById(req.params.id);

  if (canManage(req.user, ann)) {
    const obj = ann.toObject();
    obj.readCount = obj.readBy.length;
    delete obj.readBy;
    return res.json({ success: true, announcement: obj });
  }

  const visible = await Announcement.findOne({
    _id: ann._id,
    ...visibleAnnouncementFilter(req.user),
  }).lean();
  if (!visible) throw httpError(404, "Announcement not found");
  const { readBy, ...rest } = visible;
  res.json({
    success: true,
    announcement: {
      ...rest,
      isRead: (readBy || []).some(
        (r) => String(r.user) === String(req.user._id),
      ),
    },
  });
};

// PATCH /api/announcements/:id
const updateAnnouncement = async (req, res) => {
  const ann = await loadById(req.params.id);
  if (!canManage(req.user, ann))
    throw httpError(403, "You can only edit your own announcements");

  const b = req.body;
  if (b.title !== undefined) ann.title = b.title;
  if (b.content !== undefined) ann.content = b.content;
  if (b.priority !== undefined) {
    if (!PRIORITIES.includes(b.priority))
      throw httpError(400, "Invalid priority");
    ann.priority = b.priority;
  }
  if (b.status !== undefined) {
    if (!["draft", "published", "archived"].includes(b.status))
      throw httpError(400, "Invalid status");
    ann.status = b.status;
  }
  if (b.isPinned !== undefined) ann.isPinned = Boolean(b.isPinned);
  if (b.sendEmail !== undefined) ann.sendEmail = Boolean(b.sendEmail);
  if (b.publishAt !== undefined)
    ann.publishAt = toDate(b.publishAt, "publishAt") || new Date();
  if (b.expiresAt !== undefined)
    ann.expiresAt = toDate(b.expiresAt, "expiresAt");
  if (ann.expiresAt && ann.expiresAt <= ann.publishAt)
    throw httpError(400, "expiresAt must be after publishAt");

  if (b.audience !== undefined) {
    const audience = parseAudience(b.audience);
    if (!hasTarget(audience)) throw httpError(400, "Select an audience");
    if (audience.userIds.length || audience.emails.length)
      throw httpError(
        400,
        "Announcements target roles, batches, programs or departments only",
      );
    enforceScope(req.user, audience);
    ann.audience = {
      all: audience.all,
      roles: audience.roles,
      batches: audience.batches,
      programs: audience.programs,
      departments: audience.departments,
    };
  }

  await ann.save();
  const emailInfo = await queueAnnouncementEmails(ann, req.user);
  res.json({
    success: true,
    message: "Announcement updated",
    announcement: ann,
    ...emailInfo,
  });
};

// DELETE /api/announcements/:id
const deleteAnnouncement = async (req, res) => {
  const ann = await loadById(req.params.id);
  if (!canManage(req.user, ann))
    throw httpError(403, "You can only delete your own announcements");
  await ann.deleteOne();
  res.json({ success: true, message: "Announcement deleted" });
};

// POST /api/announcements/:id/read
const markAsRead = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id))
    throw httpError(400, "Invalid announcement id");
  const visible = await Announcement.exists({
    _id: req.params.id,
    ...visibleAnnouncementFilter(req.user),
  });
  if (!visible) throw httpError(404, "Announcement not found");

  await Announcement.updateOne(
    { _id: req.params.id, "readBy.user": { $ne: req.user._id } },
    { $push: { readBy: { user: req.user._id, readAt: new Date() } } },
  );
  res.json({ success: true, message: "Marked as read" });
};

module.exports = {
  createAnnouncement,
  getMyAnnouncements,
  getManageList,
  getUnreadCount,
  getAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  markAsRead,
};
