import { Router, Response } from 'express';
import { AuthService, requireAuth, AuthenticatedRequest } from '../services/authService.ts';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body;
    if (!email || !password || !fullName) {
      res.status(400).json({ error: 'Email, password, and full name are required.' });
      return;
    }
    const result = await AuthService.register(email, password, fullName, role);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Authentication failed' });
  }
});

router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

export default router;
