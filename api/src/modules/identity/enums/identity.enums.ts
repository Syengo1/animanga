export enum RoleScopeType {
  GLOBAL = 'GLOBAL',
  MERCHANT = 'MERCHANT',
  EVENT = 'EVENT',
}

export enum KycProfileStatus {
  UNVERIFIED = 'UNVERIFIED',
  VERIFIED = 'VERIFIED',
  SUSPENDED = 'SUSPENDED',
}

export enum KycCaseStatus {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CLOSED = 'CLOSED',
}
