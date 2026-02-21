
import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix for default marker icon in React Leaflet
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const customIconOnline = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/markers/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const customIconOffline = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/markers/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const LiveTracking = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchLiveLocations = async () => {
        try {
            const token = JSON.parse(localStorage.getItem("auth"))?.token;
            if (!token) return;

            const response = await axios.get("/api/v1/tracking/live", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.data.success) {
                // Filter out users without valid location data
                const validLocations = response.data.data.filter(emp => emp.latitude && emp.longitude);
                setEmployees(validLocations);
                setLastUpdated(new Date());
            }
        } catch (error) {
            console.error("Error fetching live locations:", error);
            // toast.error("Failed to load live locations"); // Optional: Don't spam toasts on polling
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLiveLocations();
        const interval = setInterval(fetchLiveLocations, 10000); // Poll every 10 seconds
        return () => clearInterval(interval);
    }, []);

    // Default center (New Delhi)
    const defaultPosition = [28.6139, 77.2090];

    // Calculate center based on employees if available
    const mapCenter = employees.length > 0
        ? [employees[0].latitude, employees[0].longitude]
        : defaultPosition;

    if (loading && employees.length === 0) {
        return <div className="p-4 text-center">Loading Live Map...</div>;
    }

    return (
        <div className="p-4" style={{ height: 'calc(100vh - 100px)', padding: "1rem" }}>
            <div className="flex justify-between items-center mb-4" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h2 className="text-2xl font-bold">Live Employee Tracking</h2>
                <div className="text-sm text-gray-500">
                    Last Updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
                    <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: '#666' }}>Auto-refreshes every 10s</span>
                </div>
            </div>

            <div className="map-container" style={{ height: "100%", width: "100%", borderRadius: "10px", overflow: "hidden", border: "1px solid #ddd" }}>
                <MapContainer center={mapCenter} zoom={13} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {employees.map((emp) => (
                        <Marker
                            key={emp.userId}
                            position={[emp.latitude, emp.longitude]}
                            icon={emp.isOnline ? customIconOnline : customIconOffline}
                        >
                            <Popup>
                                <div style={{ minWidth: '200px' }}>
                                    <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', fontWeight: 'bold' }}>{emp.name}</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.9rem' }}>
                                        <div>
                                            <strong>Status:</strong>
                                            <span style={{
                                                marginLeft: '5px',
                                                color: emp.status === 'Checked In' ? 'green' : 'red',
                                                fontWeight: 'bold'
                                            }}>
                                                {emp.status}
                                            </span>
                                        </div>
                                        <div><strong>Battery:</strong> {emp.batteryPercentage || 'N/A'}%</div>
                                        <div><strong>Online:</strong> {emp.isOnline ? 'Yes' : 'No'}</div>
                                        <div><strong>Last Seen:</strong> {emp.lastUpdated ? new Date(emp.lastUpdated).toLocaleTimeString() : 'N/A'}</div>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>

            <div style={{ marginTop: '1rem' }}>
                <h3>Active Employees: {employees.length}</h3>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {employees.map(emp => (
                        <div key={emp.userId} style={{
                            padding: '0.5rem',
                            border: '1px solid #eee',
                            borderRadius: '5px',
                            background: emp.isOnline ? '#f0fdf4' : '#fef2f2',
                            width: '200px'
                        }}>
                            <strong>{emp.name}</strong>
                            <div style={{ fontSize: '0.8rem', color: '#666' }}>
                                {emp.status} • Battery: {emp.batteryPercentage}%
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LiveTracking;
