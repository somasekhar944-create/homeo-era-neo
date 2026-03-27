const nodemailer = require("nodemailer");

// SMS Service (Fast2SMS)
// Documentation: https://www.fast2sms.com/dashboard/dev-api
const sendSMS = async (phone, otp) => {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ FAST2SMS_API_KEY not found in .env. SMS will not be sent.");
    return { success: false, message: "API Key missing" };
  }

  try {
    console.log(`[Fast2SMS] Initiating SMS for ${phone}...`);
    // Using the Fast2SMS Free Transactional API (requires approved template for real production)
    // For testing/quick start, they have a 'message' or 'otp' route.
    const response = await fetch(`https://www.fast2sms.com/dev/bulkV2?authorization=${apiKey}&variables_values=${otp}&route=otp&numbers=${phone}`);
    const data = await response.json();
    
    console.log("[Fast2SMS] API Response:", JSON.stringify(data, null, 2));
    return data;
  } catch (err) {
    console.error("[Fast2SMS] Error:", err.message);
    return { success: false, error: err.message };
  }
};

// Email Service (Nodemailer)
const sendEmail = async (email, otp) => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.warn("⚠️ EMAIL_USER or EMAIL_PASS not found in .env. Email will not be sent. OTP will be logged to console.");
    console.log(`[Mock OTP] Your OTP for ${email} is: ${otp}`);
    return { success: false, message: "Email credentials missing, OTP logged to console" };
  }

  const transporter = nodemailer.createTransport({
    service: "gmail", // You can change this to your provider
    auth: { user, pass }
  });

  const mailOptions = {
    from: `"Homeo Era PG Mentor" <${user}>`,
    to: email,
    subject: "Your OTP for PG Training Signup",
    text: `Hello Doctor, your 6-digit OTP for account verification is: ${otp}. It will expire in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4f46e5;">Welcome to Homeo Era PG Mentor</h2>
        <p>Hello Doctor,</p>
        <p>Your 6-digit OTP for account verification is:</p>
        <div style="font-size: 32px; font-weight: bold; color: #1e293b; letter-spacing: 5px; padding: 10px; background: #f8fafc; display: inline-block; border-radius: 8px; margin: 10px 0;">
          ${otp}
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p style="color: #64748b; font-size: 12px; margin-top: 20px;">If you didn't request this, please ignore this email.</p>
      </div>
    `
  };

  try {
    console.log(`[Nodemailer] Initiating Email for ${email}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log("[Nodemailer] Email Sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("[Nodemailer] Error:", err.message);
    return { success: false, error: err.message };
  }
};

module.exports = { sendSMS, sendEmail };