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
const bookRoutes = require("./routes/bookRoutes");

const app = express();
const PORT = Number(process.env.PORT) || 10000;

// Request Logging
app.use((req, res, next) => {
  console.log("Incoming Request:", req.method, req.url);
  next();
});

// Middleware
app.use(cors({
  origin: [/https:\/\/homeo-era-neo.*\.vercel\.app$/, 'https://homeo-era-neo.vercel.app', 'https://homeo-era-neo-git-main-somasekhar944-creates-projects.vercel.app'],
  credentials: true
}));
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src *; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'");
  next();
});
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { family: 4 })
.then(async () => {
  console.log("✅ Database Connected");
  
  // Auto-Seed Syllabus if empty
  const { Syllabus, PreviousYearQuestion } = require("./modules/training/models");
  const syllabusCount = await Syllabus.countDocuments();
  if (syllabusCount === 0) {
    console.log("Empty Syllabus detected. Auto-seeding...");
    const syllabusPath = path.join(__dirname, "modules/training/data/pg exam syllubs.json");
    if (fs.existsSync(syllabusPath)) {
      const syllabusData = JSON.parse(fs.readFileSync(syllabusPath, "utf8"));
      await Syllabus.insertMany(syllabusData);
      console.log(`✅ Successfully auto-seeded ${syllabusData.length} syllabus entries.`);
    }
  }

  // Auto-Seed PYQs if empty (Crucial for Week 1 exam)
  const pyqCount = await PreviousYearQuestion.countDocuments();
  if (pyqCount === 0) {
    console.log("Empty PYQ collection detected. Auto-seeding...");
    const pyqPath = path.join(__dirname, "modules/training/data/Previous Year Questions.json");
    if (fs.existsSync(pyqPath)) {
      const pyqData = JSON.parse(fs.readFileSync(pyqPath, "utf8"));
      const processedData = pyqData.map(q => {
        let week = 0;
        if (q.id && typeof q.id === 'string') {
          const match = q.id.match(/^w(\d+)/);
          if (match) week = parseInt(match[1], 10);
        }
        return { ...q, week: q.week || week };
      });
      await PreviousYearQuestion.insertMany(processedData);
      console.log(`✅ Successfully auto-seeded ${processedData.length} questions.`);
    }
  }
})
.catch(err => console.error("❌ DB Error:", err));

// API Routes (Mounted Above 404 Handler)
app.get("/api/test", (req, res) => res.json({ status: "OK" }));
app.use("/api/training", trainingRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/user", analyticsRoutes); // Support /api/user/profile and other user-specific routes
app.use("/api/notes", notesRoutes);
app.use("/api/users", userRoutes);
app.use("/api/books", bookRoutes);

// Catch-All 404 Handler (Placed after all routes)
app.use((req, res) => {
  console.log("404 Error at:", req.method, req.originalUrl);
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

app.listen(PORT, '0.0.0.0', () => console.log('Server live on ' + PORT));
