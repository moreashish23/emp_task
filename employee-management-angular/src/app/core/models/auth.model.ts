export interface User {
  email: string;
  role: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  email: string;
  role: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}
