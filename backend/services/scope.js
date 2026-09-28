const mongoose = require("mongoose");
const User = require("../models/User");
const httpError = require("../utils/httpError");

const ROLES = ["super_admin", "admin", "hr", "coordinator", "employee", "student"];
const ORG_WIDE_ROLES = ["super_admin", "admin", "hr"]; // may target the whole organisation
const ADMIN_ROLES = ["super_admin", "admin"]; // may see everything
const MAX_RECIPIENTS = Number(process.env.MAX_BULK_RECIPIENTS) || 1000;
const EMAIL_RE = /^\S+@\S+\.\S+$/;

const isAdmin = (user) => ADMIN_ROLES.includes(user.role);
const idList = (arr) => [...new Set((arr || []).map(String))];

// Validates + normalises {all, roles, batches, programs, userIds, emails}
const parseAudience = (raw = {}) => {
  if (typeof raw !== "object" || raw === null) throw httpError(400, "audience must be an object");

  const a = {
    all: raw.all === true,
    roles: idList(raw.roles),
    batches: idList(raw.batches),
    programs: idList(raw.programs),
    userIds: idList(raw.userIds),
    emails: idList(raw.emails).map((e) => e.toLowerCase().trim()),
  };

  const badRole = a.roles.find((r) => !ROLES.includes(r));
  if (badRole) throw httpError(400, `Invalid role: ${badRole}`);

  for (const key of ["batches", "programs", "userIds"]) {
    const bad = a[key].find((id) => !mongoose.isValidObjectId(id));
    if (bad) throw httpError(400, `Invalid id in ${key}: ${bad}`);
  }
  const badEmail = a.emails.find((e) => !EMAIL_RE.test(e));
  if (badEmail) throw httpError(400, `Invalid email: ${badEmail}`);

  return a;
};

const hasTarget = (a) =>
  a.all || a.roles.length || a.batches.length || a.programs.length || a.userIds.length || a.emails.length;

// Scope-based access: coordinators may only target THEIR OWN batches/programs.
const enforceScope = (user, a) => {
  if (ORG_WIDE_ROLES.includes(user.role)) return;

  if (a.all || a.roles.length || a.userIds.length || a.emails.length) {
    throw httpError(403, "You can only target your own batches or programs");
  }
  if (!a.batches.length && !a.programs.length) {
    throw httpError(400, "Select at least one batch or program");
  }
  const myBatches = idList(user.batches);
  const myPrograms = idList(user.programs);
  const badBatch = a.batches.find((b) => !myBatches.includes(b));
  const badProgram = a.programs.find((p) => !myPrograms.includes(p));
  if (badBatch || badProgram) {
    throw httpError(403, "You do not have access to one of the selected batches/programs");
  }
};

// Turns an audience into [{email, name}] (active users only, de-duplicated)
const resolveRecipients = async (a) => {
  const map = new Map();
  const add = (email, name) => {
    const e = String(email || "").toLowerCase().trim();
    if (EMAIL_RE.test(e) && !map.has(e)) map.set(e, { email: e, name: name || "" });
  };

  const or = [];
  if (a.roles?.length) or.push({ role: { $in: a.roles } });
  if (a.batches?.length) or.push({ batches: { $in: a.batches } });
  if (a.programs?.length) or.push({ programs: { $in: a.programs } });
  if (a.userIds?.length) or.push({ _id: { $in: a.userIds } });

  if (a.all || or.length) {
    const filter = a.all ? { status: "active" } : { status: "active", $or: or };
    const users = await User.find(filter).select("name email").limit(MAX_RECIPIENTS + 1).lean();
    users.forEach((u) => add(u.email, u.name));
  }
  (a.emails || []).forEach((e) => add(e));

  if (map.size > MAX_RECIPIENTS) {
    throw httpError(400, `Too many recipients (max ${MAX_RECIPIENTS})`);
  }
  return [...map.values()];
};

// Mongo filter: announcements a given user is allowed to see right now
const visibleAnnouncementFilter = (user) => {
  const now = new Date();
  const audienceOr = [{ "audience.all": true }, { "audience.roles": user.role }];
  if (user.batches?.length) audienceOr.push({ "audience.batches": { $in: user.batches } });
  if (user.programs?.length) audienceOr.push({ "audience.programs": { $in: user.programs } });

  return {
    status: "published",
    publishAt: { $lte: now },
    $and: [{ $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] }, { $or: audienceOr }],
  };
};

module.exports = {
  ROLES, ORG_WIDE_ROLES, ADMIN_ROLES, MAX_RECIPIENTS,
  isAdmin, parseAudience, hasTarget, enforceScope, resolveRecipients, visibleAnnouncementFilter,
};
