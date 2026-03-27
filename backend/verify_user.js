const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./models/User");

async function verifyUserByEmail(email) {
  try {
    await mongoose.connect(process.env.MONGO_URI, { family: 4 });
    console.log("Connected to MongoDB");

    const result = await User.updateOne({ email: email }, { $set: { isVerified: true, otp: undefined, otpExpires: undefined } });
    if (result.modifiedCount > 0) {
      console.log(`Successfully verified user: ${email}`);
    } else if (result.matchedCount > 0) {
      console.log(`User ${email} already verified.`);
    } else {
      console.log(`User not found: ${email}`);
    }
    process.exit(0);
  } catch (err) {
    console.error("Error verifying user:", err);
    process.exit(1);
  }
}

verifyUserByEmail("drsomasekhar123@gmail.com");