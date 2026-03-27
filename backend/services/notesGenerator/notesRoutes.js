const express = require("express");
const router = express.Router();
const notesController = require("./notesController");

router.post("/generate", notesController.generateNotes);

module.exports = router;
