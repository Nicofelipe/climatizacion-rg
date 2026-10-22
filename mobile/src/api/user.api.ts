export interface CreateEmployeeRequest {
  role?:'EMPLOYEE'|'ADMIN';
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

export async function createEmployeeApi(token: string, data: CreateEmployeeRequest) {
  const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 409) throw new Error('Ese correo ya está registrado.');
    throw new Error(result.message ?? 'No fue posible registrar al trabajador.');
  }
  return result.employee;
}
