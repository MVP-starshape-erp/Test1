import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Generate a random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    const senderEmail = 'roshjosephcm.daj@gmail.com';
    const appPassword = 'zidv ooff pvyq osuh';

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: senderEmail,
        pass: appPassword
      }
    });

    const mailOptions = {
      from: senderEmail,
      to: email,
      subject: 'Your Sign Up OTP',
      text: `Your OTP is: ${otp}. Please use this to verify your sign up.`,
      html: `<b>Your OTP is: ${otp}</b><br>Please use this to verify your sign up.`
    };

    await transporter.sendMail(mailOptions);
    
    return NextResponse.json({ success: true, message: 'OTP sent successfully' });
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    return NextResponse.json({ error: error.message || 'Failed to send OTP' }, { status: 500 });
  }
}
