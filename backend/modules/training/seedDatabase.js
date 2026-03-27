require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const { Syllabus, PreviousYearQuestion } = require("./models");

const PG_SYLLABUS_PATH = path.join(__dirname, "data/pg exam syllubs.json");
const PYQ_PATH = path.join(__dirname, "data/Previous Year Questions.json");

async function seedDatabase() {
  try {
    console.log("Attempting to connect to MongoDB for seeding...");
    await mongoose.connect(process.env.MONGO_URI, {
      family: 4
    });
    console.log("✅ Connected to MongoDB Successfully!");

    // Seeding Syllabuses
    if (fs.existsSync(PG_SYLLABUS_PATH)) {
      console.log("Seeding Syllabus...");
      const syllabusData = JSON.parse(fs.readFileSync(PG_SYLLABUS_PATH, "utf8"));
      await Syllabus.deleteMany({});
      await Syllabus.insertMany(syllabusData);
      console.log(`✅ Successfully seeded ${syllabusData.length} syllabus entries.`);
    }

    // Seeding Questions
    if (fs.existsSync(PYQ_PATH)) {
      console.log("Seeding Previous Year Questions (Bulk Import)...");
      const pyqData = JSON.parse(fs.readFileSync(PYQ_PATH, "utf8"));
      await PreviousYearQuestion.deleteMany({});
      
      const processedData = pyqData.map(q => {
        // Try to extract week if possible, but NEVER skip the object
        let week = 0;
        if (q.id && typeof q.id === 'string') {
          const match = q.id.match(/^w(\d+)/);
          if (match) week = parseInt(match[1], 10);
        }
        return { ...q, week: q.week || week };
      });

      const result = await PreviousYearQuestion.insertMany(processedData, { ordered: false });
      console.log(`✅ Successfully seeded ${result.length} questions.`);
    } else {
      console.error(`❌ File not found: ${PYQ_PATH}`);
    }

  } catch (error) {
    if (error.name === 'MongoBulkWriteError') {
      console.log(`✅ Successfully seeded ${error.insertedDocs.length} questions (with internal validation skips).`);
    } else {
      console.error("❌ Database Seeding Error:", error);
    }
  } finally {
    mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

seedDatabase();
