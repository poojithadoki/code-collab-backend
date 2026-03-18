const express = require("express");
const Project = require("../models/Project");
const authMiddleware = require("../middleware/authMiddleware");
const Notification = require("../models/Notification");


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

    // Only project owner can see requests
    if (project.owner._id.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Only pending requests
    const pendingRequests = project.requests.filter(
      (request) => request.status === "pending"
    );

    res.json(pendingRequests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


// GET SINGLE PROJECT BY ID (public or protected as you prefer)
router.get("/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("owner", "name email")
      .populate("teamMembers", "name email");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// ACCEPT join request
router.put("/requests/:projectId/:requestId/accept", authMiddleware, async (req, res) => {
  try {
    const { projectId, requestId } = req.params;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Only owner can accept
    if (project.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const request = project.requests.id(requestId); // Mongoose subdoc lookup

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request is already processed" });
    }

    request.status = "accepted";

    // Add user to teamMembers if not already there
    if (!project.teamMembers.includes(request.user)) {
      project.teamMembers.push(request.user);
    }

    await project.save();

    await Notification.create({
  user: request.user,          // the requester
  type: "REQUEST_ACCEPTED",
  project: project._id,
  fromUser: req.user.userId,   // the owner
});


    res.json({ message: "Request accepted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// REJECT join request
router.put("/requests/:projectId/:requestId/reject", authMiddleware, async (req, res) => {
  try {
    const { projectId, requestId } = req.params;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Only owner can reject
    if (project.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const request = project.requests.id(requestId);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request is already processed" });
    }

    request.status = "rejected";

    await project.save();

    await Notification.create({
  user: request.user,
  type: "REQUEST_REJECTED",
  project: project._id,
  fromUser: req.user.userId,
});


    res.json({ message: "Request rejected" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;

