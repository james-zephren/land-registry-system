import { Request, Response } from 'express';
import LogService from '../services/logService.js';
import { AppError } from '../utils/errors.js';

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 50;
    const action = req.query.action as string;

    let result;
    if (action) {
      result = await LogService.findByAction(action, skip, take);
    } else {
      result = await LogService.findAll(skip, take);
    }

    res.json({
      success: true,
      data: result.data,
      total: result.total,
      pagination: { skip, take, hasMore: result.hasMore },
    });
  } catch (error: any) {
    console.error('Get audit logs error:', error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const getTamperDetectionLogs = async (req: Request, res: Response) => {
  try {
    const logs = await LogService.getTamperDetectionLogs();

    res.json({
      success: true,
      data: logs,
      count: logs.length,
    });
  } catch (error: any) {
    console.error('Get tamper detection logs error:', error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const getLandAuditTrail = async (req: Request, res: Response) => {
  try {
    const { landId } = req.params;

    if (!landId) {
      throw new AppError(400, 'Land ID is required');
    }

    const logs = await LogService.findByLandId(landId);

    res.json({
      success: true,
      data: logs,
      count: logs.length,
    });
  } catch (error: any) {
    console.error('Get land audit trail error:', error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const getAuditTrailReport = async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const result = await LogService.getAuditTrail(startDate, endDate);

    res.json({
      success: true,
      data: result.data,
      total: result.total,
      filters: {
        startDate,
        endDate,
      },
    });
  } catch (error: any) {
    console.error('Get audit trail report error:', error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const getUserLogs = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 50;

    if (!userId) {
      throw new AppError(400, 'User ID is required');
    }

    const result = await LogService.findByUserId(userId, skip, take);

    res.json({
      success: true,
      data: result.data,
      total: result.total,
      pagination: { skip, take },
    });
  } catch (error: any) {
    console.error('Get user logs error:', error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const getLogStats = async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const stats = await LogService.getStats(startDate, endDate);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Get log stats error:', error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};