import { Request, Response, NextFunction } from 'express';

import { TOKEN_COOKIE_NAME, verifyToken, JwtPayload } from '../services/auth.js';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const cookieToken = req.cookies?.[TOKEN_COOKIE_NAME];
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({ error: { code: 'unauthorized', message: 'Authentication required' } });
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    console.error('Failed to verify token', error);
    res.status(401).json({ error: { code: 'invalid_token', message: 'Session expired or invalid' } });
  }
}
