import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, LoginRequest, LoginResponse, RegisterRequest } from '../models/auth.model';

/**
 * AuthService manages authentication state, tokens, and user credentials.
 *
 * NOTE ON SECURITY LIMITATIONS:
 * The JWT token and basic user info are stored in localStorage to match the
 * existing React frontend architecture and ensure state persistence across refreshes.
 * Tokens stored in localStorage are vulnerable to Cross-Site Scripting (XSS).
 * For production enterprise security, consider httpOnly secure cookies.
 * Passwords are NEVER persisted in browser storage.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = environment.apiUrl;

  private readonly _currentUser = signal<User | null>(null);
  private readonly _token = signal<string | null>(null);
  private readonly _loading = signal<boolean>(false);
  private readonly _myEmployeeId = signal<string | null>(null);

  readonly user = computed(() => this._currentUser());
  readonly token = computed(() => this._token());
  readonly isAuthenticated = computed(() => !!this._token());
  readonly loading = computed(() => this._loading());
  readonly isAdmin = computed(() => this._currentUser()?.role === 'ROLE_ADMIN');
  readonly isEmployee = computed(() => this._currentUser()?.role === 'ROLE_EMP');
  readonly myEmployeeId = computed(() => this._myEmployeeId());

  constructor() {
    this.restoreSession();
  }

  restoreSession(): void {
    const storedToken = localStorage.getItem('token');
    const storedUserStr = localStorage.getItem('user');
    const storedEmpId = localStorage.getItem('myEmployeeId');

    if (storedToken && storedUserStr) {
      try {
        const parsedUser: User = JSON.parse(storedUserStr);
        // Normalize any legacy role
        if (parsedUser.role === 'ROLE_USER') {
          parsedUser.role = 'ROLE_EMP';
        }
        this._token.set(storedToken);
        this._currentUser.set(parsedUser);
        if (storedEmpId) {
          this._myEmployeeId.set(storedEmpId);
        }
        this.fetchCurrentEmployeeProfile();
      } catch {
        this.logout();
      }
    }
  }

  fetchCurrentEmployeeProfile(): void {
    if (!this._token()) return;
    this.http.get<{ id: string | number }>(`${this.baseUrl}/employees/me`).subscribe({
      next: (emp) => {
        if (emp && emp.id) {
          const stringId = String(emp.id);
          this._myEmployeeId.set(stringId);
          localStorage.setItem('myEmployeeId', stringId);
        }
      },
      error: () => {
        // Ignored if user has no linked profile yet or fails
      }
    });
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    this._loading.set(true);
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, credentials).pipe(
      tap({
        next: (response) => {
          if (response && response.token) {
            const role = response.role === 'ROLE_USER' ? 'ROLE_EMP' : (response.role || 'ROLE_EMP');
            const userObj: User = {
              email: response.email || credentials.email,
              role: role
            };
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(userObj));
            this._token.set(response.token);
            this._currentUser.set(userObj);
            this.fetchCurrentEmployeeProfile();
          }
          this._loading.set(false);
        },
        error: () => {
          this._loading.set(false);
        }
      })
    );
  }

  register(userData: RegisterRequest): Observable<string> {
    this._loading.set(true);
    return this.http
      .post(`${this.baseUrl}/auth/register`, userData, { responseType: 'text' })
      .pipe(
        tap({
          next: () => this._loading.set(false),
          error: () => this._loading.set(false)
        })
      );
  }

  logout(redirect: boolean = true): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('myEmployeeId');
    this._token.set(null);
    this._currentUser.set(null);
    this._myEmployeeId.set(null);
    if (redirect) {
      this.router.navigate(['/login']);
    }
  }

  getToken(): string | null {
    return this._token() || localStorage.getItem('token');
  }

  getCurrentUser(): User | null {
    return this._currentUser();
  }
}
