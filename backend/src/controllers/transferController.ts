import { Request, Response } from 'express';
import transferService from '../services/transferService.js';
import { AppError } from '../utils/errors.js';
import { hasUser } from '../middleware/auth.js';

export class TransferController {
  async initiateTransfer(req: Request, res: Response) {
    try {
      if (!hasUser(req)) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      if (req.user.role !== 'CITIZEN') {
        res.status(403).json({ success: false, error: 'Only citizens can initiate transfers' });
        return;
      }

      const { landId, toOwnerId } = req.body;

      if (!landId || !toOwnerId) {
        res.status(400).json({ success: false, error: 'Land ID and recipient are required' });
        return;
      }

      const transfer = await transferService.createTransfer({
        landId,
        fromOwnerId: req.user.id,
        toOwnerId,
        requiredApprovals: 2
      });

      res.status(201).json({
        success: true,
        data: transfer,
        message: 'Transfer request submitted. Waiting for officer approval.'
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Initiate transfer error:', error);
        res.status(500).json({ success: false, error: 'Failed to initiate transfer' });
      }
    }
  }

  async approveTransfer(req: Request, res: Response) {
    try {
      if (!hasUser(req)) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      if (req.user.role !== 'OFFICER' && req.user.role !== 'ADMIN' && req.user.role !== 'REGISTRAR'
             && req.user.role !== 'SURVEYOR'
      ) {
        res.status(403).json({ success: false, error: 'Only officers can approve transfers' });
        return;
      }

      const { transferId } = req.params;

      if (!transferId) {
        res.status(400).json({ success: false, error: 'Transfer ID is required' });
        return;
      }

      const result = await transferService.approveTransfer(transferId, req.user.id);

      let message = '';
      if (result.completed) {
        message = 'Transfer completed successfully! Land ownership has been updated on blockchain.';
      } else {
        message = `Transfer approved. ${result.approvalsRemaining} more approval(s) needed.`;
      }

      res.json({
        success: true,
        data: result,
        message
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Approve transfer error:', error);
        res.status(500).json({ success: false, error: 'Failed to approve transfer' });
      }
    }
  }

  async rejectTransfer(req: Request, res: Response) {
    try {
      if (!hasUser(req)) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      if (req.user.role !== 'OFFICER' && req.user.role !== 'ADMIN' && req.user.role !== 'REGISTRAR'
            && req.user.role !== 'SURVEYOR'
      ) {
        res.status(403).json({ success: false, error: 'Only officers can reject transfers' });
        return;
      }

      const { transferId } = req.params;
      const { reason } = req.body;

      if (!transferId) {
        res.status(400).json({ success: false, error: 'Transfer ID is required' });
        return;
      }

      if (!reason || reason.trim() === '') {
        res.status(400).json({ success: false, error: 'Rejection reason is required' });
        return;
      }

      const transfer = await transferService.rejectTransfer(transferId, req.user.id, reason);

      res.json({
        success: true,
        data: transfer,
        message: 'Transfer rejected'
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Reject transfer error:', error);
        res.status(500).json({ success: false, error: 'Failed to reject transfer' });
      }
    }
  }

  async getUserTransfers(req: Request, res: Response) {
    try {
      if (!hasUser(req)) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const transfers = await transferService.getUserTransferHistory(req.user.id);

      res.json({
        success: true,
        data: transfers,
        count: transfers.length
      });
    } catch (error: any) {
      console.error('Get user transfers error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch transfers' });
    }
  }

  async getPendingTransfers(req: Request, res: Response) {
    try {
      if (!hasUser(req)) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      if (req.user.role !== 'OFFICER' && req.user.role !== 'ADMIN' && req.user.role !== 'REGISTRAR'
            && req.user.role !== 'SURVEYOR'
      ) {
        res.status(403).json({ success: false, error: 'Only officers can view pending transfers' });
        return;
      }

      const transfers = await transferService.findPending();

      res.json({
        success: true,
        data: transfers,
        count: transfers.length
      });
    } catch (error: any) {
      console.error('Get pending transfers error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch pending transfers' });
    }
  }

  async getTransferById(req: Request, res: Response) {
    try {
      if (!hasUser(req)) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const { transferId } = req.params;

      if (!transferId) {
        res.status(400).json({ success: false, error: 'Transfer ID is required' });
        return;
      }

      const transfer = await transferService.findById(transferId);

      if (!transfer) {
        res.status(404).json({ success: false, error: 'Transfer not found' });
        return;
      }

      if (transfer.fromOwnerId !== req.user.id && 
          transfer.toOwnerId !== req.user.id && 
          req.user.role !== 'ADMIN') {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }

      res.json({
        success: true,
        data: transfer
      });
    } catch (error: any) {
      console.error('Get transfer error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch transfer' });
    }
  }
}

export default new TransferController();