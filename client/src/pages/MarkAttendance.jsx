// Updated Attendance Component with "Mark Attendance" button placed at the top

import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from 'react-toastify';
import "../styles/Attendance.css";

export default function Attendance() {
  const [form, setForm] = useState({
    attendanceType: "IN",
    latitude: "",
    longitude: "",
    deviceTime: new Date().toISOString(),
    deviceId: "",
    locationAccuracy: "",
    address: "",
    batteryPercentage: "",
    networkType: "",
    remarks: "",
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // Generate device ID (stored permanently)
  const generateDeviceId = () => {
    let id = localStorage.getItem("device_id");
    if (!id) {
      id = "dev-" + Math.random().toString(36).substring(2, 12);
      localStorage.setItem("device_id", id);
    }
    setForm((p) => ({ ...p, deviceId: id }));
  };

  // Fetch Battery Status
  const fetchBattery = async () => {
    try {
      if (navigator.getBattery) {
        const battery = await navigator.getBattery();
        setForm((p) => ({ ...p, batteryPercentage: Math.round(battery.level * 100) }));
      }
    } catch {}
  };

  // Fetch Network Type
  const fetchNetwork = () => {
    try {
      const type = navigator.connection?.effectiveType || "";
      setForm((p) => ({ ...p, networkType: type.toUpperCase() }));
    } catch {}
  };

  // Reverse Geocoding
  const fetchAddress = async (lat, lng) => {
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      setForm((p) => ({ ...p, address: res.data.display_name || "" }));
    } catch {}
  };

  // Fetch GPS Location
  const fetchLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = pos.coords.accuracy;

        setForm((p) => ({ ...p, latitude: lat, longitude: lng, locationAccuracy: acc }));

        fetchAddress(lat, lng);
      },
      (err) => {
        alert("Unable to fetch location");
      },
      { enableHighAccuracy: true }
    );
  };

  // On component mount
  useEffect(() => {
    generateDeviceId();
    fetchBattery();
    fetchNetwork();
    fetchLocation();
  }, []);

  const token =
    JSON.parse(localStorage.getItem("auth")) || localStorage.getItem("token") || "";

  // Submit Attendance
  const markAttendance = async () => {
    setLoading(true);
    setMsg("");

    try {
      const res = await axios.post(
        "/api/v1/attendance/mark",
        { ...form },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const message = res.data.message || "Marked successfully";
      setMsg(message);
      toast.success(message);
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      setMsg(errMsg);
      toast.error(errMsg);
    }

    setLoading(false);
  };

  return (
    <div className="attendance-container">
     
          <div className="attendance-buttons">
            <button
              type="button"
              className="attendance-btn"
              disabled={loading}
              onClick={markAttendance}
            >
              {loading ? "Submitting..." : "Mark Attendance"}
            </button>
          </div>

      <div className="attendance-content">
        <h2>Mark Attendance</h2>
        <p>Record your check-in/check-out</p>

        <form className="attendance-form">
          <div className="form-group">
            <label>Attendance Type</label>
            <select
              value={form.attendanceType}
              onChange={(e) => setForm({ ...form, attendanceType: e.target.value })}
            >
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
            </select>
          </div>

          <div className="form-group">
            <label>Latitude</label>
            <input type="text" value={form.latitude} readOnly />
          </div>

          <div className="form-group">
            <label>Longitude</label>
            <input type="text" value={form.longitude} readOnly />
          </div>

          <div className="form-group">
            <label>Device Time</label>
            <input type="text" value={form.deviceTime} readOnly />
          </div>

          <div className="form-group">
            <label>Address</label>
            <textarea value={form.address} readOnly />
          </div>

          <div className="form-group">
            <label>Accuracy (meters)</label>
            <input type="text" value={form.locationAccuracy} readOnly />
          </div>

          <div className="form-group">
            <label>Battery (%)</label>
            <input type="text" value={form.batteryPercentage} readOnly />
          </div>

          <div className="form-group">
            <label>Network Type</label>
            <input type="text" value={form.networkType} readOnly />
          </div>

          <div className="form-group">
            <label>Device ID</label>
            <input type="text" value={form.deviceId} readOnly />
          </div>

          <div className="form-group">
            <label>Remarks</label>
            <input
              type="text"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="Optional remarks"
            />
          </div>

          <div className="attendance-buttons">
            <button
              type="button"
              className="attendance-btn"
              disabled={loading}
              onClick={markAttendance}
            >
              {loading ? "Submitting..." : "Mark Attendance"}
            </button>
          </div>
        </form>

       
      </div>
    </div>
  );
}
