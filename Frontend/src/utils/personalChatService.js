import axios from "axios";
import { io } from "socket.io-client";

const apiClient = axios.create({
  baseURL: "https://campus-connect-1-7rgs.onrender.com/api", // Backend URL
  withCredentials: true, // Include cookies in requests
});

export const socket = io("https://campus-connect-1-7rgs.onrender.com/", {
  withCredentials: true,
});

// Emit user-online event when the user connects
socket.on("connect", () => {
  const userStr = localStorage.getItem("user");
  if (userStr) {
    const user = JSON.parse(userStr);
    // console.log("User connected:", user);
    if (user.id) {
      socket.emit("user-online", user.id);
    }
  }
});

// Listen for online users updates
socket.on("online-users", (onlineUsers) => {
  // console.log("Online users updated:", onlineUsers);
});

// Create a new chat
export const createChat = async (recipientId) => {
  try {
    const response = await apiClient.post("/chats", { recipientId });
    return response.data;
  } catch (error) {
    console.error("Error creating chat:", error);
    throw error;
  }
};

// Get all chats of the user
export const getUserChats = async () => {
  try {
    const response = await apiClient.get("/chats");
    return response.data;
  } catch (error) {
    console.error("Error fetching chats:", error);
    throw error;
  }
};

// Modified sendMessage function
export const sendMessage = async (chatId, content) => {
  try {
    const response = await apiClient.post(`/chats/message/${chatId}`, {
      content,
    });
    // Emit message with chat ID for room-specific broadcasting
    socket.emit("sendMessage", {
      chatId,
      message: response.data,
    });
    return response.data;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

// Delete a message in a chat
export const deleteMessage = async (chatId, messageId) => {
  try {
    const response = await apiClient.delete(
      `/chats/message/${chatId}/${messageId}`
    );
    socket.emit("deleteMessage", { chatId, messageId });
    return response.data;
  } catch (error) {
    console.error("Error deleting message:", error);
    throw error;
  }
};

// Send a document in a chat
export const sendDocument = async (chatId, file, content = "") => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    // Always send content even if empty
    formData.append("content", content);

    const response = await apiClient.post(
      `/chats/document/${chatId}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error sending document:", error);
    throw error;
  }
};

// Send an image in a chat
export const sendImage = async (chatId, file, content = "") => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    // Always send content even if empty
    formData.append("content", content);

    const response = await apiClient.post(`/chats/image/${chatId}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error sending image:", error);
    throw error;
  }
};

// Get list of online friends with recent messages
export const getOnlineFriends = async () => {
  try {
    const response = await apiClient.get("/chats/online-friends");
    return response.data;
  } catch (error) {
    console.error("Error fetching online friends:", error);
    throw error;
  }
};

// Get all friends of the user with recent messages and online status
export const getUserFriends = async () => {
  try {
    const response = await apiClient.get("/chats/friends");
    return response.data;
  } catch (error) {
    console.error("Error fetching friends:", error);
    throw error;
  }
};

// Listen for new messages
socket.on("newMessage", (message) => {
  console.log("New message received:", message);
  // Handle new message (e.g., update UI)
});

// Listen for new documents
socket.on("newDocument", (url) => {
  console.log("New document received:", url);
  // Handle new document (e.g., update UI)
});

// Listen for new images
socket.on("newImage", (url) => {
  console.log("New image received:", url);
  // Handle new image (e.g., update UI)
});

// Listen for online users
socket.on("user-online", (onlineUsers) => {
  console.log("Online users:", onlineUsers);
  // Handle online users (e.g., update UI)
});
