const express = require("express");
const { 
  registerUser, 
  authUser, 
  allUsers, 
  getUserProfile, 
  updateUserProfile, 
  updateUserStatus, 
  getUserById 
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/").get(protect, allUsers);
router.route("/register").post(registerUser);
router.route("/login").post(authUser);
router.route("/profile").get(protect, getUserProfile).put(protect, updateUserProfile);
router.route("/status").put(protect, updateUserStatus);
router.route("/:id").get(protect, getUserById);

module.exports = router;
