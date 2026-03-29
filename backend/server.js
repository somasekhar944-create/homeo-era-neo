require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Routes
const trainingRoutes = require("./modules/training/trainingRoutes");
const quizRoutes = require("./modules/quiz/quizRoutes");
const analyticsRoutes = require("./modules/analytics/analyticsRoutes");
const notesRoutes = require("./services/notesGenerator/notesRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();
const PORT = Number(process.env.PORT) || 10000;

// Request Logging
app.use((req, res, next) => {
  console.log("Incoming Request:", req.method, req.url);
  next();
});

// Middleware
const allowedOrigins = ["http://localhost:5173", process.env.FRONTEND_URL].filter(Boolean);
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src *; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'");
  next();
});
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { family: 4 })
.then(() => console.log("✅ Database Connected"))
.catch(err => console.error("❌ DB Error:", err));

// API Routes (Mounted Above 404 Handler)
app.get("/api/test", (req, res) => res.json({ status: "OK" }));
app.use("/api/training", trainingRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/users", userRoutes);

// Catch-All 404 Handler (Placed after all routes)
app.use((req, res) => {
  console.log("404 Error at:", req.method, req.originalUrl);
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

app.listen(PORT, '0.0.0.0', () => console.log('Server live on ' + PORT));
