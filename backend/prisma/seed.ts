import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create users with isActive and isApproved set
  const citizen = await prisma.user.upsert({
    where: { email: 'citizen@example.com' },
    update: {},
    create: {
      email: 'citizen@example.com',
      password: hashedPassword,
      name: 'John Citizen',
      role: 'CITIZEN',
      walletAddress: '0x1234567890123456789012345678901234567890',
      isActive: true,
      isApproved: true,
    },
  });

  const officer1 = await prisma.user.upsert({
    where: { email: 'officer1@example.com' },
    update: {},
    create: {
      email: 'officer1@example.com',
      password: hashedPassword,
      name: 'Jane Registrar',
      role: 'REGISTRAR',
      walletAddress: '0x2345678901234567890123456789012345678901',
      isActive: true,
      isApproved: true,
    },
  });

  const officer2 = await prisma.user.upsert({
    where: { email: 'officer2@example.com' },
    update: {},
    create: {
      email: 'officer2@example.com',
      password: hashedPassword,
      name: 'Bob Surveyor',
      role: 'SURVEYOR',
      walletAddress: '0x3456789012345678901234567890123456789012',
      isActive: true,
      isApproved: true,
    },
  });

  const auditor = await prisma.user.upsert({
    where: { email: 'auditor@example.com' },
    update: {},
    create: {
      email: 'auditor@example.com',
      password: hashedPassword,
      name: 'Alice Auditor',
      role: 'AUDITOR',
      walletAddress: '0x4567890123456789012345678901234567890123',
      isActive: true,
      isApproved: true,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
      walletAddress: '0x5678901234567890123456789012345678901234',
      isActive: true,
      isApproved: true,
    },
  });

  console.log('✅ Users created:', {
    citizen: citizen.email,
    officer1: officer1.email,
    officer2: officer2.email,
    auditor: auditor.email,
    admin: admin.email,
  });

  // Create or update a sample land (avoid duplicate key error)
  const sampleLand = await prisma.land.upsert({
    where: { parcelId: 'LAND-001' },
    update: {}, // if exists, do nothing
    create: {
      parcelId: 'LAND-001',
      ownerId: citizen.id,
      location: 'Nairobi, Kenya',
      area: 0.5,
      documentHash: 'QmExampleHash123',
      dataHash: '0x' + 'a'.repeat(64),
      blockchainHash: '0x' + 'b'.repeat(64),
      status: 'PENDING',
    },
  });

  console.log('✅ Sample land created/updated:', sampleLand.parcelId);

  // Delete existing approvals for this land to avoid duplicates (optional)
  await prisma.approval.deleteMany({
    where: { landId: sampleLand.id },
  });

  // Create approvals for the land
  const approval1 = await prisma.approval.create({
    data: {
      landId: sampleLand.id,
      officerId: officer1.id,
      type: 'REGISTRATION',
      status: 'APPROVED',
      comments: 'All documents verified and approved',
    },
  });

  const approval2 = await prisma.approval.create({
    data: {
      landId: sampleLand.id,
      officerId: officer2.id,
      type: 'REGISTRATION',
      status: 'PENDING',
      comments: 'Awaiting additional documentation',
    },
  });

  console.log('✅ Approvals created:', {
    approval1: approval1.status,
    approval2: approval2.status,
  });

  // Create a log entry
  await prisma.log.create({
    data: {
      userId: admin.id,
      action: 'DATABASE_SEED',
      details: JSON.stringify({
        timestamp: new Date().toISOString(),
        seededUsers: 5,
        seededLands: 1,
        seededApprovals: 2,
        version: '1.0.0',
      }),
      ipAddress: '127.0.0.1',
      landId: sampleLand.id,
    },
  });

  console.log('✅ Log entry created');
  console.log('✅ Seeding completed successfully!');
  console.log('\n📝 Test Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 Citizen:    citizen@example.com / password123');
  console.log('📋 Registrar:  officer1@example.com / password123');
  console.log('📐 Surveyor:   officer2@example.com / password123');
  console.log('👁️ Auditor:    auditor@example.com / password123');
  console.log('⚙️ Admin:      admin@example.com / password123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📦 Sample Data:');
  console.log(`   Land: ${sampleLand.parcelId} (Status: ${sampleLand.status})`);
  console.log(`   Approvals: 1 approved, 1 pending`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });