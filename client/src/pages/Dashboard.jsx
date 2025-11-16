import React, { useEffect, useState } from "react";
import "../styles/Dashboard.css";
import { Link, useNavigate, Outlet } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";

const Dashboard = () => {
  const [token, setToken] = useState(JSON.parse(localStorage.getItem("auth")) || "");
  const [data, setData] = useState({});
  const navigate = useNavigate();

  const fetchLuckyNumber = async () => {
    try {
      const response = await axios.get("/api/v1/dashboard", {
        headers: { Authorization: `Bearer ${token}` }
      });

      setData({ msg: response.data.msg, luckyNumber: response.data.secret });
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    fetchLuckyNumber();

    if (token === "") {
      navigate("/login");
      toast.warn("Please login first to access dashboard");
    }
  }, [token]);

  return (
    <div className="dashboard-main">

      {/* NAVIGATION */}
      <nav className="dashboard-nav">
        <Link
          to="/dashboard"
          className="nav-item"
        >
          Home
        </Link>

        <Link
          to="/dashboard/attendance"
          className="nav-item"
        >
          Attendance
        </Link>

        <Link
          to="/dashboard/attendance-list"
          className="nav-item"
        >
          Attendance List
        </Link>

        <Link to="/logout" className="nav-item nav-logout">
          Logout
        </Link>
      </nav>

      {/* Render nested pages here */}
      <div className="dashboard-content">
        <Outlet />
      </div>
    </div>
  );
};

export default Dashboard;
