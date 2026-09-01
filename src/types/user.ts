export type UserRole = 'ADMIN' | 'STAFF' | 'TEACHER' | 'PRINCIPAL' | 'VIEWER';

export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: any | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
}
