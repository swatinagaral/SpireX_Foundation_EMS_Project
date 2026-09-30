const mongoose = require("mongoose");
const User = require("../models/User");
const httpError = require("../utils/httpError");
const paginate = require("../utils/pagination");
const { sendTemplateEmail } = require("../services/emailService");

const ALL_ROLES = ["super_admin", "admin", "hr", "coordinator", "employee", "student"];
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Only super_admin may create/promote to super_admin or admin.
// A plain admin may manage hr / coordinator / employee / student.
const assignableRoles = (actor) => (actor.role === "super_admin" ? ALL_ROLES : ALL_ROLES.filter((r) => !["super_admin", "admin"].includes(r)));

const genPassword = () => Math.random().toString(36).slice(-5) + Math.random().toString(36).slice(-5).toUpperCase() + "!9";

// GET /api/users
const listUsers = async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), "i");
    filter.$or = [{ name: rx }, { email: rx }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).select("-password").sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({ success: true, total, page, pages: Math.ceil(total / limit), users, assignableRoles: assignableRoles(req.user) });
};

// POST /api/users  (admin creates a user with any role they're allowed to assign)
const createUser = async (req, res) => {
  const { name, email, role, password, sendInviteEmail = true } = req.body;

  if (!name || !email) throw httpError(400, "Name and email are required");
  if (!role || !assignableRoles(req.user).includes(role)) {
    throw httpError(403, `You are not allowed to assign the role "${role}"`);
  }

  const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (existing) throw httpError(409, "A user with this email already exists");

  const tempPassword = password && String(password).length >= 8 ? password : genPassword();
  const user = await User.create({ name, email, password: tempPassword, role });

  let emailWarning;
  if (sendInviteEmail) {
    try {
      await sendTemplateEmail("welcome", { email: user.email, name: user.name }, { email: user.email }, { sentBy: req.user._id });
    } catch (err) {
      emailWarning = err.message;
    }
  }

  res.status(201).json({
    success: true,
    message: "User created",
    user: { _id: user._id, name: user.name, email: user.email, role: user.role, status: user.status },
    // shown once so the admin can share it manually if email/SMTP is not set up
    temporaryPassword: password ? undefined : tempPassword,
    emailWarning,
  });
};

const findOr404 = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw httpError(400, "Invalid user id");
  const u = await User.findById(id);
  if (!u) throw httpError(404, "User not found");
  return u;
};

// PATCH /api/users/:id/role
const changeRole = async (req, res) => {
  const { role } = req.body;
  const target = await findOr404(req.params.id);

  if (!role || !assignableRoles(req.user).includes(role)) {
    throw httpError(403, `You are not allowed to assign the role "${role}"`);
  }
  if (String(target._id) === String(req.user._id)) throw httpError(400, "You cannot change your own role");
  if (target.role === "super_admin" && req.user.role !== "super_admin") {
    throw httpError(403, "Only a super admin can change another super admin's role");
  }

  target.role = role;
  await target.save();
  res.json({ success: true, message: "Role updated", user: { _id: target._id, role: target.role } });
};

// PATCH /api/users/:id/status  (active | inactive | suspended)
const changeStatus = async (req, res) => {
  const { status } = req.body;
  if (!["active", "inactive", "suspended"].includes(status)) throw httpError(400, "Invalid status");

  const target = await findOr404(req.params.id);
  if (String(target._id) === String(req.user._id)) throw httpError(400, "You cannot change your own status");

  target.status = status;
  await target.save();
  res.json({ success: true, message: "Status updated", user: { _id: target._id, status: target.status } });
};

module.exports = { listUsers, createUser, changeRole, changeStatus, assignableRoles };
