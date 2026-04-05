const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware"); // ← move to top
const multer = require("multer");
const cloudinary = require("../config/cloudinary");

const router = express.Router();

// Multer setup
const storage = multer.memoryStorage();
const upload = multer({ storage });

// UPLOAD PROFILE PIC
// router.put(
//   "/upload-profile-pic",
//   authMiddleware,
//   upload.single("profilePic"),
//   async (req, res) => {
//     try {
//       if (!req.file) {
//         return res.status(400).json({ message: "No file uploaded" });
//       }

//       // Convert buffer to base64
//       const fileStr = `data:${req.file.mimetype};base64,${req.file.buffer.toString(
//         "base64"
//       )}`;

//       // Upload to Cloudinary
//       const result = await cloudinary.uploader.upload(fileStr, {
//         folder: "code-collab-profiles"
//       });

//       // Save URL in user
//       const updatedUser = await User.findByIdAndUpdate(
//         req.user.userId,
//         { profilePic: result.secure_url },
//         { returnDocument: "after" } // ✅ replaces deprecated `new: true`
//       ).select("-password");

//       // Return updated user
//       res.json({
//         message: "Profile picture updated",
//         user: updatedUser
//       });
//     } catch (error) {
//       console.error(error);

//       // Handle Cloudinary specific errors
//       if (error.name === "Error") {
//         return res.status(400).json({ message: error.message });
//       }

//       res.status(500).json({ message: "Server error" });
//     }
//   }
// );
// SIGNUP
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ name, email, password: hashedPassword });

    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h"
    });

    res.json({
      message: "Login successful",
      token,
      user: { _id:user._id,name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE PROFILE
router.put("/update-profile", authMiddleware, async (req, res) => {
  try {
    const { skills, experience, name, bio } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { skills, experience, name, bio },
      { new: true }
    ).select("-password");

    res.json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/change-password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const user = await User.findById(req.user.userId);

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    await user.save();

    res.json({ message: "Password updated successfully" });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});
router.put(
  "/upload-profile-pic",
  authMiddleware,
  upload.single("profilePic"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Convert file to base64 for Cloudinary
      const fileStr = `data:${req.file.mimetype};base64,${req.file.buffer.toString(
        "base64"
      )}`;

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(fileStr, {
        folder: "code-collab-profiles",
        overwrite: true,       // replaces old image
        unique_filename: false // keeps same filename if re-uploaded
      });

      // Update user profilePic in MongoDB
      const updatedUser = await User.findByIdAndUpdate(
        req.user.userId,
        { profilePic: result.secure_url },
        { new: true } // return updated user
      ).select("-password");

      // Send response
      res.json({
        message: "Profile picture updated successfully!",
        user: updatedUser
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message || "Server error" });
    }
  }
);
module.exports = router;