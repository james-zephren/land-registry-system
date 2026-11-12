import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/errors.js';
import blockchainService from '../config/blockchain.js';
import landService from './landService.js';
import { Prisma } from '@prisma/client';

interface CreateTransferData {
  landId: string;
  fromOwnerId: string;
  toOwnerId: string;
  requiredApprovals: number;
  status?: string;
}

interface GroupByResult {
  status: string;
  _count: number;
}

interface ApprovalResult {
  transfer: any;
  completed: false;
  approvalsRemaining: number;
}

interface CompletionResult {
  transfer: any;
  land: any;
  completed: true;
}

type ApproveTransferResult = ApprovalResult | CompletionResult;

export class TransferService {
  async createTransfer(data: CreateTransferData) {
    const land = await prisma.land.findUnique({
      where: { id: data.landId },
      include: { owner: true },
    });

    if (!land) {
      throw new AppError(404, 'Land not found');
    }

    if (land.ownerId !== data.fromOwnerId) {
      throw new AppError(403, 'Only the registered owner can initiate a transfer');
    }

    if (land.status !== 'VERIFIED' && land.status !== 'APPROVED') {
      throw new AppError(400, 'Land must be verified before transfer');
    }

    const existingTransfer = await prisma.transfer.findFirst({
      where: {
        landId: data.landId,
        status: 'PENDING',
      },
    });

    if (existingTransfer) {
      throw new AppError(400, 'A transfer is already pending for this land');
    }

    const newOwner = await prisma.user.findUnique({
      where: { id: data.toOwnerId },
    });

    if (!newOwner) {
      throw new AppError(404, 'Recipient user not found');
    }

    if (data.fromOwnerId === data.toOwnerId) {
      throw new AppError(400, 'Cannot transfer land to yourself');
    }

    const transfer = await prisma.transfer.create({
      data: {
        landId: data.landId,
        fromOwnerId: data.fromOwnerId,
        toOwnerId: data.toOwnerId,
        requiredApprovals: data.requiredApprovals,
        status: data.status || 'PENDING',
        approvals: 0,
      },
      include: {
        fromOwner: { select: { id: true, name: true, email: true } },
        toOwner: { select: { id: true, name: true, email: true } },
        land: { select: { id: true, parcelId: true, ownerId: true } },
      },
    });

    await prisma.log.create({
      data: {
        userId: data.fromOwnerId,
        action: 'TRANSFER_INITIATED',
        details: JSON.stringify({
          transferId: transfer.id,
          landId: data.landId,
          fromOwner: data.fromOwnerId,
          toOwner: data.toOwnerId,
          timestamp: new Date().toISOString(),
        }),
        ipAddress: null,
        landId: data.landId,
        transferId: transfer.id,
      },
    });

    return transfer;
  }

  async approveTransfer(transferId: string, officerId: string): Promise<ApproveTransferResult> {
    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
      include: {
        land: true,
        fromOwner: true,
        toOwner: true,
      },
    });

    if (!transfer) {
      throw new AppError(404, 'Transfer request not found');
    }

    if (transfer.status !== 'PENDING') {
      throw new AppError(400, 'Transfer is not pending');
    }

    const land = await prisma.land.findUnique({
      where: { id: transfer.landId },
    });

    if (!land) {
      throw new AppError(404, 'Land not found');
    }

    if (land.ownerId !== transfer.fromOwnerId) {
      throw new AppError(400, 'Land ownership has changed since transfer was initiated');
    }

    const existingApproval = await prisma.approval.findFirst({
      where: {
        landId: transfer.landId,
        officerId: officerId,
        type: 'TRANSFER',
      },
    });

    if (existingApproval) {
      throw new AppError(400, 'You have already approved this transfer');
    }

    await prisma.approval.create({
      data: {
        landId: transfer.landId,
        officerId: officerId,
        type: 'TRANSFER',
        status: 'APPROVED',
        comments: `Transfer approved by officer ${officerId}`,
      },
    });

    const newApprovalCount = transfer.approvals + 1;
    
    const updatedTransfer = await prisma.transfer.update({
      where: { id: transferId },
      data: { approvals: newApprovalCount },
    });

    if (newApprovalCount >= transfer.requiredApprovals) {
      const completionResult = await this.completeTransfer(transferId);
      return {
        transfer: completionResult.transfer,
        land: completionResult.land,
        completed: true,
      };
    }

    await prisma.log.create({
      data: {
        userId: officerId,
        action: 'TRANSFER_APPROVED',
        details: JSON.stringify({
          transferId,
          approvalsNeeded: transfer.requiredApprovals,
          approvalsReceived: newApprovalCount,
          timestamp: new Date().toISOString(),
        }),
        ipAddress: null,
        landId: transfer.landId,
        transferId: transferId,
      },
    });

    return {
      transfer: updatedTransfer,
      completed: false,
      approvalsRemaining: transfer.requiredApprovals - newApprovalCount,
    };
  }

  async completeTransfer(transferId: string) {
    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
      include: {
        land: true,
        fromOwner: true,
        toOwner: true,
      },
    });

    if (!transfer) {
      throw new AppError(404, 'Transfer request not found');
    }

    if (transfer.status !== 'PENDING') {
      throw new AppError(400, 'Transfer is not pending');
    }

    const land = await prisma.land.findUnique({
      where: { id: transfer.landId },
    });

    if (!land) {
      throw new AppError(404, 'Land not found');
    }

    if (land.ownerId !== transfer.fromOwnerId) {
      throw new AppError(400, 'Land ownership has changed. Transfer cancelled.');
    }

    // Generate new hash with new owner
    const newDataHash = landService.generateLandHash({
      parcelId: land.parcelId,
      location: land.location,
      area: land.area,
      documentHash: land.documentHash || undefined
    });

    // Store new hash on blockchain
    let blockchainTx = null;
    try {
      const isConnected = await blockchainService.isConnected();
      if (isConnected && process.env.BLOCKCHAIN_CONTRACT_ADDRESS) {
        blockchainTx = await blockchainService.storeLandHash(land.parcelId, newDataHash);
        console.log(`✅ Transfer: New hash stored on blockchain: ${blockchainTx.txHash}`);
      }
    } catch (error: any) {
      console.error('Blockchain storage error during transfer:', error.message);
    }

    // Update land ownership
    const updatedLand = await prisma.land.update({
      where: { id: transfer.landId },
      data: {
        ownerId: transfer.toOwnerId,
        status: 'TRANSFERRED',
        dataHash: newDataHash,
        blockchainHash: blockchainTx?.txHash || land.blockchainHash,
        updatedAt: new Date(),
      },
    });

    // Mark transfer as completed
    const completedTransfer = await prisma.transfer.update({
      where: { id: transferId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
      include: {
        fromOwner: { select: { id: true, name: true, email: true } },
        toOwner: { select: { id: true, name: true, email: true } },
        land: { select: { id: true, parcelId: true } },
      },
    });

    await prisma.log.create({
      data: {
        userId: transfer.fromOwnerId,
        action: 'TRANSFER_COMPLETED',
        details: JSON.stringify({
          transferId,
          landId: transfer.landId,
          parcelId: land.parcelId,
          fromOwner: transfer.fromOwnerId,
          toOwner: transfer.toOwnerId,
          newHash: newDataHash,
          blockchainTx: blockchainTx?.txHash,
          timestamp: new Date().toISOString(),
        }),
        ipAddress: null,
        landId: transfer.landId,
        transferId: transferId,
      },
    });

    return {
      transfer: completedTransfer,
      land: updatedLand,
      completed: true,
    };
  }

  async rejectTransfer(transferId: string, officerId: string, reason: string) {
    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
      include: {
        land: true,
        fromOwner: true,
        toOwner: true,
      },
    });

    if (!transfer) {
      throw new AppError(404, 'Transfer request not found');
    }

    if (transfer.status !== 'PENDING') {
      throw new AppError(400, 'Transfer is not pending');
    }

    await prisma.approval.create({
      data: {
        landId: transfer.landId,
        officerId: officerId,
        type: 'TRANSFER',
        status: 'REJECTED',
        comments: reason,
      },
    });

    const rejectedTransfer = await prisma.transfer.update({
      where: { id: transferId },
      data: {
        status: 'REJECTED',
        completedAt: new Date(),
      },
    });

    await prisma.log.create({
      data: {
        userId: officerId,
        action: 'TRANSFER_REJECTED',
        details: JSON.stringify({
          transferId,
          reason,
          timestamp: new Date().toISOString(),
        }),
        ipAddress: null,
        landId: transfer.landId,
        transferId: transferId,
      },
    });

    return rejectedTransfer;
  }

  async findById(id: string) {
    return prisma.transfer.findUnique({
      where: { id },
      include: {
        land: true,
        fromOwner: true,
        toOwner: true,
        logs: true,
      },
    });
  }

  async findByLandId(landId: string) {
    return prisma.transfer.findMany({
      where: { landId },
      include: {
        fromOwner: { select: { id: true, name: true, email: true } },
        toOwner: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPending() {
    return prisma.transfer.findMany({
      where: { status: 'PENDING' },
      include: {
        land: {
          include: {
            owner: { select: { id: true, name: true, email: true } },
          },
        },
        fromOwner: true,
        toOwner: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUserId(userId: string) {
    return prisma.transfer.findMany({
      where: {
        OR: [{ fromOwnerId: userId }, { toOwnerId: userId }],
      },
      include: {
        land: true,
        fromOwner: { select: { id: true, name: true, email: true } },
        toOwner: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTransferStats() {
    const counts = await prisma.transfer.groupBy({
      by: ['status'],
      _count: true,
    });

    const byStatus: Record<string, number> = {};
    
    counts.forEach((item: GroupByResult) => {
      byStatus[item.status] = item._count;
    });

    return {
      total: counts.reduce((acc: number, item: GroupByResult) => acc + item._count, 0),
      byStatus: byStatus,
      pending: byStatus['PENDING'] || 0,
      completed: byStatus['COMPLETED'] || 0,
      rejected: byStatus['REJECTED'] || 0,
    };
  }

  async getUserTransferHistory(userId: string) {
    const transfers = await prisma.transfer.findMany({
      where: {
        OR: [
          { fromOwnerId: userId },
          { toOwnerId: userId },
        ],
      },
      include: {
        land: true,
        fromOwner: { select: { id: true, name: true, email: true } },
        toOwner: { select: { id: true, name: true, email: true } },
        logs: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return transfers.map((transfer: any) => ({
      ...transfer,
      isIncoming: transfer.toOwnerId === userId,
      isOutgoing: transfer.fromOwnerId === userId,
      canCancel: transfer.status === 'PENDING' && transfer.fromOwnerId === userId,
    }));
  }

  async getAllTransfers(skip: number = 0, take: number = 50) {
    return prisma.transfer.findMany({
      skip,
      take,
      include: {
        land: { select: { id: true, parcelId: true } },
        fromOwner: { select: { id: true, name: true, email: true } },
        toOwner: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateTransferStatus(transferId: string, status: string) {
    const data: any = { status };
    if (status === 'COMPLETED' || status === 'REJECTED') {
      data.completedAt = new Date();
    }

    return prisma.transfer.update({
      where: { id: transferId },
      data,
      include: {
        fromOwner: { select: { id: true, name: true, email: true } },
        toOwner: { select: { id: true, name: true, email: true } },
        land: { select: { id: true, parcelId: true } },
      },
    });
  }
}

export default new TransferService();