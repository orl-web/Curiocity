import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import { config } from '../config';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter && config.SENDGRID_API_KEY) {
    transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: { user: 'apikey', pass: config.SENDGRID_API_KEY },
    });
  }
  return transporter;
}

export async function sendVerificationEmail(email: string, userId: string) {
  const tx = getTransporter();
  if (!tx) {
    console.warn('Email not configured, skipping verification email');
    return;
  }

  const token = jwt.sign({ userId, type: 'verify' }, config.JWT_SECRET, { expiresIn: '24h' });
  const verifyUrl = `${config.CORS_ORIGIN.split(',')[0]}/verify-email?token=${token}`;

  await tx.sendMail({
    from: config.SENDGRID_FROM_EMAIL,
    to: email,
    subject: 'Verify your CurioCity account',
    html: `<p>Welcome to CurioCity! Click <a href="${verifyUrl}">here</a> to verify your email address.</p>`,
  });
}

export async function sendPasswordResetEmail(email: string, userId: string) {
  const tx = getTransporter();
  if (!tx) {
    console.warn('Email not configured, skipping password reset email');
    return;
  }

  const token = jwt.sign({ userId, type: 'reset' }, config.JWT_SECRET, { expiresIn: '1h' });
  const resetUrl = `${config.CORS_ORIGIN.split(',')[0]}/reset-password?token=${token}`;

  await tx.sendMail({
    from: config.SENDGRID_FROM_EMAIL,
    to: email,
    subject: 'Reset your CurioCity password',
    html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`,
  });
}