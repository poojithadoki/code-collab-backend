// backend/routes/message.js
const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");

// ✅ Auth middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.userId };
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// ✅ Multer setup for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images/videos allowed"));
    }
  },
});

// ✅ GET all messages for a project
// routes/message.js
// TEMP: Remove authMiddleware for GET
router.get("/:projectId", async (req, res) => {
  try {
    const messages = await Message.find({ projectId: req.params.projectId })
      .populate("sender", "name profilePic")
      .sort({ createdAt: 1 }); // oldest → newest
res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});
// ✅ POST a message (text + optional files)
router.post("/:projectId", authMiddleware, upload.array("files"), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { text } = req.body;

    const files = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        files.push({
          name: file.originalname,
          url: `/uploads/${file.filename}`,
          size: file.size,
          type: file.mimetype,
        });
      });
    }

    const message = new Message({
      projectId,
      sender: req.user.id,
      text: text || "",
      files,
    });

    await message.save();

    const populated = await Message.findById(message._id)
      .populate("sender", "name email avatar");

    // Emit via Socket.io (if io is attached)
    if (req.app.get("io")) {
      req.app.get("io").to(projectId).emit("receiveMessage", populated);
    }

    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error saving message" });
  }
});

module.exports=router