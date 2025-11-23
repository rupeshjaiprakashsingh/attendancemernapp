import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/Profile.css";

export default function Profile() {
  const token = JSON.parse(localStorage.getItem("auth")) || "";
  const [user, setUser] = useState(null);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await axios.get("/api/v1/users/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(res.data);
        setName(res.data.name);
      } catch (err) {
        console.error("PROFILE LOAD ERROR:", err);
      }
    }

    loadProfile();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      await axios.put(
        "/api/v1/users/profile", // Updated endpoint
        { name, password },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("Profile updated successfully!");
    } catch (err) {
      alert("Update failed!");
      console.error(err);
    }
  };

  if (!user) return <div style={{ padding: 30 }}>Loading profile...</div>;

  return (
    <div className="profile-container">
      <h1 className="title">My Profile</h1>

      <div className="profile-card">
        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
      </div>

      <h2 className="section-title">Update Profile</h2>

      <form className="profile-form" onSubmit={handleUpdate}>
        <label>Full Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label>New Password (optional)</label>
        <input
          type="password"
          placeholder="Enter new password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit" className="profile-btn">
          Save Changes
        </button>
      </form>
    </div>
  );
}
