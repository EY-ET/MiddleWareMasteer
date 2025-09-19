import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { safeLogger } from '../utils/logger';

// Extend Express Request interface to include auth data
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
      };
      isAdmin?: boolean;
    }
  }
}

export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-admin-key'] as string;
  
  if (!apiKey) {
    res.status(401).json({
      success: false,
      error: 'Admin API key required in X-Admin-Key header',
      code: 'MISSING_ADMIN_KEY'
    });
    return;
  }

  if (apiKey !== config.security.adminApiKey) {
    safeLogger.warn('Invalid admin API key attempt', { 
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path
    });
    
    res.status(403).json({
      success: false,
      error: 'Invalid admin API key',
      code: 'INVALID_ADMIN_KEY'
    });
    return;
  }

  req.isAdmin = true;
  next();
}

export function optionalJwtAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, config.security.jwtSecret) as any;
    req.user = {
      id: decoded.id || decoded.sub,
      role: decoded.role || 'user'
    };
  } catch (error) {
    safeLogger.debug('Invalid JWT token', { error: (error as Error).message });
    // Continue without user - optional auth
  }
  
  next();
}

export function requireJwtAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'MISSING_TOKEN'
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.security.jwtSecret) as any;
    req.user = {
      id: decoded.id || decoded.sub,
      role: decoded.role || 'user'
    };
    next();
  } catch (error) {
    safeLogger.warn('Invalid JWT token attempt', { 
      error: (error as Error).message,
      ip: req.ip
    });
    
    res.status(403).json({
      success: false,
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    });
  }
}