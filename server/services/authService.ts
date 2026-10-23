import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { queryOne, execute } from '../db/index.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'academic-research-gap-jwt-secret-key-change-in-prod';

export interface UserPayload {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

export class AuthService {
  public static async register(email: string, password: string,fullName: string, role = 'researcher'): Promise<{ token: string; user: UserPayload }> {
    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await execute(
      `INSERT INTO users (id, email, password_hash, full_name, role)
       VALUES (?, ?, ?, ?, ?)`,
      [id, email.toLowerCase().trim(), passwordHash, fullName.trim(), role]
    );

    const user: UserPayload = {
      id,
      email: email.toLowerCase().trim(),
      fullName: fullName.trim(),
      role
    };

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
    return { token, user };
  }

  public static async login(email: string, password: string): Promise<{ token: string; user: UserPayload }> {
    const userRow = await queryOne<{
      id: string;
      email: string;
      password_hash: string;
      full_name: string;
      role: string;
    }>('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);

    if (!userRow) {
      throw new Error('Invalid email or password.');
    }

    const valid = await bcrypt.compare(password, userRow.password_hash);
    if (!valid) {
      throw new Error('Invalid email or password.');
    }

    const user: UserPayload = {
      id: userRow.id,
      email: userRow.email,
      fullName: userRow.full_name,
      role: userRow.role
    };

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
    return { token, user };
  }

  public static async getDefaultUser(): Promise<UserPayload> {
    const defaultRow = await queryOne<{
      id: string;
      email: string;
      full_name: string;
      role: string;
    }>('SELECT id, email, full_name, role FROM users LIMIT 1');

    if (defaultRow) {
      return {
        id: defaultRow.id,
        email: defaultRow.email,
        fullName: defaultRow.full_name,
        role: defaultRow.role
      };
    }

    return {
      id: 'usr_academic_demo_01',
      email: 'researcher@univ.edu',
      fullName: 'Dr. Alex Vance',
      role: 'Lead Researcher'
    };
  }

  public static verifyToken(token: string): UserPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as UserPayload;
    } catch {
      return null;
    }
  }
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  // Allow if req.user is already set (e.g. from internal test runner mocks)
  if (req.user) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = AuthService.verifyToken(token);
    if (decoded) {
      req.user = decoded;
      return next();
    }
    res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
    return;
  }

  // Check query token for direct download links
  const queryToken = req.query?.token as string | undefined;
  if (queryToken) {
    const decoded = AuthService.verifyToken(queryToken);
    if (decoded) {
      req.user = decoded;
      return next();
    }
    res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
    return;
  }

  // Enforce access control on the backend: reject unauthenticated requests
  res.status(401).json({ error: 'Authentication required. Please log in to access this resource.' });
}
