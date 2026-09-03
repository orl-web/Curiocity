import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from './errorHandler';

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request { user?: AuthPayload; }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) throw AppError.unauthorized('No token provided');
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as AuthPayload;
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) throw AppError.unauthorized('Token expired', 'TOKEN_EXPIRED');
    throw AppError.unauthorized('Invalid token');
  }
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();
  const token = authHeader.slice(7);
  try { req.user = jwt.verify(token, config.JWT_SECRET) as AuthPayload; } catch {}
  next();
};

export const requireRole = (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) throw AppError.unauthorized();
  if (!roles.includes(req.user.role)) throw AppError.forbidden('Insufficient permissions');
  next();
};

export const generateTokens = (payload: AuthPayload) => {
  const accessToken = jwt.sign(payload, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
  const refreshToken = jwt.sign(payload, config.JWT_REFRESH_SECRET, { expiresIn: config.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
  return { accessToken, refreshToken };
};

export const verifyRefreshToken = (token: string): AuthPayload => jwt.verify(token, config.JWT_REFRESH_SECRET) as AuthPayload;