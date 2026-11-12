import { prisma } from '../utils/prisma.js';
import bcrypt from 'bcryptjs';
import { AppError } from '../utils/errors.js';

export class UserService {
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        walletAddress: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        walletAddress: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
 * Get user by email (public info for transfers)
 */
/**
 * Get user by email (public info for transfers)
 */
async getUserByEmail(email: string) {
  // Trim and convert to lowercase for consistent search
  const searchEmail = email.trim().toLowerCase();
  console.log(`🔍 Searching for user with email: ${searchEmail}`);
  
  // First, try to find with exact match (case-sensitive)
  let user = await prisma.user.findUnique({
    where: { email: searchEmail },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      walletAddress: true,
      isActive: true,
      createdAt: true,
    },
  });
  
  // If not found, try case-insensitive search by fetching all and filtering
  if (!user) {
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        walletAddress: true,
        isActive: true,
        createdAt: true,
      },
    });
    
    const foundUser = allUsers.find(u => u.email.toLowerCase() === searchEmail);
    
    if (foundUser) {
      user = foundUser;
      console.log(`✅ Found user with case-insensitive match: ${user.email}`);
    }
  }

  console.log(`📝 User found:`, user ? user.email : 'NOT FOUND');

  if (!user) {
    // List available users for debugging
    const allUsers = await prisma.user.findMany({
      select: { email: true }
    });
    console.log('Available users:', allUsers.map(u => u.email));
    throw new AppError(404, `User with email "${email}" not found.`);
  }

  if (user.isActive === false) {
    throw new AppError(400, 'User account is inactive');
  }

  return user;
}
  async create(data: {
    email: string;
    password: string;
    name: string;
    role?: string;
    walletAddress?: string;
  }) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      throw new AppError(400, 'User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    return prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        password: hashedPassword,
        name: data.name,
        role: (data.role as any) || 'CITIZEN',
        walletAddress: data.walletAddress,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        walletAddress: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async updateWalletAddress(userId: string, walletAddress: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { walletAddress },
      select: {
        id: true,
        email: true,
        name: true,
        walletAddress: true,
        isActive: true,
      },
    });
  }

  async getAllOfficers() {
    return prisma.user.findMany({
      where: { role: 'OFFICER', isActive: true },
      select: {
        id: true,
        email: true,
        name: true,
        walletAddress: true,
        role: true,
        isActive: true,
      },
    });
  }

  async getAllUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        walletAddress: true,
        isActive: true,
        isApproved: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggleUserStatus(userId: string, isActive: boolean) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });
  }

  async updateUserRole(userId: string, role: string) {
    const validRoles = ['CITIZEN', 'OFFICER', 'AUDITOR', 'ADMIN'];
    if (!validRoles.includes(role)) {
      throw new AppError(400, `Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return prisma.user.update({
      where: { id: userId },
      data: { role: role as any },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });
  }

  async updateProfile(userId: string, data: { name?: string; walletAddress?: string }) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        walletAddress: data.walletAddress,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        walletAddress: true,
        isActive: true,
      },
    });
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        walletAddress: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return user;
  }
}

export default new UserService();