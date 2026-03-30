const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// Define Book Schema here if model doesn't exist
const bookSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  fullText: { type: String, default: '' },
});

const Book = mongoose.models.Book || mongoose.model("Book", bookSchema);

router.get("/", async (req, res) => {
  try {
    const books = await Book.find({});
    res.json(books);
  } catch (err) {
    res.status(500).json({ message: "Error fetching books", error: err.message });
  }
});

module.exports = router;
