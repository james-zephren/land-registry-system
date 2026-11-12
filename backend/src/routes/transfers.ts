import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import transferController from '../controllers/transferController';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Citizen routes
router.post('/', authorize('CITIZEN'), (req, res, next) => {
  transferController.initiateTransfer(req, res).catch(next);
});

router.get('/my-transfers', (req, res, next) => {
  transferController.getUserTransfers(req, res).catch(next);
});

// Officer/Registrar/Admin routes
router.get('/pending', authorize('OFFICER', 'REGISTRAR', 'ADMIN', 'SURVEYOR'), (req, res, next) => {
  transferController.getPendingTransfers(req, res).catch(next);
});

router.post('/:transferId/approve', authorize('OFFICER', 'REGISTRAR', 'ADMIN', 'SURVEYOR'), (req, res, next) => {
  transferController.approveTransfer(req, res).catch(next);
});

router.post('/:transferId/reject', authorize('OFFICER', 'REGISTRAR', 'ADMIN', 'SURVEYOR'), (req, res, next) => {
  transferController.rejectTransfer(req, res).catch(next);
});

// Shared routes
router.get('/:transferId', (req, res, next) => {
  transferController.getTransferById(req, res).catch(next);
});

export default router;