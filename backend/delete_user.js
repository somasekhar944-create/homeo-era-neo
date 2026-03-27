const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./models/User");

async function deleteUserByEmail(email) {
  try {
    await mongoose.connect(process.env.MONGO_URI, { family: 4 });
    console.log("Connected to MongoDB");

    const result = await User.deleteOne({ email: email });
    if (result.deletedCount > 0) {
      console.log(`Successfully deleted user: ${email}`);
    } else {
      console.log(`User not found: ${email}`);
    }
    process.exit(0);
  } catch (err) {
    console.error("Error deleting user:", err);
    process.exit(1);
  }
}

// Replace with the user's email that needs to be deleted
deleteUserByEmail("drsomasekhar123@gmail.com");