const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { family: 4 })
  .then(() => console.log("✅ Connected to MongoDB for seeding..."))
  .catch(err => console.error("❌ Connection Error:", err));

// Models
const User = require('./models/User');
const { ExamResult } = require('./modules/training/models');

const seedData = async () => {
  try {
    // 1. Create Dummy Users
    const password = await bcrypt.hash('testpass123', 10);
    const students = [
      { name: "Student Alpha", email: "alpha@test.com", phone: "1111111111", password, role: "student", isVerified: true },
      { name: "Student Beta", email: "beta@test.com", phone: "2222222222", password, role: "student", isVerified: true },
      { name: "Student Gamma", email: "gamma@test.com", phone: "3333333333", password, role: "student", isVerified: true },
      { name: "Student Delta", email: "delta@test.com", phone: "4444444444", password, role: "student", isVerified: true },
      { name: "Student Epsilon", email: "epsilon@test.com", phone: "5555555555", password, role: "student", isVerified: true },
    ];

    console.log("Creating dummy users...");
    const createdUsers = await User.insertMany(students);
    console.log(`✅ Created ${createdUsers.length} dummy users.`);

    // 2. Create Mock Exam Results (Week 1, Weekly)
    // Scores: 45, 38, 30, 25, 18 (out of 50*4 = 200 max)
    // Actually the app uses score = (correct * 4) - (wrong * 1)
    const mockResults = [
      { user: createdUsers[0], correct: 45, wrong: 3, unattempted: 2, time: 1800 },
      { user: createdUsers[1], correct: 38, wrong: 10, unattempted: 2, time: 2100 },
      { user: createdUsers[2], correct: 30, wrong: 15, unattempted: 5, time: 2400 },
      { user: createdUsers[3], correct: 25, wrong: 20, unattempted: 5, time: 2700 },
      { user: createdUsers[4], correct: 18, wrong: 30, unattempted: 2, time: 3000 },
    ];

    const resultsToInsert = mockResults.map(data => {
      const score = (data.correct * 4) - (data.wrong * 1);
      return {
        userId: data.user._id,
        weekNumber: 1,
        examType: 'weekly',
        score: score,
        correctAnswers: data.correct,
        wrongAnswers: data.wrong,
        unattempted: data.unattempted,
        totalQuestions: 50,
        timeTaken: data.time,
        subjectAnalysis: [
          { subject: "Materia Medica", total: 20, correct: Math.floor(data.correct * 0.4), wrong: 2, percentage: 80 },
          { subject: "Organon", total: 15, correct: Math.floor(data.correct * 0.3), wrong: 2, percentage: 70 },
          { subject: "Allied Subjects", total: 15, correct: Math.floor(data.correct * 0.3), wrong: 2, percentage: 60 }
        ],
        questionsAttempted: [], // Simplified for test
        submissionDate: new Date()
      };
    });

    console.log("Inserting mock exam results...");
    await ExamResult.insertMany(resultsToInsert);
    console.log("✅ Inserted mock exam results.");

    console.log("\n🚀 TEST DATA GENERATED SUCCESSFULLY!");
    console.log("--------------------------------------");
    console.log("Dummy Emails: alpha@test.com, beta@test.com, etc.");
    console.log("Password: testpass123");
    console.log("--------------------------------------");
    console.log("Open the 'Performance' or 'Leaderboard' tab on the dashboard to verify.");

    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding Error:", err);
    process.exit(1);
  }
};

seedData();
