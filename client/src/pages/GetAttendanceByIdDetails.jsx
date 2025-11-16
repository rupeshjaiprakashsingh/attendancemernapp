import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "../styles/map.css";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

import marker2x from "leaflet/dist/images/marker-icon-2x.png";
import marker from "leaflet/dist/images/marker-icon.png";
import shadow from "leaflet/dist/images/marker-shadow.png";

// FIX DEFAULT ICONS
L.Icon.Default.mergeOptions({
  iconRetinaUrl: marker2x,
  iconUrl: marker,
  shadowUrl: shadow,
});

// AUTO FIT SAFE ZOOM (avoid zoom = 20 issue)
function FitBounds({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (!positions || positions.length === 0) return;

    const bounds = L.latLngBounds(positions);

    map.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 17, // 👌 Prevent zooming too much
    });
  }, [positions, map]);

  return null;
}

export default function GetAttendanceByIdDetails() {
  const { id } = useParams();
  const query = new URLSearchParams(window.location.search);
  const date = query.get("date");

  const [attendance, setAttendance] = useState(null);

  const token =
    JSON.parse(localStorage.getItem("auth")) ||
    localStorage.getItem("token") ||
    "";

  // ========= API CALL =========
  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get(
          `/api/v1/attendance/day/${id}?date=${date}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setAttendance(res.data);
      } catch (err) {
        console.error("DETAILS API ERROR:", err);
      }
    }

    load();
  }, [id, date, token]);

  if (!attendance) return <div>Loading...</div>;

  const IN = attendance.in;
  const OUT = attendance.out;

  let inPos = IN ? [IN.latitude, IN.longitude] : null;
  let outPos = OUT ? [OUT.latitude, OUT.longitude] : null;
console.log("MAP POSITIONS →", { inPos, outPos });

  // Prevent both markers from overlapping
  if (
    inPos &&
    outPos &&
    inPos[0] === outPos[0] &&
    inPos[1] === outPos[1]
  ) {
    outPos = [outPos[0] + 0.0002, outPos[1] + 0.0002];
  }

  const positions = [inPos, outPos].filter(Boolean);

  return (
    <div style={{ display: "flex", gap: "20px", padding: "20px" }}>
      {/* LEFT PANEL */}
      <div
        style={{
          width: "360px",
          padding: "20px",
          border: "1px solid #ddd",
          borderRadius: "10px",
          background: "#fff",
        }}
      >
        <h2>{attendance.user?.name}</h2>
        <p style={{ marginTop: 0 }}>{attendance.user?.email}</p>

        <div><strong>Date:</strong> {attendance.date}</div>
        <div><strong>Total Hours:</strong> {attendance.totalHours}</div>

        <hr />

        <h3>In Details</h3>
        {IN ? (
          <ul>
            <li><strong>Time:</strong> {new Date(IN.deviceTime).toLocaleString()}</li>
            <li><strong>Address:</strong> {IN.address}</li>
            <li><strong>Battery:</strong> {IN.batteryPercentage}%</li>
            <li><strong>Network:</strong> {IN.networkType}</li>
            <li><strong>Validated:</strong> {IN.validatedInsideGeoFence ? "Yes" : "No"}</li>
          </ul>
        ) : (
          <p>No IN Records</p>
        )}

        <hr />

        <h3>Out Details</h3>
        {OUT ? (
          <ul>
            <li><strong>Time:</strong> {new Date(OUT.deviceTime).toLocaleString()}</li>
            <li><strong>Address:</strong> {OUT.address}</li>
            <li><strong>Battery:</strong> {OUT.batteryPercentage}%</li>
            <li><strong>Network:</strong> {OUT.networkType}</li>
            <li><strong>Validated:</strong> {OUT.validatedInsideGeoFence ? "Yes" : "No"}</li>
          </ul>
        ) : (
          <p>No OUT Records</p>
        )}
      </div>

      {/* MAP */}
      <div className="map-wrapper">
        <MapContainer
          center={inPos || [20, 78]}
          zoom={13}
          maxZoom={18}
          minZoom={3}
          scrollWheelZoom={true}
          style={{ width: "100%", height: "100%" }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {inPos && (
            <Marker position={inPos}>
              <Popup>
                <b>IN</b><br />
                {IN.address}<br />
                {new Date(IN.deviceTime).toLocaleString()}
              </Popup>
            </Marker>
          )}

          {outPos && (
            <Marker position={outPos}>
              <Popup>
                <b>OUT</b><br />
                {OUT.address}<br />
                {new Date(OUT.deviceTime).toLocaleString()}
              </Popup>
            </Marker>
          )}

          {positions.length >= 2 && (
            <Polyline positions={positions} color="blue" />
          )}

          <FitBounds positions={positions} />
        </MapContainer>
      </div>
    </div>
  );
}
