export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  createdAt?: string;
  lastLogin?: string;
  avatarUrl?: string;
}
