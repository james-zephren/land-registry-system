import { Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/errors.js';
import { hasUser } from '../middleware/auth.js';

/**
 * Get pending approvals for officer
 * Shows ALL lands with PENDING status that haven't been approved by THIS officer yet
 */
export const getPendingApprovals = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!hasUser(req)) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (req.user.role !== 'OFFICER' && req.user.role !== 'ADMIN' && req.user.role !== 'REGISTRAR'
       &&  req.user.role !== 'SURVEYOR') {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    // Get all PENDING lands
    const pendingLands = await prisma.land.findMany({
      where: {
        status: 'PENDING'
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        approvals: {
          where: {
            type: 'REGISTRATION',
            status: 'APPROVED'
          },
          include: {
            officer: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Filter out lands that this officer has already approved
    const availableLands = pendingLands.filter(land => {
      const alreadyApproved = land.approvals.some(
        approval => approval.officerId === req.user.id
      );
      return !alreadyApproved;
    });

    // Transform to match frontend expected format
    const formattedApprovals = availableLands.map(land => ({
      id: land.id,
      landId: land.id,
      land: {
        id: land.id,
        parcelId: land.parcelId,
        location: land.location,
        area: land.area,
        owner: land.owner,
        dataHash: land.dataHash,
        status: land.status
      },
      status: land.status,
      createdAt: land.createdAt,
      approvalsReceived: land.approvals.length,
      approvalsNeeded: 2
    }));

    console.log(`Pending approvals for ${req.user.email}: ${formattedApprovals.length} lands`);
    console.log(`Total pending lands in DB: ${pendingLands.length}`);
    console.log(`Officer already approved: ${pendingLands.length - formattedApprovals.length} lands`);

    res.json({
      success: true,
      data: formattedApprovals,
      count: formattedApprovals.length
    });
  } catch (error: any) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending approvals'
    });
  }
};

/**
 * Approve a land registration
 */
export const approveLand = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!hasUser(req)) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (req.user.role !== 'OFFICER' && req.user.role !== 'ADMIN' && req.user.role !== 'REGISTRAR'
       && req.user.role !== 'SURVEYOR') {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    const { landId } = req.params;
    const { comments } = req.body;

    if (!landId) {
      res.status(400).json({ success: false, error: 'Land ID is required' });
      return;
    }

    // Check if land exists
    const land = await prisma.land.findUnique({
      where: { id: landId }
    });

    if (!land) {
      res.status(404).json({ success: false, error: 'Land not found' });
      return;
    }

    // Check if already approved
    if (land.status !== 'PENDING') {
      res.status(400).json({ 
        success: false, 
        error: `Land is already ${land.status}. Cannot approve.` 
      });
      return;
    }

    // Check if this officer already approved this land
    const existingApproval = await prisma.approval.findFirst({
      where: {
        landId,
        officerId: req.user.id,
        type: 'REGISTRATION'
      }
    });

    if (existingApproval) {
      res.status(400).json({ 
        success: false, 
        error: 'You have already approved this land. Each officer can only approve once.' 
      });
      return;
    }

    // Create approval record
    const approval = await prisma.approval.create({
      data: {
        landId,
        officerId: req.user.id,
        type: 'REGISTRATION',
        status: 'APPROVED',
        comments: comments || `Approved by ${req.user.name || 'Officer'}`
      }
    });

    // Get all approvals for this land
    const allApprovals = await prisma.approval.findMany({
      where: {
        landId,
        type: 'REGISTRATION',
        status: 'APPROVED'
      }
    });

    const requiredApprovals = 2;
    const currentApprovals = allApprovals.length;

    console.log(`Land ${land.parcelId}: ${currentApprovals}/${requiredApprovals} approvals`);

    // If we have enough approvals, update land status
    if (currentApprovals >= requiredApprovals) {
      const updatedLand = await prisma.land.update({
        where: { id: landId },
        data: { status: 'APPROVED' }
      });

      console.log(`Land ${land.parcelId} status updated to APPROVED`);

      // Create audit log for approval completion
      await prisma.log.create({
        data: {
          userId: req.user.id,
          action: 'LAND_APPROVED_COMPLETED',
          details: JSON.stringify({
            landId,
            parcelId: land.parcelId,
            approvalsCount: currentApprovals,
            requiredApprovals
          }),
          landId
        }
      });

      res.json({
        success: true,
        data: approval,
        message: `Land fully approved! ${currentApprovals}/${requiredApprovals} approvals received. Land status updated to APPROVED.`
      });
      return;
    }

    // Create audit log for single approval
    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'LAND_APPROVED',
        details: JSON.stringify({
          landId,
          parcelId: land.parcelId,
          approvalsNeeded: requiredApprovals,
          approvalsReceived: currentApprovals
        }),
        landId
      }
    });

    res.json({
      success: true,
      data: approval,
      message: `Land approved! ${currentApprovals}/${requiredApprovals} approvals received. ${requiredApprovals - currentApprovals} more approval(s) needed.`
    });
  } catch (error: any) {
    console.error('Approve land error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to approve land'
    });
  }
};

/**
 * Reject a land registration
 */
export const rejectLand = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!hasUser(req)) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (req.user.role !== 'OFFICER' && req.user.role !== 'ADMIN' && req.user.role !== 'REGISTRAR' 
          && req.user.role !== 'SURVEYOR' ) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    const { landId } = req.params;
    const { comments } = req.body;

    if (!landId) {
      res.status(400).json({ success: false, error: 'Land ID is required' });
      return;
    }

    if (!comments || comments.trim() === '') {
      res.status(400).json({ 
        success: false, 
        error: 'Rejection reason is required' 
      });
      return;
    }

    const land = await prisma.land.findUnique({
      where: { id: landId }
    });

    if (!land) {
      res.status(404).json({ success: false, error: 'Land not found' });
      return;
    }

    if (land.status !== 'PENDING') {
      res.status(400).json({ 
        success: false, 
        error: `Land is already ${land.status}. Cannot reject.` 
      });
      return;
    }

    const approval = await prisma.approval.create({
      data: {
        landId,
        officerId: req.user.id,
        type: 'REGISTRATION',
        status: 'REJECTED',
        comments,
      }
    });

    await prisma.land.update({
      where: { id: landId },
      data: { status: 'REJECTED' }
    });

    await prisma.log.create({
      data: {
        userId: req.user.id,
        action: 'LAND_REJECTED',
        details: JSON.stringify({
          landId,
          parcelId: land.parcelId,
          reason: comments
        }),
        landId
      }
    });

    res.json({
      success: true,
      data: approval,
      message: 'Land registration rejected'
    });
  } catch (error: any) {
    console.error('Reject land error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject land'
    });
  }
};

/**
 * Get approvals by land ID
 */
export const getApprovalsByLand = async (req: Request, res: Response): Promise<void> => {
  try {
    const { landId } = req.params;

    if (!landId) {
      res.status(400).json({ success: false, error: 'Land ID is required' });
      return;
    }

    const approvals = await prisma.approval.findMany({
      where: { landId },
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
    });

    res.json({
      success: true,
      data: approvals,
      count: approvals.length
    });
  } catch (error: any) {
    console.error('Get approvals by land error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch approvals'
    });
  }
};

/**
 * Get verification needed (for auditors)
 */
export const getVerificationNeeded = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!hasUser(req)) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (req.user.role !== 'AUDITOR' && req.user.role !== 'ADMIN' && req.user.role) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    const approvedLands = await prisma.land.findMany({
      where: {
        status: 'APPROVED'
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        approvals: {
          where: {
            type: 'REGISTRATION',
            status: 'APPROVED'
          },
          include: {
            officer: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({
      success: true,
      data: approvedLands,
      count: approvedLands.length
    });
  } catch (error: any) {
    console.error('Get verification needed error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lands needing verification'
    });
  }
};