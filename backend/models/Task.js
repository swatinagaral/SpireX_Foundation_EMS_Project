const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    program: { type: mongoose.Schema.Types.ObjectId, ref: "Program" },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch" },
    domain: { type: String, trim: true, maxlength: 60 }, // e.g. Frontend, Backend, Design
    status: { type: String, enum: ["pending", "in_progress", "completed"], default: "pending" },
    dueDate: Date,
  },
  { timestamps: true }
);

taskSchema.index({ batch: 1 });
taskSchema.index({ domain: 1 });

module.exports = mongoose.model("Task", taskSchema);
