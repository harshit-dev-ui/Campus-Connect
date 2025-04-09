import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import { useSelector } from "react-redux";
import WhiteboardKonva from "./WhiteboardKonva";
import { io } from "socket.io-client";

const socket = io("https://campus-connect-1-7rgs.onrender.com/", {
  withCredentials: true,
  transports: ["websocket", "polling"],
});
axios.defaults.baseURL = "https://campus-connect-1-7rgs.onrender.com/";
axios.defaults.withCredentials = true;

socket.on("connect", () => {
  console.log("Socket connected:", socket.id);
});
socket.on("connect_error", (err) => {
  console.error("Socket connection error:", err);
});

const StudyRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const currentUserId = user?._id;
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [tasks, setTasks] = useState([]);
  const [task, setTask] = useState("");
  const [timer, setTimer] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [duration, setDuration] = useState(25);
  const [mode, setMode] = useState("work");
  const [showCopied, setShowCopied] = useState(false);
  // State for switching between Chat and Whiteboard views
  const [activeTab, setActiveTab] = useState("chat");

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const progress = ((timer / (duration * 60)) * circumference).toFixed(2);

  // Auto-scroll chat when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (showCopied) {
      const timerId = setTimeout(() => setShowCopied(false), 2000);
      return () => clearTimeout(timerId);
    }
  }, [showCopied]);

  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        const res = await axios.get(`/api/rooms/${roomId}`);
        const room = res.data;
        setParticipants(room.participants || []);
        setTasks(room.tasks || []);
        setMessages(room.chatMessages || []);
        setTimer(room.timer?.timeLeft || 25 * 60);
        setIsRunning(room.timer?.isRunning || false);
        setDuration((room.timer?.duration || 25 * 60) / 60);
        setMode(room.timer?.mode || "work");
      } catch (err) {
        console.error("Error fetching room data:", err);
        toast.error("Failed to fetch room data");
        navigate("/room", { replace: true });
      }
    };

    console.log("Emitting joinRoom event for room:", roomId);
    socket.emit("joinRoom", roomId);
    fetchRoomData();

    // Socket event listeners
    socket.on("newMessage", (msg) => {
      console.log("Received new message:", msg);
      setMessages((prev) => [...prev, msg]);
    });
    socket.on("taskAdded", (newTask) => setTasks((prev) => [...prev, newTask]));
    socket.on("taskDeleted", (taskId) =>
      setTasks((prev) => prev.filter((t) => t._id !== taskId))
    );
    socket.on("taskUpdated", (updatedTask) =>
      setTasks((prev) =>
        prev.map((t) => (t._id === updatedTask._id ? updatedTask : t))
      )
    );
    socket.on("timerUpdated", (timerData) => {
      setTimer(timerData.timeLeft);
      setIsRunning(timerData.isRunning);
      setDuration(timerData.duration / 60);
      setMode(timerData.mode);
    });
    socket.on("participantsUpdated", (updatedParticipants) => {
      setParticipants(updatedParticipants);
    });

    return () => {
      console.log("Leaving room:", roomId);
      socket.emit("leaveRoom", roomId);
      socket.off("newMessage");
      socket.off("taskAdded");
      socket.off("taskDeleted");
      socket.off("taskUpdated");
      socket.off("timerUpdated");
      socket.off("participantsUpdated");
      socket.off("whiteboardLine");
    };
  }, [roomId, navigate]);

  // Leave room on component unmount
  useEffect(() => {
    return () => {
      try {
        leaveRoom()
      } catch (err) {
        console.log(err);
      }
    }
  },[])


  const handleDurationChange = (minutes) => {
    if (!isRunning && minutes > 0 && minutes <= 120) {
      setDuration(minutes);
      socket.emit("setDuration", { roomId, duration: minutes * 60, mode });
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    try {
      await axios.post(`/api/rooms/${roomId}/chat`, { message });
      setMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Failed to send message");
    }
  };

  const toggleTimer = () => {
    if (isRunning) {
      socket.emit("stopTimer", roomId);
    } else {
      socket.emit("startTimer", roomId);
    }
  };

  const toggleMode = () => {
    const newMode = mode === "work" ? "break" : "work";
    socket.emit("stopTimer", roomId);
    socket.emit("toggleMode", {
      roomId,
      mode: newMode,
      duration: newMode === "work" ? 25 * 60 : 5 * 60,
    });
  };

  const addTask = async () => {
    if (!task.trim()) return;
    try {
      await axios.post(`/api/rooms/${roomId}/task`, { title: task });
      setTask("");
    } catch (err) {
      console.error("Error adding task:", err);
      toast.error("Failed to add task");
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await axios.delete(`/api/rooms/${roomId}/task/${taskId}`);
    } catch (err) {
      console.error("Error deleting task:", err);
      toast.error("Failed to delete task");
    }
  };

  const toggleTask = async (taskId, completed) => {
    try {
      await axios.post(`/api/rooms/${roomId}/task/${taskId}`, { taskId, completed });
    } catch (err) {
      console.error("Error toggling task:", err);
      toast.error("Failed to update task");
    }
  };

  const leaveRoom = async () => {
    try {
      await axios.post(`/api/rooms/${roomId}/leave`);
      navigate("/dashboard");
    } catch (err) {
      console.error("Error leaving room:", err);
    }
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setShowCopied(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#121212] via-[#1e1e1e] to-[#000] text-gray-100 antialiased">
      <Toaster
        position="top-right"
        containerClassName="z-50"
        toastOptions={{
          className: "bg-gray-800 text-gray-200 border border-gray-700 shadow-2xl",
          success: { className: "bg-green-900 text-green-100" },
          error: { className: "bg-red-900 text-red-100" },
        }}
      />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Left Column - Timer, Participants & Room Actions */}
        <div className="grid md:grid-cols-3 gap-8 items-stretch">
          <div className="md:col-span-1 space-y-6">
            <div className="bg-gray-800/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
              <div className="relative z-10">
                <h2
                  className={`text-3xl font-bold text-center mb-4 ${mode === "work" ? "text-blue-300 glow-blue" : "text-green-300 glow-green"
                    }`}
                >
                  {mode === "work" ? "Focus Time" : "Break Time"}
                </h2>
                <div className="relative w-48 h-48 mx-auto">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                    <circle
                      cx="100"
                      cy="100"
                      r={radius}
                      className="stroke-current text-gray-700/50"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r={radius}
                      className={`stroke-current ${mode === "work" ? "text-blue-500" : "text-green-500"}`}
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference - progress}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-5xl font-mono font-bold text-gray-100 drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                      {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, "0")}
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-2 justify-center">
                  {(mode === "work" ? [25, 30, 45, 60] : [5, 15]).map((min) => (
                    <button
                      key={min}
                      onClick={() => handleDurationChange(min)}
                      className={`px-4 py-2 rounded-full transition-all duration-300 ${duration === min
                          ? "bg-blue-600 text-white scale-105 glow-blue"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        } ${isRunning ? "opacity-50 cursor-not-allowed" : ""}`}
                      disabled={isRunning}
                    >
                      {min}m
                    </button>
                  ))}
                </div>
                <div className="mt-6 flex justify-center space-x-4">
                  <button
                    className={`px-6 py-3 rounded-full font-bold uppercase tracking-wide transition-all duration-300 ${isRunning ? "bg-red-600 hover:bg-red-500 glow-red" : "bg-green-600 hover:bg-green-500 glow-green"
                      }`}
                    onClick={toggleTimer}
                  >
                    {isRunning ? "Stop" : "Start"}
                  </button>
                  <button
                    className="px-6 py-3 bg-purple-600 rounded-full hover:bg-purple-500 glow-purple uppercase font-bold tracking-wide"
                    onClick={toggleMode}
                  >
                    {mode === "work" ? "Break" : "Work"}
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-gray-800/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-semibold">Participants</h2>
                <div className="relative">
                  <button onClick={copyRoomId} className="px-3 py-1 bg-gray-600 rounded hover:bg-gray-500 text-sm">
                    Copy Room ID
                  </button>
                  {showCopied && (
                    <span className="absolute -top-8 right-0 bg-gray-800 px-2 py-1 rounded text-sm">
                      Copied!
                    </span>
                  )}
                </div>
              </div>
              {participants.length > 0 ? (
                <ul className="space-y-2">
                  {participants.map((p) => (
                    <li key={p._id || p.userId} className="flex items-center gap-2 text-gray-200">
                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                      {p.username}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400 text-center mt-2">No participants yet</p>
              )}
            </div>
            <div className="flex gap-10 justify-center items-center">
              <button onClick={leaveRoom} className="text-red-400 hover:text-red-300 font-bold">
                Leave Room
              </button>
            </div>
          </div>

          {/* Right Column - Chat / Whiteboard Container */}
          <div className="md:col-span-2 flex flex-col">
            <div className="bg-gray-800/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 shadow-2xl h-full flex flex-col">
              {/* Header with Tab Buttons */}
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setActiveTab("chat")}
                  className={`px-4 py-2 rounded-lg font-bold ${activeTab === "chat" ? "bg-blue-600 text-white shadow-lg" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                >
                  Chat
                </button>
                <button
                  onClick={() => setActiveTab("whiteboard")}
                  className={`px-4 py-2 rounded-lg font-bold ${activeTab === "whiteboard" ? "bg-indigo-600 text-white shadow-lg" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                >
                  Whiteboard
                </button>
              </div>

              {/* Content area with equalized height */}
              <div className="flex-1 overflow-y-auto mt-4">
                {activeTab === "whiteboard" ? (
                  <div className="h-full">
                    <WhiteboardKonva roomId={roomId} socket={socket} />
                  </div>
                ) : (
                  <div className="flex flex-col h-full">
                    <div className="border border-gray-600 rounded-md p-4 flex-1 overflow-y-auto">
                      {messages.map((msg) => {
                        const isMyMessage = msg.sender?._id === currentUserId;
                        return (
                          <div
                            key={msg._id || msg.timestamp}
                            className={`mb-3 p-2 rounded-lg w-fit max-w-[90%] ${isMyMessage ? "bg-blue-600 ml-auto text-right" : "bg-gray-700 mr-auto text-left"
                              }`}
                          >
                            <p className="text-xs font-medium text-white">{msg.sender?.username}</p>
                            <p className="text-sm text-white break-words">{msg.message}</p>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                    <div className="mt-4 flex">
                      <input
                        type="text"
                        className="w-full bg-gray-800 border border-gray-600 p-3 rounded-l-md focus:outline-none focus:border-blue-400"
                        placeholder="Type a message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                      />
                      <button
                        className="bg-blue-600 text-white px-4 rounded-r-md hover:bg-blue-500"
                        onClick={sendMessage}
                      >
                        Send
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Conditionally render Tasks segment only when Chat is selected */}
            {activeTab === "chat" && (
              <div className="mt-4">
                <div className="bg-gray-800/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 shadow-2xl">
                  <h2 className="text-2xl font-semibold mb-4">Tasks</h2>
                  <div className="grid grid-cols-1 gap-3">
                    {tasks.map((t) => (
                      <div
                        key={t._id}
                        className={`p-3 rounded-lg flex justify-between items-center ${t.completed ? "bg-gray-700" : "bg-gray-700 border border-gray-600"
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={t.completed}
                            onChange={() => toggleTask(t._id, t.completed)}
                            className="w-4 h-4 text-blue-400 bg-gray-800 rounded focus:ring-blue-500"
                          />
                          <span className={`${t.completed ? "text-gray-400 line-through" : "text-gray-200"}`}>
                            {t.title}
                          </span>
                        </div>
                        <button className="text-red-400 hover:text-red-300" onClick={() => deleteTask(t._id)}>
                          ❌
                        </button>
                      </div>
                    ))}
                  </div>
                  <input
                    type="text"
                    className="w-full bg-gray-800 border border-gray-600 p-3 rounded mt-4 focus:outline-none focus:border-blue-400"
                    placeholder="Add a new task..."
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTask()}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyRoom;
