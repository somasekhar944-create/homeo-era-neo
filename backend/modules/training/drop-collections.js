require("dotenv").config();
const mongoose = require("mongoose");
const { Syllabus, PreviousYearQuestion } = require("./models");

async function dropCollections() {
  try {
    console.log("Attempting to connect to MongoDB for dropping collections...");
    await mongoose.connect(process.env.MONGO_URI, {
      family: 4
    });
    console.log("✅ Connected to MongoDB Successfully!");

    console.log("Dropping 'syllabuses' collection...");
    await Syllabus.collection.drop();
    console.log("✅ 'syllabuses' collection dropped.");

    console.log("Dropping 'previousyearquestions' collection...");
    await PreviousYearQuestion.collection.drop();
    console.log("✅ 'previousyearquestions' collection dropped.");

  } catch (error) {
    if (error.code === 26) { // NamespaceNotFound: collection does not exist
      console.warn("Collection not found, skipping drop.");
    } else {
      console.error("❌ Error dropping collections:", error);
    }
  } finally {
    mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

dropCollections();
