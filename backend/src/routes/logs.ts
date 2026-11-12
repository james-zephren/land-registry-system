import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getAuditLogs,
  getTamperDetectionLogs,
  getLandAuditTrail,
  getAuditTrailReport,
  getUserLogs,
  getLogStats,
} from '../controllers/logController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Audit logs - Auditor/Admin only
router.get('/', authorize('AUDITOR', 'ADMIN'), (req, res, next) => {
  getAuditLogs(req, res).catch(next);
});

// Tamper detection logs - Auditor/Admin only
router.get('/tamper/detected', authorize('AUDITOR', 'ADMIN'), (req, res, next) => {
  getTamperDetectionLogs(req, res).catch(next);
});

// Land audit trail - Authenticated users (with permission checks in controller)
router.get('/land/:landId', (req, res, next) => {
  getLandAuditTrail(req, res).catch(next);
});

// Audit trail report - Auditor/Admin only
router.get('/report', authorize('AUDITOR', 'ADMIN'), (req, res, next) => {
  getAuditTrailReport(req, res).catch(next);
});

// User logs - Admin only
router.get('/user/:userId', authorize('ADMIN'), (req, res, next) => {
  getUserLogs(req, res).catch(next);
});

// Log statistics - Auditor/Admin only
router.get('/stats/overview', authorize('AUDITOR', 'ADMIN'), (req, res, next) => {
  getLogStats(req, res).catch(next);
});

export default router;