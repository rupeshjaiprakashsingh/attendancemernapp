import React, { useEffect, useState } from "react";
import "../styles/Dashboard.css";
import { Link, useNavigate, Outlet } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";

const Dashboard = () => {
  const [token, setToken] = useState(
    JSON.parse(localStorage.getItem("auth")) || ""
  );
  const [data, setData] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = useNavigate();

  const fetchLuckyNumber = async () => {
    try {
      const response = await axios.get("/api/v1/dashboard", {
        headers: { Authorization: `Bearer ${token}` }
      });

      setData({
        msg: response.data.msg,
        luckyNumber: response.data.secret
      });
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

        {/* LEFT side + hamburger */}
        <div className="nav-left">
          <div className="nav-logo">Attendance</div>

          {/* Mobile Toggle */}
          <button
            className="nav-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>
        </div>

        {/* MENU ITEMS */}
        <ul className={`nav-menu ${menuOpen ? "open" : ""}`}>

          <li>
            <Link
              to="/dashboard"
              className="nav-item"
              onClick={() => setMenuOpen(false)}
            >
              Home
            </Link>
          </li>

          <li>
            <Link
              to="/dashboard/attendance"
              className="nav-item"
              onClick={() => setMenuOpen(false)}
            >
              Attendance
            </Link>
          </li>

          <li>
            <Link
              to="/dashboard/attendance-list"
              className="nav-item"
              onClick={() => setMenuOpen(false)}
            >
              Attendance List
            </Link>
          </li>

          {/* Logout (mobile view inside menu) */}
          <li className="mobile-logout">
            <Link
              to="/logout"
              className="nav-item nav-logout"
              onClick={() => setMenuOpen(false)}
            >
              Logout
            </Link>
          </li>
        </ul>

        {/* Desktop Logout */}
        <Link to="/logout" className="nav-item nav-logout desktop-logout">
          Logout
        </Link>
      </nav>

      {/* Render nested components */}
      <div className="dashboard-content">
        <Outlet />
      </div>
    </div>
  );
};

export default Dashboard;
