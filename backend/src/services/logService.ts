import { prisma } from '../utils/prisma.js';
import { Prisma } from '@prisma/client';

// Define types
interface LogData {
  userId?: string;
  action: string;
  details: any;
  ipAddress?: string;
  landId?: string;
  transferId?: string;
}

interface LogFilters {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  action?: string;
}

interface PaginatedResult {
  data: any[];
  total: number;
  skip: number;
  take: number;
  hasMore?: boolean;
}

export class LogService {
  /**
   * Create a new log entry
   */
  async log(data: LogData) {
    return prisma.log.create({
      data: {
        userId: data.userId,
        action: data.action,
        details: typeof data.details === 'string' ? data.details : JSON.stringify(data.details),
        ipAddress: data.ipAddress,
        landId: data.landId,
        transferId: data.transferId,
      },
    });
  }

  /**
   * Find all logs with pagination and filtering
   */
  async findAll(skip: number = 0, take: number = 50, filters?: LogFilters): Promise<PaginatedResult> {
    const where: Prisma.LogWhereInput = {};

    if (filters?.startDate || filters?.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        where.timestamp.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.timestamp.lte = filters.endDate;
      }
    }

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.action) {
      where.action = filters.action;
    }

    const [logs, total] = await Promise.all([
      prisma.log.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          land: {
            select: {
              id: true,
              parcelId: true,
            },
          },
          transfer: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
      }),
      prisma.log.count({ where }),
    ]);

    return {
      data: logs,
      total,
      skip,
      take,
      hasMore: skip + take < total,
    };
  }

  /**
   * Find logs by action type
   */
  async findByAction(action: string, skip: number = 0, take: number = 50): Promise<PaginatedResult> {
    const [logs, total] = await Promise.all([
      prisma.log.findMany({
        where: { action },
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          land: {
            select: {
              id: true,
              parcelId: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
      }),
      prisma.log.count({ where: { action } }),
    ]);

    return {
      data: logs,
      total,
      skip,
      take,
    };
  }

  /**
   * Find logs by user ID
   */
  async findByUserId(userId: string, skip: number = 0, take: number = 50): Promise<PaginatedResult> {
    const [logs, total] = await Promise.all([
      prisma.log.findMany({
        where: { userId },
        skip,
        take,
        include: {
          land: {
            select: {
              id: true,
              parcelId: true,
            },
          },
          transfer: true,
        },
        orderBy: { timestamp: 'desc' },
      }),
      prisma.log.count({ where: { userId } }),
    ]);

    return {
      data: logs,
      total,
      skip,
      take,
    };
  }

  /**
   * Find logs by land ID (audit trail)
   */
  async findByLandId(landId: string) {
    const logs = await prisma.log.findMany({
      where: {
        OR: [
          { landId: landId },
          {
            details: {
              contains: landId,
            },
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        transfer: true,
      },
      orderBy: { timestamp: 'asc' },
    });

    return logs;
  }

  /**
   * Get audit trail with date range
   */
  async getAuditTrail(startDate?: Date, endDate?: Date, skip: number = 0, take: number = 1000): Promise<PaginatedResult> {
    const where: Prisma.LogWhereInput = {};

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = startDate;
      }
      if (endDate) {
        where.timestamp.lte = endDate;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.log.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          land: {
            select: {
              id: true,
              parcelId: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take,
      }),
      prisma.log.count({ where }),
    ]);

    return {
      data: logs,
      total,
      skip,
      take,
    };
  }

  /**
   * Get tamper detection logs
   */
  async getTamperDetectionLogs() {
    const logs = await prisma.log.findMany({
      where: {
        action: {
          in: ['TAMPER_DETECTED', 'VERIFICATION_FAILED', 'INTEGRITY_CHECK_FAILED'],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        land: {
          select: {
            id: true,
            parcelId: true,
            dataHash: true,
            blockchainHash: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    return logs;
  }

  /**
   * Get logs grouped by action (for statistics)
   */
  async getGroupedByAction(startDate?: Date, endDate?: Date) {
    const where: Prisma.LogWhereInput = {};

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = startDate;
      }
      if (endDate) {
        where.timestamp.lte = endDate;
      }
    }

    const grouped = await prisma.log.groupBy({
      by: ['action'],
      where,
      _count: true,
      orderBy: {
        _count: {
          action: 'desc',
        },
      },
    });

    return grouped.map((item: { action: string; _count: number }) => ({
      action: item.action,
      count: item._count,
    }));
  }

  /**
   * Get logs grouped by user (for statistics)
   */
  async getGroupedByUser(startDate?: Date, endDate?: Date, limit: number = 10) {
    const where: Prisma.LogWhereInput = {};

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = startDate;
      }
      if (endDate) {
        where.timestamp.lte = endDate;
      }
    }

    const grouped = await prisma.log.groupBy({
      by: ['userId'],
      where,
      _count: true,
      orderBy: {
        _count: {
          userId: 'desc',
        },
      },
      take: limit,
    });

    // Get user details for the grouped results
    const userIds = grouped
      .map((item: { userId: string | null; _count: number }) => item.userId)
      .filter((id: string | null): id is string => id !== null);
      
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, role: true },
    });

    const userMap = new Map(users.map((u: { id: string; name: string; email: string; role: string }) => [u.id, u]));

    return grouped.map((item: { userId: string | null; _count: number }) => ({
      user: userMap.get(item.userId!) || { id: item.userId!, name: 'Unknown' },
      count: item._count,
    }));
  }

  /**
   * Get recent activity logs
   */
  async getRecentActivity(limit: number = 100) {
    const logs = await prisma.log.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        land: {
          select: {
            id: true,
            parcelId: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return logs;
  }

  /**
   * Get log statistics
   */
  async getStats(startDate?: Date, endDate?: Date) {
    const where: Prisma.LogWhereInput = {};

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = startDate;
      }
      if (endDate) {
        where.timestamp.lte = endDate;
      }
    }

    const [total, byAction, uniqueUsers] = await Promise.all([
      prisma.log.count({ where }),
      prisma.log.groupBy({
        by: ['action'],
        where,
        _count: true,
      }),
      prisma.log.groupBy({
        by: ['userId'],
        where,
        _count: true,
      }),
    ]);

    return {
      total,
      uniqueActions: byAction.length,
      uniqueUsers: uniqueUsers.length,
      byAction: byAction.map((item: { action: string; _count: number }) => ({
        action: item.action,
        count: item._count,
      })),
    };
  }

  /**
   * Export logs in CSV format
   */
  async exportLogs(startDate?: Date, endDate?: Date, limit: number = 10000) {
    const where: Prisma.LogWhereInput = {};

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = startDate;
      }
      if (endDate) {
        where.timestamp.lte = endDate;
      }
    }

    const logs = await prisma.log.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
        land: {
          select: {
            parcelId: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return logs.map((log: any) => ({
      timestamp: log.timestamp.toISOString(),
      user: log.user?.email || 'System',
      userName: log.user?.name || 'System',
      action: log.action,
      details: log.details,
      ipAddress: log.ipAddress || '',
      landId: log.land?.parcelId || '',
      transferId: log.transferId || '',
    }));
  }

  /**
   * Delete old logs (for maintenance)
   */
  async deleteOldLogs(beforeDate: Date) {
    const result = await prisma.log.deleteMany({
      where: {
        timestamp: {
          lt: beforeDate,
        },
      },
    });

    return {
      deleted: result.count,
      beforeDate,
    };
  }
}

export default new LogService();