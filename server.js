const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["1.1.1.1", "8.8.8.8"]);
const User = require("./models/User");
const Project = require("./models/Project");

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");  // ✅ ADDED (missing import)
const multer = require("multer");     // ✅ ADDED for media
const path = require("path");
const fs = require("fs");

const Message = require("./models/Message");
require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

// Routes
const notificationRoutes = require("./routes/notification");
const authRoutes = require("./routes/auth");
const projectRoutes = require("./routes/project");
const messageRoutes = require("./routes/message");

// Create app & server
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://code-collab-frontend-pink.vercel.app"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.set("io",io)

// ✅ MEDIA UPLOAD SETUP
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ 
  storage, 
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Middleware
const allowedOrigins = [
  "http://localhost:5173",
  "https://code-collab-frontend-pink.vercel.app"
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("❌ Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));


// Routes
app.use("/api/notifications", notificationRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/messages", messageRoutes);
// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ DB Error:", err));

app.get("/", (req, res) => res.send("Code-Collab Backend 🚀"));

// ✅ SOCKET.IO with AUTH FIRST
// ✅ SOCKET AUTH MIDDLEWARE (DEPLOY SAFE)
io.use((socket, next) => {
  let token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error("Authentication error: No token"));
  }

  try {
    // ✅ Handle "Bearer token"
    if (token.startsWith("Bearer ")) {
      token = token.split(" ")[1];
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Ensure correct key
    socket.userId = decoded.userId;

    next();
  } catch (err) {
    console.log("❌ Socket auth error:", err.message);
    next(new Error("Authentication error"));
  }
});


// ✅ SOCKET CONNECTION
io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id, "| User:", socket.userId);

  // ✅ JOIN PROJECT ROOM
socket.on("joinProject", (projectId) => {
  if (!projectId) {
    console.log("❌ No projectId received");
    return;
  }

  socket.join(projectId);
  console.log(`✅ User ${socket.userId} joined project ${projectId}`);
});

  // ✅ LEAVE PROJECT ROOM
  socket.on("leaveProject", (projectId) => {
    if (!projectId) return;

    socket.leave(projectId);
    console.log(`🚪 User ${socket.userId} left project ${projectId}`);
  });

  // ✅ SEND MESSAGE (PRODUCTION READY)
socket.on("sendMessage", async (data) => {
  try {
    const { projectId, text, files } = data; // files optional for future media

    // ✅ VALIDATION
    if (!projectId || (!text?.trim() && (!files || files.length === 0))) {
      console.log("⚠️ Invalid message data, skipping");
      return;
    }

    console.log("📩 Incoming message:", text);

    // ✅ SAVE MESSAGE
    const newMessage = await Message.create({
      projectId,
      text: text?.trim() || "",
      files: files || [], // store files if provided
      sender: socket.userId,
    });

    // ✅ POPULATE SENDER INFO
    const populatedMsg = await Message.findById(newMessage._id)
      .populate("sender", "name email avatar");

    console.log("💾 Saved message:", populatedMsg._id);

    // ✅ BROADCAST TO ROOM
    io.to(projectId).emit("receiveMessage", populatedMsg);

  } catch (error) {
    console.error("❌ Message error:", error.message);
  }
});

  // ✅ DISCONNECT
  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

server.listen(process.env.PORT || 5000, () => {
  console.log(`🚀 Server on port ${process.env.PORT || 5000}`);
});