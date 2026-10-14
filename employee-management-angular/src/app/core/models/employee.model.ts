export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  salary?: number | null;
  phone?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployeePayload {
  name: string;
  email: string;
  department: string;
  salary?: number | null;
  phone?: string | null;
  password?: string;
}
