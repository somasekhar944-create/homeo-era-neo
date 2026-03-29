const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");
const { sendSMS, sendEmail } = require("../services/notificationService");

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key_here";

// POST /api/users/signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if user exists
    let user = await User.findOne({ $or: [{ email }, { phone }] });
    if (user) {
      return res.status(400).json({ message: "User with this email or mobile number already exists." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (Auto-verified as per instructions)
    user = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      isVerified: true,
      role: "student"
    });

    await user.save();

    // Create JWT
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({
      message: "Signup successful. Redirecting to dashboard.",
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone }
    });
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ message: "Error during signup", error: err.message });
  }
});

// POST /api/users/verify-otp (RETAINED FOR COMPATIBILITY BUT UNUSED)
router.post("/verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const user = await User.findOne({ phone, otp, otpExpires: { $gt: new Date() } });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Create JWT
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

    res.status(200).json({ message: "Account verified successfully.", token, user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ message: "Verification error", error: err.message });
  }
});

// POST /api/users/login
router.post("/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    // Find user by phone number ONLY (reverted from email support)
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(400).json({ message: "Invalid mobile number or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid mobile number or password." });
    }

    // Create JWT
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

    res.status(200).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ message: "Login error", error: err.message });
  }
});

// POST /api/users/complete-profile
router.post("/complete-profile", auth, async (req, res) => {
  try {
    const { phone } = req.body;
    const userId = req.user.id;

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required." });
    }

    // Basic 10-digit validation
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: "Please enter a valid 10-digit phone number." });
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: "Phone number already in use." });
    }

    const user = await User.findByIdAndUpdate(userId, { phone }, { new: true });
    res.status(200).json({ 
      message: "Profile updated successfully", 
      user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone } 
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating profile", error: error.message });
  }
});

// GET all users with optional search
router.get("/", async (req, res) => {
  console.log("GET /api/users request received in userRoutes.");
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    const users = await User.find(query).select("-password");
    console.log(`Found ${users.length} users.`);
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users in userRoutes:", error);
    res.status(500).json({ message: "Error fetching users", error: error.message });
  }
});

// PUT update user role
router.put("/:id/role", async (req, res) => { // isAdmin temporarily removed for testing
  console.log("PUT /api/users/:id/role request received in userRoutes.");
  try {
    const { id } = req.params;
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(id, { role }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });
    console.log(`User ${user.email} role updated to ${role}.`);
    res.status(200).json({ message: "User role updated successfully", user });
  } catch (error) {
    console.error("Error updating user role in userRoutes:", error);
    res.status(500).json({ message: "Error updating user role", error: error.message });
  }
});

// DELETE user
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  console.log("DELETE /api/users/:id request received in userRoutes.");
  console.log("Attempting to delete user with ID:", id);
  try {
    await User.findByIdAndDelete(id);
    console.log(`User ${id} deleted from DB.`);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user in userRoutes:", error);
    res.status(500).json({ message: "Error deleting user", error: error.message });
  }
});

module.exports = router;