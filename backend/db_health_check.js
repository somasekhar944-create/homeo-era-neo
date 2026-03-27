// backend/db_health_check.js
require("dotenv").config();
const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  fullText: { type: String, default: '' },
});

const Book = mongoose.model("Book", bookSchema);

async function runHealthCheck(bookTitle = null) {
  try {
    console.log("Attempting to connect to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI, {
      family: 4
    });
    console.log("✅ Connected to MongoDB Successfully!");

    console.log(bookTitle ? `Fetching book: ${bookTitle} from the 'books' collection...` : "Fetching all books from the 'books' collection...");
    const query = bookTitle ? { title: bookTitle } : {};
    const books = await Book.find(query);

    if (books.length === 0) {
      console.log(bookTitle ? `No book found with title: ${bookTitle}.` : "No books found in the collection.");
    } else {
      console.log("\n--- Book FullText Health Check ---");
      console.log("| Book Name                     | FullText Length (characters) |");
      console.log("|-------------------------------|------------------------------|");

      books.forEach(book => {
        const title = book.title || "N/A";
        const fullTextCharCount = book.fullText ? book.fullText.length : 0;
        let highlight = "";
        if (fullTextCharCount === 0) {
          highlight = " [RE-UPLOAD SUGGESTED]";
        }
        console.log(`| ${title.padEnd(29)} | ${String(fullTextCharCount).padEnd(28)}${highlight}|`);

        if (fullTextCharCount > 0) {
          console.log(`| First 500 characters of fullText for ${title}:`);
          console.log(`|---`);
          console.log(`| ${book.fullText.substring(0, 500).replace(/\n/g, '\n| ')}`); // Display first 500 chars, format newlines
          console.log(`|---`);
        }
      });
      console.log("-------------------------------------------------------------------");
    }
  } catch (error) {
    console.error("❌ Database Health Check Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

// Check for a command-line argument for book title
const args = process.argv.slice(2);
const bookTitleArg = args[0];

runHealthCheck(bookTitleArg);