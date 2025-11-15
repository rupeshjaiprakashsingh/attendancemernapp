const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const attendanceController = require("../controllers/attendance");

router.post("/mark", auth, attendanceController.markAttendance);

module.exports = router;
