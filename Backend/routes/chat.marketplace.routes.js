import express from "express";
import mongoose from "mongoose";
import Chat from "../models/chat.marketplace.model.js";
import protectRoute from "../middlewares/protectRoute.js";

const router = express.Router();

// Fetch chat inbox for the logged-in user with unread count calculation
router.get("/inbox", protectRoute, async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const chats = await Chat.find({
      $or: [{ buyerId: userId }, { sellerId: userId }],
    })
      .populate("buyerId", "username")
      .populate("sellerId", "username")
      .sort({ updatedAt: -1 });

    // For each chat, compute last message and unread count based on last read timestamp.
    const chatSummaries = chats.map((chat) => {
      const lastMessageObj = chat.messages[chat.messages.length - 1];
      const lastMessage = lastMessageObj ? lastMessageObj.text : "No messages yet";
      let unreadCount = 0;
      if (chat.buyerId._id.toString() === userId.toString()) {
        const lastRead = chat.buyerLastRead || new Date(0);
        unreadCount = chat.messages.filter((msg) => msg.timestamp > lastRead).length;
      } else if (chat.sellerId._id.toString() === userId.toString()) {
        const lastRead = chat.sellerLastRead || new Date(0);
        unreadCount = chat.messages.filter((msg) => msg.timestamp > lastRead).length;
      }
      return {
        _id: chat._id,
        buyerId: chat.buyerId._id.toString(),
        sellerId: chat.sellerId._id.toString(),
        buyer: chat.buyerId,
        seller: chat.sellerId,
        lastMessage,
        unreadCount,
      };
    });

    res.json(chatSummaries);
  } catch (error) {
    console.error("Error fetching chat inbox:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get (or create) a chat between the logged-in user and a seller
router.get("/:sellerId", protectRoute, async (req, res) => {
  try {
    const { sellerId } = req.params;
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    let chat = await Chat.findOne({
      $or: [
        { buyerId: userId, sellerId: sellerId },
        { buyerId: sellerId, sellerId: userId },
      ],
    });

    if (!chat) {
      chat = new Chat({
        buyerId: userId,
        sellerId,
        messages: [],
        buyerLastRead: new Date(), // Buyer reading at creation time
        sellerLastRead: null,
      });
      await chat.save();
    }
    res.json(chat);
  } catch (error) {
    console.error("Error fetching chat:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Send a new message in a conversation
router.post("/send", protectRoute, async (req, res) => {
  try {
    const { chatId, senderId, receiverId, text } = req.body;
    if (!chatId || !senderId || !receiverId || !text) {
      return res.status(400).json({ error: "All fields are required" });
    }

    let chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    const newMessage = {
      senderId,
      text,
      timestamp: new Date(),
    };

    chat.messages.push(newMessage);
    
    await chat.save();
    // Emit event to notify the receiver (sender's room should be managed via socket connection)
    req.io.to(receiverId.toString()).emit("newMessage", { chatId, senderId, text });

    

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Mark the conversation as read for the logged-in user
router.put("/mark-read", protectRoute, async (req, res) => {
  try {
    const { chatId } = req.body;
    const userId = req.user?._id;
    if (!chatId || !userId) {
      return res.status(400).json({ error: "Chat ID and User ID are required" });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    if (chat.buyerId.toString() === userId.toString()) {
      chat.buyerLastRead = new Date();
    } else if (chat.sellerId.toString() === userId.toString()) {
      chat.sellerLastRead = new Date();
    } else {
      return res.status(400).json({ error: "User is not a participant in this chat" });
    }

    await chat.save();
    res.json({ success: true, chat });
  } catch (error) {
    console.error("Error marking chat as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
