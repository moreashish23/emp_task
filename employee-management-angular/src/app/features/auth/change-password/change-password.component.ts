import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="max-w-xl mx-auto space-y-6">
      <div>
        <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Change Password</h1>
        <p class="mt-1 text-sm text-slate-500">Change the password used to sign in to your account.</p>
      </div>

      @if (success()) {
        <div class="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{{ success() }}</div>
      }
      @if (error()) {
        <div class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{{ error() }}</div>
      }

      <form (ngSubmit)="submit()" class="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div>
          <label for="currentPassword" class="mb-1 block text-sm font-medium text-slate-700">Current password</label>
          <input id="currentPassword" name="currentPassword" type="password" [(ngModel)]="currentPassword" required autocomplete="current-password" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
        </div>
        <div>
          <label for="newPassword" class="mb-1 block text-sm font-medium text-slate-700">New password</label>
          <input id="newPassword" name="newPassword" type="password" [(ngModel)]="newPassword" required minlength="8" autocomplete="new-password" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
          <p class="mt-1 text-xs text-slate-500">Use at least 8 characters.</p>
        </div>
        <div>
          <label for="confirmPassword" class="mb-1 block text-sm font-medium text-slate-700">Confirm new password</label>
          <input id="confirmPassword" name="confirmPassword" type="password" [(ngModel)]="confirmPassword" required minlength="8" autocomplete="new-password" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
        </div>
        <div class="flex items-center justify-end gap-3">
          <a routerLink="/dashboard" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</a>
          <button type="submit" [disabled]="saving()" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{{ saving() ? 'Updating...' : 'Update Password' }}</button>
        </div>
      </form>
    </div>
  `
})
export class ChangePasswordComponent {
  private readonly authService = inject(AuthService);
  protected currentPassword = '';
  protected newPassword = '';
  protected confirmPassword = '';
  protected readonly saving = signal(false);
  protected readonly success = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    this.success.set(null);
    this.error.set(null);
    if (this.newPassword.length < 8) {
      this.error.set('New password must contain at least 8 characters.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.error.set('New password and confirmation do not match.');
      return;
    }
    this.saving.set(true);
    this.authService.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: (message) => {
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.success.set(message || 'Password changed successfully. Use your new password the next time you log in.');
        this.saving.set(false);
      },
      error: (err) => {
        const message = err.error?.message || (typeof err.error === 'string' ? err.error : null) || 'Could not change password. Please check your current password and try again.';
        this.error.set(message);
        this.saving.set(false);
      }
    });
  }
}
