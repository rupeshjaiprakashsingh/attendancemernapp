// Updated Attendance Component with "Mark Attendance" button placed at the top

import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from 'react-toastify';
import "../styles/Attendance.css";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

export default function Attendance() {
  const [form, setForm] = useState({
    attendanceType: "IN",
    latitude: "",
    longitude: "",
    // deviceTime: new Date().toISOString(), // Removed: Using Server Time
    deviceId: "",
    locationAccuracy: "",
    address: "",
    batteryPercentage: "",
    networkType: "",
    remarks: "",
  });

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyBAbFbmXPOSgsBnhuYrCtSQ7yXK_0nB--Y", // Replace with env if possible
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [todayRecord, setTodayRecord] = useState(null); // Store today's attendance

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
    } catch { }
  };

  // Fetch Network Type
  const fetchNetwork = () => {
    try {
      const type = navigator.connection?.effectiveType || "";
      setForm((p) => ({ ...p, networkType: type.toUpperCase() }));
    } catch { }
  };

  // Reverse Geocoding
  const fetchAddress = async (lat, lng) => {
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      setForm((p) => ({ ...p, address: res.data.display_name || "" }));
    } catch { }
  };

  // Fetch GPS Location (Promisified)
  const fetchLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        alert("Geolocation not supported");
        reject(new Error("Geolocation not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const acc = pos.coords.accuracy;

          setForm((p) => ({ ...p, latitude: lat, longitude: lng, locationAccuracy: acc }));
          fetchAddress(lat, lng);
          resolve({ latitude: lat, longitude: lng, locationAccuracy: acc });
        },
        (err) => {
          alert("Unable to fetch location: " + err.message);
          reject(err);
        },
        { enableHighAccuracy: true, maximumAge: 0 }
      );
    });
  };

  // Manual Refresh for Button
  const refreshLocationManual = async () => {
    const toastId = toast.loading("Fetching latest location...");
    try {
      await fetchLocation();
      toast.update(toastId, { render: "Location updated!", type: "success", isLoading: false, autoClose: 2000 });
    } catch (e) {
      toast.update(toastId, { render: "Failed to update location.", type: "error", isLoading: false, autoClose: 3000 });
    }
  };

  const token =
    JSON.parse(localStorage.getItem("auth")) || localStorage.getItem("token") || "";

  // Fetch Today's Attendance to check previous IN time
  const fetchTodayAttendance = async () => {
    if (!token) return;
    try {
      // Decode token to get userId (simple decode payload)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.id || payload._id;

      // Use local date to ensure we get the correct "today" relative to the user
      const now = new Date();
      const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

      const res = await axios.get(`/api/v1/attendance/day/${userId}?date=${todayStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data && res.data.in) {
        setTodayRecord(res.data);
      }
    } catch (error) {
      console.error("Error fetching today's attendance", error);
    }
  };

  // On component mount
  useEffect(() => {
    generateDeviceId();
    fetchBattery();
    fetchNetwork();
    fetchLocation();
    fetchTodayAttendance();
  }, []);

  // Auto-switch to OUT if already checked in
  useEffect(() => {
    if (todayRecord && todayRecord.in && !todayRecord.out) {
      setForm(p => ({ ...p, attendanceType: "OUT" }));
    }
  }, [todayRecord]);

  // Submit Attendance
  const markAttendance = async () => {
    setLoading(true);
    setMsg("");

    try {
      // Force Refresh Location before submitting
      let currentLoc = { latitude: form.latitude, longitude: form.longitude, locationAccuracy: form.locationAccuracy };
      try {
        currentLoc = await fetchLocation();
      } catch (locErr) {
        console.warn("Could not refresh location, using existing...", locErr);
        // If we strictly require fresh location, we could return here. 
        // For now, proceeding if we have at least some coords.
        if (!currentLoc.latitude) {
          setLoading(false);
          return;
        }
      }

      // 4-HOUR CHECK-OUT RESTRICTION
      if (form.attendanceType === "OUT") {
        if (todayRecord && todayRecord.in) {
          const inTime = new Date(todayRecord.in.deviceTime).getTime();
          const now = new Date().getTime();
          const diffMs = now - inTime;
          const diffHours = diffMs / (1000 * 60 * 60);

          if (diffHours < 4) {
            const remainingMinutes = Math.ceil((4 - diffHours) * 60);
            const hoursLeft = Math.floor(remainingMinutes / 60);
            const minsLeft = remainingMinutes % 60;

            const msg = `Check out is allowed after 4 hours of check in. Time remaining: ${hoursLeft}h ${minsLeft}m`;
            setMsg(msg);
            toast.error(msg);
            setLoading(false);
            return;
          }
        }
      }

      // Merge fresh location into payload
      const payload = { ...form, ...currentLoc };

      const res = await axios.post(
        "/api/v1/attendance/mark",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const message = res.data.message || "Marked successfully";
      setMsg(message);
      toast.success(message);

      // Refresh status
      fetchTodayAttendance();

    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      setMsg(errMsg);
      toast.error(errMsg);
    }

    setLoading(false);
  };

  return (
    <div className="attendance-container">

      {/* STATUS BANNER */}
      {todayRecord && todayRecord.in && !todayRecord.out && (
        <div style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #3b82f6',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{ fontSize: '24px' }}>ℹ️</div>
          <div>
            <h3 style={{ margin: '0 0 5px 0', color: '#1e40af', fontSize: '16px' }}>Already Checked In</h3>
            <p style={{ margin: 0, color: '#1e3a8a', fontSize: '14px' }}>
              You checked in at <strong>{new Date(todayRecord.in.deviceTime).toLocaleTimeString()}</strong>.
              You can check out after 4 hours.
            </p>
          </div>
        </div>
      )}

      {todayRecord && todayRecord.in && todayRecord.out && (
        <div style={{
          backgroundColor: '#ecfdf5',
          border: '1px solid #10b981',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{ fontSize: '24px' }}>✅</div>
          <div>
            <h3 style={{ margin: '0 0 5px 0', color: '#065f46', fontSize: '16px' }}>Attendance Completed</h3>
            <p style={{ margin: 0, color: '#064e3b', fontSize: '14px' }}>
              You have already checked out today. Total working hours: <strong>{todayRecord.totalHours}</strong>.
            </p>
          </div>
        </div>
      )}

      <div className="attendance-buttons">
        <button
          type="button"
          className="attendance-btn"
          disabled={loading || (todayRecord?.out)}
          onClick={markAttendance}
          style={{ opacity: todayRecord?.out ? 0.5 : 1 }}
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
            <label>Remarks</label>
            <input
              type="text"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="Optional remarks"
            />
          </div>
          <div className="form-group">
            <label>Latitude</label>
            <input type="text" value={form.latitude} readOnly />
          </div>

          <div className="form-group">
            <label>Longitude</label>
            <input type="text" value={form.longitude} readOnly />
          </div>

          {/* Map View */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontWeight: 'bold', color: '#374151' }}>Current Location</label>
            <button
              type="button"
              onClick={refreshLocationManual}
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              Update Location ↻
            </button>
          </div>
          {isLoaded && form.latitude && form.longitude && (
            <div style={{ height: "250px", width: "100%", marginBottom: "15px", borderRadius: "8px", overflow: "hidden" }}>
              <GoogleMap
                mapContainerStyle={{ width: "100%", height: "100%" }}
                center={{ lat: parseFloat(form.latitude), lng: parseFloat(form.longitude) }}
                zoom={15}
                options={{ streetViewControl: false, mapTypeControl: false }}
              >
                <Marker position={{ lat: parseFloat(form.latitude), lng: parseFloat(form.longitude) }} />
              </GoogleMap>
            </div>
          )}

          <div className="form-group">
            <label>Time</label>
            <input type="text" value="Server Time (IST)" readOnly style={{ backgroundColor: '#eef2ff', color: '#3b82f6', fontWeight: 'bold' }} />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
              <label>Address</label>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); fetchLocation(); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                ↻ Refresh Location
              </button>
            </div>
            <textarea value={form.address} readOnly placeholder="Fetching address..." />
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



          <div className="attendance-buttons">
            <button
              type="button"
              className="attendance-btn"
              disabled={loading || (todayRecord?.out)}
              onClick={markAttendance}
              style={{ opacity: todayRecord?.out ? 0.5 : 1 }}
            >
              {loading ? "Submitting..." : "Mark Attendance"}
            </button>
          </div>
        </form>


      </div>
    </div>
  );
}
