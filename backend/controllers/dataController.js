// Lightweight CRUD for the organisation's core records (Program, Batch, Student, Task,
// Attendance, Performance, Certificate) so Reports have real data to work with.
// Admin-only (see routes/dataRoutes.js). Kept deliberately simple: create, list, delete.

const mongoose = require("mongoose");
const Program = require("../models/Program");
const Batch = require("../models/Batch");
const Student = require("../models/Student");
const Task = require("../models/Task");
const Attendance = require("../models/Attendance");
const Performance = require("../models/Performance");
const Certificate = require("../models/Certificate");
const httpError = require("../utils/httpError");
const paginate = require("../utils/pagination");

const oid = (id, label = "id") => {
  if (!mongoose.isValidObjectId(id)) throw httpError(400, `Invalid ${label}`);
  return id;
};

// Builds { list, create, remove } for a plain model with optional populate + filterable fields.
const makeCrud = (Model, { populate = "", filterFields = [], sort = { createdAt: -1 } } = {}) => ({
  list: async (req, res) => {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};
    filterFields.forEach((f) => {
      if (req.query[f] !== undefined && req.query[f] !== "") filter[f] = req.query[f];
    });

    const [items, total] = await Promise.all([
      Model.find(filter).populate(populate).sort(sort).skip(skip).limit(limit).lean(),
      Model.countDocuments(filter),
    ]);
    res.json({ success: true, total, page, pages: Math.ceil(total / limit), items });
  },
  remove: async (req, res) => {
    oid(req.params.id);
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) throw httpError(404, "Not found");
    res.json({ success: true, message: "Deleted" });
  },
});

// ---------------- Program ----------------
const programCrud = makeCrud(Program);
const createProgram = async (req, res) => {
  const { name, status } = req.body;
  if (!name) throw httpError(400, "Program name is required");
  const program = await Program.create({ name, status });
  res.status(201).json({ success: true, program });
};

// ---------------- Batch ----------------
const batchCrud = makeCrud(Batch, { populate: "program", filterFields: ["program", "status"] });
const createBatch = async (req, res) => {
  const { name, program, startDate, endDate, status } = req.body;
  if (!name || !program || !startDate || !endDate) throw httpError(400, "name, program, startDate and endDate are required");
  oid(program, "program");
  const batch = await Batch.create({ name, program, startDate, endDate, status });
  res.status(201).json({ success: true, batch });
};

// ---------------- Student ----------------
const studentCrud = makeCrud(Student, { populate: "program batch", filterFields: ["program", "batch", "status"] });
const createStudent = async (req, res) => {
  const { name, email, program, batch, status } = req.body;
  if (!name || !email || !program || !batch) throw httpError(400, "name, email, program and batch are required");
  oid(program, "program");
  oid(batch, "batch");
  const existing = await Student.findOne({ email: String(email).toLowerCase().trim() });
  if (existing) throw httpError(409, "A student with this email already exists");
  const student = await Student.create({ name, email, program, batch, status });
  res.status(201).json({ success: true, student });
};

// ---------------- Task ----------------
const taskCrud = makeCrud(Task, { populate: "program batch", filterFields: ["program", "batch", "domain", "status"] });
const createTask = async (req, res) => {
  const { title, program, batch, domain, status, dueDate } = req.body;
  if (!title) throw httpError(400, "Title is required");
  if (program) oid(program, "program");
  if (batch) oid(batch, "batch");
  const task = await Task.create({ title, program, batch, domain, status, dueDate });
  res.status(201).json({ success: true, task });
};

// ---------------- Attendance ----------------
const attendanceCrud = makeCrud(Attendance, { populate: "student batch", filterFields: ["batch", "student", "status"] });
const createAttendance = async (req, res) => {
  const { student, batch, date, status } = req.body;
  if (!student || !batch || !date || !status) throw httpError(400, "student, batch, date and status are required");
  oid(student, "student");
  oid(batch, "batch");
  if (!["present", "absent", "late"].includes(status)) throw httpError(400, "Invalid status");
  try {
    const attendance = await Attendance.create({ student, batch, date, status });
    res.status(201).json({ success: true, attendance });
  } catch (err) {
    if (err.code === 11000) throw httpError(409, "Attendance for this student on this date is already marked");
    throw err;
  }
};

// ---------------- Performance ----------------
const performanceCrud = makeCrud(Performance, { populate: "student program batch task", filterFields: ["program", "batch", "domain", "student"] });
const createPerformance = async (req, res) => {
  const { student, program, batch, domain, task, score, remarks } = req.body;
  if (!student || score === undefined) throw httpError(400, "student and score are required");
  oid(student, "student");
  if (program) oid(program, "program");
  if (batch) oid(batch, "batch");
  if (task) oid(task, "task");
  if (score < 0 || score > 100) throw httpError(400, "score must be between 0 and 100");
  const performance = await Performance.create({ student, program, batch, domain, task, score, remarks });
  res.status(201).json({ success: true, performance });
};

// ---------------- Certificate ----------------
const certificateCrud = makeCrud(Certificate, { populate: "student", filterFields: ["status", "student", "year", "verified"] });
const createCertificate = async (req, res) => {
  const { student, year, expiresAt, status, verified } = req.body;
  if (!student || !year) throw httpError(400, "student and year are required");
  oid(student, "student");
  const certificate = await Certificate.create({ student, year, expiresAt, status, verified });
  res.status(201).json({ success: true, certificate });
};

module.exports = {
  programCrud, createProgram,
  batchCrud, createBatch,
  studentCrud, createStudent,
  taskCrud, createTask,
  attendanceCrud, createAttendance,
  performanceCrud, createPerformance,
  certificateCrud, createCertificate,
};
