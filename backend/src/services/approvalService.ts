import { prisma } from '../utils/prisma.js';

export class ApprovalService {
  async createApproval(data: {
    landId: string;
    officerId: string;
    type: 'REGISTRATION' | 'TRANSFER';
    comments?: string;
    status?: string;
  }) {
    try {
      return await prisma.approval.create({
        data: {
          ...data,
          status: data.status || 'PENDING',
        },
        include: {
          officer: { select: { id: true, name: true, email: true } },
          land: { select: { id: true, parcelId: true } },
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new Error('Officer has already approved this land');
      }
      throw error;
    }
  }

  async findById(id: string) {
    return prisma.approval.findUnique({
      where: { id },
      include: {
        officer: true,
        land: true,
      },
    });
  }

  async findByLandId(landId: string) {
    return prisma.approval.findMany({
      where: { landId },
      include: {
        officer: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async findVerificationNeeded() {
    return prisma.approval.findMany({
      where: {
        type: 'REGISTRATION',
        status: 'PENDING',
      },
      include: {
        land: {
          include: {
            owner: { select: { id: true, name: true, email: true } },
          },
        },
        officer: { select: { id: true, name: true } },
      },
      take: 50,
    });
  }

  async updateApprovalStatus(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    comments?: string
  ) {
    return prisma.approval.update({
      where: { id },
      data: { status, comments },
      include: {
        land: true,
        officer: true,
      },
    });
  }

  async getApprovalCount(landId: string, type: 'REGISTRATION' | 'TRANSFER') {
    return prisma.approval.count({
      where: {
        landId,
        type,
        status: 'APPROVED',
      },
    });
  }

  async hasOfficerApproved(
    landId: string,
    officerId: string,
    type: 'REGISTRATION' | 'TRANSFER'
  ): Promise<boolean> {
    const approval = await prisma.approval.findFirst({
      where: {
        landId,
        officerId,
        type,
      },
    });

    return !!approval;
  }

  async getPendingApprovalsForOfficer(officerId: string) {
    return prisma.approval.findMany({
      where: {
        officerId,
        status: 'PENDING',
      },
      include: {
        land: {
          include: {
            owner: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export default new ApprovalService();
