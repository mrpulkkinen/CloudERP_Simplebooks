import { Router, Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';

import { prisma } from '../services/prisma.js';
import { loadEnv } from '../config/env.js';
import {
  clearAuthCookie,
  hashPassword,
  setAuthCookie,
  signToken,
  validatePassword
} from '../services/auth.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const { DEFAULT_ORG_ID } = loadEnv();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required')
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required')
});

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { email: payload.email }
    });

    if (existing) {
      res.status(409).json({ error: { code: 'user_exists', message: 'User already exists' } });
      return;
    }

    const passwordHash = await hashPassword(payload.password);

    const user = await prisma.user.create({
      data: {
        email: payload.email,
        name: payload.name,
        password: passwordHash,
        orgs: {
          create: {
            orgId: DEFAULT_ORG_ID,
            role: 'owner'
          }
        }
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    const token = signToken({ userId: user.id, orgId: DEFAULT_ORG_ID, email: user.email });
    setAuthCookie(res, token);
    res.status(201).json({ data: user });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(422).json({
        error: {
          code: 'validation_error',
          message: 'Invalid registration data',
          details: error.flatten()
        }
      });
      return;
    }

    next(error);
  }
});

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: payload.email },
      select: { id: true, email: true, name: true, password: true }
    });

    if (!user) {
      res.status(401).json({ error: { code: 'invalid_credentials', message: 'Invalid credentials' } });
      return;
    }

    const passwordValid = await validatePassword(payload.password, user.password);
    if (!passwordValid) {
      res.status(401).json({ error: { code: 'invalid_credentials', message: 'Invalid credentials' } });
      return;
    }

    const token = signToken({ userId: user.id, orgId: DEFAULT_ORG_ID, email: user.email });
    setAuthCookie(res, token);

    res.json({
      data: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(422).json({
        error: {
          code: 'validation_error',
          message: 'Invalid login data',
          details: error.flatten()
        }
      });
      return;
    }

    next(error);
  }
});

router.post('/logout', (_req: Request, res: Response) => {
  clearAuthCookie(res);
  res.status(204).send();
});

router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: { code: 'unauthorized', message: 'Authentication required' } });
    return;
  }

  res.json({
    data: {
      id: req.user.userId,
      email: req.user.email,
      orgId: req.user.orgId
    }
  });
});

export const authRouter = router;
