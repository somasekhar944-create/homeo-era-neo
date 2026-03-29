require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function totalRefresh() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { family: 4 });
    console.log("Connected to MongoDB");

    // 1. Delete ALL users
    const delAll = await User.deleteMany({});
    console.log(`Successfully cleared entire Users collection. Deleted ${delAll.deletedCount} users.`);

    // 2. Create fresh Admin user
    const phone = "9494163566";
    const password = "Admin123!";
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const freshAdmin = new User({
      name: "Somasekhar",
      phone: phone,
      password: hashedPassword,
      role: "admin",
      isVerified: true
    });

    await freshAdmin.save();
    console.log("✅ FRESH Admin account created successfully.");
    console.log(`Name: Somasekhar`);
    console.log(`Phone: ${phone}`);
    console.log(`Password: ${password}`);
    console.log(`Role: admin`);

  } catch (err) {
    console.error("Error during total refresh:", err);
  } finally {
    mongoose.disconnect();
  }
}

totalRefresh();
