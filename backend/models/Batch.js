// const mongoose = require("mongoose");

// const batchSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true, trim: true, maxlength: 150 },
//     program: { type: mongoose.Schema.Types.ObjectId, ref: "Program", required: true },
//     startDate: { type: Date, required: true },
//     endDate: { type: Date, required: true },
//     status: { type: String, enum: ["upcoming", "ongoing", "completed"], default: "upcoming" },
//   },
//   { timestamps: true }
// );

// batchSchema.pre("validate", function (next) {
//   if (this.startDate && this.endDate && this.endDate <= this.startDate) {
//     return next(new Error("endDate must be after startDate"));
//   }
//   next();
// });

// batchSchema.index({ program: 1 });

// module.exports = mongoose.model("Batch", batchSchema);




const mongoose = require("mongoose");

const batchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    program: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Program",
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["upcoming", "ongoing", "completed"],
      default: "upcoming",
    },
  },
  { timestamps: true }
);

batchSchema.pre("validate", function () {
  if (this.startDate && this.endDate && this.endDate <= this.startDate) {
    throw new Error("endDate must be after startDate");
  }
});

batchSchema.index({ program: 1 });

module.exports = mongoose.model("Batch", batchSchema);