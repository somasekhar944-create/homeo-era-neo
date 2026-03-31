const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const { Syllabus, PreviousYearQuestion, ExamResult, GeneratedExam } = require("./models");
const User = require("../../models/User");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require("mongoose");
const auth = require("../../middleware/auth");

// Initialize AI Model - STRICT MODEL LOCK: gemini-2.5-flash
const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

let model = null;
if (API_KEY && API_KEY !== "your_gemini_api_key_here") {
  const genAI = new GoogleGenerativeAI(API_KEY);
  // Reverted/Locked to gemini-2.5-flash as per user command
  model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  console.log("✅ Training Controller: Gemini 2.5 Flash Model Locked.");
} else {
  console.error("❌ Training Controller: API_KEY missing.");
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Utility to shuffle intermix
const shuffleArray = (array) => {
  if (!array || !Array.isArray(array)) return [];
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// GET /api/training/exam/:weekNumber - PG Training Hybrid Logic (50/100)
router.get("/exam/:weekNumber", auth, async (req, res) => {
  try {
    let { weekNumber } = req.params;
    // Support both "1" and "week-1" format for flexibility
    if (typeof weekNumber === 'string' && weekNumber.startsWith('week-')) {
      weekNumber = weekNumber.replace('week-', '');
    }
    weekNumber = parseInt(weekNumber, 10);
    const userId = req.user.id;

    if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 24) {
      return res.status(400).json({ message: "Invalid week number." });
    }

    const isMonthlyMock = weekNumber % 4 === 0;
    const type = isMonthlyMock ? 'monthly' : 'weekly';
    
    const TARGET_TOTAL = isMonthlyMock ? 100 : 50;
    const TARGET_PYQ = isMonthlyMock ? 40 : 20;
    const TARGET_AI = isMonthlyMock ? 60 : 30;
    const TIME_LIMIT = isMonthlyMock ? 120 : 60; 

    // --- STEP 1: Check DB First ---
    const existingExam = await GeneratedExam.findOne({ weekNumber, type });
    if (existingExam && existingExam.questions && existingExam.questions.length >= TARGET_TOTAL) {
      console.log(`Serving Exam from Database: Week ${weekNumber} (${type})`);
      return res.status(200).json({ 
        examQuestions: existingExam.questions, 
        isMonthlyMock,
        totalQuestions: existingExam.questions.length,
        timeLimit: TIME_LIMIT,
        weekNumber,
        syllabusCovered: `Weeks 1 to ${weekNumber}`
      });
    }

    // --- NEW: Static File Fallback for Week 1 (Corrected Path) ---
    if (weekNumber === 1 && !isMonthlyMock) {
      console.log("Week 1 exam requested. Attempting to load static file...");
      const staticExamPath = path.join(__dirname, "data/Previous Year Questions.json");
      if (fs.existsSync(staticExamPath)) {
        const fullData = JSON.parse(fs.readFileSync(staticExamPath, "utf8"));
        // Filter for week 1 questions
        const week1Qs = fullData.filter(q => q.id && q.id.startsWith("w1_")).slice(0, 50);
        if (week1Qs.length > 0) {
           console.log(`Found ${week1Qs.length} static questions for Week 1.`);
           return res.status(200).json({
             examQuestions: week1Qs,
             isMonthlyMock: false,
             totalQuestions: week1Qs.length,
             timeLimit: 60,
             weekNumber: 1
           });
        }
      }
    }

    // Clear incomplete
    if (existingExam) {
       await GeneratedExam.deleteOne({ _id: existingExam._id });
    }

    console.log(`Generating New Hybrid Exam via Gemini 2.5 Flash: Week ${weekNumber} (${type})`);

    // --- STEP 2: PYQ Fetch ---
    const pyqs = await PreviousYearQuestion.aggregate([
      { 
        $match: { 
          isAI: { $ne: true }, 
          isUsedInStaticPaper: { $ne: true }, 
          week: { $lte: weekNumber, $gt: 0 } 
        } 
      },
      { $sample: { size: TARGET_PYQ } }
    ]);

    // --- STEP 3: AI Fetch (MANDATORY Hybrid) ---
    const cumulativeSyllabus = await Syllabus.find({ week: { $lte: weekNumber } });
    const materiaMedica = [];
    const organonTopics = [];
    const alliedTopics = [];
    cumulativeSyllabus.forEach(s => {
      if (s.materia_medica) materiaMedica.push(...s.materia_medica);
      if (s.organon) organonTopics.push(s.organon);
      if (s.allied_subjects) {
        for (let [sub, topic] of s.allied_subjects) {
          alliedTopics.push(`${sub}: ${topic}`);
        }
      }
    });
    const syllabusSummary = `Materia Medica: ${materiaMedica.join(", ")}; Organon: ${organonTopics.join(", ")}; Allied: ${alliedTopics.join(", ")}`;

    let aiQuestions = [];
    if (model) {
      const aiPrompt = `Generate EXACTLY ${TARGET_AI} clinical MCQs for Homoeopathy PG strictly from the syllabus of Week 1 to Week ${weekNumber}.
       Syllabus: ${syllabusSummary}
       Format: JSON array of objects: { "question": "...", "options": ["...", "...", "...", "..."], "answer": "...", "topic": "...", "explanation": "...", "subject": "..." }.
       Ensure exactly ${TARGET_AI} questions.`;

      let attempts = 0;
      while (attempts < MAX_RETRIES) {
        try {
          const aiResult = await model.generateContent(aiPrompt, { requestOptions: { timeout: 30000 } });
          const text = aiResult.response.text();
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const aiQs = JSON.parse(jsonMatch[0]);
            aiQuestions = aiQs.slice(0, TARGET_AI).map(q => ({
              ...q,
              week: weekNumber,
              isAI: true,
              source: "PG-Mentor Model Question"
            }));
            break;
          }
        } catch (err) {
          attempts++;
          if (attempts < MAX_RETRIES) await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        }
      }
    }

    // --- STEP 4: Merge Logic ---
    const formattedPYQs = pyqs.map(q => ({
      _id: q._id,
      question: `[${q.source || "AIAPGET"}${q.year ? ' ' + q.year : ''}] ${q.question}`,
      options: q.options,
      subject: q.subject || q.topic || "General",
      topic: q.topic || "General",
      source: q.source || "AIAPGET",
      explanation: q.explanation || "Refer to standard textbooks.",
      answer: q.answer,
      isAI: false
    }));

    const formattedAIs = aiQuestions.map(q => ({
      _id: new mongoose.Types.ObjectId(),
      question: `[PG-Mentor Model Question] ${q.question}`,
      options: q.options,
      subject: q.subject || q.topic || "General",
      topic: q.topic || "General",
      source: "PG-Mentor Model Question",
      explanation: q.explanation || "Mentor Insight provided via AI.",
      answer: q.answer,
      isAI: true
    }));

    const completePaper = shuffleArray([...formattedPYQs, ...formattedAIs]);
    console.log(`Total Questions: ${completePaper.length}`);

    if (completePaper.length < TARGET_TOTAL) {
       return res.status(500).json({ message: "Incomplete paper generated." });
    }

    // --- STEP 5: Save (Persistence) ---
    try {
      await GeneratedExam.findOneAndUpdate(
        { weekNumber, type },
        { $setOnInsert: { weekNumber, type, questions: completePaper, createdAt: new Date() } },
        { upsert: true, new: true }
      );
      const pyqIds = pyqs.map(q => q._id);
      if (pyqIds.length > 0) {
        await PreviousYearQuestion.updateMany({ _id: { $in: pyqIds } }, { $set: { isUsedInStaticPaper: true } });
      }
    } catch (saveErr) {
      console.error("Save Error:", saveErr.message);
    }

    res.status(200).json({ examQuestions: completePaper, isMonthlyMock, totalQuestions: completePaper.length, weekNumber });
  } catch (error) {
    console.error("Critical Error:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
});

// GET /api/training/leaderboard/:weekNumber
router.get("/leaderboard/:weekNumber", auth, async (req, res) => {
  try {
    const leaderboard = await ExamResult.find({ weekNumber: req.params.weekNumber }).sort({ score: -1 }).limit(10);
    res.status(200).json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: "Error", error: error.message });
  }
});

// POST /api/training/submit-exam
router.post("/submit-exam", auth, async (req, res) => {
  try {
    const { weekNumber, examType, userAnswers, totalQuestions, timeTaken } = req.body;
    const uid = req.user.id;
    let correct = 0, wrong = 0, unattempted = 0;
    const questionsAttempted = [];
    const subjectAnalysis = {};

    for (const ans of userAnswers) {
      let q = await PreviousYearQuestion.findById(ans.questionId);
      // Important fallback for missing data
      if (!q) {
        q = { 
          answer: ans.correctAnswer, 
          question: ans.questionText || "Question text not found.",
          subject: ans.subject, 
          topic: ans.topic,
          explanation: ans.explanation || "No explanation recorded."
        };
      }
      
      const uAns = ans.answer ? String(ans.answer).trim().toLowerCase() : "";
      
      // Handle potential index/text in answer or correctAnswer
      let cAns = "";
      if (q.options && q.correctAnswer !== undefined && (typeof q.correctAnswer === 'number' || (!isNaN(q.correctAnswer) && q.correctAnswer !== ""))) {
          const index = parseInt(q.correctAnswer, 10);
          if (index >= 0 && index < q.options.length) {
              cAns = q.options[index];
          } else {
              cAns = q.answer || q.correctAnswer;
          }
      } else {
          cAns = q.answer || q.correctAnswer;
      }
      cAns = String(cAns).trim().toLowerCase();
      
      const isCorrect = (uAns === cAns);
      if (ans.answer) { if (isCorrect) correct++; else wrong++; } else unattempted++;
      
      const sub = q.subject || "General";
      if (!subjectAnalysis[sub]) subjectAnalysis[sub] = { subject: sub, total: 0, correct: 0, wrong: 0, unattempted: 0 };
      subjectAnalysis[sub].total++;
      if (ans.answer) { if (isCorrect) subjectAnalysis[sub].correct++; else subjectAnalysis[sub].wrong++; } else subjectAnalysis[sub].unattempted++;

      questionsAttempted.push({
        questionId: ans.questionId,
        userAnswer: ans.answer,
        correctAnswer: q.answer || q.correctAnswer,
        isCorrect,
        topic: q.topic,
        question: q.question || q.questionText, // Preserve full data
        explanation: q.explanation
      });

      if (mongoose.isValidObjectId(ans.questionId)) {
        await PreviousYearQuestion.findByIdAndUpdate(ans.questionId, {
          $addToSet: { usedBy: { userId: uid } }
        });
      }
    }

    const score = (correct * 4) - (wrong * 1);
    const result = new ExamResult({
      userId: uid, weekNumber, examType, score, correctAnswers: correct, wrongAnswers: wrong, unattempted, totalQuestions, timeTaken,
      subjectAnalysis: Object.values(subjectAnalysis).map(s => ({
        ...s,
        percentage: s.total > 0 ? (s.correct / s.total) * 100 : 0
      })),
      questionsAttempted
    });

    await result.save();
    res.status(200).json({ message: "Success", result, leaderboard: await ExamResult.find({ weekNumber }).sort({ score: -1 }).limit(10) });
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});

router.get("/syllabus", async (req, res) => {
  try {
    const syllabus = await Syllabus.find({});
    res.status(200).json(syllabus);
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});

// GET /api/training/bookmarks
router.get("/bookmarks", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const questionIds = user.bookmarks.map(b => b.questionId);
    const questions = await PreviousYearQuestion.find({ _id: { $in: questionIds } });
    const bookmarkedData = questions.map(q => {
      const bookmark = user.bookmarks.find(b => b.questionId.toString() === q._id.toString());
      return { ...q.toObject(), correctCount: bookmark ? bookmark.correctCount : 0, addedAt: bookmark ? bookmark.addedAt : null };
    });
    res.status(200).json(bookmarkedData);
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});

// POST /api/training/toggle-bookmark
router.post("/toggle-bookmark", auth, async (req, res) => {
  try {
    const { questionId } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const bookmarkIndex = user.bookmarks.findIndex(b => b.questionId.toString() === questionId);
    if (bookmarkIndex > -1) {
      user.bookmarks.splice(bookmarkIndex, 1);
      await user.save();
      res.status(200).json({ message: "Bookmark removed", isBookmarked: false });
    } else {
      user.bookmarks.push({ questionId });
      await user.save();
      res.status(200).json({ message: "Bookmark added", isBookmarked: true });
    }
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});

// POST /api/training/update-revision-progress
router.post("/update-revision-progress", auth, async (req, res) => {
  try {
    const { questionId, isCorrect } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const bookmark = user.bookmarks.find(b => b.questionId.toString() === questionId);
    if (bookmark) {
      if (isCorrect) bookmark.correctCount += 1;
      await user.save();
      res.status(200).json({ message: "Progress updated", correctCount: bookmark.correctCount });
    } else {
      res.status(404).json({ message: "Bookmark not found" });
    }
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});

const moment = require("moment");

// POST /api/training/update-exam-day
router.post("/update-exam-day", auth, async (req, res) => {
  try {
    const { preferredDay } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.preferredExamDay && user.lastRescheduledDate && user.role !== 'admin') {
      const lastRescheduled = moment(user.lastRescheduledDate);
      const now = moment();
      if (now.diff(lastRescheduled, 'days') < 30) {
        return res.status(403).json({ message: `Reschedule only once a month.` });
      }
    }

    const baseDate = user.joiningDate || user.createdAt || new Date();
    const schedule = [];
    
    for (let i = 1; i <= 24; i++) {
      // Logic: Week N Exam = startDate + (i * 7 days), adjusted to nearest Preferred Day
      let examDatemoment = moment(baseDate).add(i * 7, 'days');
      
      // Sync with Preferred Day (moving forward to find the next occurrence)
      while (examDatemoment.format('dddd') !== preferredDay) {
        examDatemoment.add(1, 'day');
      }

      schedule.push({
        week: i,
        examDate: examDatemoment.toDate(),
        isMonthlyMock: i % 4 === 0,
      });
    }

    user.joiningDate = baseDate;
    user.preferredExamDay = preferredDay;
    user.trainingSchedule = schedule;
    user.lastRescheduledDate = new Date();
    await user.save();
    res.status(200).json({ success: true, message: "Roadmap generated", schedule });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error", error: err.message });
  }
});

// GET /api/training/results/:examId
router.get("/results/:examId", auth, async (req, res) => {
  try {
    const { examId } = req.params;
    let weekNumber = parseInt(examId.replace("week-", ""), 10);
    const query = { $or: [ { weekNumber: isNaN(weekNumber) ? -1 : weekNumber }, { _id: mongoose.isValidObjectId(examId) ? examId : new mongoose.Types.ObjectId() } ] };
    const result = await ExamResult.findOne(query).sort({ submissionDate: -1 }).populate("questionsAttempted.questionId").lean();
    if (!result) return res.status(404).json({ message: "No results found." });

    // Calculate Rank (Strict Compare with other users)
    const totalBetterScores = await ExamResult.countDocuments({ 
      weekNumber: result.weekNumber, 
      score: { $gt: result.score } 
    });
    const rank = totalBetterScores + 1;

    const enhancedQuestions = result.questionsAttempted.map(attempt => {
      const fullQ = attempt.questionId;
      return { 
        ...attempt, 
        questionId: fullQ ? fullQ._id : attempt.questionId, 
        question: fullQ ? (fullQ.question || fullQ.questionText) : (attempt.question || "Question text not found."), 
        options: fullQ ? fullQ.options : (attempt.options || []), 
        explanation: fullQ ? fullQ.explanation : (attempt.explanation || "Explanation not found."),
        correctAnswer: fullQ ? (fullQ.answer || fullQ.correctAnswer) : attempt.correctAnswer
      };
    });
    res.status(200).json({ ...result, questionsAttempted: enhancedQuestions });
  } catch (err) {
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
});

// GET /api/training/explanation/:questionId
router.get("/explanation/:questionId", auth, async (req, res) => {
  try {
    const { questionId } = req.params;
    const question = await PreviousYearQuestion.findById(questionId);
    if (!question) return res.status(404).json({ message: "Question not found" });

    const existingExplanation = question.explanation || "";
    const genericMarkers = ["Refer to standard textbooks", "Explanation not found"];
    const isGeneric = !existingExplanation || genericMarkers.some(marker => existingExplanation.includes(marker));

    if (!isGeneric) return res.status(200).json({ explanation: existingExplanation });
    if (!model) return res.status(503).json({ message: "AI Service Temporarily Unavailable" });

    const prompt = `Provide a clinical explanation for: ${question.question}\nCorrect Answer: ${question.answer}. Mentor Insight style.`;
    let attempts = 0;
    while (attempts < MAX_RETRIES) {
      try {
        const aiResult = await model.generateContent(prompt);
        const explanation = (await aiResult.response).text().trim();
        question.explanation = explanation;
        await question.save();
        return res.status(200).json({ explanation });
      } catch (aiErr) {
        attempts++;
        if (attempts < MAX_RETRIES) await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      }
    }
    return res.status(503).json({ message: "AI failed", explanation: existingExplanation });
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});

module.exports = router;
