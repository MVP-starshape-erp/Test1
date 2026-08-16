import nodemailer from 'nodemailer';

// Get args
const senderEmail = process.argv[2];
const receiverEmail = process.argv[3];
const appPassword = 'zidv ooff pvyq osuh'; // User provided app password

if (!senderEmail || !receiverEmail) {
  console.error("Usage: node test-otp-email.mjs <sender-gmail> <receiver-email>");
  process.exit(1);
}

// Generate a random 6-digit OTP
const otp = Math.floor(100000 + Math.random() * 900000);

console.log(`Configuring nodemailer to send from ${senderEmail} to ${receiverEmail}`);
console.log(`Generated OTP: ${otp}`);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: senderEmail,
    pass: appPassword
  }
});

const mailOptions = {
  from: senderEmail,
  to: receiverEmail,
  subject: 'Your Test OTP Code',
  text: `Your OTP is: ${otp}. Please use this to verify your email.`,
  html: `<b>Your OTP is: ${otp}</b><br>Please use this to verify your email.`
};

try {
  const info = await transporter.sendMail(mailOptions);
  console.log('Email sent successfully!');
  console.log('Message ID:', info.messageId);
} catch (error) {
  console.error('Error sending email:', error);
}
