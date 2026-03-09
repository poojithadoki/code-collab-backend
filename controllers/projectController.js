const Project = require("../models/Project");

exports.sendJoinRequest = async (req, res) => {
  try {

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Use userId (NOT id)
    const alreadyRequested = project.requests.find(
      (reqItem) => reqItem.user.toString() === req.user.userId
    );

    if (alreadyRequested) {
      return res.status(400).json({ message: "Request already sent" });
    }

    project.requests.push({
      user: req.user.userId,
      status: "pending"
    });

    await project.save();

    res.status(200).json({ message: "Join request sent successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};