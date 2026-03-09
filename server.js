const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
const authRoutes = require("./routes/auth");

app.use("/api/auth", authRoutes);

const projectRoutes = require("./routes/project");


app.use("/api/projects", projectRoutes);
// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("✅ MongoDB Connected Successfully"))
.catch((err) => console.log("❌ DB Connection Error:", err));

app.get("/", (req, res) => {
  res.send("Code-Collab Backend Running 🚀");
});

app.listen(process.env.PORT, () => {
  console.log(`🚀 Server running on port ${process.env.PORT}`);
});

