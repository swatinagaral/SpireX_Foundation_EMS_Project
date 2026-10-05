const mongoose = require("mongoose");

const performanceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    program: { type: mongoose.Schema.Types.ObjectId, ref: "Program" },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch" },
    domain: { type: String, trim: true, maxlength: 60 },
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
    score: { type: Number, min: 0, max: 100, required: true },
    remarks: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

performanceSchema.index({ student: 1 });
performanceSchema.index({ batch: 1 });
performanceSchema.index({ domain: 1 });

module.exports = mongoose.model("Performance", performanceSchema);
