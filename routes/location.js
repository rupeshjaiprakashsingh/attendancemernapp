const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { logLocation, getLiveLocations } = require("../controllers/location");

// App: Post location background update
router.post("/log", auth, logLocation);

// Admin: Get live map data (High accuracy)
router.get("/live", auth, getLiveLocations);

module.exports = router;
