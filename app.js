require("dotenv").config();
require("express-async-errors");

const connectDB = require("./db/connect");
const express = require("express");
const cors = require("cors");

const app = express();

// Routes
const userRoutes = require("./routes/user");
const attendanceRoutes = require("./routes/attendance");
const dashboardRoutes = require("./routes/dashboard");
const reportRoutes = require("./routes/reports");

// Cron Jobs & Keep-Alive
const { scheduleDailyReport } = require("./utils/cronJobs");
const keepAwake = require("./utils/keepAwake");

// Middlewares
app.use(express.json());
app.use(cors());

// Versioned APIs
// Mount user routes at /api/v1 so endpoints become /api/v1/login, /api/v1/register
app.use("/api/v1", userRoutes);                 // Example: /api/v1/register
app.use("/api/v1/attendance", attendanceRoutes); // Example: /api/v1/attendance/mark
app.use("/api/v1/dashboard", dashboardRoutes);   // Example: /api/v1/dashboard/admin-stats
app.use("/api/v1/reports", reportRoutes);        // Example: /api/v1/reports/monthly-report
app.use("/api/v1/enquiry", require("./routes/enquiry")); // Public API for enquiry form
app.use("/api/v1/geofence", require("./routes/geofence"));
app.use("/api/v1/location", require("./routes/location"));
app.use("/api/v1/tracking", require("./routes/trackingRoutes"));

// --- Setup Health Endpoint for Keep-Alive ---
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is awake and healthy" });
});

const port = process.env.PORT || 3000;

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    app.listen(port, () => {
      console.log(`Server is listening on port ${port}`);

      // Start cron jobs
      scheduleDailyReport();

      // Pings Render Server every 14 minutes to prevent the free tier sleep after 15 minutes of inactivity
      const renderWebsiteUrl = "https://salesapiadminpage.onrender.com/api/health";
      keepAwake(renderWebsiteUrl, 14);
    });
  } catch (error) {
    console.log(error);
  }
};

start();
