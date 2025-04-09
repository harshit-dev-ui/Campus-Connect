import Header from "../components/Header.jsx";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import CalanderView from "../components/CalanderView";
const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {

    const fetchDashboard = async () => {
      try {
        const response = await axios.get("https://campus-connect-1-7rgs.onrender.com/auth/dashboard", {
          withCredentials: true,
        });
        console.log(response.data);
        setUser(response.data.user);
        setLoading(false);
      } catch (err) {
        setLoading(false);
        if (err.response?.status ==401 || err.response?.status===403) {
          setError("Unauthorized: Please log in");
          navigate("/login");
        } else {
          setError("An error occurred while loading the dashboard");
        }
      }
    };

    fetchDashboard();
  }, [navigate]);

  if (loading) {
    return <div className="text-center text-gray-700">Loading...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">{error}</div>;
  }

  return (

    <CalanderView user={user} />

  );
};

export default Dashboard;
