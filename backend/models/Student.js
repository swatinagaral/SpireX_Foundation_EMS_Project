const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, match: [/^\S+@\S+\.\S+$/, "Invalid email"] },
    program: { type: mongoose.Schema.Types.ObjectId, ref: "Program", required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true },
    status: { type: String, enum: ["active", "completed", "dropped"], default: "active" },
  },
  { timestamps: true }
);

studentSchema.index({ program: 1 });
studentSchema.index({ batch: 1 });

module.exports = mongoose.model("Student", studentSchema);
