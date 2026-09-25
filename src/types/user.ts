export type UserRole = "admin" | "member";
export type UserAccountStatus = "active" | "disabled" | "pending";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole | string;
  status?: UserAccountStatus;
  isAdmin?: boolean;
  mfaEnabled?: boolean;
  mfaSecret?: string;
  createdAt?: string;
  lastLogin?: string;
  lastLoginAt?: string;
  lastSeen?: string;
  avatarUrl?: string;
  photoURL?: string;
}
