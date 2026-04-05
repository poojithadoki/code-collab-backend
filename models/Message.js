const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true // ✅ faster queries
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      trim: true,
      default: "" // ✅ prevents undefined
    },
    files: [
      {
        name: String,
        url: String,   // /uploads/file.jpg
        size: Number,
        type: String,  // image/png, video/mp4, etc.
      }
    ],

    // ✅ NEW: message type (VERY IMPORTANT for media filtering)
    messageType: {
      type: String,
      enum: ["text", "image", "video", "file"],
      default: "text"
    }

  },
  { timestamps: true }
);

// ✅ Optimized index for chat + media
messageSchema.index({ projectId: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);