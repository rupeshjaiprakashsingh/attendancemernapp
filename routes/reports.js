const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
    sendDailyReport,
    getMonthlyReport,
    exportMonthlyExcel
} = require("../controllers/reports");

// Send daily report email (admin only)
router.post("/daily-report", auth, sendDailyReport);

// Get monthly report data
router.get("/monthly-report", auth, getMonthlyReport);

// Export monthly report to Excel
router.get("/export-excel", auth, exportMonthlyExcel);

module.exports = router;
