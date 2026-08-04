export interface ApiSuccess<T = unknown> {
  success: true;
  message?: string;
  data: T;
  meta?: unknown;
  timestamp?: string;
}

export interface ApiErrorBody {
  success: false;
  message?: string;
  errorCode?: string;
  errors?: unknown;
  timestamp?: string;
  requestId?: string;
}

export interface ServerRole {
  _id?: string;
  name?: string;
  slug?: string;
}

export interface ServerUser {
  _id: string;
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  avatar?: string | null;
  role?: ServerRole | string;
  emailVerified?: boolean;
  isActive?: boolean;
  notificationPreferences?: {
    emailAlerts?: boolean;
    platformAnnouncements?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthTokensPayload {
  user: ServerUser;
  accessToken: string;
  refreshToken: string;
  expiresAt?: string;
  tokenType?: string;
  deviceId?: string;
}

export interface ForgotPasswordPayload {
  success: boolean;
  message?: string;
  expiresIn?: number;
}

export interface VerifyOtpPayload {
  success: boolean;
  email: string;
  resetToken: string;
  expiresIn?: number;
}

export interface MessagePayload {
  success: boolean;
  message?: string;
}
