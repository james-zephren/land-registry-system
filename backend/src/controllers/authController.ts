import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth.js';
import { registerSchema, loginSchema } from '../schemas/auth.js';
import UserService from '../services/userService.js';
import { AppError } from '../utils/errors.js';

const generateTokens = (userId: string, email: string, role: string) => {
  const jwtSecret = process.env.JWT_SECRET || 'secret';
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'refresh-secret';
  
  const accessToken = jwt.sign(
    { id: userId, email, role },
    jwtSecret,
    { expiresIn: process.env.JWT_EXPIRY || '15m' } as any
  );

  const refreshToken = jwt.sign(
    { id: userId },
    jwtRefreshSecret,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' } as any
  );

  return { accessToken, refreshToken };
};

export const register = async (req: AuthRequest, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await UserService.findByEmail(data.email);
    if (existingUser) {
      throw new AppError(400, 'Email already registered');
    }

    const user = await UserService.create(data);

    const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        accessToken,
        refreshToken,
      },
    });
  } catch (error: any) {
    const statusCode = error instanceof AppError ? error.statusCode : 400;
    const message = error.message || 'Registration failed';
    res.status(statusCode).json({ success: false, message });
  }
};

export const login = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await UserService.findByEmail(email);
    if (!user) {
      throw new AppError(401, 'Invalid credentials');
    }

    if (!user.isActive) {
      throw new AppError(403, 'User account is inactive');
    }

    const isPasswordValid = await UserService.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid credentials');
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          walletAddress: user.walletAddress,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error: any) {
    const statusCode = error instanceof AppError ? error.statusCode : 400;
    const message = error.message || 'Login failed';
    res.status(statusCode).json({ success: false, message });
  }
};

export const refreshToken = async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError(400, 'Refresh token required');
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'refresh-secret'
    ) as any;

    const user = await UserService.findById(decoded.id);
    if (!user) {
      throw new AppError(401, 'User not found');
    }

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(
      user.id,
      user.email,
      user.role
    );

    res.json({
      success: true,
      message: 'Token refreshed',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error: any) {
    const message = error.message || 'Token refresh failed';
    res.status(401).json({ success: false, message });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized');
    }

    const user = await UserService.findById(req.user.id);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};
