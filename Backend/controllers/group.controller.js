import Group from "../models/group.model.js";
import Message from "../models/message.model.js";
import GroupRequest from "../models/groupRequest.model.js";
import User from "../models/user.model.js";
import cloudinary from "../config/cloudinary.js"; // Ensure Cloudinary is imported
import multer from "multer";
import Poll from "../models/poll.model.js";
import Announcement from "../models/announcement.model.js"; // new: import announcement model
// Set up multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Create a new group
export const createGroup = async (req, res) => {
  try {
    const { name, description, tags, isPublic, members } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId);

    const group = new Group({
      name,
      description,
      tags,
      collegename: user.collegename,
      isPublic,
      admins: [userId],
      members: [userId, ...members], // Add members during group creation
    });

    await group.save();
    res.status(201).json({ message: "Group created successfully", group });
  } catch (error) {
    res.status(500).json({ message: "Error creating group", error });
  }
};

// Get groups for the logged-in user's college
export const getGroupsByCollege = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const groups = await Group.find({ collegename: user.collegename });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: "Error fetching groups", error });
  }
};

// Get groups for the logged-in user
export const getUserGroups = async (req, res) => {
  try {
    const userId = req.user.id;
    const groups = await Group.find({ members: userId });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user groups", error });
  }
};

// Search public groups by name and tags
export const searchPublicGroups = async (req, res) => {
  try {
    const { query, tags } = req.query;
    const tagArray = tags
      ? tags.split(",").map((tag) => tag.trim().toLowerCase())
      : [];

    const cleanQuery = query ? query.trim().toLowerCase() : "";

    let searchQuery = { isPublic: true };

    if (cleanQuery || tagArray.length > 0) {
      searchQuery.$or = [];

      if (cleanQuery) {
        searchQuery.$or.push({
          name: { $regex: cleanQuery, $options: "i" },
        });
      }

      if (tagArray.length > 0) {
        searchQuery.$or.push({
          tags: {
            $in: tagArray.map((tag) => new RegExp(tag, "i")),
          },
        });
      }
    }

    const groups = await Group.find(searchQuery);

    res.json(groups);
  } catch (error) {
    console.error("Error in searchPublicGroups:", error);
    res.status(500).json({ message: "Error searching groups", error });
  }
};

// Join a public group
export const joinPublicGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const group = await Group.findById(groupId);

    if (!group.isPublic)
      return res.status(403).json({ message: "This is a private group" });
    if (group.members.includes(userId))
      return res.status(400).json({ message: "Already a member" });

    group.members.push(userId);
    await group.save();
    res.json({ message: "Joined group successfully", group });
  } catch (error) {
    res.status(500).json({ message: "Error joining group", error });
  }
};

// Handle requests for private groups
export const handleGroupRequest = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const group = await Group.findById(groupId);

    if (group.isPublic)
      return res
        .status(400)
        .json({ message: "No request needed for public groups" });

    const existingRequest = await GroupRequest.findOne({
      user: userId,
      group: groupId,
    });
    if (existingRequest)
      return res.status(400).json({ message: "Request already sent" });

    const request = new GroupRequest({ user: userId, group: groupId });
    await request.save();
    res.json({ message: "Join request sent" });
  } catch (error) {
    res.status(500).json({ message: "Error requesting to join", error });
  }
};

// Post an announcement (global or within group)
export const postAnnouncement = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { content, isGlobal, category, expiryDate } = req.body;
    const userId = req.user.id;

    const announcement = new Announcement({
      sender: userId,
      content,
      group: groupId,
      isGlobal,
      category,
      expiryDate,
    });
    await announcement.save();
    res.json({ message: "Announcement posted successfully", announcement });
  } catch (error) {
    res.status(500).json({ message: "Error posting announcement", error });
  }
};

// Pin a message in a group
export const pinMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { messageId } = req.body;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.admins.includes(userId))
      return res.status(403).json({ message: "Only admins can pin messages" });

    if (group.pinnedMessages.includes(messageId))
      return res.status(400).json({ message: "Message already pinned" });
    const pinnedMessage = await Message.findById(messageId).populate(
      "sender",
      "username avatar"
    );
    req.io
      .to(groupId)
      .emit("messagePinned", { messageId, message: pinnedMessage });
    group.pinnedMessages.push(messageId);
    group.save();

    res.json({ message: "Message pinned successfully", pinnedMessage });
  } catch (error) {
    res.status(500).json({ message: "Error pinning message", error });
  }
};

export const unpinMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { messageId } = req.body;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.admins.includes(userId))
      return res
        .status(403)
        .json({ message: "Only admins can unpin messages" });

    group.pinnedMessages = group.pinnedMessages.filter(
      (id) => id.toString() !== messageId
    );
    req.io.to(groupId).emit("messageUnpinned", messageId);
    group.save();
    res.json({ message: "Message unpinned successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error unpinning message", error });
  }
};

export const getPinnedMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId).populate({
      path: "pinnedMessages",
      populate: { path: "sender", select: "username avatar" },
    });

    if (!group) return res.status(404).json({ message: "Group not found" });
    res.json(group.pinnedMessages);
  } catch (error) {
    res.status(500).json({ message: "Error fetching pinned messages", error });
  }
};

// Delete a group (only allowed by an admin)
export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.admins.includes(userId))
      return res.status(403).json({ message: "Unauthorized" });
    await group.deleteOne();
    res.json({ message: "Group deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting group", error });
  }
};

// Add a member to a group (admin only)
export const addMemberToGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberId } = req.body;

    const userId = req.user.id;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.admins.includes(userId))
      return res.status(403).json({ message: "Only admins can add members" });
    if (group.members.includes(memberId))
      return res.status(400).json({ message: "Member already exists" });
    group.members.push(memberId);
    await group.save();
    res.json({ message: "Member added successfully", group });
  } catch (error) {
    res.status(500).json({ message: "Error adding member", error });
  }
};

// Promote a member to admin (admin only)
export const promoteMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberId } = req.body;
    const userId = req.user.id;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.admins.includes(userId))
      return res
        .status(403)
        .json({ message: "Only admins can promote members" });
    if (!group.members.includes(memberId))
      return res.status(400).json({ message: "User is not a member" });
    if (group.admins.includes(memberId))
      return res.status(400).json({ message: "User is already an admin" });
    group.admins.push(memberId);
    await group.save();
    res.json({ message: "Member promoted to admin", group });
  } catch (error) {
    res.status(500).json({ message: "Error promoting member", error });
  }
};

// Demote an admin to member (admin only)
export const demoteMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { adminId } = req.body;
    const userId = req.user.id;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.admins.includes(userId))
      return res
        .status(403)
        .json({ message: "Only admins can demote members" });
    if (!group.admins.includes(adminId))
      return res.status(400).json({ message: "User is not an admin" });
    // Prevent demoting yourself
    if (adminId === userId)
      return res.status(400).json({ message: "You cannot demote yourself" });
    group.admins = group.admins.filter((id) => id.toString() !== adminId);
    await group.save();
    res.json({ message: "Admin demoted to member", group });
  } catch (error) {
    res.status(500).json({ message: "Error demoting member", error });
  }
};

// Remove a member from a group (admin only)
export const removeMemberFromGroup = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user.id;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.admins.includes(userId))
      return res
        .status(403)
        .json({ message: "Only admins can remove members" });
    if (!group.members.includes(memberId))
      return res.status(400).json({ message: "User is not a member" });
    group.members = group.members.filter((id) => id.toString() !== memberId);
    await group.save();
    res.json({ message: "Member removed successfully", group });
  } catch (error) {
    res.status(500).json({ message: "Error removing member", error });
  }
};

// Send a group chat message (similar to personal chat)
export const sendGroupMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { content, isGlobal } = req.body; // isGlobal: true for global message in group
    const user = req.user;
    const message = new Message({
      sender: user.id,
      content,
      group: groupId,
      isGlobal: isGlobal || false,
    });
    req.io.to(groupId).emit("newGroupMessage", {
      _id: message._id,
      sender: { _id: user.id, username: user.username, avatar: user.avatar }, // updated: full user details rather than just id
      content,
      isGlobal: message.isGlobal,
      createdAt: new Date(),
      group: groupId,
    });
    const group = await Group.findById(groupId);
    group.messages.push(message._id);
    message.save();
    group.save();
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: "Error sending message", error });
  }
};

// Delete a group chat message (only sender can delete)
export const deleteGroupMessage = async (req, res) => {
  try {
    const { groupId, messageId } = req.params;
    const userId = req.user.id;

    req.io.to(groupId).emit("deleteGroupMessage", messageId);
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });
    if (message.sender.toString() !== userId.toString())
      return res.status(403).json({ message: "Unauthorized" });
    await message.deleteOne();
    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting message", error });
  }
};

// Send a document in group chat (reusing Cloudinary upload, similar to personal chat)
export const sendGroupDocument = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  try {
    const { groupId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "group/documents", resource_type: "raw" },
        (error, result) => {
          if (error) {
            console.error("Cloudinary document upload error:", error);
            return reject(error);
          }
          resolve(result);
        }
      );
      stream.end(req.file.buffer); // Use buffer from uploadMiddleware
    });

    const message = new Message({
      sender: userId,
      content: content || "",
      mediaUrl: result.secure_url,
      group: groupId,
    });
    await message.save();

    const group = await Group.findById(groupId);
    group.messages.push(message._id);
    await group.save();

    // Retrieve full sender details (username and avatar)
    const senderDetails = await User.findById(userId).select("username avatar");

    req.io.to(groupId).emit("newGroupMessage", {
      _id: message._id,
      sender: senderDetails, // updated: full user details rather than just id
      content: content || "",
      mediaUrl: result.secure_url,
      createdAt: message.createdAt,
      group: groupId,
    });

    res.json(message);
  } catch (error) {
    console.error("Error in sendGroupDocument:", error);
    res.status(500).json({ message: "Error sending document", error });
  }
};

// Send an image in group chat (similar to personal chat)
export const sendGroupImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  try {
    const { groupId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "group/images" },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    const message = new Message({
      sender: userId,
      content: content || "",
      mediaUrl: result.secure_url,
      group: groupId,
    });
    await message.save();

    // Add message to group's messages and images arrays
    const group = await Group.findById(groupId);
    group.messages.push(message._id);
    group.images.push(message.mediaUrl); // <-- new: store image URL
    await group.save();

    // Retrieve full sender details (username and avatar)
    const senderDetails = await User.findById(userId).select("username avatar");

    req.io.to(groupId).emit("newGroupMessage", {
      _id: message._id,
      sender: senderDetails, // updated: full user details rather than just id
      content: content || "",
      mediaUrl: result.secure_url,
      createdAt: message.createdAt,
      group: groupId,
    });

    res.json(message);
  } catch (error) {
    console.error("Error sending image:", error);
    res.status(500).json({ message: "Error sending image", error });
  }
};

// Fetch group chats
export const getGroupChats = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId).populate({
      path: "messages",
      populate: [
        { path: "sender", select: "username avatar" },
        { path: "poll", model: "Poll" }, // Add this to populate poll data
      ],
    });
    if (!group) return res.status(404).json({ message: "Group not found" });
    res.json(group.messages);
  } catch (error) {
    res.status(500).json({ message: "Error fetching group chats", error });
  }
};

// Get details of a particular group
export const getGroupDetails = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId)
      .populate("members", "username avatar")
      .populate("admins", "username avatar");
    if (!group) return res.status(404).json({ message: "Group not found" });
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: "Error fetching group details", error });
  }
};

// Leave a group
export const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.members.includes(userId))
      return res
        .status(400)
        .json({ message: "You are not a member of this group" });
    if (group.admins.includes(userId))
      return res.status(400).json({ message: "Admins cannot leave the group" });

    group.members = group.members.filter((id) => id.toString() !== userId);
    await group.save();
    res.json({ message: "Left group successfully", group });
  } catch (error) {
    res.status(500).json({ message: "Error leaving group", error });
  }
};

// Edit group details (admin only)
export const editGroupDetails = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const group = await Group.findById(groupId);

    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.admins.includes(userId)) {
      return res
        .status(403)
        .json({ message: "Only admins can edit group details" });
    }

    // Create an update object for modified fields
    const updates = {};

    // Handle regular fields
    const { name, description, isPublic, tags } = req.body;

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (isPublic !== undefined)
      updates.isPublic =
        typeof isPublic === "boolean" ? isPublic : isPublic === "true";
    if (tags) {
      updates.tags = tags.split(",").filter((tag) => tag.trim());
    }

    // Handle file upload separately
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "group/avatars",
        });
        updates.avatar = result.secure_url;
      } catch (uploadError) {
        return res.status(500).json({
          message: "Error uploading file",
          error: uploadError.message,
        });
      }
    }

    // Update group with modified fields only
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { $set: updates },
      { new: true }
    )
      .populate("members", "username avatar")
      .populate("admins", "username avatar");
    console.log("here");

    res.json({
      message: "Group details updated successfully",
      group: updatedGroup,
    });
  } catch (error) {
    console.error("Error updating group details:", error);
    res.status(500).json({
      message: "Error updating group details",
      error: error.message,
    });
  }
};

// Update group avatar (new function)
export const updateGroupAvatar = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const group = await Group.findById(groupId);

    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.admins.includes(userId)) {
      return res
        .status(403)
        .json({ message: "Only admins can update group avatar" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "group/avatars" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    group.avatar = result.secure_url;
    await group.save();

    res.json({
      message: "Group avatar updated successfully",
      avatar: group.avatar,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating group avatar",
      error: error.message,
    });
  }
};

export const joinGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is already a member
    if (group.members.includes(userId)) {
      return res
        .status(400)
        .json({ message: "Already a member of this group" });
    }

    // If group is private, send a join request instead of direct join
    if (!group.isPublic) {
      return res.status(403).json({
        message: "This is a private group. Please send a join request.",
      });
    }

    // Add user to members array
    group.members.push(userId);
    await group.save();

    res.json({ message: "Successfully joined group", group });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error joining group", error: error.message });
  }
};

// Poll Controllers
export const createPoll = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { question, options, duration } = req.body;
    const userId = req.user.id;

    const poll = new Poll({
      question,
      options: options.map((text) => ({ text, votes: 0 })),
      createdBy: userId,
      group: groupId,
      voters: [],
      expiresAt: duration
        ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000)
        : null,
    });
    await poll.save();

    const message = new Message({
      sender: userId,
      group: groupId,
      poll: poll._id,
      type: "poll",
    });
    await message.save();

    const group = await Group.findById(groupId);
    group.messages.push(message._id);
    await group.save();

    // Populate all necessary data before emitting
    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "username avatar")
      .populate("poll");

    req.io.to(groupId).emit("newGroupMessage", populatedMessage);
    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Error creating poll:", error);
    res.status(500).json({ message: "Error creating poll", error });
  }
};

export const votePoll = async (req, res) => {
  try {
    const { pollId } = req.params;
    const { optionIndex } = req.body;
    const userId = req.user.id;

    const poll = await Poll.findById(pollId);
    if (!poll) return res.status(404).json({ message: "Poll not found" });

    // Check if poll has expired
    if (poll.expiresAt && new Date() > new Date(poll.expiresAt))
      return res.status(400).json({ message: "Poll has expired" });

    // Check if user has already voted
    if (poll.voters.includes(userId))
      return res.status(400).json({ message: "Already voted" });

    // Update vote count and add user to voters
    poll.options[optionIndex].votes += 1;
    poll.voters.push(userId);
    await poll.save();

    req.io.to(poll.group.toString()).emit("pollUpdated", poll);
    res.json(poll);
  } catch (error) {
    res.status(500).json({ message: "Error voting in poll", error });
  }
};

export const getGroupPolls = async (req, res) => {
  try {
    const { groupId } = req.params;
    const polls = await Poll.find({ group: groupId })
      .populate("createdBy", "username avatar")
      .sort("-createdAt");
    res.json(polls);
  } catch (error) {
    res.status(500).json({ message: "Error fetching polls", error });
  }
};
