const mongoose = require('mongoose');

const cachedGeneralQuizSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  topic: { type: String, required: true },
  numQuestions: { type: Number, required: true },
  questions: { type: Array, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Compound index for fast lookup and uniqueness
cachedGeneralQuizSchema.index({ subject: 1, topic: 1, numQuestions: 1 }, { unique: true });

const CachedGeneralQuiz = mongoose.model('CachedGeneralQuiz', cachedGeneralQuizSchema);

module.exports = { CachedGeneralQuiz };
