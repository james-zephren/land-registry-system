// Type definitions for string-based enums
export type Role = 'CITIZEN' | 'OFFICER' | 'AUDITOR' | 'ADMIN'
export type LandStatus = 'PENDING' | 'APPROVED' | 'VERIFIED' | 'REJECTED' | 'TRANSFERRED'
export type ApprovalType = 'REGISTRATION' | 'TRANSFER'
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type TransferStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED'

// Helper functions
export const RoleValues = {
  CITIZEN: 'CITIZEN' as Role,
  OFFICER: 'OFFICER' as Role,
  AUDITOR: 'AUDITOR' as Role,
  ADMIN: 'ADMIN' as Role,
}

export const LandStatusValues = {
  PENDING: 'PENDING' as LandStatus,
  APPROVED: 'APPROVED' as LandStatus,
  VERIFIED: 'VERIFIED' as LandStatus,
  REJECTED: 'REJECTED' as LandStatus,
  TRANSFERRED: 'TRANSFERRED' as LandStatus,
}