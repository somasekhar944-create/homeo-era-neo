const mongoose = require("mongoose");

// Syllabus Schema
const syllabusSchema = new mongoose.Schema({
  week: { type: Number, required: true, unique: true },
  materia_medica: [{ type: String }],
  organon: { type: String },
  allied_subjects: { type: Map, of: String },
  keywords: [{ type: String }],
});

const Syllabus = mongoose.model("Syllabus", syllabusSchema);

// Previous Year Question Schema
const previousYearQuestionSchema = new mongoose.Schema({
  id: { type: String },
  subject: { type: String },
  topic: { type: String },
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  answer: { type: String, required: true },
  source: { type: String },
  year: { type: String },
  explanation: { type: String },
  week: { type: Number, default: 0 },
  isAI: { type: Boolean, default: false }, // New field for AI questions
  isUsedInStaticPaper: { type: Boolean, default: false }, // NEW for Zero Repetition
  usedBy: [{
    userId: { type: String }, // Store as string to allow 'guest_user'
    examId: { type: mongoose.Schema.Types.ObjectId }
  }]
}, { strict: false });

const PreviousYearQuestion = mongoose.model("PreviousYearQuestion", previousYearQuestionSchema);

// Exam Result Schema
const examResultSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // Store as string to allow 'guest_user'
  weekNumber: { type: Number, required: true },
  examType: { type: String, enum: ['weekly', 'monthly'], required: true },
  score: { type: Number, required: true },
  correctAnswers: { type: Number, required: true },
  wrongAnswers: { type: Number, required: true },
  unattempted: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  timeTaken: { type: Number }, // In seconds
  subjectAnalysis: [{
    subject: { type: String },
    total: { type: Number },
    correct: { type: Number, default: 0 },
    wrong: { type: Number, default: 0 },
    unattempted: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 }
  }],
  questionsAttempted: [{
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "PreviousYearQuestion" },
    userAnswer: { type: String },
    correctAnswer: { type: String },
    isCorrect: { type: Boolean },
    topic: { type: String }
  }],
  submissionDate: { type: Date, default: Date.now },
});

const ExamResult = mongoose.model("ExamResult", examResultSchema);

// New Collection: GeneratedExams
const generatedExamSchema = new mongoose.Schema({
  weekNumber: { type: Number, required: true },
  type: { type: String, enum: ['weekly', 'monthly', 'mock'], required: true },
  questions: { type: Array, required: true },
  createdAt: { type: Date, default: Date.now }
});

generatedExamSchema.index({ weekNumber: 1, type: 1 }, { unique: true });

const GeneratedExam = mongoose.model("GeneratedExam", generatedExamSchema);

module.exports = { Syllabus, PreviousYearQuestion, ExamResult, GeneratedExam };
