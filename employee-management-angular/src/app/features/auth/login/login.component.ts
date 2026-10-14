import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LucideBriefcase, LucideMail, LucideLock, LucideAlertCircle } from '@lucide/angular';
import { AuthService } from '../../../core/services/auth.service';
import { InputFieldComponent } from '../../../shared/components/input-field/input-field.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { validateEmail } from '../../../shared/utils/formatters';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideBriefcase,
    LucideMail,
    LucideLock,
    LucideAlertCircle,
    InputFieldComponent,
    ButtonComponent
  ],
  template: `
    <div class="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <!-- Brand Header -->
        <div class="flex justify-center">
          <div class="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/30">
            <svg lucideBriefcase class="w-8 h-8"></svg>
          </div>
        </div>
        <h2 class="mt-4 text-center text-3xl font-extrabold text-white tracking-tight">
          EMS Portal Sign In
        </h2>
        <p class="mt-2 text-center text-sm text-slate-400">
          Enter your credentials to access employee management
        </p>
      </div>

      <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">

          <!-- Expiration Banner -->
          @if (isExpired()) {
            <div class="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <svg lucideAlertCircle class="w-4 h-4 text-amber-600 flex-shrink-0"></svg>
              <span>Your session has expired. Please sign in again.</span>
            </div>
          }

          <!-- Error Banner -->
          @if (apiError()) {
            <div class="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
              <svg lucideAlertCircle class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"></svg>
              <div>{{ apiError() }}</div>
            </div>
          }

          <form class="space-y-6" (ngSubmit)="handleSubmit()">
            <!-- Email Field -->
            <app-input-field
              label="Email Address"
              name="email"
              type="email"
              [(ngModel)]="email"
              placeholder="user@example.com"
              [required]="true"
              [hasIcon]="true"
              [error]="errors().email"
              [disabled]="loading()"
            >
              <svg lucideMail class="w-5 h-5 text-slate-400" icon></svg>
            </app-input-field>

            <!-- Password Field -->
            <app-input-field
              label="Password"
              name="password"
              type="password"
              [(ngModel)]="password"
              placeholder="••••••••"
              [required]="true"
              [hasIcon]="true"
              [error]="errors().password"
              [disabled]="loading()"
            >
              <svg lucideLock class="w-5 h-5 text-slate-400" icon></svg>
            </app-input-field>

            <div class="pt-3">
              <app-button
                type="submit"
                variant="primary"
                [isLoading]="loading()"
                class="w-full py-3 text-base font-semibold"
              >
                Sign In
              </app-button>
            </div>
          </form>

        </div>
      </div>
    </div>
  `
})
export class LoginComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected email = '';
  protected password = '';
  protected readonly errors = signal<{ email?: string; password?: string }>({});
  protected readonly apiError = signal<string>('');
  protected readonly isExpired = signal<boolean>(false);
  protected readonly loading = this.authService.loading;

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    const expiredParam = this.route.snapshot.queryParamMap.get('expired');
    this.isExpired.set(expiredParam === 'true');
  }

  private validate(): boolean {
    const errs: { email?: string; password?: string } = {};

    if (!this.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!validateEmail(this.email.trim())) {
      errs.email = 'Enter a valid email address';
    }

    if (!this.password) {
      errs.password = 'Password is required';
    }

    this.errors.set(errs);
    return Object.keys(errs).length === 0;
  }

  protected handleSubmit(): void {
    this.apiError.set('');
    if (!this.validate()) return;

    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';

    this.authService.login({
      email: this.email.trim(),
      password: this.password
    }).subscribe({
      next: () => {
        const destination = this.authService.isAdmin()
          ? (returnUrl === '/my-profile' ? '/dashboard' : returnUrl)
          : '/dashboard';
          
        this.router.navigateByUrl(destination);
      },
      error: (err) => {
        if (err.status === 401 || err.status === 403) {
          this.apiError.set('Invalid credentials. Please check your email and password.');
        } else if (err.error?.message) {
          this.apiError.set(err.error.message);
        } else if (err.error?.error) {
          this.apiError.set(err.error.error);
        } else if (err.status === 0) {
          this.apiError.set('Unable to connect to the backend server. Please verify your connection.');
        } else {
          this.apiError.set('Login failed. Please try again.');
        }
      }
    });
  }
}
