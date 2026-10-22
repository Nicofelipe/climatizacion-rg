export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  passwordPolicy?: {mustChangePassword:boolean;deadline:string|null;remainingSeconds:number|null;expired:boolean};
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
