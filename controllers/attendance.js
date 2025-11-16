const Attendance = require("../models/Attendance");
const User = require("../models/User");
const { isInsideGeofence } = require("../utils/geoFence");

// Mark Attendance (IN/OUT)
exports.markAttendance = async (req, res) => {
  try {
    const userId = req.user.id; // Get from JWT
    const ipAddress = req.ip;

    const {
      attendanceType,
      latitude,
      longitude,
      deviceTime,
      deviceId,
      locationAccuracy,
      address,
      batteryPercentage,
      networkType,
      remarks,
    } = req.body;

    // -------- Mandatory Validation ----------
    if (!attendanceType || !latitude || !longitude || !deviceTime || !deviceId) {
      return res.status(400).json({ message: "Mandatory fields missing" });
    }

    // Duplicate Check for same day (Only for IN)
    if (attendanceType === "IN") {
      const alreadyMarkedIn = await Attendance.findOne({
        userId,
        attendanceType: "IN",
        createdAt: {
          $gte: new Date().setHours(0, 0, 0),
          $lte: new Date().setHours(23, 59, 59),
        },
      });

      if (alreadyMarkedIn) {
        return res.status(400).json({ message: "You’re already checked in Now you can check out when leaving." });
      }
    }

    // Check if OUT before IN
    if (attendanceType === "OUT") {
      const inMarked = await Attendance.findOne({
        userId,
        attendanceType: "IN",
        createdAt: {
          $gte: new Date().setHours(0, 0, 0),
          $lte: new Date().setHours(23, 59, 59),
        },
      });

      if (!inMarked) {
        return res.status(400).json({ message: "You must mark IN before OUT" });
      }
    }

    // Geofence Validation
    const insideFence = isInsideGeofence(latitude, longitude);

    // Create Attendance Entry
    const record = new Attendance({
      userId,
      attendanceType,
      latitude,
      longitude,
      deviceTime,
      deviceId,
      locationAccuracy,
      address,
      batteryPercentage,
      networkType,
      remarks,
      ipAddress,
      validatedInsideGeoFence: insideFence,
    });

    await record.save();

    res.status(201).json({
      message: `${attendanceType} marked successfully`,
      insideOffice: insideFence,
      data: record,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// GET ALL ATTENDANCE (Admin or Global View)
exports.getAllAttendance = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; 
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const attendanceRecords = await Attendance.find({})
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Attendance.countDocuments();

    res.status(200).json({
      success: true,
      total,
      page,
      limit,
      records: attendanceRecords,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.getDailyAttendance = async (req, res) => {
  try {
    const { userId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        message: "date query param is required (YYYY-MM-DD)"
      });
    }

    // Create local date range
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get user only once
    const user = await User.findById(userId).select("name email");

    // Fetch IN record (no populate)
    const inRecord = await Attendance.findOne({
      userId,
      attendanceType: "IN",
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).lean();

    // Fetch OUT record (no populate)
    const outRecord = await Attendance.findOne({
      userId,
      attendanceType: "OUT",
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).lean();

    // Remove userId from IN/OUT
    if (inRecord) delete inRecord.userId;
    if (outRecord) delete outRecord.userId;

    // Calculate duration
    let totalHours = null;
    if (inRecord && outRecord) {
      const ms = new Date(outRecord.deviceTime) - new Date(inRecord.deviceTime);
      const hours = Math.floor(ms / (1000 * 60 * 60));
      const minutes = Math.floor((ms / (1000 * 60)) % 60);
      totalHours = `${hours}h ${minutes}m`;
    }

    return res.status(200).json({
      success: true,
      date,
      user,
      in: inRecord || null,
      out: outRecord || null,
      totalHours
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};



