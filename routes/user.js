const express = require("express");
const router = express.Router();

const {
    login,
    register,
    dashboard,
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getProfile,
    updateProfile
} = require("../controllers/user");
const authMiddleware = require('../middleware/auth')

router.route("/login").post(login);
router.route("/register").post(register);
router.route("/dashboard").get(authMiddleware, dashboard);

// Admin User CRUD Routes
router.route("/users").get(getAllUsers).post(createUser);
router.route("/users/:id").get(getUserById).put(updateUser).delete(deleteUser);

// Profile Routes
router.route("/profile").get(authMiddleware, getProfile).put(authMiddleware, updateProfile);

module.exports = router;