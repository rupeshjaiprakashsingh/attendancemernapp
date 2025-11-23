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

// Cron Jobs
const { scheduleDailyReport } = require("./utils/cronJobs");

// Middlewares
app.use(express.json());
app.use(cors());

// Versioned APIs
// Mount user routes at /api/v1 so endpoints become /api/v1/login, /api/v1/register
app.use("/api/v1", userRoutes);                 // Example: /api/v1/register
app.use("/api/v1/attendance", attendanceRoutes); // Example: /api/v1/attendance/mark
app.use("/api/v1/dashboard", dashboardRoutes);   // Example: /api/v1/dashboard/admin-stats
app.use("/api/v1/reports", reportRoutes);        // Example: /api/v1/reports/monthly-report

const port = process.env.PORT || 3000;

// Serve static files from the client/dist directory
const path = require("path");
app.use(express.static(path.join(__dirname, "client/dist")));

// Handle React routing, return all requests to React app
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client/dist", "index.html"));
});

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    app.listen(port, () => {
      console.log(`Server is listening on port ${port}`);

      // Start cron jobs
      scheduleDailyReport();
    });
  } catch (error) {
    console.log(error);
  }
};

start();
