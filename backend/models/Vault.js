const mongoose = require("mongoose");

const vaultSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: mongoose.Schema.Types.Mixed, required: true }, // Support both Number (index) and String (text)
  explanation: { type: String },
  subject: { type: String, default: "General" },
  label: { type: String },
  originalQuestionId: { type: String }, // Store as string to handle non-ObjectIds (like Week 1)
  addedAt: { type: Date, default: Date.now },
  correctCount: { type: Number, default: 0 } // For revision mastery tracking
});

// Ensure a user can\'t bookmark the same question twice (based on content now, or original ID)
vaultSchema.index({ userId: 1, question: 1 }, { unique: true, partialFilterExpression: { originalQuestionId: { $exists: false } } });
vaultSchema.index({ userId: 1, originalQuestionId: 1 }, { unique: true, partialFilterExpression: { originalQuestionId: { $exists: true } } });

module.exports = mongoose.model("Vault", vaultSchema);