import { Request, Response } from 'express';
import userService from '../services/userService.js';
import { AppError } from '../utils/errors.js';
import { hasUser } from '../middleware/auth.js';
import prisma from '@/utils/prisma.js';

/**
 * Get user by email (for transfers)
 */
export const getUserByEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.params;

    if (!email) {
      res.status(400).json({ success: false, error: 'Email is required' });
      return;
    }

    console.log(`📧 Looking up user by email: ${email}`);
    
    const user = await userService.getUserByEmail(email);

    res.json({
      success: true,
      data: user
    });
  } catch (error: any) {
    console.error('Get user by email error:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to find user' });
    }
  }
};
/**
 * Get all users (Admin only)
 */
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    
    if (!hasUser(req)) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (req.user.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return;
    }

    const users = await userService.getAllUsers();

    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error: any) {
    console.error('Get all users error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
};

/**
 * Get all officers
 */
export const getAllOfficers = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!hasUser(req)) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const officers = await userService.getAllOfficers();

    res.json({
      success: true,
      data: officers,
      count: officers.length
    });
  } catch (error: any) {
    console.error('Get officers error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch officers' });
  }
};

/**
 * Get user profile (current user)
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!hasUser(req)) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const profile = await userService.getProfile(req.user.id);

    res.json({
      success: true,
      data: profile
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!hasUser(req)) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { name, walletAddress } = req.body;
    const updatedUser = await userService.updateProfile(req.user.id, { name, walletAddress });

    res.json({
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully'
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
};

/**
 * Toggle user status (Admin only)
 */
export const toggleUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!hasUser(req)) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (req.user.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return;
    }

    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      res.status(400).json({ success: false, error: 'isActive must be a boolean' });
      return;
    }

    const updatedUser = await userService.toggleUserStatus(userId, isActive);

    res.json({
      success: true,
      data: updatedUser,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error: any) {
    console.error('Toggle user status error:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to toggle user status' });
    }
  }
};

/**
 * Update user role (Admin only)
 */
export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!hasUser(req)) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (req.user.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return;
    }

    const { userId } = req.params;
    const { role } = req.body;

    if (!role) {
      res.status(400).json({ success: false, error: 'Role is required' });
      return;
    }

    const updatedUser = await userService.updateUserRole(userId, role);

    res.json({
      success: true,
      data: updatedUser,
      message: `User role updated to ${role}`
    });
  } catch (error: any) {
    console.error('Update user role error:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to update user role' });
    }
  }
};

/**
 * Debug endpoint to search users (temporary)
 */
export const searchUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.query;
    
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: query as string, mode: 'insensitive' } },
          { name: { contains: query as string, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      },
      take: 10
    });
    
    res.json({ success: true, data: users });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get all users pending approval (isApproved = false, role = 'CITIZEN')
 * Admin only
 */
export const getPendingUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!hasUser(req) || req.user.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return;
    }

    const pendingUsers = await prisma.user.findMany({
      where: {
        isApproved: false,
        role: 'CITIZEN',
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ success: true, data: pendingUsers });
  } catch (error) {
    console.error('Get pending users error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pending users' });
  }
};

/**
 * Approve a user (set isApproved = true)
 * Admin only
 */
export const approveUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!hasUser(req) || req.user.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return;
    }

    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    if (user.isApproved) {
      res.status(400).json({ success: false, error: 'User is already approved' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isApproved: true },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isApproved: true,
      },
    });

    // Optional: Send notification email here (omitted for brevity)

    res.json({
      success: true,
      message: 'User approved successfully',
      data: updatedUser,
    });
  } catch (error: any) {
    console.error('Approve user error:', error);
    res.status(500).json({ success: false, error: 'Failed to approve user' });
  }
};