const Project = require("../models/Project");
const Notification = require("../models/Notification");



exports.sendJoinRequest = async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.userId;


    const project = await Project.findById(projectId);


    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }


    // Owner cannot send join request
    if (project.owner.toString() === userId) {
      return res
        .status(400)
        .json({ message: "Owner is already a member of this project" });
    }


    // Already in team
    if (project.teamMembers.includes(userId)) {
      return res
        .status(400)
        .json({ message: "You are already a member of this project" });
    }


    // Already sent pending request
    const alreadyRequested = project.requests.find(
      (reqItem) =>
        reqItem.user.toString() === userId && reqItem.status === "pending"
    );


    if (alreadyRequested) {
      return res
        .status(400)
        .json({ message: "You already sent a join request for this project" });
    }


    // Add new request
    project.requests.push({
      user: userId,
      status: "pending",
      createdAt: new Date(),
    });


    await project.save();


// ✅ Create notification for owner
    await Notification.create({
      user: project.owner,        // receiver is owner
      type: "JOIN_REQUEST",
      project: project._id,
      fromUser: req.user.userId,  // requester
    });


    // Later you can send email/notification to project.owner here


    res.status(200).json({ message: "Join request sent successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}; 