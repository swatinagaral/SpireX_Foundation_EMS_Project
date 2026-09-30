// const mongoose = require("mongoose");

// const announcementSchema = new mongoose.Schema(
//   {
//     title: { type: String, required: true, trim: true, minlength: 3, maxlength: 150 },
//     content: { type: String, required: true, trim: true, maxlength: 10000 },
//     priority: { type: String, enum: ["normal", "important", "urgent"], default: "normal" },

//     // A user sees the announcement if ANY of these match.
//     audience: {
//       all: { type: Boolean, default: false },
//       roles: [String],
//       batches: [{ type: mongoose.Schema.Types.ObjectId, ref: "Batch" }],
//       programs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Program" }],
//     },

//     isPinned: { type: Boolean, default: false },
//     status: { type: String, enum: ["draft", "published", "archived"], default: "published" },
//     publishAt: { type: Date, default: Date.now },
//     expiresAt: Date,

//     sendEmail: { type: Boolean, default: false },
//     emailQueuedAt: Date, // prevents sending the emails twice

//     createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//     readBy: [
//       {
//         _id: false,
//         user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//         readAt: { type: Date, default: Date.now },
//       },
//     ],
//   },
//   { timestamps: true }
// );

// announcementSchema.index({ status: 1, publishAt: -1 });
// announcementSchema.index({ createdBy: 1 });

// module.exports = mongoose.model("Announcement", announcementSchema);



const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 150,
    },
    content: { type: String, required: true, trim: true, maxlength: 10000 },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    // A user sees the announcement if ANY of these match.
    audience: {
      all: { type: Boolean, default: false },
      roles: [String],
      batches: [{ type: mongoose.Schema.Types.ObjectId, ref: "Batch" }],
      programs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Program" }],
      departments: [
        { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
      ],
    },

    isPinned: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "published",
    },
    publishAt: { type: Date, default: Date.now },
    expiresAt: Date,

    sendEmail: { type: Boolean, default: false },
    emailQueuedAt: Date, // prevents sending the emails twice

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    readBy: [
      {
        _id: false,
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        readAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

announcementSchema.index({ status: 1, publishAt: -1 });
announcementSchema.index({ createdBy: 1 });

module.exports = mongoose.model("Announcement", announcementSchema);
