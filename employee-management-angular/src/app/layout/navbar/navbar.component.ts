import { Component, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideMenu, LucideLogOut, LucideShield } from '@lucide/angular';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, LucideMenu, LucideLogOut, LucideShield],
  template: `
    <header class="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div class="px-4 sm:px-6 py-3 flex items-center justify-between">
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
            <div class="flex items-center space-x-3 border-r border-slate-200 pr-4 hidden sm:flex">
              <div class="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                {{ userInitial() }}
              </div>
              <div class="flex flex-col">
                <span class="text-sm font-semibold text-slate-800 leading-none">
                  {{ currentUser.email }}
                </span>
                <span class="text-xs font-medium text-slate-500 flex items-center gap-1 mt-1">
                  <svg lucideShield class="w-3 h-3 text-blue-500"></svg>
                  {{ currentUser.role || 'ROLE_USER' }}
                </span>
              </div>
            </div>
          }

          <button
            type="button"
            (click)="logout()"
            class="flex items-center space-x-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors duration-150 cursor-pointer"
            title="Log out of application"
          >
            <svg lucideLogOut class="w-4 h-4 text-red-500"></svg>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  `
})
export class NavbarComponent {
  private readonly authService = inject(AuthService);

  readonly toggleSidebar = output<void>();

  readonly user = this.authService.user;

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
