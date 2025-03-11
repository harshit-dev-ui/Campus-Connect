import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DoubtsPage from "./pages/Doubt";
import QuestionDetail from "./pages/QuestionDetail";
import MentorApplicationForm from './components/MentorApplicationForm';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import ForwardAdmin from './components/ForwardAdmin';
import Applications from './components/Applications';
import { RecoilRoot } from 'recoil';
import MentorList from './components/MentorList';
import Chat from './components/Chat';
import WebSocketProvider from './components/WebSocketProvider';
import MentorChatList from './components/MentorChatList';
import Room from "./pages/Room";
import StudyRoom from "./pages/StudyRoom";

// Protected Route Component
const ProtectedAdminRoute = ({ children }) => {
  const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));

  if (!adminInfo) {
    return <Navigate to="/admin/login" />;
  }

  return children;
};

const App = () => {
  return (
    <RecoilRoot>
      <WebSocketProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Signup />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/doubts" element={<DoubtsPage />} />
            <Route path="/questions/:questionId" element={<QuestionDetail />} />
            <Route path="/mentor-application" element={<MentorApplicationForm />} />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedAdminRoute>
                  <AdminDashboard />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/applications"
              element={
                <ProtectedAdminRoute>
                  <Applications />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/forward-admin"
              element={
                <ProtectedAdminRoute>
                  <ForwardAdmin />
                </ProtectedAdminRoute>
              }
            />
            <Route path="/mentors" element={<MentorList />} />
            <Route path="/chat/:mentorId" element={<Chat />} />
            <Route path="/mentor/chats" element={<MentorChatList />} />
          </Routes>
        </Router>
      </WebSocketProvider>
    </RecoilRoot>
  );
};

export default App;
