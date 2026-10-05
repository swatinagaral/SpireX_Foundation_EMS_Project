const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ["present", "absent", "late"], required: true },
  },
  { timestamps: true }
);

// one attendance record per student per day
attendanceSchema.index({ student: 1, date: 1 }, { unique: true });
attendanceSchema.index({ batch: 1, date: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
