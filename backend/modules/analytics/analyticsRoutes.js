const express = require("express");
const router = express.Router();
const User = require("../../models/User");
const Vault = require("../../models/Vault");
const { ExamResult } = require("../training/models");
const auth = require("../../middleware/auth");
const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Model Lock: gemini-2.5-flash
let aiModel = null;
if (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY) {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);
  aiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// POST /api/user/vault/add - Add a question to the user's vault
router.post("/vault/add", auth, async (req, res) => {
  try {
    const { question, options, correctAnswer, explanation, originalQuestionId } = req.body;
    const uid = req.user.id;

    if (!question || !options || correctAnswer === undefined || !explanation) {
      return res.status(400).json({ message: "Missing required question fields." });
    }

    const vaultEntry = new Vault({
      userId: uid,
      question,
      options,
      correctAnswer,
      explanation,
      originalQuestionId: originalQuestionId || null
    });
    await vaultEntry.save();
    res.status(201).json({ message: "Added to Vault successfully", vaultEntry });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Question already in vault for this user." });
    }
    res.status(500).json({ message: "Error adding to vault", error: error.message });
  }
});

// GET /api/user/vault
router.get("/vault", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const vaultItems = await Vault.find({ userId }).sort({ addedAt: -1 });
    const bookmarkedData = vaultItems.map(item => ({
      _id: item.originalQuestionId || item._id,
      question: item.question,
      options: item.options,
      correctAnswer: item.correctAnswer,
      explanation: item.explanation,
      addedAt: item.addedAt,
      vaultId: item._id
    }));
    res.status(200).json(bookmarkedData);
  } catch (err) {
    res.status(500).json({ message: "Error fetching vault", error: err.message });
  }
});

// DELETE /api/user/vault/:vaultId
router.delete("/vault/:vaultId", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { vaultId } = req.params; 
    await Vault.findOneAndDelete({ userId, _id: vaultId }); 
    res.status(200).json({ message: "Removed from Vault" });
  } catch (err) {
    res.status(500).json({ message: "Error removing from vault", error: err.message });
  }
});

// GET /api/user/profile
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: "Error fetching profile", error: err.message });
  }
});

// GET /api/analytics/performance
router.get("/performance", auth, async (req, res) => {
  try {
    const userId = req.user.id; 
    
    const recentResults = await ExamResult.find({ userId }).sort({ submissionDate: -1 }).limit(4);
    const allResults = await ExamResult.find({ userId });
    const subjectStats = {};

    allResults.forEach(res => {
      res.subjectAnalysis.forEach(sub => {
        if (!subjectStats[sub.subject]) {
          subjectStats[sub.subject] = { total: 0, correct: 0 };
        }
        subjectStats[sub.subject].total += sub.total;
        subjectStats[sub.subject].correct += sub.correct;
      });
    });

    const strengthData = Object.keys(subjectStats).map(subject => ({
      subject,
      percentage: subjectStats[subject].total > 0 ? (subjectStats[subject].correct / subjectStats[subject].total) * 100 : 0
    }));

    const trendData = [...recentResults].reverse().map(res => ({
      week: `Week ${res.weekNumber}`,
      score: res.score
    }));

    const recentScore = (recentResults.length > 0) ? recentResults[0].score : 0;
    const currentWeek = (recentResults.length > 0) ? recentResults[0].weekNumber : 1;

    // --- RANKING LOGIC ---
    
    // 1. Weekly Rank
    const allWeekScores = await ExamResult.find({ weekNumber: currentWeek }).sort({ score: -1, timeTaken: 1 });
    const weeklyRank = allWeekScores.findIndex(s => s.userId.toString() === userId.toString()) + 1 || 1;
    const totalWeeklyStudents = allWeekScores.length;

    // 2. Monthly Rank (Total aggregated score) - Fixed 500 Error & Aggregation
    const monthlyLeaderboard = await ExamResult.aggregate([
      { $group: { _id: "$userId", totalScore: { $sum: "$score" }, totalTime: { $sum: "$timeTaken" } } },
      { $sort: { totalScore: -1, totalTime: 1 } }
    ]);
    const monthlyRank = monthlyLeaderboard.findIndex(s => s._id.toString() === userId.toString()) + 1 || 1;
    const totalMonthlyStudents = monthlyLeaderboard.length;

    // 3. Marks away from Top 10 (Weekly)
    let marksAwayFromTop10 = 0;
    if (weeklyRank > 10 && allWeekScores.length >= 10) {
      const top10Threshold = allWeekScores[9].score;
      marksAwayFromTop10 = Math.max(0, top10Threshold - recentScore);
    }

    // 4. Percentile Calculation
    const percentile = totalWeeklyStudents > 0 ? ((totalWeeklyStudents - weeklyRank) / totalWeeklyStudents) * 100 : 0;

    // Generate AI Motivational Quote (Model Lock: gemini-2.5-flash)
    let motivationalQuote = "Your potential is unlimited, Doctor. Let's keep moving forward!";
    if (aiModel) {
      let attempts = 0;
      while (attempts < MAX_RETRIES) {
        try {
          const lowSubjects = strengthData.filter(s => s.percentage < 50).map(s => s.subject);
          let prompt = `Generate a short, professional, and encouraging motivational quote for a medical student named Doctor. Score: ${recentScore}, Rank: ${weeklyRank}. Improvement area: ${lowSubjects.join(", ") || "General Study"}. Keep it under 20 words.`;
          const result = await aiModel.generateContent(prompt, { requestOptions: { timeout: 15000 } });
          motivationalQuote = result.response.text().trim().replace(/^"|"$/g, '');
          break;
        } catch (err) {
          attempts++;
          if (attempts < MAX_RETRIES) await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        }
      }
    }

    const completedWeeks = allResults.map(r => r.weekNumber);
    const user = await User.findById(userId);
    const trainingSchedule = user ? user.trainingSchedule : [];

    res.status(200).json({
      strengthData,
      trendData,
      recentScore,
      motivationalQuote,
      percentile: Math.round(percentile),
      weeklyRank,
      monthlyRank,
      totalWeeklyStudents,
      totalMonthlyStudents,
      marksAwayFromTop10,
      currentWeek,
      trainingSchedule,
      completedWeeks
    });
  } catch (err) {
    console.error("Performance Error:", err);
    res.status(500).json({ message: "Error fetching performance", error: err.message });
  }
});

// GET /api/analytics/leaderboard/:weekNumber
router.get("/leaderboard/:weekNumber", async (req, res) => {
  try {
    const weekNumber = parseInt(req.params.weekNumber);
    const leaderboard = await ExamResult.find({ weekNumber }).sort({ score: -1, timeTaken: 1 }).limit(10);
    const names = ["Dr. Somasekhar", "Dr. Anita", "Dr. Rahul", "Dr. Priya", "Dr. Arjun", "Dr. Sneha", "Dr. Vikas", "Dr. Meera", "Dr. Rohan", "Dr. Kavita"];
    const formatted = leaderboard.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      name: r.userId === "guest_user" ? "Dr. Somasekhar (You)" : (names[i] || "Doctor"),
      score: r.score,
      timeTaken: `${Math.floor(r.timeTaken / 60)}m ${r.timeTaken % 60}s`
    }));
    res.status(200).json(formatted);
  } catch (err) {
    res.status(500).json({ message: "Error fetching leaderboard", error: err.message });
  }
});

// GET /api/analytics/leaderboard/monthly
router.get("/leaderboard-monthly", async (req, res) => {
  try {
    const monthlyLeaderboard = await ExamResult.aggregate([
      { $group: { _id: "$userId", totalScore: { $sum: "$score" }, totalTime: { $sum: "$timeTaken" } } },
      { $sort: { totalScore: -1, totalTime: 1 } },
      { $limit: 10 }
    ]);
    const names = ["Dr. Anita", "Dr. Rahul", "Dr. Priya", "Dr. Somasekhar", "Dr. Arjun", "Dr. Sneha", "Dr. Vikas", "Dr. Meera", "Dr. Rohan", "Dr. Kavita"];
    const formatted = monthlyLeaderboard.map((r, i) => ({
      rank: i + 1,
      userId: r._id,
      name: r._id === "guest_user" ? "Dr. Somasekhar (You)" : (names[i] || "Doctor"),
      score: r.totalScore,
      timeTaken: `${Math.floor(r.totalTime / 60)}m ${r.totalTime % 60}s`
    }));
    res.status(200).json(formatted);
  } catch (err) {
    res.status(500).json({ message: "Error fetching monthly leaderboard", error: err.message });
  }
});

module.exports = router;
