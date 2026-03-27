require("dotenv").config();
const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  fullText: { type: String, default: '' },
});

const Book = mongoose.model("Book", bookSchema);

async function deleteKentDocument() {
  try {
    console.log("Attempting to connect to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI, {
      family: 4
    });
    console.log("✅ Connected to MongoDB Successfully!");

    console.log("Attempting to delete 'boerickeHMM' document...");
    const result = await Book.deleteOne({ title: "boerickeHMM" });

    if (result.deletedCount === 1) {
      console.log("✅ Successfully deleted 'boerickeHMM' document.");
    } else {
      console.log("No document found with title 'boerickeHMM' or deletion failed.");
    }
  } catch (error) {
    console.error("❌ Error deleting document:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

deleteKentDocument();