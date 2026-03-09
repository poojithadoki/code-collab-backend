const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true
  },

  skills: {
    type: [String],
    default: []
  },

  experience: {
    type: String,
    default: ""
  },

  bio: {
    type: String,
    default: ""
  },

  profilePic: {
    type: String,
    default: "" // Will store Cloudinary URL or image link
  }

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);