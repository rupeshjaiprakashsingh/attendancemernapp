const express = require("express");
const router = express.Router();
const { createEnquiry } = require("../controllers/enquiry");
const rateLimit = require("express-rate-limit");

// 1. Rate Limiter: Allow only 5 requests per hour per IP
const enquiryLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
        msg: "Too many requests from this IP, please try again after an hour"
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// 2. Honeypot Middleware: Check if hidden field is filled
const checkHoneypot = (req, res, next) => {
    // If the hidden '_honey' field has a value, it's likely a bot
    if (req.body._honey) {
        // Silently reject: return success to fool the bot, but don't process
        return res.status(200).json({ success: true, msg: "Enquiry submitted successfully" });
    }
    next();
};

// Apply security middleware to the route
router.post("/submit", enquiryLimiter, checkHoneypot, createEnquiry);

// Get all enquiries (Admin only)
const auth = require("../middleware/auth");
const { getAllEnquiries } = require("../controllers/enquiry");
router.get("/all", auth, getAllEnquiries);

module.exports = router;
