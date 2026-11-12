import { Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/errors.js';
import { hasUser } from '../middleware/auth.js';
import landService from '../services/landService.js';

/**
 * Register a new land (Citizen only)
 */
export const registerLand = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!hasUser(req)) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (req.user.role !== 'CITIZEN') {
      res.status(403).json({ success: false, error: 'Only citizens can register land' });
      return;
    }

    const { parcelId, location, area, documentHash } = req.body;

    if (!parcelId || !location || !area) {
      res.status(400).json({ 
        success: false, 
        error: 'Parcel ID, location, and area are required' 
      });
      return;
    }

    const land = await landService.create({
      parcelId,
      ownerId: req.user.id,
      location,
      area: parseFloat(area),
      documentHash,
      status: 'PENDING'
    });

    res.status(201).json({
      success: true,
      data: land,
      message: 'Land registered successfully. Waiting for officer approval.'
    });
  } catch (error: any) {
    console.error('Register land error:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to register land' });
    }
  }
};

/**
 * Get current user's lands
 */
export const getUserLands = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!hasUser(req)) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const lands = await prisma.land.findMany({
      where: { ownerId: req.user.id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        approvals: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: lands,
      count: lands.length
    });
  } catch (error: any) {
    console.error('Get user lands error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch lands' });
  }
};

/**
 * Get all lands with pagination (Officer, Auditor, Admin)
 */
export const getAllLands = async (req: Request, res: Response): Promise<void> => {
  try {
    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 50;

    const result = await landService.findAll(skip, take);

    res.json({
      success: true,
      data: result.data,
      total: result.total,
      skip: result.skip,
      take: result.take,
      hasMore: result.hasMore
    });
  } catch (error: any) {
    console.error('Get all lands error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch lands' });
  }
};

/**
 * Get land by parcel ID
 */
export const getLandByParcelId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { parcelId } = req.params;

    if (!parcelId) {
      res.status(400).json({ success: false, error: 'Parcel ID is required' });
      return;
    }

    const land = await prisma.land.findUnique({
      where: { parcelId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            walletAddress: true
          }
        },
        approvals: {
          include: {
            officer: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        transfers: {
          include: {
            fromOwner: true,
            toOwner: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!land) {
      res.status(404).json({ success: false, error: 'Land not found' });
      return;
    }

    // Check permissions: Citizens can only view their own lands
    if (hasUser(req) && req.user.role === 'CITIZEN' && land.ownerId !== req.user.id) {
      res.status(403).json({ success: false, error: 'You do not have permission to view this land' });
      return;
    }

    res.json({
      success: true,
      data: land
    });
  } catch (error: any) {
    console.error('Get land by parcel ID error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch land' });
  }
};

/**
 * Get lands by status - Using direct Prisma query since LandService doesn't have this method
 */
export const getLandsByStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.params;

    if (!status) {
      res.status(400).json({ success: false, error: 'Status is required' });
      return;
    }

    const validStatuses = ['PENDING', 'APPROVED', 'VERIFIED', 'REJECTED', 'TRANSFERRED'];
    if (!validStatuses.includes(status.toUpperCase())) {
      res.status(400).json({ 
        success: false, 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
      return;
    }

    const lands = await prisma.land.findMany({
      where: { status: status as any },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        approvals: {
          take: 3,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: lands,
      count: lands.length
    });
  } catch (error: any) {
    console.error('Get lands by status error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch lands' });
  }
};

/**
 * Update land status (Officer, Admin)
 */
export const updateLandStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!hasUser(req)) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { landId } = req.params;
    const { status } = req.body;

    if (!landId || !status) {
      res.status(400).json({ success: false, error: 'Land ID and status are required' });
      return;
    }

    const validStatuses = ['PENDING', 'APPROVED', 'VERIFIED', 'REJECTED', 'TRANSFERRED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ 
        success: false, 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
      return;
    }

    const land = await landService.updateStatus(landId, status);

    res.json({
      success: true,
      data: land,
      message: `Land status updated to ${status}`
    });
  } catch (error: any) {
    console.error('Update land status error:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to update land status' });
    }
  }
};

/**
 * Verify land integrity (Auditor, Admin)
 */
export const verifyLand = async (req: Request, res: Response): Promise<void> => {
  try {
    const { parcelId, currentDataHash } = req.body;

    if (!parcelId) {
      res.status(400).json({ 
        success: false, 
        error: 'Parcel ID is required' 
      });
      return;
    }

    const verification = await landService.verifyLandIntegrity(parcelId);

    res.json({
      success: true,
      data: verification
    });
  } catch (error: any) {
    console.error('Verify land error:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to verify land' });
    }
  }
};

/**
 * Get land statistics
 */
export const getLandStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await landService.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Get land stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch land statistics' });
  }
};