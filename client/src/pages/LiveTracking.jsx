
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { toast } from 'react-toastify';
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import "../styles/Attendance.css"; // Reuse existing styles or create new

const containerStyle = {
    width: '100%',
    height: '80vh',
    borderRadius: '8px'
};

const defaultCenter = {
    lat: 28.6139,
    lng: 77.2090
};

export default function LiveTracking() {
    const [locations, setLocations] = useState([]);
    const [filteredLocations, setFilteredLocations] = useState([]);
    const [selectedUser, setSelectedUser] = useState("all");
    const [selectedMarker, setSelectedMarker] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [refreshInterval, setRefreshInterval] = useState(10); // seconds

    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: "AIzaSyBAbFbmXPOSgsBnhuYrCtSQ7yXK_0nB--Y", // Using key from local file
    });

    const mapRef = useRef(null);

    const fetchLocations = async () => {
        try {
            const token = JSON.parse(localStorage.getItem("auth")) || "";
            const res = await axios.get("/api/v1/attendance/live-locations", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLocations(res.data.data);
            setLastUpdated(new Date());
        } catch (error) {
            console.error("Error fetching live locations", error);
        }
    };

    useEffect(() => {
        fetchLocations();
        const interval = setInterval(fetchLocations, refreshInterval * 1000);
        return () => clearInterval(interval);
    }, [refreshInterval]);

    useEffect(() => {
        if (selectedUser === "all") {
            setFilteredLocations(locations);
        } else {
            setFilteredLocations(locations.filter(l => l.userId === selectedUser));
        }
    }, [selectedUser, locations]);

    // Handle marker click
    const handleMarkerClick = (location) => {
        setSelectedMarker(location);
    };

    if (!isLoaded) return <div>Loading Map...</div>;

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Live Staff Map 🗺️</h2>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>

                    <div>
                        <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Filter User:</label>
                        <select
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                        >
                            <option value="all">All Employees</option>
                            {locations.map(loc => (
                                <option key={loc.userId} value={loc.userId}>{loc.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ fontSize: '14px', color: '#666' }}>
                        Auto-refresh: {refreshInterval}s
                        {lastUpdated && ` (Last: ${lastUpdated.toLocaleTimeString()})`}
                    </div>
                </div>
            </div>

            <div style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={locations.length > 0 ? { lat: locations[0].latitude, lng: locations[0].longitude } : defaultCenter}
                    zoom={12}
                    onLoad={map => mapRef.current = map}
                >
                    {filteredLocations.map((loc) => (
                        <Marker
                            key={loc.userId}
                            position={{ lat: loc.latitude, lng: loc.longitude }}
                            onClick={() => handleMarkerClick(loc)}
                            title={loc.name}
                        // Optional: Add custom icon based on status
                        // icon={{ url: "..." }} 
                        />
                    ))}

                    {selectedMarker && (
                        <InfoWindow
                            position={{ lat: selectedMarker.latitude, lng: selectedMarker.longitude }}
                            onCloseClick={() => setSelectedMarker(null)}
                        >
                            <div style={{ minWidth: '200px' }}>
                                <h3 style={{ margin: '0 0 10px 0' }}>{selectedMarker.name}</h3>
                                <p><strong>Status:</strong> {selectedMarker.status}</p>
                                <p><strong>Time:</strong> {new Date(selectedMarker.lastSeen).toLocaleString()}</p>
                                <p><strong>Battery:</strong> {selectedMarker.battery}%</p>
                                <p style={{ fontSize: '12px', color: '#555' }}>{selectedMarker.address}</p>
                                <a
                                    href={`https://www.google.com/maps?q=${selectedMarker.latitude},${selectedMarker.longitude}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ display: 'block', marginTop: '10px', color: '#3b82f6' }}
                                >
                                    View on Google Maps
                                </a>
                            </div>
                        </InfoWindow>
                    )}
                </GoogleMap>
            </div>

            <div style={{ marginTop: '20px' }}>
                <h3>Details</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table className="report-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'left' }}>
                                <th style={{ padding: '10px' }}>Name</th>
                                <th style={{ padding: '10px' }}>Status</th>
                                <th style={{ padding: '10px' }}>Last Seen</th>
                                <th style={{ padding: '10px' }}>Address</th>
                                <th style={{ padding: '10px' }}>Battery</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLocations.map(loc => (
                                <tr key={loc.userId} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                    <td style={{ padding: '10px' }}>{loc.name}</td>
                                    <td style={{ padding: '10px' }}>
                                        <span style={{
                                            padding: '4px 8px',
                                            borderRadius: '12px',
                                            backgroundColor: loc.status === 'IN' ? '#dcfce7' : '#fee2e2',
                                            color: loc.status === 'IN' ? '#166534' : '#991b1b',
                                            fontSize: '12px', fontWeight: 'bold'
                                        }}>
                                            {loc.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px' }}>{new Date(loc.lastSeen).toLocaleString()}</td>
                                    <td style={{ padding: '10px', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{loc.address}</td>
                                    <td style={{ padding: '10px' }}>{loc.battery}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
