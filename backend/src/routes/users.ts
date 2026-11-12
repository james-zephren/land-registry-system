import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getUserByEmail,
  getAllUsers,
  getAllOfficers,
  getProfile,
  updateProfile,
  toggleUserStatus,
  updateUserRole,
  searchUsers,
  getPendingUsers,
  approveUser,
} from '../controllers/userController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Public user info (for transfers) – accessible by authenticated users
router.get('/by-email/:email', getUserByEmail);

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Admin only routes
router.get('/', authorize('ADMIN'), getAllUsers);
router.get('/officers/all', authorize('ADMIN', 'OFFICER', 'REGISTRAR', 'SURVEYOR'), getAllOfficers);
router.get('/search', authenticate, searchUsers);
router.patch('/:userId/status', authorize('ADMIN'), toggleUserStatus);
router.put('/:userId/role', authorize('ADMIN'), updateUserRole);

// ✅ NEW endpoints for Level 2 Approval
router.get('/pending', authorize('ADMIN'), getPendingUsers);
router.patch('/:userId/approve', authorize('ADMIN'), approveUser);

export default router;