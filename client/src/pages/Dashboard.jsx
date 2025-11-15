import React, { useEffect, useState } from 'react';
import "../styles/Dashboard.css";
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import Attendance from './Attendance';

const Dashboard = () => {
  const [token, setToken] = useState(JSON.parse(localStorage.getItem("auth")) || "");
  const [data, setData] = useState({});
  const [currentPage, setCurrentPage] = useState("home");
  const navigate = useNavigate();

  const fetchLuckyNumber = async () => {
    let axiosConfig = {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    try {
      const response = await axios.get("/api/v1/dashboard", axiosConfig);
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

      {/* ====================== NAVIGATION BAR ====================== */}
      <nav className="dashboard-nav">
        <button 
          onClick={() => setCurrentPage("home")}
          className={`nav-item ${currentPage === "home" ? 'active' : ''}`}
          style={{
            background: currentPage === "home" ? '#334155' : 'transparent',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Home
        </button>
        <button 
          onClick={() => setCurrentPage("attendance")}
          className={`nav-item ${currentPage === "attendance" ? 'active' : ''}`}
          style={{
            background: currentPage === "attendance" ? '#334155' : 'transparent',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Attendance
        </button>
        <Link to="/logout" className="nav-item nav-logout">Logout</Link>
      </nav>
      {/* ============================================================ */}

      {/* RENDER CURRENT PAGE */}
      {currentPage === "home" ? (
        <div className="dashboard-content">
          <h1>Dashboard</h1>
          <p>Hi {data.msg}! {data.luckyNumber}</p>
        </div>
      ) : (
        <Attendance />
      )}
    </div>
  );
};

export default Dashboard;
