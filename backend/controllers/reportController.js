// const EmailLog = require("../models/EmailLog");
// const Announcement = require("../models/Announcement");
// const httpError = require("../utils/httpError");
// const paginate = require("../utils/pagination");
// const { sendExport } = require("../utils/exporters");
// const { ORG_WIDE_ROLES, isAdmin } = require("../services/scope");

// const MAX_EXPORT_ROWS = 5000;

// const parseRange = (query) => {
//   const range = {};
//   if (query.from) {
//     const d = new Date(query.from);
//     if (Number.isNaN(d.getTime())) throw httpError(400, "Invalid 'from' date");
//     range.$gte = d;
//   }
//   if (query.to) {
//     const d = new Date(query.to);
//     if (Number.isNaN(d.getTime())) throw httpError(400, "Invalid 'to' date");
//     range.$lte = d;
//   }
//   return Object.keys(range).length ? range : undefined;
// };

// // ---------------- Emails ----------------

// const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// const emailFilter = (req) => {
//   const filter = isAdmin(req.user) ? {} : { sentBy: req.user._id };
//   const range = parseRange(req.query);
//   if (range) filter.createdAt = range;
//   if (req.query.status) filter.status = req.query.status;
//   if (req.query.type) filter.type = req.query.type;
//   if (req.query.batch) filter["audience.batches"] = req.query.batch;
//   if (req.query.program) filter["audience.programs"] = req.query.program;
//   if (req.query.department) filter["audience.departments"] = req.query.department;
//   if (req.query.q) {
//     const rx = new RegExp(escapeRegex(req.query.q), "i");
//     filter.$or = [{ "to.email": rx }, { subject: rx }];
//   }
//   return filter;
// };

// const EMAIL_COLUMNS = [
//   { key: "to.email", label: "Recipient" },
//   { key: "subject", label: "Subject" },
//   { key: "type", label: "Type" },
//   { key: "status", label: "Status" },
//   { key: "attempts", label: "Attempts" },
//   { key: "sentByName", label: "Sent By" },
//   { key: "createdAt", label: "Created At" },
//   { key: "sentAt", label: "Sent At" },
// ];

// const withSentByName = (docs) =>
//   docs.map((d) => ({ ...d, sentByName: d.sentBy ? `${d.sentBy.name} (${d.sentBy.role})` : "-" }));

// // GET /api/reports/emails
// const getEmailReport = async (req, res) => {
//   const filter = emailFilter(req);
//   const { page, limit, skip } = paginate(req.query);

//   const [rows, total, byStatus, byType] = await Promise.all([
//     EmailLog.find(filter).select("-html -text").populate("sentBy", "name role").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
//     EmailLog.countDocuments(filter),
//     EmailLog.aggregate([{ $match: filter }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
//     EmailLog.aggregate([{ $match: filter }, { $group: { _id: "$type", count: { $sum: 1 } } }]),
//   ]);

//   res.json({
//     success: true,
//     total,
//     page,
//     pages: Math.ceil(total / limit),
//     summary: {
//       byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
//       byType: Object.fromEntries(byType.map((s) => [s._id, s.count])),
//     },
//     emails: withSentByName(rows),
//   });
// };

// // GET /api/reports/emails/export
// const exportEmailReport = async (req, res) => {
//   const filter = emailFilter(req);
//   const rows = await EmailLog.find(filter)
//     .select("-html -text")
//     .populate("sentBy", "name role")
//     .sort({ createdAt: -1 })
//     .limit(MAX_EXPORT_ROWS)
//     .lean();

//   await sendExport(res, {
//     format: req.query.format,
//     filename: `email-report-${Date.now()}`,
//     title: "Email Report",
//     rows: withSentByName(rows),
//     columns: EMAIL_COLUMNS,
//   });
// };

// // ---------------- Announcements ----------------

// const announcementFilter = (req) => {
//   const filter = ORG_WIDE_ROLES.includes(req.user.role) ? {} : { createdBy: req.user._id };
//   const range = parseRange(req.query);
//   if (range) filter.createdAt = range;
//   if (req.query.status) filter.status = req.query.status;
//   if (req.query.priority) filter.priority = req.query.priority;
//   if (req.query.batch) filter["audience.batches"] = req.query.batch;
//   if (req.query.program) filter["audience.programs"] = req.query.program;
//   if (req.query.department) filter["audience.departments"] = req.query.department;
//   if (req.query.q) filter.title = new RegExp(escapeRegex(req.query.q), "i");
//   return filter;
// };

// const ANNOUNCEMENT_COLUMNS = [
//   { key: "title", label: "Title" },
//   { key: "priority", label: "Priority" },
//   { key: "status", label: "Status" },
//   { key: "audienceText", label: "Audience" },
//   { key: "readCount", label: "Read Count" },
//   { key: "createdByName", label: "Created By" },
//   { key: "publishAt", label: "Publish At" },
//   { key: "expiresAt", label: "Expires At" },
// ];

// const describeAudience = (a) => {
//   if (a.all) return "Everyone";
//   const parts = [];
//   if (a.roles?.length) parts.push(a.roles.join(", "));
//   if (a.batches?.length) parts.push(`${a.batches.length} batch(es)`);
//   if (a.programs?.length) parts.push(`${a.programs.length} program(s)`);
//   if (a.departments?.length) parts.push(`${a.departments.length} department(s)`);
//   return parts.join(" | ") || "-";
// };

// const enrichAnnouncements = (docs) =>
//   docs.map((d) => ({
//     ...d,
//     readCount: (d.readBy || []).length,
//     audienceText: describeAudience(d.audience || {}),
//     createdByName: d.createdBy ? `${d.createdBy.name} (${d.createdBy.role})` : "-",
//   }));

// // GET /api/reports/announcements
// const getAnnouncementReport = async (req, res) => {
//   const filter = announcementFilter(req);
//   const { page, limit, skip } = paginate(req.query);

//   const [rows, total, byStatus, byPriority] = await Promise.all([
//     Announcement.find(filter).populate("createdBy", "name role").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
//     Announcement.countDocuments(filter),
//     Announcement.aggregate([{ $match: filter }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
//     Announcement.aggregate([{ $match: filter }, { $group: { _id: "$priority", count: { $sum: 1 } } }]),
//   ]);

//   res.json({
//     success: true,
//     total,
//     page,
//     pages: Math.ceil(total / limit),
//     summary: {
//       byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
//       byPriority: Object.fromEntries(byPriority.map((s) => [s._id, s.count])),
//     },
//     announcements: enrichAnnouncements(rows),
//   });
// };

// // GET /api/reports/announcements/export
// const exportAnnouncementReport = async (req, res) => {
//   const filter = announcementFilter(req);
//   const rows = await Announcement.find(filter).populate("createdBy", "name role").sort({ createdAt: -1 }).limit(MAX_EXPORT_ROWS).lean();

//   await sendExport(res, {
//     format: req.query.format,
//     filename: `announcement-report-${Date.now()}`,
//     title: "Announcement Report",
//     rows: enrichAnnouncements(rows),
//     columns: ANNOUNCEMENT_COLUMNS,
//   });
// };

// // ---------------- Dashboard analytics ----------------

// // Daily counts for the last N days, always including days with zero activity.
// const dailySeries = async (Model, match, dateField = "createdAt", days = 14) => {
//   const since = new Date();
//   since.setHours(0, 0, 0, 0);
//   since.setDate(since.getDate() - (days - 1));

//   const rows = await Model.aggregate([
//     { $match: { ...match, [dateField]: { $gte: since } } },
//     { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: `$${dateField}` } }, count: { $sum: 1 } } },
//   ]);
//   const map = Object.fromEntries(rows.map((r) => [r._id, r.count]));

//   const series = [];
//   for (let i = 0; i < days; i++) {
//     const d = new Date(since);
//     d.setDate(d.getDate() + i);
//     const key = d.toISOString().slice(0, 10);
//     series.push({ date: key, count: map[key] || 0 });
//   }
//   return series;
// };

// // GET /api/reports/dashboard
// const getDashboardAnalytics = async (req, res) => {
//   const emailScope = isAdmin(req.user) ? {} : { sentBy: req.user._id };
//   const annScope = ORG_WIDE_ROLES.includes(req.user.role) ? {} : { createdBy: req.user._id };

//   const [emailByStatus, emailByType, annByStatus, annByPriority, emailsPerDay, announcementsPerDay] = await Promise.all([
//     EmailLog.aggregate([{ $match: emailScope }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
//     EmailLog.aggregate([{ $match: emailScope }, { $group: { _id: "$type", count: { $sum: 1 } } }]),
//     Announcement.aggregate([{ $match: annScope }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
//     Announcement.aggregate([{ $match: annScope }, { $group: { _id: "$priority", count: { $sum: 1 } } }]),
//     dailySeries(EmailLog, emailScope, "createdAt", 14),
//     dailySeries(Announcement, annScope, "createdAt", 14),
//   ]);

//   res.json({
//     success: true,
//     emails: {
//       byStatus: Object.fromEntries(emailByStatus.map((s) => [s._id, s.count])),
//       byType: Object.fromEntries(emailByType.map((s) => [s._id, s.count])),
//       perDay: emailsPerDay,
//     },
//     announcements: {
//       byStatus: Object.fromEntries(annByStatus.map((s) => [s._id, s.count])),
//       byPriority: Object.fromEntries(annByPriority.map((s) => [s._id, s.count])),
//       perDay: announcementsPerDay,
//     },
//   });
// };

// module.exports = {
//   getEmailReport, exportEmailReport,
//   getAnnouncementReport, exportAnnouncementReport,
//   getDashboardAnalytics,
// };





const EmailLog = require("../models/EmailLog");
const Announcement = require("../models/Announcement");
const Performance = require("../models/Performance");
const Attendance = require("../models/Attendance");
const Certificate = require("../models/Certificate");
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


// ---------------- Performance ----------------

const performanceFilter = (req) => {
  const filter = {};
  const range = parseRange(req.query);
  if (range) filter.createdAt = range;
  if (req.query.student) filter.student = req.query.student;
  if (req.query.program) filter.program = req.query.program;
  if (req.query.batch) filter.batch = req.query.batch;
  if (req.query.domain) filter.domain = new RegExp(escapeRegex(req.query.domain), "i");
  if (req.query.task) filter.task = req.query.task;
  return filter;
};

const PERFORMANCE_COLUMNS = [
  { key: "studentName", label: "Student" },
  { key: "programName", label: "Program" },
  { key: "batchName", label: "Batch" },
  { key: "domain", label: "Domain" },
  { key: "taskTitle", label: "Task" },
  { key: "score", label: "Score" },
  { key: "remarks", label: "Remarks" },
  { key: "createdAt", label: "Recorded At" },
];

const enrichPerformance = (docs) =>
  docs.map((d) => ({
    ...d,
    studentName: d.student ? `${d.student.name} (${d.student.email})` : "-",
    programName: d.program?.name || "-",
    batchName: d.batch?.name || "-",
    taskTitle: d.task?.title || "-",
  }));

// GET /api/reports/performance
const getPerformanceReport = async (req, res) => {
  const filter = performanceFilter(req);
  const { page, limit, skip } = paginate(req.query);

  const [rows, total, avgAgg, byDomain, byBatch] = await Promise.all([
    Performance.find(filter).populate("student", "name email").populate("program", "name").populate("batch", "name").populate("task", "title").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Performance.countDocuments(filter),
    Performance.aggregate([{ $match: filter }, { $group: { _id: null, avg: { $avg: "$score" } } }]),
    Performance.aggregate([{ $match: filter }, { $group: { _id: "$domain", avg: { $avg: "$score" }, count: { $sum: 1 } } }]),
    Performance.aggregate([{ $match: filter }, { $group: { _id: "$batch", avg: { $avg: "$score" }, count: { $sum: 1 } } }]),
  ]);

  res.json({
    success: true,
    total,
    page,
    pages: Math.ceil(total / limit),
    summary: {
      averageScore: avgAgg[0]?.avg ?? null,
      byDomain: byDomain.map((d) => ({ domain: d._id || "Unspecified", average: d.avg, count: d.count })),
      byBatch: byBatch.map((d) => ({ batch: d._id, average: d.avg, count: d.count })),
    },
    performance: enrichPerformance(rows),
  });
};

// GET /api/reports/performance/export
const exportPerformanceReport = async (req, res) => {
  const filter = performanceFilter(req);
  const rows = await Performance.find(filter).populate("student", "name email").populate("program", "name").populate("batch", "name").populate("task", "title").sort({ createdAt: -1 }).limit(MAX_EXPORT_ROWS).lean();

  await sendExport(res, {
    format: req.query.format,
    filename: `performance-report-${Date.now()}`,
    title: "Performance Report",
    rows: enrichPerformance(rows),
    columns: PERFORMANCE_COLUMNS,
  });
};

// ---------------- Attendance ----------------

const ATTENDANCE_DATE_FORMATS = { daily: "%Y-%m-%d", weekly: "%G-W%V", monthly: "%Y-%m" };

const attendanceFilter = (req) => {
  const filter = {};
  const range = parseRange({ from: req.query.from, to: req.query.to });
  if (range) filter.date = range;
  if (req.query.student) filter.student = req.query.student;
  if (req.query.batch) filter.batch = req.query.batch;
  if (req.query.status) filter.status = req.query.status;
  return filter;
};

const ATTENDANCE_COLUMNS = [
  { key: "studentName", label: "Student" },
  { key: "batchName", label: "Batch" },
  { key: "date", label: "Date" },
  { key: "status", label: "Status" },
];

const enrichAttendance = (docs) =>
  docs.map((d) => ({ ...d, studentName: d.student ? `${d.student.name} (${d.student.email})` : "-", batchName: d.batch?.name || "-" }));

// GET /api/reports/attendance   (?period=daily|weekly|monthly controls the trend grouping)
const getAttendanceReport = async (req, res) => {
  const filter = attendanceFilter(req);
  const { page, limit, skip } = paginate(req.query);
  const period = ["daily", "weekly", "monthly"].includes(req.query.period) ? req.query.period : "daily";

  const [rows, total, byStatus, trend] = await Promise.all([
    Attendance.find(filter).populate("student", "name email").populate("batch", "name").sort({ date: -1 }).skip(skip).limit(limit).lean(),
    Attendance.countDocuments(filter),
    Attendance.aggregate([{ $match: filter }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    Attendance.aggregate([
      { $match: filter },
      { $group: { _id: { $dateToString: { format: ATTENDANCE_DATE_FORMATS[period], date: "$date" } }, present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } }, absent: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } }, late: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const totalMarked = Object.values(Object.fromEntries(byStatus.map((s) => [s._id, s.count]))).reduce((a, b) => a + b, 0) || 0;
  const presentCount = byStatus.find((s) => s._id === "present")?.count || 0;

  res.json({
    success: true,
    total,
    page,
    pages: Math.ceil(total / limit),
    summary: {
      byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
      attendanceRate: totalMarked ? Math.round((presentCount / totalMarked) * 1000) / 10 : null,
      period,
      trend: trend.map((t) => ({ period: t._id, present: t.present, absent: t.absent, late: t.late })),
    },
    attendance: enrichAttendance(rows),
  });
};

// GET /api/reports/attendance/export
const exportAttendanceReport = async (req, res) => {
  const filter = attendanceFilter(req);
  const rows = await Attendance.find(filter).populate("student", "name email").populate("batch", "name").sort({ date: -1 }).limit(MAX_EXPORT_ROWS).lean();

  await sendExport(res, {
    format: req.query.format,
    filename: `attendance-report-${Date.now()}`,
    title: "Attendance Report",
    rows: enrichAttendance(rows),
    columns: ATTENDANCE_COLUMNS,
  });
};

// ---------------- Certificates ----------------

const certificateFilter = (req) => {
  const filter = {};
  if (req.query.year) filter.year = Number(req.query.year);
  if (req.query.status) filter.status = req.query.status;
  if (req.query.student) filter.student = req.query.student;
  if (req.query.verified !== undefined && req.query.verified !== "") filter.verified = req.query.verified === "true";
  if (req.query.q) filter.certificateId = new RegExp(escapeRegex(req.query.q), "i");
  if (req.query.expiringSoon === "true") {
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);
    filter.expiresAt = { $gte: new Date(), $lte: in30 };
  } else if (req.query.expFrom || req.query.expTo) {
    filter.expiresAt = {};
    if (req.query.expFrom) filter.expiresAt.$gte = new Date(req.query.expFrom);
    if (req.query.expTo) filter.expiresAt.$lte = new Date(req.query.expTo);
  }
  return filter;
};

const CERTIFICATE_COLUMNS = [
  { key: "certificateId", label: "Certificate ID" },
  { key: "studentName", label: "Student" },
  { key: "year", label: "Year" },
  { key: "status", label: "Status" },
  { key: "verified", label: "Verified" },
  { key: "issuedAt", label: "Issued At" },
  { key: "expiresAt", label: "Expires At" },
];

const enrichCertificates = (docs) =>
  docs.map((d) => ({ ...d, studentName: d.student ? `${d.student.name} (${d.student.email})` : "-" }));

// GET /api/reports/certificates
const getCertificateReport = async (req, res) => {
  const filter = certificateFilter(req);
  const { page, limit, skip } = paginate(req.query);

  const [rows, total, byStatus, verifiedCount] = await Promise.all([
    Certificate.find(filter).populate("student", "name email").sort({ issuedAt: -1 }).skip(skip).limit(limit).lean(),
    Certificate.countDocuments(filter),
    Certificate.aggregate([{ $match: filter }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    Certificate.countDocuments({ ...filter, verified: true }),
  ]);

  res.json({
    success: true,
    total,
    page,
    pages: Math.ceil(total / limit),
    summary: { byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])), verified: verifiedCount, unverified: total - verifiedCount },
    certificates: enrichCertificates(rows),
  });
};

// GET /api/reports/certificates/export
const exportCertificateReport = async (req, res) => {
  const filter = certificateFilter(req);
  const rows = await Certificate.find(filter).populate("student", "name email").sort({ issuedAt: -1 }).limit(MAX_EXPORT_ROWS).lean();

  await sendExport(res, {
    format: req.query.format,
    filename: `certificate-report-${Date.now()}`,
    title: "Certificate Report",
    rows: enrichCertificates(rows),
    columns: CERTIFICATE_COLUMNS,
  });
};

module.exports = {
  getEmailReport, exportEmailReport,
  getAnnouncementReport, exportAnnouncementReport,
  getDashboardAnalytics,
  getPerformanceReport, exportPerformanceReport,
  getAttendanceReport, exportAttendanceReport,
  getCertificateReport, exportCertificateReport,
};
