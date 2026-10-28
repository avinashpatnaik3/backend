
const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema(
  {
    socketId: {
      type: String,
      required: true,
      unique: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    x: {
      type: Number,
      required: true,
      default: 100,
    },

    y: {
      type: Number,
      required: true,
      default: 100,
    },

    location: {
      type: [Number],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pixel coordinates use a 2D index.
playerSchema.index({ location: "2d" });

module.exports = mongoose.model("Player", playerSchema);
