import { LoginRequest, LoginResponse } from '@/types/auth';
import { requestJson } from './http';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export async function loginApi(
  data: LoginRequest
): Promise<LoginResponse> {
  return requestJson(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

}
