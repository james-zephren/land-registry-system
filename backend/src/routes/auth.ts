import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../server.js';
import { z } from 'zod';

const router = express.Router();

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  walletAddress: z.string().optional().nullable(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post('/register', async (req, res) => {
  console.log('📝 Registration request received:', {
    email: req.body.email,
    name: req.body.name,
    hasWallet: !!req.body.walletAddress
  });
  
  try {
    const validationResult = registerSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.log('❌ Validation failed:', validationResult.error.errors);
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validationResult.error.errors 
      });
    }
    
    const { email, password, name, walletAddress } = validationResult.data;
    
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      console.log('❌ User already exists:', email);
      return res.status(400).json({ 
        error: 'EMAIL_ALREADY_EXISTS',
        message: `User with email "${email}" already exists. Please use a different email or login.`
      });
    }
    
    if (walletAddress) {
      const existingWallet = await prisma.user.findUnique({
        where: { walletAddress },
      });
      if (existingWallet) {
        console.log('❌ Wallet address already used:', walletAddress);
        return res.status(400).json({ 
          error: 'WALLET_ALREADY_USED',
          message: 'Wallet address already associated with another account. Please use a different wallet address or leave it empty.'
        });
      }
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // ✅ NEW: isApproved = false – requires admin approval
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        role: 'CITIZEN',
        walletAddress: walletAddress || null,
        isActive: true,
        isApproved: false,   // <-- Level 2 approval
      },
    });
    
    console.log('✅ User created successfully (pending approval):', user.email);
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '15m' }
    );
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      { expiresIn: '7d' }
    );
    
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({
      success: true,
      accessToken: token,
      refreshToken,
      user: userWithoutPassword,
    });
    
  } catch (error: any) {
    console.error('❌ Registration error:', error);
    if (error.code === 'P2002') {
      const target = error.meta?.target;
      if (target && Array.isArray(target)) {
        if (target.includes('email')) {
          return res.status(400).json({ error: 'EMAIL_ALREADY_EXISTS', message: 'This email is already registered.' });
        }
        if (target.includes('walletAddress')) {
          return res.status(400).json({ error: 'WALLET_ALREADY_USED', message: 'This wallet address is already linked to another account.' });
        }
      }
    }
    res.status(500).json({ error: 'REGISTRATION_FAILED', message: error.message || 'Registration failed.' });
  }
});

router.post('/login', async (req, res) => {
  console.log('🔐 Login request received:', req.body.email);
  
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
    }

    if (!user.isActive) {
  console.log('❌ Account disabled:', email);
  return res.status(401).json({ 
    error: 'ACCOUNT_DISABLED', 
    message: 'Your account has been disabled. Please contact administrator.' 
  });
}
    
    // ✅ NEW: Check if user is approved by admin
    if (!user.isApproved) {
      console.log('❌ User not approved:', email);
      return res.status(401).json({ error: 'ACCOUNT_PENDING_APPROVAL', message: 'Your account is pending admin approval. You will be notified once approved.' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '15m' }
    );
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      { expiresIn: '7d' }
    );
    
    console.log('✅ User logged in:', email);
    const { password: _, ...userWithoutPassword } = user;
    res.json({
      success: true,
      accessToken: token,
      refreshToken,
      user: userWithoutPassword,
    });
    
  } catch (error: any) {
    console.error('❌ Login error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid input format', details: error.errors });
    }
    res.status(500).json({ error: 'LOGIN_FAILED', message: error.message || 'Login failed.' });
  }
  
});

router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh-secret') as { id: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user || !user.isActive || !user.isApproved) {
      return res.status(401).json({ error: 'Invalid refresh token or user not approved' });
    }

    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '15m' }
    );

    res.json({ success: true, accessToken: newAccessToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh-secret') as { id: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user || !user.isActive || !user.isApproved) {
      return res.status(401).json({ error: 'Invalid refresh token or user not approved' });
    }

    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '15m' }
    );

    res.json({ success: true, accessToken: newAccessToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

export default router;