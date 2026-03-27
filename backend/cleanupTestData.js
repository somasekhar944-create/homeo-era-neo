const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { family: 4 })
  .then(() => console.log("✅ Connected to MongoDB for cleanup..."))
  .catch(err => console.error("❌ Connection Error:", err));

// Models
const User = require('./models/User');
const { ExamResult } = require('./modules/training/models');

const cleanup = async () => {
  try {
    const dummyEmails = ["alpha@test.com", "beta@test.com", "gamma@test.com", "delta@test.com", "epsilon@test.com"];
    
    // Find dummy user IDs
    const users = await User.find({ email: { $in: dummyEmails } });
    const userIds = users.map(u => u._id);

    console.log(`Found ${users.length} dummy users. Cleaning up...`);

    // Delete Exam Results
    const resultsResult = await ExamResult.deleteMany({ userId: { $in: userIds } });
    console.log(`✅ Deleted ${resultsResult.deletedCount} mock exam results.`);

    // Delete Users
    const usersResult = await User.deleteMany({ _id: { $in: userIds } });
    console.log(`✅ Deleted ${usersResult.deletedCount} dummy users.`);

    console.log("\n🧹 CLEANUP COMPLETED SUCCESSFULLY!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Cleanup Error:", err);
    process.exit(1);
  }
};

cleanup();
