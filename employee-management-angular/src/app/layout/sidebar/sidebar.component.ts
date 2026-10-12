import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideBriefcase, LucideGrid, LucideUsers, LucideUserPlus, LucideUser, LucideX } from '@lucide/angular';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  host: {
    class: 'h-full shrink-0 flex'
  },
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    LucideBriefcase,
    LucideGrid,
    LucideUsers,
    LucideUserPlus,
    LucideUser,
    LucideX
  ],
  template: `
    @if (isOpen()) {
      <div
        (click)="closeSidebar()"
        class="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
      ></div>
    }

    <aside
      class="fixed top-0 bottom-0 left-0 z-50 w-64 h-screen lg:h-full bg-slate-900 text-white flex flex-col shrink-0 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto"
      [ngClass]="isOpen() ? 'translate-x-0' : '-translate-x-full'"
    >
      <!-- Brand logo header -->
      <div class="h-16 px-6 flex items-center justify-between border-b border-slate-800 shrink-0">
        <div class="flex items-center space-x-3">
          <div class="p-2 bg-blue-600 rounded-lg text-white">
            <svg lucideBriefcase class="w-5 h-5"></svg>
          </div>
          <div>
            <h1 class="font-bold text-base tracking-wide text-white">EMS Portal</h1>
            <p class="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Employee Management</p>
          </div>
        </div>
        <button
          (click)="closeSidebar()"
          class="p-1.5 text-slate-400 hover:text-white rounded-lg lg:hidden"
        >
          <svg lucideX class="w-5 h-5"></svg>
        </button>
      </div>

      <!-- Main Navigation Menu -->
      <div class="flex-1 min-h-0 px-4 py-6 space-y-1 overflow-y-auto">
        <div class="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Main Menu
        </div>

        <a
          routerLink="/dashboard"
          routerLinkActive="bg-blue-600 text-white shadow-md shadow-blue-900/30"
          [routerLinkActiveOptions]="{ exact: true }"
          (click)="closeSidebar()"
          class="flex items-center space-x-3 px-3.5 py-2.5 rounded-lg font-medium text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all duration-150"
        >
          <svg lucideGrid class="w-5 h-5"></svg>
          <span>Dashboard</span>
        </a>

        <a
          routerLink="/employees"
          routerLinkActive="bg-blue-600 text-white shadow-md shadow-blue-900/30"
          [routerLinkActiveOptions]="{ exact: true }"
          (click)="closeSidebar()"
          class="flex items-center space-x-3 px-3.5 py-2.5 rounded-lg font-medium text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all duration-150"
        >
          <svg lucideUsers class="w-5 h-5"></svg>
          <span>Employees List</span>
        </a>

        @if (isAdmin()) {
          <a
            routerLink="/employees/add"
            routerLinkActive="bg-blue-600 text-white shadow-md shadow-blue-900/30"
            (click)="closeSidebar()"
            class="flex items-center space-x-3 px-3.5 py-2.5 rounded-lg font-medium text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all duration-150"
          >
            <svg lucideUserPlus class="w-5 h-5"></svg>
            <span>Add Employee</span>
          </a>
        }

        @if (isEmployee() && myEmployeeId()) {
          <a
            [routerLink]="['/employees', myEmployeeId()]"
            routerLinkActive="bg-blue-600 text-white shadow-md shadow-blue-900/30"
            (click)="closeSidebar()"
            class="flex items-center space-x-3 px-3.5 py-2.5 rounded-lg font-medium text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all duration-150"
          >
            <svg lucideUser class="w-5 h-5"></svg>
            <span>My Profile</span>
          </a>
        }
      </div>

      <!-- Sidebar Footer -->
      <div class="p-4 border-t border-slate-800 bg-slate-950/40 shrink-0">
        <div class="text-xs text-slate-400 text-center">
          EMS Web Client v1.0.0
        </div>
      </div>
    </aside>
  `
})
export class SidebarComponent {
  private readonly authService = inject(AuthService);

  readonly isOpen = input<boolean>(false);
  readonly closed = output<void>();

  readonly isAdmin = this.authService.isAdmin;
  readonly isEmployee = this.authService.isEmployee;
  readonly myEmployeeId = this.authService.myEmployeeId;

  protected closeSidebar(): void {
    this.closed.emit();
  }
}
