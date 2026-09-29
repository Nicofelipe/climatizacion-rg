import { LoginRequest, LoginResponse } from '@/types/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export async function loginApi(
  data: LoginRequest
): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message ?? 'No fue posible iniciar sesión'
    );
  }

  return result;
}