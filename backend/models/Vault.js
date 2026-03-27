const mongoose = require("mongoose");

const vaultSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: Number, required: true },
  explanation: { type: String },
  originalQuestionId: { type: mongoose.Schema.Types.ObjectId, ref: "PreviousYearQuestion" }, // Link to original question if applicable
  addedAt: { type: Date, default: Date.now }
});

// Ensure a user can\'t bookmark the same question twice (based on content now, or original ID)
vaultSchema.index({ userId: 1, question: 1 }, { unique: true, partialFilterExpression: { originalQuestionId: { $exists: false } } });
vaultSchema.index({ userId: 1, originalQuestionId: 1 }, { unique: true, partialFilterExpression: { originalQuestionId: { $exists: true } } });

module.exports = mongoose.model("Vault", vaultSchema);