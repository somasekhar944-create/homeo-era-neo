const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { Syllabus, PreviousYearQuestion, ExamResult, GeneratedExam } = require("./models");
const User = require("../../models/User");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const auth = require("../../middleware/auth");

// Initialize AI Model - STRICT MODEL LOCK: gemini-2.5-flash
const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
let model = null;
if (API_KEY && API_KEY !== "your_gemini_api_key_here") {
  const genAI = new GoogleGenerativeAI(API_KEY);
  model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  console.log("✅ Training Controller: Gemini 2.5 Flash Model Locked.");
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Utility to shuffle
const shuffleArray = (array) => {
  if (!array || !Array.isArray(array)) return [];
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// GET /api/training/exam/:weekNumber - PG Training Exam Generation
router.get("/exam/:weekNumber", auth, async (req, res) => {
  try {
    let { weekNumber } = req.params;
    if (typeof weekNumber === 'string' && weekNumber.startsWith('week-')) {
      weekNumber = weekNumber.replace('week-', '');
    }
    weekNumber = parseInt(weekNumber, 10);

    if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 24) {
      return res.status(400).json({ message: "Invalid week number." });
    }

    const isMonthlyMock = weekNumber % 4 === 0;
    const type = isMonthlyMock ? 'monthly' : 'weekly';
    
    // --- Rule-Based Counts ---
    const TARGET_TOTAL = isMonthlyMock ? 60 : 50; 
    const TARGET_PYQ = Math.floor(TARGET_TOTAL * 0.4); // 40% PYQ
    const TARGET_AI = TARGET_TOTAL - TARGET_PYQ;     // 60% AI

    // 1. Check for Existing Exam
    const existingExam = await GeneratedExam.findOne({ weekNumber, type });
    if (existingExam && existingExam.questions && existingExam.questions.length >= TARGET_TOTAL) {
      return res.status(200).json({ 
        examQuestions: existingExam.questions, 
        totalQuestions: existingExam.questions.length,
        timeLimit: 60,
        weekNumber
      });
    }

    // 2. Week 1 Static Fallback
    if (weekNumber === 1 && !isMonthlyMock) {
      const staticPath = path.join(__dirname, "data/Previous Year Questions.json");
      if (fs.existsSync(staticPath)) {
        const fullData = JSON.parse(fs.readFileSync(staticPath, "utf8"));
        const week1Qs = fullData.filter(q => q.id && q.id.startsWith("w1_")).slice(0, TARGET_TOTAL);
        if (week1Qs.length >= 20) {
           return res.status(200).json({ examQuestions: week1Qs, totalQuestions: week1Qs.length, timeLimit: 60, weekNumber: 1 });
        }
      }
    }

    // 3. Fetch PYQs
    const pyqs = await PreviousYearQuestion.aggregate([
      { $match: { week: { $lte: weekNumber, $gt: 0 } } },
      { $sample: { size: TARGET_PYQ } }
    ]);

    // 4. Fetch Syllabus and Generate AI Questions
    const cumulativeSyllabus = await Syllabus.find({ week: { $lte: weekNumber } });
    let materiaMedica = [], organonTopics = [], alliedTopics = [];
    cumulativeSyllabus.forEach(s => {
      if (s.materia_medica) materiaMedica.push(...s.materia_medica);
      if (s.organon) organonTopics.push(s.organon);
      if (s.allied_subjects) {
        for (let [sub, topic] of s.allied_subjects) alliedTopics.push(`${sub}: ${topic}`);
      }
    });
    
    const syllabusSummary = `Materia Medica: ${materiaMedica.slice(-10).join(", ")}; Organon: ${organonTopics.slice(-5).join(", ")}; Allied: ${alliedTopics.slice(-5).join(", ")}`;
    
    let aiQuestions = [];
    if (model) {
      const aiPrompt = `Generate EXACTLY ${TARGET_AI} clinical MCQs for Homoeopathy PG (Weeks 1 to ${weekNumber}). 
      Syllabus: ${syllabusSummary}
      Return ONLY a JSON array: [{ "question": "...", "options": ["...", "...", "...", "..."], "answer": "...", "topic": "...", "explanation": "...", "subject": "..." }]`;

      try {
        const aiResult = await model.generateContent(aiPrompt);
        const text = aiResult.response.text();
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) aiQuestions = JSON.parse(jsonMatch[0]).slice(0, TARGET_AI);
      } catch (err) {
        console.error("AI Generation Failed, falling back to more PYQs");
      }
    }

    // 5. Fill gaps with more PYQs if AI failed
    if (aiQuestions.length < TARGET_AI) {
      const extraPyqs = await PreviousYearQuestion.aggregate([
        { $match: { _id: { $nin: pyqs.map(p => p._id) } } },
        { $sample: { size: TARGET_AI - aiQuestions.length } }
      ]);
      pyqs.push(...extraPyqs);
    }

    // 6. Format and Combine
    const formattedPYQs = pyqs.map(q => ({
      _id: q._id, id: q.id, question: q.question || q.questionText, options: q.options,
      subject: q.subject || "General", topic: q.topic || "General",
      explanation: q.explanation || "Refer to standard texts.", answer: q.answer || q.correctAnswer
    }));

    const formattedAIs = aiQuestions.map(q => ({
      _id: new mongoose.Types.ObjectId(), question: q.question, options: q.options,
      subject: q.subject || "General AI", topic: q.topic || "General",
      explanation: q.explanation || "Mentor Insight via AI.", answer: q.answer || q.correctAnswer
    }));

    const completePaper = shuffleArray([...formattedPYQs, ...formattedAIs]);

    // 7. Save and Send
    if (completePaper.length > 0) {
      await GeneratedExam.findOneAndUpdate(
        { weekNumber, type },
        { $set: { questions: completePaper, createdAt: new Date() } },
        { upsert: true }
      );
    }

    res.status(200).json({ examQuestions: completePaper, totalQuestions: completePaper.length, timeLimit: 60, weekNumber });
  } catch (error) {
    console.error("Exam Generation Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// POST /api/training/submit-exam - Robust Submission
router.post("/submit-exam", auth, async (req, res) => {
  try {
    const { weekNumber, examType, userAnswers, totalQuestions, timeTaken } = req.body;
    const uid = req.user.id;
    let correct = 0, wrong = 0, unattempted = 0;
    const questionsAttempted = [];
    const subjectAnalysis = {};

    for (const ans of userAnswers) {
      let q = null;
      if (mongoose.isValidObjectId(ans.questionId)) {
        q = await PreviousYearQuestion.findById(ans.questionId);
      } else {
        q = await PreviousYearQuestion.findOne({ id: ans.questionId });
      }
      
      // Fallback to submitted data if not in DB
      if (!q) {
        q = { 
          answer: ans.correctAnswer, question: ans.questionText, 
          subject: ans.subject || "General", topic: ans.topic || "General", 
          explanation: ans.explanation 
        };
      }
      
      const uAns = ans.answer ? String(ans.answer).trim().toLowerCase() : "";
      
      let cAns = "";
      if (q.options && q.correctAnswer !== undefined && (typeof q.correctAnswer === 'number' || (!isNaN(q.correctAnswer) && q.correctAnswer !== ""))) {
          const idx = parseInt(q.correctAnswer, 10);
          cAns = (idx >= 0 && idx < q.options.length) ? q.options[idx] : (q.answer || q.correctAnswer);
      } else {
          cAns = q.answer || q.correctAnswer;
      }
      cAns = String(cAns).trim().toLowerCase();
      
      const isCorrect = (uAns === cAns);
      if (!ans.answer) unattempted++;
      else if (isCorrect) correct++;
      else wrong++;
      
      const sub = q.subject || "General";
      if (!subjectAnalysis[sub]) subjectAnalysis[sub] = { subject: sub, total: 0, correct: 0, wrong: 0, unattempted: 0 };
      subjectAnalysis[sub].total++;
      if (!ans.answer) subjectAnalysis[sub].unattempted++;
      else if (isCorrect) subjectAnalysis[sub].correct++;
      else subjectAnalysis[sub].wrong++;

      questionsAttempted.push({
        questionId: ans.questionId,
        userAnswer: ans.answer,
        correctAnswer: q.answer || q.correctAnswer,
        isCorrect,
        topic: q.topic,
        question: q.question || q.questionText,
        explanation: q.explanation
      });
    }

    const score = (correct * 4) - (wrong * 1);
    const result = new ExamResult({
      userId: uid, weekNumber, examType, score, correctAnswers: correct, wrongAnswers: wrong, unattempted, totalQuestions, timeTaken,
      subjectAnalysis: Object.values(subjectAnalysis).map(s => ({ ...s, percentage: s.total > 0 ? (s.correct / s.total) * 100 : 0 })),
      questionsAttempted
    });

    await result.save();
    res.status(200).json({ message: "Success", result });
  } catch (err) {
    console.error("Submission Error:", err);
    res.status(500).json({ message: "Submission failed", error: err.message });
  }
});

// GET /api/training/results/:examId
router.get("/results/:examId", auth, async (req, res) => {
  try {
    const { examId } = req.params;
    let weekNumber = parseInt(examId.replace("week-", ""), 10);
    const query = { $or: [ { weekNumber: isNaN(weekNumber) ? -1 : weekNumber }, { _id: mongoose.isValidObjectId(examId) ? examId : new mongoose.Types.ObjectId() } ] };
    const result = await ExamResult.findOne(query).sort({ submissionDate: -1 }).lean();
    if (!result) return res.status(404).json({ message: "No results found." });

    // Global Rank
    const totalBetter = await ExamResult.countDocuments({ weekNumber: result.weekNumber, score: { $gt: result.score } });
    
    res.status(200).json({ ...result, rank: totalBetter + 1 });
  } catch (err) {
    res.status(500).json({ message: "Error fetching results" });
  }
});

// GET /api/training/explanation/:questionId
router.get("/explanation/:questionId", auth, async (req, res) => {
  try {
    const { questionId } = req.params;
    let question = await PreviousYearQuestion.findById(mongoose.isValidObjectId(questionId) ? questionId : null);
    if (!question) question = await PreviousYearQuestion.findOne({ id: questionId });
    if (!question) return res.status(404).json({ message: "Question not found" });

    if (question.explanation && !question.explanation.includes("Refer to standard")) {
      return res.status(200).json({ explanation: question.explanation });
    }

    if (!model) return res.status(503).json({ message: "AI Unavailable" });
    const aiResult = await model.generateContent(`Provide a clinical explanation for: ${question.question}\nAnswer: ${question.answer}`);
    const explanation = aiResult.response.text().trim();
    question.explanation = explanation;
    await question.save();
    res.status(200).json({ explanation });
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
});

module.exports = router;
