import { prisma } from '../utils/prisma.js';
import { hashData } from '../utils/crypto.js';
import blockchainService from '../config/blockchain.js';
import { AppError } from '../utils/errors.js';

export class LandService {
  /**
   * Generate hash from land data (immutable properties only - NO timestamp)
   */
  generateLandHash(data: {
    parcelId: string;
    location: string;
    area: number;
    documentHash?: string;
  }): string {
    const dataObj: any = {
      parcelId: data.parcelId,
      location: data.location,
      area: data.area,
      documentHash: data.documentHash || ''
    };
    
    const dataString = JSON.stringify(dataObj);
    return hashData(dataString);
  }

  async create(data: {
    parcelId: string;
    ownerId: string;
    location: string;
    area: number;
    documentHash?: string;
    status?: string;
  }) {
    const existingLand = await prisma.land.findUnique({
      where: { parcelId: data.parcelId }
    });

    if (existingLand) {
      throw new AppError(400, 'Land with this parcel ID already exists');
    }

    // Generate the hash (NO timestamp)
    const dataHash = this.generateLandHash({
      parcelId: data.parcelId,
      location: data.location,
      area: data.area,
      documentHash: data.documentHash
    });
    
    console.log('========== REGISTRATION DEBUG ==========');
    console.log('Parcel ID:', data.parcelId);
    console.log('Generated dataHash:', dataHash);
    
    let blockchainTx = null;
    let blockchainError = null;
    
    try {
      const isConnected = await blockchainService.isConnected();
      if (isConnected && process.env.BLOCKCHAIN_CONTRACT_ADDRESS) {
        blockchainTx = await blockchainService.storeLandHash(data.parcelId, dataHash);
        console.log('Blockchain tx hash:', blockchainTx.txHash);
      }
    } catch (error: any) {
      console.error('Blockchain storage error:', error.message);
      blockchainError = error.message;
    }

    const land = await prisma.land.create({
      data: {
        parcelId: data.parcelId,
        ownerId: data.ownerId,
        location: data.location,
        area: data.area,
        documentHash: data.documentHash,
        dataHash: dataHash,
        blockchainHash: blockchainTx?.txHash || '',
        status: data.status || 'PENDING',
      },
      include: {
        owner: {
          select: { id: true, email: true, name: true, role: true },
        }
      }
    });

    console.log('Land created with dataHash:', land.dataHash);
    console.log('========================================');

    await prisma.log.create({
      data: {
        userId: data.ownerId,
        action: blockchainTx ? 'LAND_REGISTERED' : 'LAND_REGISTERED_NO_BLOCKCHAIN',
        details: JSON.stringify({
          landId: land.id,
          parcelId: data.parcelId,
          blockchainTx: blockchainTx?.txHash,
          dataHash: dataHash,
          blockchainError
        }),
        landId: land.id
      }
    });

    return land;
  }

  async findByParcelId(parcelId: string) {
    return prisma.land.findUnique({
      where: { parcelId },
      include: {
        owner: {
          select: { id: true, email: true, name: true, role: true, walletAddress: true },
        },
        approvals: {
          include: {
            officer: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' }
        },
        transfers: {
          include: {
            fromOwner: { select: { id: true, name: true, email: true } },
            toOwner: { select: { id: true, name: true, email: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      },
    });
  }

  async findByOwnerId(ownerId: string) {
    return prisma.land.findMany({
      where: { ownerId },
      include: {
        approvals: true,
        transfers: {
          include: {
            fromOwner: true,
            toOwner: true
          }
        },
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findAll(skip: number = 0, take: number = 50) {
    const [lands, total] = await Promise.all([
      prisma.land.findMany({
        skip,
        take,
        include: {
          owner: {
            select: { id: true, email: true, name: true },
          },
          approvals: {
            take: 3,
            orderBy: { createdAt: 'desc' }
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.land.count()
    ]);

    return {
      data: lands,
      total,
      skip,
      take,
      hasMore: skip + take < total
    };
  }

  async updateStatus(id: string, status: string) {
    return prisma.land.update({
      where: { id },
      data: { status: status as any, updatedAt: new Date() },
    });
  }

  async verifyLandIntegrity(parcelId: string) {
  const land = await this.findByParcelId(parcelId);
  if (!land) throw new AppError(404, 'Land not found');

  const currentHash = this.generateLandHash({
    parcelId: land.parcelId,
    location: land.location,
    area: land.area,
    documentHash: land.documentHash || undefined
  });

  const storedHash = await blockchainService.getLandHash(land.parcelId);
  const isValid = storedHash === currentHash;

  // For TRANSFERRED lands, they should still verify as VALID
  if (isValid && land.status === 'APPROVED') {
    await this.updateStatus(land.id, 'VERIFIED');
  }

  return { isValid, storedHash, currentHash };
}

  async getStats() {
    const [total, byStatus, totalArea] = await Promise.all([
      prisma.land.count(),
      prisma.land.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.land.aggregate({
        _sum: {
          area: true
        }
      })
    ]);

    const statusCounts: Record<string, number> = {};
    byStatus.forEach((item: any) => {
      statusCounts[item.status] = item._count;
    });

    return {
      total,
      byStatus: statusCounts,
      totalArea: totalArea._sum.area || 0,
      pending: statusCounts['PENDING'] || 0,
      approved: statusCounts['APPROVED'] || 0,
      verified: statusCounts['VERIFIED'] || 0,
      transferred: statusCounts['TRANSFERRED'] || 0,
      rejected: statusCounts['REJECTED'] || 0
    };
  }

  async getBlockchainStats() {
    const isConnected = await blockchainService.isConnected();
    const landsWithBlockchain = await prisma.land.count({
      where: { blockchainHash: { not: '' } }
    });
    const totalLands = await prisma.land.count();

    return {
      blockchainConnected: isConnected,
      contractAddress: process.env.BLOCKCHAIN_CONTRACT_ADDRESS || 'Not configured',
      network: process.env.BLOCKCHAIN_NETWORK || 'ganache',
      totalLandsOnBlockchain: landsWithBlockchain,
      totalLands,
      percentageOnBlockchain: totalLands > 0 ? Number((landsWithBlockchain / totalLands * 100).toFixed(2)) : 0
    };
  }

  async getLandWithVerification(parcelId: string) {
    const land = await this.findByParcelId(parcelId);

    if (!land) {
      throw new AppError(404, 'Land not found');
    }

    // Generate current hash (NO timestamp)
    const currentHash = this.generateLandHash({
      parcelId: land.parcelId,
      location: land.location,
      area: land.area,
      documentHash: land.documentHash || undefined
    });

    let blockchainVerification;
    let isBlockchainAvailable = false;

    try {
      const storedHash = await blockchainService.getLandHash(land.parcelId);
      const isValid = storedHash === currentHash;
      
      blockchainVerification = {
        isValid,
        storedHash: storedHash,
        currentHash: currentHash
      };
      isBlockchainAvailable = true;
    } catch (error: any) {
      console.error('Blockchain verification error:', error);
      blockchainVerification = {
        isValid: land.dataHash === currentHash,
        storedHash: land.blockchainHash || 'Not available',
        currentHash: currentHash
      };
    }

    return {
      ...land,
      blockchain: {
        storedHash: blockchainVerification.storedHash,
        currentHash: blockchainVerification.currentHash,
        isValid: blockchainVerification.isValid,
        transactionHash: land.blockchainHash,
        isAvailable: isBlockchainAvailable
      }
    };
  }
}

export default new LandService();
