import nodemailer from 'nodemailer';
import { google } from 'googleapis';

const OAuth2 = google.auth.OAuth2;
const oauth2Client = new OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

export async function sendOTPEmail(email: string, otp: string): Promise<void> {
  const accessToken = await oauth2Client.getAccessToken();

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', // Use Gmail's SMTP server
    port: 587, // Port for TLS
    secure: false, // Use TLS, not SSL
    auth: {
      type: 'OAuth2',
      user: process.env.GMAIL_USER, // Your Gmail address
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      accessToken: accessToken.token || '', // Use the generated access token
    },
  });

  const mailOptions = {
    from: process.env.GMAIL_USER, // Sender email
    to: email, // Recipient email
    subject: 'Your 2FA Verification Code',
    text: `Your verification code is: ${otp}\n\nThis code is valid for 5 minutes.`,
  };

  await transporter.sendMail(mailOptions); // Send the email
  console.log(`OTP email sent to ${email}`);
}
