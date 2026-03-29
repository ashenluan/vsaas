export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatar: string | null;
  role: UserRole;
  creditBalance: number;
  createdAt: string;
}

export interface UserListItem {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  creditBalance: number;
  createdAt: string;
  lastLoginAt: string | null;
}
