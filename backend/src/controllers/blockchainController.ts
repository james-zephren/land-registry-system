import { Request, Response } from 'express';
import blockchainService from '../config/blockchain.js';
import landService from '../services/landService.js';
import { AppError } from '../utils/errors.js';

export class BlockchainController {
  async getStatus(req: Request, res: Response) {
    try {
      const isConnected = await blockchainService.isConnected();
      const blockNumber = await blockchainService.getProvider().getBlockNumber();
      
      res.json({
        success: true,
        data: {
          connected: isConnected,
          blockNumber,
          contractAddress: process.env.BLOCKCHAIN_CONTRACT_ADDRESS,
          network: process.env.BLOCKCHAIN_NETWORK || 'ganache'
        }
      });
    } catch (error: any) {
      console.error('Get status error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get blockchain status' 
      });
    }
  }

  async verifyLand(req: Request, res: Response) {
    try {
      const { parcelId } = req.params;
      
      if (!parcelId) {
        res.status(400).json({ success: false, error: 'Parcel ID is required' });
        return;
      }
      
      const verification = await landService.verifyLandIntegrity(parcelId);
      
      res.json({ success: true, data: verification });
    } catch (error: any) {
      console.error('Verify land error:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Failed to verify land' });
      }
    }
  }

  async getLandBlockchainDetails(req: Request, res: Response) {
    try {
      const { parcelId } = req.params;
      
      if (!parcelId) {
        res.status(400).json({ success: false, error: 'Parcel ID is required' });
        return;
      }
      
      const landDetails = await landService.getLandWithVerification(parcelId);
      
      res.json({ success: true, data: landDetails });
    } catch (error: any) {
      console.error('Get land blockchain details error:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Failed to get land blockchain details' });
      }
    }
  }

  async getStoredHash(req: Request, res: Response) {
    try {
      const { parcelId } = req.params;
      
      if (!parcelId) {
        res.status(400).json({ success: false, error: 'Parcel ID is required' });
        return;
      }
      
      const hash = await blockchainService.getLandHash(parcelId);
      
      res.json({
        success: true,
        data: { parcelId, storedHash: hash }
      });
    } catch (error: any) {
      console.error('Get stored hash error:', error);
      res.status(500).json({ success: false, error: 'Failed to get stored hash' });
    }
  }

  async getStats(req: Request, res: Response) {
    try {
      const stats = await landService.getBlockchainStats();
      res.json({ success: true, data: stats });
    } catch (error: any) {
      console.error('Get stats error:', error);
      res.status(500).json({ success: false, error: 'Failed to get blockchain stats' });
    }
  }
}

export default new BlockchainController();