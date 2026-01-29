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

  const [retryCount, setRetryCount] = useState(0); // Track failed attempts
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [todayRecord, setTodayRecord] = useState(null); // Store today's attendance
  const [showEarlyModal, setShowEarlyModal] = useState(false);
  const [earlyReason, setEarlyReason] = useState("");

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

  // Fetch High Accuracy Location
  // Uses watchPosition to get the best possible accuracy within a timeout window
  const fetchLocation = (force = false) => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }

      const TARGET_ACCURACY = 15; // Aim for 15 meters (GPS level)
      const TIMEOUT_MS = 15000; // 15 seconds to hunt for satellites
      const MIN_ACCEPTABLE_ACCURACY = 100; // Refuse if worse than 100m (Cell tower/IP)

      let bestPosition = null;
      let watchId = null;
      let timeoutId = null;

      const finish = (pos) => {
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        if (timeoutId !== null) clearTimeout(timeoutId);

        if (pos) {
          const { latitude, longitude, accuracy } = pos.coords;

          // If force is enabled, we accept ANY accuracy.
          // If force is false, we reject bad accuracy.
          if (!force && accuracy > MIN_ACCEPTABLE_ACCURACY) {
            reject(new Error(`GPS signal weak (Accuracy: ${Math.round(accuracy)}m). Please move outdoors or try again (Attempt ${retryCount + 1}/3).`));
            return;
          }

          // Update State
          setForm((p) => ({ ...p, latitude, longitude, locationAccuracy: accuracy }));
          fetchAddress(latitude, longitude);
          resolve({ latitude, longitude, locationAccuracy: accuracy });
        } else {
          reject(new Error("Unable to retrieve valid location. Is GPS on?"));
        }
      };

      // Start watching
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const acc = pos.coords.accuracy;

          // Keep the best position found so far
          if (!bestPosition || acc < bestPosition.coords.accuracy) {
            bestPosition = pos;
          }

          // If accuracy is good enough, stop and resolve immediately
          if (acc <= TARGET_ACCURACY) {
            finish(pos);
          }
        },
        (err) => {
          console.warn("Location watch error:", err);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
      );

      // Timeout fallback
      timeoutId = setTimeout(() => {
        if (bestPosition) {
          // Return the best we found within time
          finish(bestPosition);
        } else {
          // Nothing found
          finish(null);
        }
      }, TIMEOUT_MS);
    });
  };

  // Manual Refresh for Button
  const refreshLocationManual = async () => {
    const toastId = toast.loading("Fetching latest location...");
    try {
      await fetchLocation(retryCount >= 2);
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
    fetchTodayAttendance();
    // Removed automatic fetching of location/battery/network on mount
  }, []);

  // Auto-switch to OUT if already checked in
  useEffect(() => {
    if (todayRecord && todayRecord.in && !todayRecord.out) {
      setForm(p => ({ ...p, attendanceType: "OUT" }));
    }
  }, [todayRecord]);

  const handleEarlySubmit = () => {
    // ... same as before
    if (!earlyReason.trim()) {
      toast.error("Please provide a reason for early checkout.");
      return;
    }
    const newRemarks = form.remarks ? `${form.remarks} | Early Reason: ${earlyReason}` : `Early Reason: ${earlyReason}`;
    markAttendance(true, newRemarks);
    setShowEarlyModal(false);
  };

  // Submit Attendance
  const markAttendance = async (bypassTimeCheck = false, customRemarks = null) => {
    setLoading(true);
    setMsg("Fetching location and device details...");

    try {
      // 1. Fetch Network Type
      const netType = navigator.connection?.effectiveType?.toUpperCase() || "";

      // 2. Fetch Battery Status
      let batteryPct = "";
      if (navigator.getBattery) {
        try {
          const battery = await navigator.getBattery();
          batteryPct = Math.round(battery.level * 100);
        } catch (e) { }
      }

      // 3. Force Refresh Location
      // We do NOT use the state 'form.latitude' here blindly. We must fetch fresh.
      let currentLoc = null;
      try {
        // Pass true if retryCount >= 2 to force acceptance of low accuracy
        const forceAccept = retryCount >= 2;
        if (forceAccept) {
          console.warn("Forcing location acceptance due to repeated failures.");
        }
        currentLoc = await fetchLocation(forceAccept);

        // If successful, reset retries
        setRetryCount(0);

      } catch (locErr) {
        console.warn("Location fetch failed:", locErr);
        // Increment retry count on failure
        setRetryCount(prev => prev + 1);
      }

      // CRITICAL CHECK: If Location is still missing, STOP.
      if (!currentLoc || !currentLoc.latitude || !currentLoc.longitude) {
        setLoading(false);
        // Custom message based on retry count
        if (retryCount >= 2) {
          setMsg("Unable to detect location even after retries. Is GPS enabled?");
        } else {
          setMsg(`Location not found or weak signal. Please click 'Mark Attendance' again. (Attempt ${retryCount + 1}/3)`);
        }
        toast.error("Location not found. Please try again.");
        return;
      }

      // Update local state for non-React managed values (Battery/Net)
      // fetchLocation already updated form state for lat/long/acc
      setForm(p => ({ ...p, batteryPercentage: batteryPct, networkType: netType }));

      // 8-HOUR CHECK-OUT RESTRICTION LOGIC
      if (form.attendanceType === "OUT" && bypassTimeCheck !== true) {
        const now = new Date();
        const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        let userId = null;
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.id || payload._id;
        } catch (e) { }

        if (userId) {
          try {
            const resCheck = await axios.get(`/api/v1/attendance/day/${userId}?date=${todayStr}`, {
              headers: { Authorization: `Bearer ${token}` }
            });

            const freshRecord = resCheck.data;
            if (freshRecord && freshRecord.in) {
              const inTime = new Date(freshRecord.in.deviceTime).getTime();
              const currentMs = new Date().getTime();
              const diffMs = currentMs - inTime;
              const diffHours = diffMs / (1000 * 60 * 60);

              if (diffHours < 8) {
                setShowEarlyModal(true);
                setLoading(false);
                return;
              }
            }
          } catch (checkErr) {
            console.error("Failed to verify existing attendance for time check", checkErr);
          }
        }
      }

      // Prepare Final Payload
      // We use the 'currentLoc' values we just fetched to be 100% sure we are sending fresh data
      const finalRemarks = customRemarks !== null ? customRemarks : form.remarks;
      const deviceTime = new Date().toISOString();

      const payload = {
        ...form,
        remarks: finalRemarks,
        latitude: currentLoc.latitude,
        longitude: currentLoc.longitude,
        locationAccuracy: currentLoc.locationAccuracy,
        batteryPercentage: batteryPct,
        networkType: netType,
        deviceTime: deviceTime
      };

      setMsg("Submitting data...");
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
      const errMsg = error.response?.data?.message || error.message || "An error occurred";
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
              Standard working hours: 8 hours. Early checkout will be marked Absent.
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
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontWeight: 'bold', color: '#374151' }}>Current Location</label>
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


      {/* Early Checkout Modal */}
      {
        showEarlyModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '90%', maxWidth: '400px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ marginTop: 0, color: '#dc2626' }}>Early Checkout Warning</h3>
              <p style={{ color: '#4b5563', marginBottom: '15px' }}>
                If you will not complete 8 working hours then <strong>Absent</strong> will be marked for today.
              </p>

              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Why not able to complete?</label>
              <textarea
                value={earlyReason}
                onChange={(e) => setEarlyReason(e.target.value)}
                placeholder="Enter reason..."
                style={{
                  width: '100%', minHeight: '80px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', marginBottom: '15px'
                }}
              />

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowEarlyModal(false)}
                  style={{
                    padding: '8px 16px', border: '1px solid #d1d5db', backgroundColor: 'white', borderRadius: '4px', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEarlySubmit}
                  style={{
                    padding: '8px 16px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'
                  }}
                >
                  Mark Absent & Checkout
                </button>
              </div>
            </div>
          </div>
        )
      }

    </div >
  );
}
