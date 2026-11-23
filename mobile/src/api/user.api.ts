import { API_URL, jsonBody, requestJson } from './http';

export interface CreateEmployeeRequest {
  rut?:string;
  role?:'EMPLOYEE'|'ADMIN';
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

export async function createEmployeeApi(token: string, data: CreateEmployeeRequest) {
  return (await requestJson(`${API_URL}/users`, jsonBody(token, data))).employee;
}
