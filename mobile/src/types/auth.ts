export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: number;
  companyId: number;
  firstName: string;
  lastName: string;
  email: string;
  role: 'ADMIN' | 'EMPLOYEE';
}

export interface LoginResponse {
  message: string;
  user: AuthUser;
  token: string;
}