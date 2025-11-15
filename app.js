require("dotenv").config();
require("express-async-errors");

const connectDB = require("./db/connect");
const express = require("express");
const cors = require("cors");

const app = express();

// Routes
const userRoutes = require("./routes/user");
const attendanceRoutes = require("./routes/attendance");

// Middlewares
app.use(express.json());
app.use(cors());

// Versioned APIs
app.use("/api/v1/users", userRoutes);          // Example: /api/v1/users/register
app.use("/api/v1/attendance", attendanceRoutes); // Example: /api/v1/attendance/mark

const port = process.env.PORT || 3000;

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    app.listen(port, () => {
      console.log(`Server is listening on port ${port}`);
    });
  } catch (error) {
    console.log(error);
  }
};

start();
