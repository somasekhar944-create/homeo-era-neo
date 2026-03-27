const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const { generateQuiz } = require('./quizController');

router.post("/generate-ai-quiz", auth, generateQuiz);

module.exports = router;