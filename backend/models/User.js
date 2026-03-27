const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, sparse: true, unique: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "student" },
  isVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpires: { type: Date },
  bookmarks: [
    {
      questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
      correctCount: { type: Number, default: 0 },
      addedAt: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
  joiningDate: { type: Date },
  preferredExamDay: { type: String }, // e.g., 'Sunday', 'Monday'
  lastRescheduledDate: { type: Date },
  googleId: { type: String },
  isGoogleUser: { type: Boolean, default: false },
  trainingSchedule: [
    {
      week: { type: Number },
      examDate: { type: Date },
      isMonthlyMock: { type: Boolean },
    }
  ],
});

module.exports = mongoose.model("User", userSchema);
