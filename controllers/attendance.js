const Attendance = require("../models/Attendance");
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
        return res.status(400).json({ message: "IN already marked today" });
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
