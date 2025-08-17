// pages/api/auth/register.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function verifyRecaptcha(token) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    return { ok: false, reason: 'Missing RECAPTCHA_SECRET_KEY' };
  }

  const params = new URLSearchParams({
    secret,
    response: token || '',
  });

  const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  const data = await res.json();
  // For v2, success is boolean. (No "score" like v3.)
  return { ok: !!data.success, data };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { emailText, password, name, recaptchaToken } = req.body || {};

  // Basic validation
  if (!emailText || !password || !name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // 1) Verify reCAPTCHA
  try {
    const rc = await verifyRecaptcha(recaptchaToken);
    if (!rc.ok) {
      return res.status(400).json({ error: 'Invalid reCAPTCHA' });
    }
  } catch (e) {
    console.error('reCAPTCHA verification error:', e);
    return res.status(502).json({ error: 'reCAPTCHA verification failed' });
  }

  try {
    // 2) Ensure user doesn’t already exist
    const existing = await prisma.user.findUnique({
      where: { email: emailText },
      select: { id: true },
    });
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    // 3) Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: emailText,
        name: name,
        hashedPassword,
        // otpVerified remains default false (per your schema)
      },
      select: { id: true, email: true },
    });

    return res.status(201).json({ ok: true, user });
  } catch (err) {
    console.error('Registration DB error:', err);
    return res.status(500).json({ error: 'Server error creating user' });
  }
}
