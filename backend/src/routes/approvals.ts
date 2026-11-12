import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getPendingApprovals,
  approveLand,
  rejectLand,
  getApprovalsByLand,
  getVerificationNeeded
} from '../controllers/approvalController';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get pending approvals (Officer, Registrar, Admin)
router.get('/pending', authorize('OFFICER', 'REGISTRAR', 'ADMIN', 'SURVEYOR'), (req, res, next) => {
  getPendingApprovals(req, res).catch(next);
});

// Get approvals by land ID (All authenticated)
router.get('/land/:landId', (req, res, next) => {
  getApprovalsByLand(req, res).catch(next);
});

// Get verification needed (Auditor, Admin)
router.get('/verification/needed', authorize('AUDITOR', 'ADMIN'), (req, res, next) => {
  getVerificationNeeded(req, res).catch(next);
});

// Approve a land (Officer, Registrar, Admin)
router.post('/land/:landId/approve', authorize('OFFICER', 'REGISTRAR', 'ADMIN', 'SURVEYOR'), (req, res, next) => {
  approveLand(req, res).catch(next);
});

// Reject a land (Officer, Registrar, Admin)
router.post('/land/:landId/reject', authorize('OFFICER', 'REGISTRAR', 'ADMIN', 'SURVEYOR'), (req, res, next) => {
  rejectLand(req, res).catch(next);
});

export default router;