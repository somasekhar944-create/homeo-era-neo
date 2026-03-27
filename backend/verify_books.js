require("dotenv").config();
const mongoose = require("mongoose");

// Book Schema (must be consistent with server.js)
const bookSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  fullText: { type: String, default: '' },
});

const Book = mongoose.model("Book", bookSchema);

async function verifyBooks() {
  try {
    console.log("Attempting to connect to MongoDB for verification...");
    await mongoose.connect(process.env.MONGO_URI, {
      family: 4
    });
    console.log("✅ Connected to MongoDB Successfully!");

    // List all databases
    const adminDb = mongoose.connection.db.admin();
    const listDatabases = await adminDb.listDatabases();
    console.log("\n--- Databases in Cloud Cluster ---");
    listDatabases.databases.forEach(db => console.log(`- ${db.name}`));
    console.log("----------------------------------");

    // Count documents in books collection
    const bookCount = await Book.countDocuments({});
    console.log(`\nTotal documents in 'books' collection: ${bookCount}`);

    const books = await Book.find({});

    if (books.length === 0) {
      console.log("No books found in the database.");
      mongoose.disconnect();
      return;
    }

    console.log("\n--- Uploaded Books Verification ---");
    console.log("| Title                            | Character Count |");
    console.log("|----------------------------------|-----------------|");

    let boerickeHMMCharCount = 0;
    books.forEach(book => {
      const title = book.title.padEnd(32).substring(0, 32);
      const charCount = book.fullText.length.toString().padStart(15);
      console.log(`| ${title} | ${charCount} |`);
      if (book.title === "boerickeHMM") {
        boerickeHMMCharCount = book.fullText.length;
      }
    });
    console.log("------------------------------------");

    console.log(`\nVerification for 'Boericke HMM' fullText length: ${boerickeHMMCharCount} characters.`);

    if (boerickeHMMCharCount >= 3400000 && boerickeHMMCharCount <= 3500000) { // Around 3.4 million
      console.log("✅ 'Boericke HMM' fullText length is around 3.4 million characters (confirmed).");
    } else {
      console.warn("⚠️ 'Boericke HMM' fullText length is NOT around 3.4 million characters. Current: " + boerickeHMMCharCount);
    }

  } catch (error) {
    console.error("❌ Verification Error:", error);
  } finally {
    mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

verifyBooks();
