import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  name?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface AuthRequest extends Request {
  user: AuthUser;
}

export const hasUser = (req: Request): req is AuthRequest => {
  return req.user !== undefined;
};

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Handle both "Bearer token" and just "token" formats
    let token = authHeader;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Clean the token (remove any quotes or whitespace)
    const cleanToken = token.replace(/['"]+/g, '').trim();
    
    const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET || 'secret') as AuthUser;
    
    req.user = decoded;
    
    next();
  } catch (error: any) {
    console.error('Auth error:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userRole = req.user.role;
    const userRoleTrimmed = userRole.trim();
    const rolesTrimmed = roles.map(r => r.trim());
    
    console.log('🔐 Authorize check DETAILED:', { 
      userRole: `"${userRole}"`,
      userRoleLength: userRole.length,
      allowedRoles: roles,
      rolesTrimmed,
      includes: rolesTrimmed.includes(userRoleTrimmed)
    });
    
    if (!rolesTrimmed.includes(userRoleTrimmed)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

export const getAuthUser = (req: Request): AuthUser | undefined => {
  return req.user;
};