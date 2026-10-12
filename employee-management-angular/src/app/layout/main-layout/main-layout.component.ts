import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, NavbarComponent],
  template: `
    <div class="flex h-screen bg-slate-50 overflow-hidden">
      <!-- Sidebar Navigation -->
      <app-sidebar
        [isOpen]="sidebarOpen()"
        (closed)="sidebarOpen.set(false)"
      ></app-sidebar>

      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <app-navbar
          (toggleSidebar)="sidebarOpen.set(!sidebarOpen())"
        ></app-navbar>

        <main class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div class="max-w-7xl mx-auto">
            <router-outlet></router-outlet>
          </div>
        </main>
      </div>
    </div>
  `
})
export class MainLayoutComponent {
  protected readonly sidebarOpen = signal<boolean>(false);
}
