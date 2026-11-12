import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  registerLand,
  getUserLands,
  getAllLands,
  getLandByParcelId,
  updateLandStatus,
  verifyLand,
  getLandStats,
  getLandsByStatus
} from '../controllers/landController';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Register new land (Citizen only)
router.post('/register', authorize('CITIZEN'), (req, res, next) => {
  registerLand(req, res).catch(next);
});

// Get user's own lands (All authenticated users)
router.get('/user/my-lands', (req, res, next) => {
  getUserLands(req, res).catch(next);
});

// Get all lands with pagination (Officer, Registrar, Surveyor, Auditor, Admin)
router.get('/', authorize('OFFICER', 'REGISTRAR', 'SURVEYOR', 'AUDITOR', 'ADMIN'), (req, res, next) => {
  getAllLands(req, res).catch(next);
});

// Get land by parcel ID (All authenticated users)
router.get('/parcel/:parcelId', (req, res, next) => {
  getLandByParcelId(req, res).catch(next);
});

// Get lands by status (Officer, Registrar, Surveyor, Auditor, Admin)
router.get('/status/:status', authorize('OFFICER', 'REGISTRAR', 'SURVEYOR', 'AUDITOR', 'ADMIN'), (req, res, next) => {
  getLandsByStatus(req, res).catch(next);
});

// Update land status (Officer, Registrar, Admin)
router.patch('/:landId/status', authorize('OFFICER', 'REGISTRAR', 'SURVEYOR', 'ADMIN'), (req, res, next) => {
  updateLandStatus(req, res).catch(next);
});

// Verify land integrity (Auditor, Admin)
router.post('/verify', authorize('AUDITOR', 'ADMIN'), (req, res, next) => {
  verifyLand(req, res).catch(next);
});

// Get land statistics (Officer, Registrar, Surveyor, Auditor, Admin)
router.get('/stats/overview', authorize('OFFICER', 'REGISTRAR', 'SURVEYOR', 'AUDITOR', 'ADMIN'), (req, res, next) => {
  getLandStats(req, res).catch(next);
});

export default router;