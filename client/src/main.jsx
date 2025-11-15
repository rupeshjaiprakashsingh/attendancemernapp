import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import 'react-toastify/dist/ReactToastify.css';
import './index.css'
import "./responsive.css";
import axios from 'axios';

// Determine API base URL:
// - If running on localhost (dev), use local backend at http://localhost:3000
// - Otherwise use VITE_API_BASE if provided, else fallback to cloud default
const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const cloudDefault = import.meta.env.VITE_API_BASE || 'https://mern-login-and-register-with-json-web-78u3.onrender.com';
const apiBase = isLocalhost ? 'http://localhost:3000' : cloudDefault;
axios.defaults.baseURL = apiBase;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
