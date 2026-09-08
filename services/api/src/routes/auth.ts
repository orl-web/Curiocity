import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { users, guideDrafts } from '../db/schema';
import { eq } from 'drizzle-orm';
import { config } from '../config';
import { authenticate, generateTokens, verifyRefreshToken } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { sendPasswordResetEmail, sendVerificationEmail } from '../utils/email';

const router = Router();

const registerSchema = z.object({ email: z.string().email(), password: z.string().min(8).max(128), displayName: z.string().min(1).max(100) });
const loginSchema = z.object({ email: z.string().email(), password: z.string() });
const refreshSchema = z.object({ refreshToken: z.string() });
const forgotPasswordSchema = z.object({ email: z.string().email() });
const resetPasswordSchema = z.object({ token: z.string(), password: z.string().min(8).max(128) });

const generateInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

router.post('/register', validateBody(registerSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) throw AppError.conflict('Email already registered');

    const passwordHash = await bcrypt.hash(password, 12);
    const initials = generateInitials(displayName);
    const userId = uuidv4();

    const newUser = { id: userId, email, emailVerified: config.NODE_ENV === 'development', passwordHash, displayName, initials, role: 'user' as const };
    await db.insert(users).values(newUser);

    // Send verification email in production
    if (config.NODE_ENV !== 'development') {
      await sendVerificationEmail(email, userId).catch((err) => {
        console.error('Failed to send verification email:', err);
      });
    }

    const tokens = generateTokens({ userId, email, role: 'user' });
    res.status(201).json({ user: { id: userId, email, displayName, initials, role: 'user', emailVerified: newUser.emailVerified }, ...tokens });
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.badRequest('Registration failed');
  }
});

router.post('/login', validateBody(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const userRows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!userRows.length) throw AppError.unauthorized('Invalid credentials');
    const user = userRows[0];
    if (!user.passwordHash) throw AppError.unauthorized('Account uses social login. Please sign in with your provider.');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw AppError.unauthorized('Invalid credentials');

    const tokens = generateTokens({ userId: user.id, email: user.email, role: user.role });
    res.json({ user: { id: user.id, email: user.email, displayName: user.displayName, initials: user.initials, role: user.role, emailVerified: user.emailVerified, avatarUrl: user.avatarUrl, bio: user.bio, location: user.location }, ...tokens });
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.badRequest('Login failed');
  }
});

router.post('/refresh', validateBody(refreshSchema), async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  try { const payload = verifyRefreshToken(refreshToken); const tokens = generateTokens({ userId: payload.userId, email: payload.email, role: payload.role }); res.json(tokens); }
  catch { throw AppError.unauthorized('Invalid refresh token', 'INVALID_REFRESH_TOKEN'); }
});

router.post('/forgot-password', validateBody(forgotPasswordSchema), async (req: Request, res: Response) => {
  const { email } = req.body;
  const userRows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (userRows.length > 0) {
    const token = jwt.sign({ userId: userRows[0].id, type: 'reset' }, config.JWT_SECRET, { expiresIn: '1h' });
    const resetUrl = `${config.CORS_ORIGIN.split(',')[0]}/reset-password?token=${token}`;
    await sendPasswordResetEmail(email, userRows[0].id).catch((err) => {
      console.error('Failed to send password reset email:', err);
    });
  }
  res.json({ message: 'If the email exists, a reset link has been sent' });
});

router.post('/reset-password', validateBody(resetPasswordSchema), async (req: Request, res: Response) => {
  const { token, password } = req.body;
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as { userId: string; type: 'reset' };
    if (payload.type !== 'reset') throw new Error('Invalid token type');
    const passwordHash = await bcrypt.hash(password, 12);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, payload.userId));
    res.json({ message: 'Password reset successful' });
  } catch { throw AppError.badRequest('Invalid or expired reset token'); }
});

router.post('/verify-email', async (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token) throw AppError.badRequest('Token required');
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as { userId: string; type: 'verify' };
    if (payload.type !== 'verify') throw new Error('Invalid token type');
    await db.update(users).set({ emailVerified: true, updatedAt: new Date() }).where(eq(users.id, payload.userId));
    res.json({ message: 'Email verified successfully' });
  } catch { throw AppError.badRequest('Invalid or expired verification token'); }
});

router.get('/me', authenticate, async (req: Request, res: Response) => {
  const userRows = await db.select().from(users).where(eq(users.id, req.user!.userId)).limit(1);
  if (!userRows.length) throw AppError.notFound('User not found');
  const user = userRows[0];
  res.json({ id: user.id, email: user.email, displayName: user.displayName, initials: user.initials, role: user.role, emailVerified: user.emailVerified, avatarUrl: user.avatarUrl, bio: user.bio, location: user.location, stripeAccountId: user.stripeAccountId, createdAt: user.createdAt });
});

router.post('/logout', authenticate, (_req: Request, res: Response) => res.json({ message: 'Logged out' }));

export { router as authRouter };