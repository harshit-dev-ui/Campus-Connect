import express from "express";
// import helmet from "helmet"; // Added for security headers
import bodyParser from "body-parser";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import collegeRoutes from "./routes/collegeRoutes.js";
import mentorRoutes from "./routes/mentorRoutes.js";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import questionRoutes from "./routes/question.routes.js";
import answerRoutes from "./routes/answer.routes.js";
import roomRoutes from "./routes/room.routes.js";
import marketplaceRoutes from "./routes/marketplace.routes.js";
import marketChatRoutes from "./routes/chat.marketplace.routes.js";
import userRoutes from "./routes/user.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import chatRoutes from "./routes/chat.personal.routes.js"; // Import chat routes
import { Server } from "socket.io";
import http from "http";
import adminRoutes from "./routes/adminRoutes.js";
import chatMentorRoutes from "./routes/chat.routes.js";
import meetingRoutes from "./routes/meeting.routes.js";
import Meeting from "./models/meeting.model.js";
import User from "./models/user.model.js";
import { sendMeetingLinkEmail } from "./utils/emailUtils.js";
import StudyRoom from "./models/room.model.js";
import groupRoutes from "./routes/groupChat.routes.js";
import cloudinary from "./config/cloudinary.js"; 
import { log } from "console";
dotenv.config();
const app = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: "https://hubster.onrender.com", // Allows requests from any origin
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true, // Allows cookies and authentication headers
  },
});



// Add timer management
const activeTimers = new Map(); // Track active timers per room
const users = new Map(); // Track online users
const whiteboardState = {}; // Store whiteboard lines for each room

// Middleware
app.use(cookieParser());
app.use(express.json());

// Configure CORS
app.use(
  cors()
);

// Make io and cloudinary available throughout the app
app.set("io", io);
app.set("cloudinary", cloudinary); // Add this line

// Inject io and cloudinary into requests
app.use((req, res, next) => {
  req.io = io;
  req.cloudinary = cloudinary; // Add this line
  next();
});

// Socket.io Events
io.on("connection", (socket) => {
  // console.log("User connected:", socket.id);
  console.log("User connected:", socket.id);
  // Handle user online status
  socket.on("user-online", (userId) => {
    users.set(userId, socket.id);
    socket.userId = userId; // Store userId in socket object
    io.emit("online-users", Array.from(users.keys()));
  });

  socket.on("disconnect", () => {
    log("User disconnected:", socket.id);
    if (socket.userId) {
      users.delete(socket.userId);
      io.emit("online-users", Array.from(users.keys()));
    }
  });



  // Study Room Events
  const handleStudyRoomEvents = () => {
    socket.on("joinRoom", async (roomId) => {
      try {
        socket.join(roomId);
        console.log(`Socket ${socket.id} joined room ${roomId}`);

        // Send current room state
        const room = await StudyRoom.findOne({ roomId });
        if (room) {
          socket.emit("timerUpdated", room.timer);
          socket.emit("participantsUpdated", room.participants);
          socket.emit("tasksUpdated", room.tasks);
          socket.emit("messagesUpdated", room.chatMessages);
        }
      } catch (err) {
        console.error("Join room error:", err);
      }
    });

    socket.on("setDuration", async ({ roomId, duration, mode }) => {
      try {
        const room = await StudyRoom.findOne({ roomId });
        if (!room) return;

        room.timer.duration = duration;
        if (!room.timer.isRunning) {
          room.timer.timeLeft = duration;
        }
        room.timer.mode = mode;

        await room.save();
        io.to(roomId).emit("timerUpdated", room.timer);
      } catch (err) {
        console.error("Duration update error:", err);
      }
    });

    // Listen for whiteboardLine events and update whiteboard state
  socket.on("whiteboardLine", ({ roomId, line, sender }) => {
    if (!whiteboardState[roomId]) whiteboardState[roomId] = [];
    whiteboardState[roomId].push(line);
    io.in(roomId).emit("whiteboardLine", { roomId, line, sender });
  });

  // When a client requests whiteboard data
  socket.on("requestWhiteboardData", ({ roomId }) => {
    if (whiteboardState[roomId]) {
      socket.emit("whiteboardData", { roomId, lines: whiteboardState[roomId] });
    }
  });


    // startTimer handler
    socket.on("startTimer", async (roomId) => {
      try {
        if (activeTimers.has(roomId)) return;

        const room = await StudyRoom.findOne({ roomId });
        if (!room || room.timer.timeLeft <= 0) return;

        // Only reset timeLeft if timer is expired
        if (room.timer.timeLeft <= 0) {
          room.timer.timeLeft = room.timer.duration;
        }

        room.timer.isRunning = true;
        await room.save();

        const interval = setInterval(async () => {
          const updatedRoom = await StudyRoom.findOne({ roomId });
          if (!updatedRoom) {
            clearInterval(interval);
            activeTimers.delete(roomId);
            return;
          }

          updatedRoom.timer.timeLeft--;

          if (updatedRoom.timer.timeLeft <= 0) {
            updatedRoom.timer.isRunning = false;
            clearInterval(interval);
            activeTimers.delete(roomId);
          }

          await updatedRoom.save();
          io.to(roomId).emit("timerUpdated", updatedRoom.timer);
        }, 1000);

        activeTimers.set(roomId, interval);
        io.to(roomId).emit("timerUpdated", room.timer);
      } catch (err) {
        console.error("Start timer error:", err);
      }
    });

    // Add this to your socket.io server code
    socket.on("stopTimer", async (roomId) => {
      try {
        const room = await StudyRoom.findOne({ roomId });
        if (!room) return;

        // Clear existing timer
        if (activeTimers.has(roomId)) {
          clearInterval(activeTimers.get(roomId));
          activeTimers.delete(roomId);
        }

        room.timer.isRunning = false;
        await room.save();

        io.to(roomId).emit("timerUpdated", room.timer);
      } catch (err) {
        console.error("Stop timer error:", err);
      }
    });

    socket.on("toggleMode", async ({ roomId, mode, duration }) => {
      try {
        const room = await StudyRoom.findOne({ roomId });
        if (!room) return;

        room.timer.isRunning = false;
        room.timer.mode = mode;
        room.timer.duration = duration;
        room.timer.timeLeft = duration;

        await room.save();
        io.to(roomId).emit("timerUpdated", room.timer);
      } catch (err) {
        console.error("Mode toggle error:", err);
      }
    });
  };

  // Chat Events for direct messaging between buyer and seller
  const handleMarketChatEvents = () => {
    socket.on("joinChat", ({ buyerId, sellerId }) => {
      // Create a consistent room name by sorting the IDs
      const chatRoom = [buyerId, sellerId].sort().join("-");
      socket.join(chatRoom);
      console.log(`User joined chat: ${chatRoom}`);
    });

    socket.on("join", (userId) => {
      socket.join(userId); // User joins their own room (userId)
      console.log(`User ${userId} joined their personal room`);
    });

    socket.on("sendMessage", (message) => {
      const { senderId, receiverId } = message;
      // Use the same room naming strategy
      const chatRoom = [senderId, receiverId].sort().join("-");
      io.to(chatRoom).emit("receiveMessage", message);
    });
  };

  // Question/Answer Events (existing functionality)
  const handleQnAEvents = () => {
    socket.on("join_question", (questionId) => {
      socket.join(`question_${questionId}`);
    });

    socket.on("leave_question", (questionId) => {
      socket.leave(`question_${questionId}`);
    });

    socket.on("new_question", (question) => {
      io.emit("question_added", question);
    });

    socket.on("new_answer", (answer) => {
      io.to(`question_${answer.question}`).emit("answer_added", answer);
    });

    socket.on("new_reply", ({ answerId, reply }) => {
      io.to(`question_${reply.question}`).emit("reply_added", {
        answerId,
        reply,
      });
    });
  };

  //Chat features
  const handleChatEvents = () => {
    // Join personal chat rooms
    socket.on("joinChat", (chatId) => {
      socket.join(chatId);
      // console.log(`User ${socket.userId} joined chat: ${chatId}`);
    });

    // Join group chat rooms
    socket.on("joinGroupRoom", (groupId) => {
      socket.join(groupId);
      // console.log(`User ${socket.userId} joined group: ${groupId}`);
    });

    // Handle personal chat messages
    socket.on("sendMessage", async ({ chatId, message }) => {
      try {
        // Broadcast the message to all users in the chat room except sender
        socket.to(chatId).emit("newMessage", {
          _id: message._id,
          sender: message.sender,
          content: message.content,
          mediaUrl: message.mediaUrl,
          createdAt: message.createdAt,
          chat: chatId,
        });
      } catch (error) {
        console.error("Error broadcasting message:", error);
      }
    });

    // Handle group chat messages
    socket.on("sendGroupMessage", async ({ groupId, message }) => {
      try {
        // Broadcast the message to all users in the group room except sender

        socket.to(groupId).emit("newGroupMessage", {
          _id: message._id,
          sender: message.sender,
          content: message.content,
          mediaUrl: message.mediaUrl,
          createdAt: message.createdAt,
          group: groupId,
        });
      } catch (error) {
        console.error("Error broadcasting group message:", error);
      }
    });

    // Leave chat room when user switches chat
    socket.on("leaveChat", (chatId) => {
      socket.leave(chatId);
      console.log(`User ${socket.userId} left chat: ${chatId}`);
    });

    // Handle typing status
    socket.on("typing", ({ chatId, userId }) => {
      socket.to(chatId).emit("userTyping", userId);
    });

    socket.on("stopTyping", ({ chatId, userId }) => {
      socket.to(chatId).emit("userStoppedTyping", userId);
    });
  };

  handleStudyRoomEvents();
  handleQnAEvents();
  handleChatEvents();
  handleMarketChatEvents();

  socket.on("disconnect", () => {
    // console.log("User disconnected:", socket.id);
    // Cleanup any room-specific timers if needed
  });
});

app.use("/auth", authRoutes);
app.use("/college", collegeRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/answers", answerRoutes);
app.use("/api/mentors", mentorRoutes);
app.use("/api/mentor", mentorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chat", chatMentorRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chatMarket", marketChatRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/groups", groupRoutes);
connectDB();
// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

//send email 24 hrs after

let enter = true;

setInterval(async () => {
  console.log("enter ing");

  if (enter) {
    let meetings = await Meeting.find({ status: "approved" });
    meetings.forEach(async (meeting) => {
      ``;
      let now = new Date();
      let meetingDate = new Date(meeting.date);
      console.log(meetingDate.getDate());

      if (meetingDate.getDate() == now.getDate()) {
        let senderid = meeting.senderId;
        let receiverid = meeting.receiverId;
        let senderEmail = await User.findById(senderid).select("email");
        let receiverEmail = await User.findById(receiverid).select("email");

        let message = JSON.stringify(meeting);
        let arr = new TextEncoder().encode(message);
        let roomCode = Buffer.from(arr).toString("base64");

        let senderMeetingLink = roomCode;
        let receiverMeetingLink = roomCode;
        await sendMeetingLinkEmail(senderMeetingLink, senderEmail);
        await sendMeetingLinkEmail(receiverMeetingLink, receiverEmail);
      }
    });
  }
}, 24 * 60 * 60 * 1000);
