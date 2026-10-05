const mongoose = require("mongoose");

const programSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true, maxlength: 150 },
    status: { type: String, enum: ["active", "upcoming", "completed"], default: "active" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Program", programSchema);
