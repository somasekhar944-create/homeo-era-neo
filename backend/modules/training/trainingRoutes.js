const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { Syllabus, PreviousYearQuestion, ExamResult, GeneratedExam } = require("./models");
const User = require("../../models/User");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const auth = require("../../middleware/auth");

// Model Lock: gemini-2.5-flash
const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
let model = null;
if (API_KEY && API_KEY !== "your_gemini_api_key_here") {
  const genAI = new GoogleGenerativeAI(API_KEY);
  model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

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

// GET /api/training/exam/:weekNumber
router.get("/exam/:weekNumber", auth, async (req, res) => {
  try {
    let { weekNumber } = req.params;
    if (typeof weekNumber === 'string' && weekNumber.startsWith('week-')) {
      weekNumber = weekNumber.replace('week-', '');
    }
    weekNumber = parseInt(weekNumber, 10);

    if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 24) return res.status(400).json({ message: "Invalid Week" });

    const isMonthly = weekNumber % 4 === 0;
    const type = isMonthly ? 'monthly' : 'weekly';
    
    // STRICT RATIO: Weekly (20 PYQ, 30 AI) | Monthly (40 PYQ, 60 AI)
    const TARGET_PYQ = isMonthly ? 40 : 20;
    const TARGET_AI = isMonthly ? 60 : 30;
    const TOTAL_QNS = TARGET_PYQ + TARGET_AI;

    // 1. Return existing if valid
    const existing = await GeneratedExam.findOne({ weekNumber, type });
    if (existing && existing.questions && existing.questions.length >= TOTAL_QNS) {
      return res.status(200).json({ examQuestions: existing.questions, totalQuestions: existing.questions.length, timeLimit: 60, weekNumber });
    }

    // 2. Fetch PYQs (Cumulative + No Repetition)
    const pyqs = await PreviousYearQuestion.aggregate([
      { 
        $match: { 
          week: { $lte: weekNumber, $gt: 0 },
          isUsedInTraining: { $ne: true } // Rule: No Repetition
        } 
      },
      { $sample: { size: TARGET_PYQ } }
    ]);

    // 3. Mark PYQs as used
    if (pyqs.length > 0) {
      const ids = pyqs.map(p => p._id);
      await PreviousYearQuestion.updateMany({ _id: { $in: ids } }, { $set: { isUsedInTraining: true } });
    }

    // 4. Cumulative Syllabus for AI
    const syllabus = await Syllabus.find({ week: { $lte: weekNumber } });
    let topics = [];
    syllabus.forEach(s => {
      if (s.materia_medica) topics.push(...s.materia_medica);
      if (s.organon) topics.push(s.organon);
    });
    const syllabusSummary = topics.slice(-15).join(", ");

    // 5. Generate AI Questions
    let aiQs = [];
    if (model) {
      const prompt = `Generate EXACTLY ${TARGET_AI} Homoeopathy PG MCQs. Topics: ${syllabusSummary}. Return JSON array only: [{"question":"...","options":["...","...","...","..."],"answer":"...","explanation":"...","subject":"..."}]`;
      try {
        const result = await model.generateContent(prompt);
        const match = result.response.text().match(/\[[\s\S]*\]/);
        if (match) aiQs = JSON.parse(match[0]).slice(0, TARGET_AI);
      } catch (e) { console.error("AI Fail", e); }
    }

    // 6. Final Formatting with Labels
    const formattedPYQs = pyqs.map(q => ({
      ...q,
      _id: q._id,
      question: q.question || q.questionText,
      answer: q.answer || q.correctAnswer,
      label: `${q.year || '2022'} ${q.source || 'AIAPGET'}`, // Prof. Labeling
      isAI: false
    }));

    const formattedAIs = aiQs.map(q => ({
      ...q,
      _id: new mongoose.Types.ObjectId(),
      label: "AI Generated Model Question", // Prof. Labeling
      isAI: true
    }));

    const finalPaper = shuffleArray([...formattedPYQs, ...formattedAIs]);

    if (finalPaper.length > 0) {
      await GeneratedExam.findOneAndUpdate({ weekNumber, type }, { $set: { questions: finalPaper, createdAt: new Date() } }, { upsert: true });
    }

    res.status(200).json({ examQuestions: finalPaper, totalQuestions: finalPaper.length, timeLimit: 60, weekNumber });
  } catch (err) {
    res.status(500).json({ message: "Error" });
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
      let q = null;
      if (mongoose.isValidObjectId(ans.questionId)) q = await PreviousYearQuestion.findById(ans.questionId);
      if (!q) q = await PreviousYearQuestion.findOne({ id: ans.questionId });
      
      // Fallback
      if (!q) q = { answer: ans.correctAnswer, question: ans.questionText, subject: ans.subject, topic: ans.topic, explanation: ans.explanation };
      
      const uAns = ans.answer ? String(ans.answer).trim().toLowerCase() : "";
      let cAns = "";
      if (q.options && q.correctAnswer !== undefined && !isNaN(q.correctAnswer) && q.correctAnswer !== "") {
          const idx = parseInt(q.correctAnswer, 10);
          cAns = (idx >= 0 && idx < q.options.length) ? q.options[idx] : (q.answer || q.correctAnswer);
      } else { cAns = q.answer || q.correctAnswer; }
      cAns = String(cAns).trim().toLowerCase();
      
      const isCorrect = (uAns === cAns);
      if (!ans.answer) unattempted++; else if (isCorrect) correct++; else wrong++;
      
      const sub = q.subject || "General";
      if (!subjectAnalysis[sub]) subjectAnalysis[sub] = { subject: sub, total: 0, correct: 0, wrong: 0, unattempted: 0 };
      subjectAnalysis[sub].total++;
      if (!ans.answer) subjectAnalysis[sub].unattempted++; else if (isCorrect) subjectAnalysis[sub].correct++; else subjectAnalysis[sub].wrong++;

      questionsAttempted.push({
        questionId: ans.questionId, userAnswer: ans.answer, correctAnswer: q.answer || q.correctAnswer,
        isCorrect, topic: q.topic, question: q.question || q.questionText, explanation: q.explanation,
        label: ans.label // Pass through label
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
    res.status(500).json({ message: "Failed" });
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
    const totalBetter = await ExamResult.countDocuments({ weekNumber: result.weekNumber, score: { $gt: result.score } });
    res.status(200).json({ ...result, rank: totalBetter + 1 });
  } catch (err) { res.status(500).json({ message: "Error" }); }
});

// GET /api/training/explanation/:questionId
router.get("/explanation/:questionId", auth, async (req, res) => {
  try {
    const { questionId } = req.params;
    let question = await PreviousYearQuestion.findById(mongoose.isValidObjectId(questionId) ? questionId : null);
    if (!question) question = await PreviousYearQuestion.findOne({ id: questionId });
    if (!question) return res.status(404).json({ message: "Question not found" });
    if (question.explanation && !question.explanation.includes("standard")) return res.status(200).json({ explanation: question.explanation });
    if (!model) return res.status(503).json({ message: "AI Unavailable" });
    const result = await model.generateContent(`Explain MCQ: ${question.question}\nAns: ${question.answer}`);
    const explanation = result.response.text().trim();
    question.explanation = explanation;
    await question.save();
    res.status(200).json({ explanation });
  } catch (err) { res.status(500).json({ message: "Error" }); }
});

// GET /api/training/syllabus
router.get("/syllabus", async (req, res) => {
  try {
    const syllabus = await Syllabus.find({}).sort({ week: 1 });
    res.status(200).json(syllabus);
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
});

module.exports = router;
