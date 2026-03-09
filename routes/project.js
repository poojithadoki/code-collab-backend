const express = require("express");
const Project = require("../models/Project");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();
const { sendJoinRequest } = require("../controllers/projectController");

// CREATE PROJECT (Protected)

router.get("/test", (req, res) => {
  res.send("Project route working");
});
router.post("/create", authMiddleware, async (req, res) => {
    console.log("User from token:", req.user); //
  try {
    const { title, description, techStack } = req.body;

    const newProject = new Project({
      title,
      description,
      techStack,
      owner: req.user.userId, // from JWT
      teamMembers: [req.user.userId]
    });

    await newProject.save();

    res.status(201).json({
      message: "Project created successfully",
      project: newProject
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});



router.post("/join/:projectId", authMiddleware, async (req, res) => {
  try {

    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // prevent joining twice
    if (project.teamMembers.includes(req.user.userId)) {
      return res.json({ message: "Already joined project" });
    }

    project.teamMembers.push(req.user.userId);

    await project.save();

    res.json({
      message: "Joined project successfully",
      project
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});
router.get("/all", async (req, res) => {
  try {

    const projects = await Project.find();

    res.json(projects);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/request/:id",authMiddleware,sendJoinRequest);
router.get("/requests/:id", authMiddleware, async (req, res) => {
  try {

    const project = await Project.findById(req.params.id)
      .populate("requests.user", "name email")
      .populate("owner", "name email");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    if (project.owner.toString() === req.user.userId) {
  return res.status(400).json({ message: "Owner is already a member" });
}

    // Only project owner can see requests
    if (project.owner._id.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Return only pending requests
    const pendingRequests = project.requests.filter(
      (request) => request.status === "pending"
    );

    res.json(pendingRequests);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;

