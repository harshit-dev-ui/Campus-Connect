import Chat from "../models/chat.personal.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import cloudinary from "../config/cloudinary.js";

// Create a new private chat
export const createChat = async (req, res) => {
  try {
    const { recipientId } = req.body;
    const userId = req.user.id;

    let chat = await Chat.findOne({
      participants: { $all: [userId, recipientId] },
    });

    if (!chat) {
      chat = new Chat({ participants: [userId, recipientId], messages: [] });
      await chat.save();
    }

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: "Error creating chat", error });
  }
};

// Get all chats of a user
export const getUserChats = async (req, res) => {
  try {
    const userId = req.user.id;
    const chats = await Chat.find({ participants: userId })
      .populate("participants", "username avatar")
      .populate({
        path: "messages",
        select: "content sender mediaUrl createdAt",
        populate: { path: "sender", select: "username avatar" },
      })
      .select("participants messages createdAt");
    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: "Error fetching chats", error });
  }
};

// Send a message in private chat (uses Socket.io for real-time updates)
export const sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const message = new Message({ sender: userId, content, chat: chatId });

    const chat = await Chat.findById(chatId);
    chat.messages.push(message._id);

    // Emit to specific chat room with detailed sender info (id and avatar)
    const newMessage = {
      _id: message._id,
      sender: { _id: userId, avatar: req.user.avatar },
      content,
      createdAt: new Date(),
      chat: chatId,
    };
    req.io.to(chatId).emit("newMessage", newMessage);
    message.save();
    chat.save();
    res.json(newMessage); // Return the new message object
  } catch (error) {
    res.status(500).json({ message: "Error sending message", error });
  }
};

// Send a document in private chat
export const sendDocument = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  try {
    const { chatId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "chat/documents", resource_type: "raw" },
        (error, result) => {
          if (error) {
            console.error("Cloudinary document upload error:", error);
            return reject(error);
          }
          resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    const message = new Message({
      sender: userId,
      content: content || "",
      mediaUrl: result.secure_url,
      chat: chatId,
    });
    await message.save();

    const chat = await Chat.findById(chatId);
    chat.messages.push(message._id);
    await chat.save();

    req.io.to(chatId).emit("newMessage", {
      _id: message._id,
      sender: {
        _id: userId,
        username: req.user.username,
        avatar: req.user.avatar,
      },
      content: content || "",
      mediaUrl: result.secure_url,
      createdAt: message.createdAt,
      chat: chatId,
    });

    res.json(message);
  } catch (error) {
    console.error("Error in sendDocument:", error);
    res.status(500).json({ message: "Error sending document", error });
  }
};

// Send an image in private chat
export const sendImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  try {
    const { chatId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "chat/images" },
        (error, result) => {
          if (error) {
            console.error("Cloudinary image upload error:", error);
            return reject(error);
          }
          resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    const message = new Message({
      sender: userId,
      content: content || "",
      mediaUrl: result.secure_url,
      chat: chatId,
    });
    await message.save();

    const chat = await Chat.findById(chatId);
    chat.messages.push(message._id);
    await chat.save();

    req.io.to(chatId).emit("newMessage", {
      _id: message._id,
      sender: {
        _id: userId,
        username: req.user.username,
        avatar: req.user.avatar,
      },
      content: content || "",
      mediaUrl: result.secure_url,
      createdAt: message.createdAt,
      chat: chatId,
    });

    res.json(message);
  } catch (error) {
    console.error("Error in sendImage:", error);
    res.status(500).json({ message: "Error sending image", error });
  }
};

// Send a document in group chat
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
      stream.end(req.file.buffer);
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

    req.io.to(groupId).emit("newGroupMessage", {
      _id: message._id,
      sender: userId,
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

// Delete a message in private chat
export const deleteMessage = async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Check if the user is the sender
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    req.io.to(chatId).emit("deleteMessage", messageId);
    // Delete the message
    await message.deleteOne();

    // Remove message reference from chat
    const chat = await Chat.findById(chatId);
    if (chat) {
      chat.messages.pull(messageId);
      await chat.save();
    }

    // Emit event after successful deletion

    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ message: "Error deleting message", error });
  }
};

// Get list of online friends with recent messages
export const getOnlineFriends = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).populate(
      "friends",
      "username avatar"
    );

    // Ensure that the user and friends are correctly populated
    if (!user || !user.friends) {
      return res.status(404).json({ message: "User or friends not found" });
    }

    // Check if the friends are online using the socket.io map
    const onlineFriends = user.friends.filter((friend) =>
      req.io.sockets.sockets.has(friend._id.toString())
    );

    const friendsWithMessages = await Promise.all(
      onlineFriends.map(async (friend) => {
        const chat = await Chat.findOne({
          participants: { $all: [userId, friend._id] },
        }).populate("messages");

        return {
          friend,
          recentMessages: chat ? chat.messages.slice(-5) : [],
        };
      })
    );

    res.json(friendsWithMessages);
  } catch (error) {
    res.status(500).json({ message: "Error fetching online friends", error });
  }
};

// Get all friends of the user with recent messages and online status
export const getUserFriends = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find user and populate friends
    const user = await User.findById(userId).populate(
      "friends",
      "username avatar"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get online users from the socket instance
    const onlineUsers = Array.from(req.io.sockets.adapter.sids.keys());

    const friendsWithStatus = await Promise.all(
      (user.friends || []).map(async (friend) => {
        // Find chat between user and friend
        const chat = await Chat.findOne({
          participants: { $all: [userId, friend._id] },
        }).populate("messages");

        // Check if friend is online
        const isOnline = onlineUsers.some((socketId) => {
          const socket = req.io.sockets.sockets.get(socketId);
          return socket && socket.userId === friend._id.toString();
        });

        return {
          friend,
          chatId: chat ? chat._id : null, // Include chatId
          recentMessages: chat ? chat.messages.slice(-5) : [],
          isOnline,
        };
      })
    );

    return res.json(friendsWithStatus);
  } catch (error) {
    console.error("Error in getUserFriends:", error);
    res.status(500).json({
      message: "Error fetching friends",
      error: error.message,
    });
  }
};
