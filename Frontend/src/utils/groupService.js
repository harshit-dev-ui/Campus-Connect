import axios from "axios";
import { io } from "socket.io-client";

const apiClient = axios.create({
  baseURL: "https://campus-connect-1-7rgs.onrender.com/api", // Backend URL
  withCredentials: true, // Include cookies in requests
});

export const socket = io("https://campus-connect-1-7rgs.onrender.com/", {
  withCredentials: true,
});

// API Handlers
export const createGroup = async (groupData) => {
  try {
    const response = await apiClient.post("/groups/create", groupData);
    return response.data;
  } catch (error) {
    console.error("Error creating group:", error);
    throw error;
  }
};

export const getGroupsByCollege = async () => {
  try {
    const response = await apiClient.get("/groups");
    return response.data;
  } catch (error) {
    console.error("Error fetching groups:", error);
    throw error;
  }
};

export const getUserGroups = async () => {
  try {
    const response = await apiClient.get("/groups/user");
    return response.data;
  } catch (error) {
    console.error("Error fetching user groups:", error);
    throw error;
  }
};

export const searchPublicGroups = async (query = "", tags = "") => {
  try {
    const searchParams = new URLSearchParams();
    if (query) searchParams.append("query", query);
    if (tags) searchParams.append("tags", tags);

    const response = await apiClient.get(
      `/groups/search?${searchParams.toString()}`
    );
    return response.data;
  } catch (error) {
    console.error("Error searching public groups:", error);
    throw error;
  }
};

export const joinPublicGroup = async (groupId) => {
  try {
    const response = await apiClient.post(`/groups/join/${groupId}`);
    return response.data;
  } catch (error) {
    console.error("Error joining public group:", error);
    throw error;
  }
};

export const handleGroupRequest = async (groupId) => {
  try {
    const response = await apiClient.post(`/groups/request/${groupId}`);
    return response.data;
  } catch (error) {
    console.error("Error handling group request:", error);
    throw error;
  }
};

export const postAnnouncement = async (groupId, announcementData) => {
  try {
    const response = await apiClient.post(
      `/groups/announcement/${groupId}`,
      announcementData
    );
    return response.data;
  } catch (error) {
    console.error("Error posting announcement:", error);
    throw error;
  }
};

export const pinMessage = async (groupId, messageId) => {
  try {
    const response = await apiClient.post(`/groups/pin/${groupId}`, {
      messageId,
    });
    return response.data;
  } catch (error) {
    console.error("Error pinning message:", error);
    throw error;
  }
};

export const unpinMessage = async (groupId, messageId) => {
  try {
    const response = await apiClient.post(`/groups/unpin/${groupId}`, {
      messageId,
    });
    return response.data;
  } catch (error) {
    console.error("Error unpinning message:", error);
    throw error;
  }
};

export const getPinnedMessages = async (groupId) => {
  try {
    const response = await apiClient.get(`/groups/pinned/${groupId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching pinned messages:", error);
    throw error;
  }
};

export const deleteGroup = async (groupId) => {
  try {
    const response = await apiClient.delete(`/groups/${groupId}`);

    return response.data;
  } catch (error) {
    console.error("Error deleting group:", error);
    throw error;
  }
};

export const addMemberToGroup = async (groupId, memberId) => {
  try {
    const response = await apiClient.post(`/groups/add-member/${groupId}`, {
      memberId,
    });
    return response.data;
  } catch (error) {
    console.error("Error adding member to group:", error);
    throw error;
  }
};

export const promoteMember = async (groupId, memberId) => {
  try {
    const response = await apiClient.post(`/groups/promote/${groupId}`, {
      memberId,
    });
    return response.data;
  } catch (error) {
    console.error("Error promoting member:", error);
    throw error;
  }
};

export const demoteMember = async (groupId, adminId) => {
  try {
    const response = await apiClient.post(`/groups/demote/${groupId}`, {
      adminId,
    });
    return response.data;
  } catch (error) {
    console.error("Error demoting member:", error);
    throw error;
  }
};

export const removeMemberFromGroup = async (groupId, memberId) => {
  try {
    const response = await apiClient.post(
      `/groups/remove-member/${groupId}/${memberId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error removing member from group:", error);
    throw error;
  }
};

export const sendGroupMessage = async (groupId, messageData) => {
  try {
    const response = await apiClient.post(
      `/groups/message/${groupId}`,
      messageData
    );
    return response.data;
  } catch (error) {
    console.error("Error sending group message:", error);
    throw error;
  }
};

export const deleteGroupMessage = async (groupId, messageId) => {
  try {
    const response = await apiClient.delete(
      `/groups/message/${groupId}/${messageId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error deleting group message:", error);
    throw error;
  }
};

export const sendGroupDocument = async (groupId, formData) => {
  try {
    const response = await apiClient.post(
      `/groups/message/document/${groupId}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error sending group document:", error);
    throw error;
  }
};

export const sendGroupImage = async (groupId, formData) => {
  try {
    const response = await apiClient.post(
      `/groups/message/image/${groupId}`,
      formData
    );
    return response.data;
  } catch (error) {
    console.error("Error sending group image:", error);
    throw error;
  }
};

export const getGroupChats = async (groupId) => {
  try {
    const response = await apiClient.get(`/groups/chats/${groupId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching group chats:", error);
    throw error;
  }
};

export const getGroupDetails = async (groupId) => {
  try {
    const response = await apiClient.get(`/groups/details/${groupId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching group details:", error);
    throw error;
  }
};

export const leaveGroup = async (groupId) => {
  try {
    const response = await apiClient.post(`/groups/leave/${groupId}`);
    return response.data;
  } catch (error) {
    console.error("Error leaving group:", error);
    throw error;
  }
};

export const editGroupDetails = async (groupId, updates) => {
  try {
    const response = await apiClient.put(`/groups/edit/${groupId}`, updates);
    return response.data;
  } catch (error) {
    console.error("Error editing group details:", error);
    throw error;
  }
};

export const updateGroupAvatar = async (groupId, avatarFile) => {
  try {
    const formData = new FormData();
    formData.append("file", avatarFile);

    const response = await apiClient.put(
      `/groups/avatar/${groupId}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating group avatar:", error);
    throw error;
  }
};

export const joinGroup = async (groupId) => {
  try {
    const response = await apiClient.post(`/groups/join/${groupId}`);
    return response.data;
  } catch (error) {
    console.error("Error joining group:", error);
    throw error;
  }
};

// Poll Functions
export const createPoll = async (groupId, pollData) => {
  try {
    const response = await apiClient.post(`/groups/poll/${groupId}`, pollData);
    return response.data;
  } catch (error) {
    console.error("Error creating poll:", error);
    throw error;
  }
};

export const votePoll = async (pollId, optionIndex) => {
  try {
    const response = await apiClient.post(`/groups/poll/vote/${pollId}`, {
      optionIndex,
    });
    return response.data;
  } catch (error) {
    console.error("Error voting in poll:", error);
    throw error;
  }
};

export const getGroupPolls = async (groupId) => {
  try {
    const response = await apiClient.get(`/groups/polls/${groupId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching polls:", error);
    throw error;
  }
};

// Socket Client-Side Code
export const joinGroupRoom = (groupId) => {
  // Updated to emit the correct event for group chats
  socket.emit("joinGroupRoom", groupId);
};

export const leaveGroupRoom = (groupId) => {
  // Updated to emit the correct event for leaving a group chat room
  socket.emit("leaveGroupRoom", groupId);
};

export const sendMessage = (groupId, message) => {
  socket.emit("sendMessage", { groupId, message });
};

export const onNewGroupMessage = (callback) => {
  socket.on("newGroupMessage", (message) => {
    // Transform poll message if needed
    if (message.poll) {
      message.type = "poll"; // Add type for easier handling in UI
    }
    callback(message);
  });
};

export const onDeleteGroupMessage = (callback) => {
  socket.on("deleteGroupMessage", callback);
};

// Poll Socket Event Handlers
export const onNewPoll = (callback) => {
  socket.on("newPoll", callback);
};

export const onPollUpdated = (callback) => {
  socket.on("pollUpdated", callback);
};

export const onPollExpired = (callback) => {
  socket.on("pollExpired", callback);
};

// Poll Socket Emitters
export const emitCreatePoll = (groupId, pollData) => {
  socket.emit("createPoll", { groupId, pollData });
};

export const emitVotePoll = (pollId, optionIndex) => {
  socket.emit("votePoll", { pollId, optionIndex });
};
