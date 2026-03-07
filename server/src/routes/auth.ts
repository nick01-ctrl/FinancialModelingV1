import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../models/database';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

export const authRouter = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '7d';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return secret;
}

function getRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not configured');
  return secret;
}

function generateTokens(userId: string): { token: string; refreshToken: string } {
  const token = jwt.sign({ userId }, getJwtSecret(), {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
  const refreshToken = jwt.sign({ userId }, getRefreshSecret(), {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
  return { token, refreshToken };
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password: string): boolean {
  return typeof password === 'string' && password.length >= 8;
}

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
authRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;

    // Input validation
    if (!email || !password || !name) {
      res.status(400).json({
        success: false,
        error: 'Email, password, and name are required',
      });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ success: false, error: 'Invalid email format' });
      return;
    }

    if (!isValidPassword(password)) {
      res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters',
      });
      return;
    }

    if (typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ success: false, error: 'Name is required' });
      return;
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase().trim()],
    );

    if (existingUser.rows.length > 0) {
      res.status(409).json({
        success: false,
        error: 'A user with this email already exists',
      });
      return;
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const userId = uuidv4();
    const normalizedEmail = email.toLowerCase().trim();
    const trimmedName = name.trim();

    await query(
      'INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)',
      [userId, normalizedEmail, passwordHash, trimmedName],
    );

    // Generate tokens
    const { token, refreshToken } = generateTokens(userId);

    res.status(201).json({
      success: true,
      data: {
        token,
        refreshToken,
        user: {
          id: userId,
          email: normalizedEmail,
          name: trimmedName,
        },
      },
    });
  } catch (err) {
    console.error('[auth] Register error:', err);
    res.status(500).json({ success: false, error: 'Failed to register user' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Look up user
    const result = await query(
      'SELECT id, email, password_hash, name FROM users WHERE email = $1',
      [normalizedEmail],
    );

    if (result.rows.length === 0) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const user = result.rows[0] as {
      id: string;
      email: string;
      password_hash: string;
      name: string;
    };

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    // Generate tokens
    const { token, refreshToken } = generateTokens(user.id);

    res.json({
      success: true,
      data: {
        token,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
    });
  } catch (err) {
    console.error('[auth] Login error:', err);
    res.status(500).json({ success: false, error: 'Failed to log in' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/refresh
// ---------------------------------------------------------------------------
authRouter.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: incomingToken } = req.body;

    if (!incomingToken) {
      res.status(400).json({ success: false, error: 'Refresh token is required' });
      return;
    }

    let decoded: { userId: string };
    try {
      decoded = jwt.verify(incomingToken, getRefreshSecret()) as { userId: string };
    } catch {
      res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
      return;
    }

    // Verify the user still exists
    const result = await query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [decoded.userId],
    );

    if (result.rows.length === 0) {
      res.status(401).json({ success: false, error: 'User not found' });
      return;
    }

    const user = result.rows[0] as { id: string; email: string; name: string };

    // Issue new tokens
    const { token, refreshToken } = generateTokens(user.id);

    res.json({
      success: true,
      data: {
        token,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
    });
  } catch (err) {
    console.error('[auth] Refresh error:', err);
    res.status(500).json({ success: false, error: 'Failed to refresh token' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/me  (optional: return current user info)
// ---------------------------------------------------------------------------
authRouter.get(
  '/me',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = await query(
        'SELECT id, email, name, created_at FROM users WHERE id = $1',
        [req.userId],
      );

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const user = result.rows[0] as {
        id: string;
        email: string;
        name: string;
        created_at: string;
      };

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.created_at,
        },
      });
    } catch (err) {
      console.error('[auth] Me error:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch user' });
    }
  },
);
