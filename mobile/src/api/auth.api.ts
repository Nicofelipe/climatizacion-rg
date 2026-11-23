import { LoginRequest, LoginResponse } from '@/types/auth';
import { API_URL, requestJson } from './http';


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
