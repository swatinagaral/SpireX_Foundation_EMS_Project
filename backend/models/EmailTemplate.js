const mongoose = require("mongoose");

const emailTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },

    // unique machine name used by other modules, e.g. "offer_letter"
    key: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9_]{2,50}$/, "Key must be 2-50 chars: a-z, 0-9, _"],
    },

    category: {
      type: String,
      enum: ["general", "welcome", "application", "offer_letter", "certificate", "announcement", "reminder", "other"],
      default: "general",
    },

    subject: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 50000 }, // HTML, supports {{variables}}
    variables: [String], // auto-extracted from subject + body
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

emailTemplateSchema.pre("validate", function () {
  const found = new Set();
  const re = /\{\{\s*([\w.]+)\s*\}\}/g;
  for (const text of [this.subject, this.body]) {
    let m;
    while ((m = re.exec(text || ""))) found.add(m[1]);
  }
  this.variables = [...found];
});

module.exports = mongoose.model("EmailTemplate", emailTemplateSchema);
