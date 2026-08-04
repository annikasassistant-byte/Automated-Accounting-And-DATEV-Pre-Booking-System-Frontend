export type UserRole = "admin" | "user";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  company?: string;
  title?: string;
  joinedAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  type: "system" | "alert" | "security";
}

export interface Activity {
  id: string;
  action: string;
  subject: string;
  timestamp: string;
  user: string;
}
