import { Component, output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideMenu, LucideLogOut, LucideShield, LucideUser } from '@lucide/angular';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideMenu, LucideLogOut, LucideShield, LucideUser],
  template: `
    <header class="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div class="px-4 sm:px-6 py-3 flex items-center justify-between ">
        <div class="flex items-center space-x-4">
          <button
            type="button"
            (click)="onToggleSidebar()"
            class="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 lg:hidden focus:outline-none"
            aria-label="Toggle Navigation Sidebar"
          >
            <svg lucideMenu class="w-6 h-6"></svg>
          </button>

          <div class="flex items-center space-x-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
              Enterprise Dashboard
            </span>
          </div>
        </div>

        <div class="flex items-center space-x-3 sm:space-x-5">
          @if (user(); as currentUser) {
            <div class="relative">
              <button
                type="button"
                (click)="toggleUserMenu()"
                (keydown.escape)="userMenuOpen.set(false)"
                [attr.aria-expanded]="userMenuOpen()"
                aria-label="Open account menu"
                class="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <span class="w-10 h-10 rounded-full cursor-pointer bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  {{ userInitial() }}
                </span>
                <span class="hidden sm:flex flex-col items-start cursor-pointer">
                  <span class="text-sm font-semibold text-slate-800 leading-tight">{{ currentUser.email }}</span>
                  <span class="text-xs text-slate-500 mt-1">{{ currentUser.role || 'ROLE_USER' }}</span>
                </span>
                <span class="text-slate-400 text-xs">▾</span>
              </button>

              @if (userMenuOpen()) {
                <div class="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white py-2 shadow-lg z-50">
                  <div class="px-4 py-2 border-b border-slate-100">
                    <p class="text-xs text-slate-500">Signed in as</p>
                    <p class="text-sm font-semibold text-slate-800 truncate">{{ currentUser.email }}</p>
                  </div>
                  <a
                    [routerLink]="profileRoute()"
                    (click)="userMenuOpen.set(false)"
                    class="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <svg lucideUser class="w-4 h-4"></svg>
                    My Profile
                  </a>
                  <button
                    type="button"
                    (click)="logout()"
                    class="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 text-left cursor-pointer"
                  >
                    <svg lucideLogOut class="w-4 h-4"></svg>
                    Logout
                  </button>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </header>
  `
})
export class NavbarComponent {
  private readonly authService = inject(AuthService);

  readonly toggleSidebar = output<void>();

  readonly user = this.authService.user;
  protected readonly userMenuOpen = signal(false);

  protected toggleUserMenu(): void {
    this.userMenuOpen.update(open => !open);
  }

  protected profileRoute(): string {
    return this.authService.isAdmin() ? '/dashboard' : '/my-profile';
  }

  protected userInitial(): string {
    const email = this.user()?.email;
    return email ? email.charAt(0).toUpperCase() : 'U';
  }

  protected onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  protected logout(): void {
    this.authService.logout();
  }
}
