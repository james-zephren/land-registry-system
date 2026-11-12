import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import blockchainController from '../controllers/blockchainController.js';

const router = express.Router();

// Public blockchain endpoints (no authentication required)
router.get('/status', (req, res, next) => {
  blockchainController.getStatus(req, res).catch(next);
});

router.get('/verify/:parcelId', (req, res, next) => {
  blockchainController.verifyLand(req, res).catch(next);
});

router.get('/hash/:parcelId', (req, res, next) => {
  blockchainController.getStoredHash(req, res).catch(next);
});

// Protected endpoints (require authentication)
router.use(authenticate);

// Get blockchain stats (Admin only)
router.get('/stats', authorize('ADMIN'), (req, res, next) => {
  blockchainController.getStats(req, res).catch(next);
});

// Get land with blockchain details (Authenticated users)
router.get('/land/:parcelId', (req, res, next) => {
  blockchainController.getLandBlockchainDetails(req, res).catch(next);
});

export default router;