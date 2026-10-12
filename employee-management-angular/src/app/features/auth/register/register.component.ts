import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideBriefcase, LucideMail, LucideLock, LucideAlertCircle, LucideCheckCircle } from '@lucide/angular';
import { AuthService } from '../../../core/services/auth.service';
import { InputFieldComponent } from '../../../shared/components/input-field/input-field.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { validateEmail } from '../../../shared/utils/formatters';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LucideBriefcase,
    LucideMail,
    LucideLock,
    LucideAlertCircle,
    LucideCheckCircle,
    InputFieldComponent,
    ButtonComponent
  ],
  template: `
    <div class="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <div class="flex justify-center">
          <div class="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/30">
            <svg lucideBriefcase class="w-8 h-8"></svg>
          </div>
        </div>
        <h2 class="mt-4 text-center text-3xl font-extrabold text-white tracking-tight">
          Create EMS Account
        </h2>
        <p class="mt-2 text-center text-sm text-slate-400">
          Register to gain access to employee management platform
        </p>
      </div>

      <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">

          <!-- Success Banner -->
          @if (successMsg()) {
            <div class="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
              <svg lucideCheckCircle class="w-5 h-5 text-emerald-600 flex-shrink-0"></svg>
              <div>{{ successMsg() }}</div>
            </div>
          }

          <!-- API Error Banner -->
          @if (apiError()) {
            <div class="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
              <svg lucideAlertCircle class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"></svg>
              <div>{{ apiError() }}</div>
            </div>
          }

          <form class="space-y-5" (ngSubmit)="handleSubmit()">
            <!-- Email -->
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

            <!-- Password -->
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
              helperText="Must be at least 6 characters"
            >
              <svg lucideLock class="w-5 h-5 text-slate-400" icon></svg>
            </app-input-field>

            <!-- Confirm Password -->
            <app-input-field
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              [(ngModel)]="confirmPassword"
              placeholder="••••••••"
              [required]="true"
              [hasIcon]="true"
              [error]="errors().confirmPassword"
              [disabled]="loading()"
            >
              <svg lucideLock class="w-5 h-5 text-slate-400" icon></svg>
            </app-input-field>

            <div>
              <app-button
                type="submit"
                variant="primary"
                [isLoading]="loading()"
                class="w-full py-3 text-base font-semibold"
              >
                Register Account
              </app-button>
            </div>
          </form>

          <div class="mt-6 text-center border-t border-slate-100 pt-6">
            <p class="text-sm text-slate-600">
              Already registered?
              <a routerLink="/login" class="font-semibold text-blue-600 hover:text-blue-500 ml-1">
                Sign in here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected email = '';
  protected password = '';
  protected confirmPassword = '';
  protected readonly errors = signal<{ email?: string; password?: string; confirmPassword?: string }>({});
  protected readonly apiError = signal<string>('');
  protected readonly successMsg = signal<string>('');
  protected readonly loading = this.authService.loading;

  private validate(): boolean {
    const errs: { email?: string; password?: string; confirmPassword?: string } = {};

    if (!this.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!validateEmail(this.email.trim())) {
      errs.email = 'Enter a valid email address';
    }

    if (!this.password) {
      errs.password = 'Password is required';
    } else if (this.password.length < 6) {
      errs.password = 'Password must be at least 6 characters long';
    }

    if (this.password !== this.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }

    this.errors.set(errs);
    return Object.keys(errs).length === 0;
  }

  protected handleSubmit(): void {
    this.apiError.set('');
    this.successMsg.set('');

    if (!this.validate()) return;

    this.authService.register({
      email: this.email.trim(),
      password: this.password
    }).subscribe({
      next: () => {
        this.successMsg.set('Registration successful! Redirecting to login...');
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1500);
      },
      error: (err) => {
        if (err.error?.message) {
          this.apiError.set(err.error.message);
        } else if (err.error?.error) {
          this.apiError.set(err.error.error);
        } else if (typeof err.error === 'string' && err.error.length > 0) {
          this.apiError.set(err.error);
        } else if (err.status === 0) {
          this.apiError.set('Unable to connect to the backend server. Please verify your connection.');
        } else {
          this.apiError.set('Registration failed. User may already exist.');
        }
      }
    });
  }
}
