import { loginApi } from '@/api/auth.api';
import { LoginRequest } from '@/types/auth';

export class AuthService {
  static async login(data: LoginRequest) {
    return loginApi(data);
  }
}