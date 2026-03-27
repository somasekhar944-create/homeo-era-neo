require("dotenv").config();
const mongoose = require("mongoose");

// Book Schema (must be consistent with server.js)
const bookSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  fullText: { type: String, default: '' },
});

const Book = mongoose.model("Book", bookSchema);

async function deleteBooks() {
  try {
    console.log("Attempting to connect to MongoDB for deletion...");
    await mongoose.connect(process.env.MONGO_URI, {
      family: 4
    });
    console.log("✅ Connected to MongoDB Successfully!");

    const booksToDelete = ["hmm"];
    console.log(`Attempting to delete books: ${booksToDelete.join(', ')}`);

    const deleteResult = await Book.deleteMany({ title: { $in: booksToDelete } });

    console.log(`Deleted ${deleteResult.deletedCount} documents.`);

    if (deleteResult.deletedCount > 0) {
      console.log("✅ Successfully deleted specified books.");
    } else {
      console.log("No specified books found to delete.");
    }

  } catch (error) {
    console.error("❌ Deletion Error:", error);
  } finally {
    mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

deleteBooks();
