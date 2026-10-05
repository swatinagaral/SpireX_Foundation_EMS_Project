const mongoose = require("mongoose");
const crypto = require("crypto");

const certificateSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    certificateId: { type: String, unique: true, uppercase: true, trim: true },
    year: { type: Number, required: true },
    issuedAt: { type: Date, default: Date.now },
    expiresAt: Date,
    status: { type: String, enum: ["issued", "revoked", "reworked"], default: "issued" },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// certificateSchema.pre("validate", function (next) {
//   if (!this.certificateId) {
//     this.certificateId = `CERT-${this.year || new Date().getFullYear()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
//   }
//   next();
// });

certificateSchema.pre("validate", function () {
  if (!this.certificateId) {
    this.certificateId = `CERT-${this.year || new Date().getFullYear()}-${crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase()}`;
  }
});


certificateSchema.index({ student: 1 });
certificateSchema.index({ year: 1 });
certificateSchema.index({ expiresAt: 1 });

module.exports = mongoose.model("Certificate", certificateSchema);
