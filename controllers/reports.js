const User = require("../models/User");
const Attendance = require("../models/Attendance");
const { sendEmail, createDailyReportHTML } = require("../utils/emailService");
const ExcelJS = require("exceljs");

// Generate Daily Report Data
const generateDailyReportData = async (date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all users
    const allUsers = await User.find().select("name email");
    const totalUsers = allUsers.length;

    // Get today's attendance
    const todayAttendance = await Attendance.find({
        deviceTime: { $gte: startOfDay, $lte: endOfDay }
    }).populate("userId", "name email");

    // Group by user
    const userAttendanceMap = {};
    todayAttendance.forEach(record => {
        const userId = record.userId?._id?.toString();
        if (!userId) return;

        if (!userAttendanceMap[userId]) {
            userAttendanceMap[userId] = {
                name: record.userId.name,
                email: record.userId.email,
                checkIn: null,
                checkOut: null,
                workingHours: 0,
                status: "Absent"
            };
        }

        if (record.attendanceType === "IN") {
            userAttendanceMap[userId].checkIn = new Date(record.deviceTime).toLocaleTimeString();
            userAttendanceMap[userId].status = "Present";
        } else if (record.attendanceType === "OUT") {
            userAttendanceMap[userId].checkOut = new Date(record.deviceTime).toLocaleTimeString();
            userAttendanceMap[userId].workingHours = record.workingHours || 0;
        }
    });

    // Create attendance list with all users
    const attendanceList = allUsers.map(user => {
        const userId = user._id.toString();
        return userAttendanceMap[userId] || {
            name: user.name,
            email: user.email,
            checkIn: null,
            checkOut: null,
            workingHours: 0,
            status: "Absent"
        };
    });

    const presentCount = attendanceList.filter(u => u.status === "Present").length;
    const absentCount = totalUsers - presentCount;

    return {
        date,
        totalUsers,
        presentCount,
        absentCount,
        attendanceList
    };
};

// Send Daily Report Email
exports.sendDailyReport = async (req, res) => {
    try {
        const date = req.query.date || new Date();

        // Use the shared logic from cronJobs
        const { generateAndSendDailyReport } = require("../utils/cronJobs");
        const result = await generateAndSendDailyReport(date);

        if (result.success) {
            res.status(200).json({
                success: true,
                message: "Daily report sent successfully",
                messageId: result.messageId,
                previewUrl: result.previewUrl
            });
        } else {
            res.status(500).json({
                success: false,
                message: result.message || "Failed to send email",
                error: result.error
            });
        }
    } catch (error) {
        console.error("Daily report error:", error);
        res.status(500).json({ message: error.message });
    }
};

// Get Monthly Report Data
exports.getMonthlyReport = async (req, res) => {
    try {
        const { year, month } = req.query;

        if (!year || !month) {
            return res.status(400).json({ message: "Year and month are required" });
        }

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        // Get all users
        const allUsers = await User.find().select("name email");

        // Get attendance for the month
        const monthAttendance = await Attendance.find({
            deviceTime: { $gte: startDate, $lte: endDate }
        }).populate("userId", "name email");

        // Group by user and date
        const userReportMap = {};

        allUsers.forEach(user => {
            userReportMap[user._id.toString()] = {
                name: user.name,
                email: user.email,
                daysPresent: 0,
                daysAbsent: 0,
                totalWorkingHours: 0,
                averageWorkingHours: 0,
                dailyRecords: {}
            };
        });

        monthAttendance.forEach(record => {
            const userId = record.userId?._id?.toString();
            if (!userId || !userReportMap[userId]) return;

            const dateStr = new Date(record.deviceTime).toISOString().split('T')[0];

            if (!userReportMap[userId].dailyRecords[dateStr]) {
                userReportMap[userId].dailyRecords[dateStr] = {
                    checkIn: null,
                    checkOut: null,
                    workingHours: 0
                };
            }

            if (record.attendanceType === "IN") {
                userReportMap[userId].dailyRecords[dateStr].checkIn = record.deviceTime;
            } else if (record.attendanceType === "OUT") {
                userReportMap[userId].dailyRecords[dateStr].checkOut = record.deviceTime;
                userReportMap[userId].dailyRecords[dateStr].workingHours = record.workingHours || 0;
            }
        });

        // Calculate summary stats
        Object.keys(userReportMap).forEach(userId => {
            const user = userReportMap[userId];
            const daysInMonth = new Date(year, month, 0).getDate();

            user.daysPresent = Object.keys(user.dailyRecords).length;
            user.daysAbsent = daysInMonth - user.daysPresent;

            user.totalWorkingHours = Object.values(user.dailyRecords)
                .reduce((sum, day) => sum + (day.workingHours || 0), 0);

            user.averageWorkingHours = user.daysPresent > 0
                ? user.totalWorkingHours / user.daysPresent
                : 0;
        });

        const reportData = Object.values(userReportMap);

        res.status(200).json({
            success: true,
            year: parseInt(year),
            month: parseInt(month),
            monthName: new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' }),
            data: reportData
        });
    } catch (error) {
        console.error("Monthly report error:", error);
        res.status(500).json({ message: error.message });
    }
};

// Export Monthly Report to Excel
exports.exportMonthlyExcel = async (req, res) => {
    try {
        const { year, month } = req.query;

        if (!year || !month) {
            return res.status(400).json({ message: "Year and month are required" });
        }

        // Get report data (reuse the logic)
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);
        const allUsers = await User.find().select("name email");
        const monthAttendance = await Attendance.find({
            deviceTime: { $gte: startDate, $lte: endDate }
        }).populate("userId", "name email");

        // Create workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Monthly Attendance');

        // Add title
        worksheet.mergeCells('A1:F1');
        worksheet.getCell('A1').value = `Monthly Attendance Report - ${new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
        worksheet.getCell('A1').font = { size: 16, bold: true };
        worksheet.getCell('A1').alignment = { horizontal: 'center' };

        // Add headers
        worksheet.addRow([]);
        const headerRow = worksheet.addRow(['Name', 'Email', 'Days Present', 'Days Absent', 'Total Hours', 'Avg Hours/Day']);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF3B82F6' }
        };
        headerRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.alignment = { horizontal: 'center' };
        });

        // Process data
        const userReportMap = {};
        allUsers.forEach(user => {
            userReportMap[user._id.toString()] = {
                name: user.name,
                email: user.email,
                daysPresent: 0,
                totalWorkingHours: 0,
                dailyRecords: {}
            };
        });

        monthAttendance.forEach(record => {
            const userId = record.userId?._id?.toString();
            if (!userId || !userReportMap[userId]) return;

            const dateStr = new Date(record.deviceTime).toISOString().split('T')[0];

            if (!userReportMap[userId].dailyRecords[dateStr]) {
                userReportMap[userId].dailyRecords[dateStr] = { workingHours: 0 };
            }

            if (record.attendanceType === "OUT") {
                userReportMap[userId].dailyRecords[dateStr].workingHours = record.workingHours || 0;
            }
        });

        const daysInMonth = new Date(year, month, 0).getDate();

        Object.values(userReportMap).forEach(user => {
            user.daysPresent = Object.keys(user.dailyRecords).length;
            user.daysAbsent = daysInMonth - user.daysPresent;
            user.totalWorkingHours = Object.values(user.dailyRecords)
                .reduce((sum, day) => sum + (day.workingHours || 0), 0);
            user.averageWorkingHours = user.daysPresent > 0
                ? user.totalWorkingHours / user.daysPresent
                : 0;

            worksheet.addRow([
                user.name,
                user.email,
                user.daysPresent,
                user.daysAbsent,
                parseFloat(user.totalWorkingHours.toFixed(2)),
                parseFloat(user.averageWorkingHours.toFixed(2))
            ]);
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            column.width = 20;
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=attendance_${year}_${month}.xlsx`);

        // Write to response
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error("Excel export error:", error);
        res.status(500).json({ message: error.message });
    }
};
