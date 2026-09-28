const mongoose = require("mongoose");

// One document per recipient. Also acts as the email queue.
const emailLogSchema = new mongoose.Schema(
  {
    to: {
      email: { type: String, required: true, lowercase: true, trim: true },
      name: { type: String, trim: true },
    },
    subject: { type: String, required: true },
    html: { type: String, required: true },
    text: String,

    type: { type: String, enum: ["single", "bulk", "automated", "announcement"], default: "single" },
    template: { type: mongoose.Schema.Types.ObjectId, ref: "EmailTemplate" },
    templateKey: String,
    bulkId: String, // same for every email of one bulk send
    announcement: { type: mongoose.Schema.Types.ObjectId, ref: "Announcement" },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    status: {
      type: String,
      enum: ["queued", "sending", "sent", "failed", "cancelled"],
      default: "queued",
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    lastError: String,
    messageId: String,
    scheduledAt: { type: Date, default: Date.now },
    sentAt: Date,
  },
  { timestamps: true }
);

emailLogSchema.index({ status: 1, scheduledAt: 1 });
emailLogSchema.index({ sentBy: 1, createdAt: -1 });
emailLogSchema.index({ bulkId: 1 });

module.exports = mongoose.model("EmailLog", emailLogSchema);
