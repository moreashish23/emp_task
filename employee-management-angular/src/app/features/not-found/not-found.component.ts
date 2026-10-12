import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAlertOctagon, LucideHome } from '@lucide/angular';
import { ButtonComponent } from '../../shared/components/button/button.component';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, LucideAlertOctagon, LucideHome, ButtonComponent],
  template: `
    <div class="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div class="bg-white max-w-md w-full rounded-2xl p-8 text-center shadow-2xl border border-slate-100">
        <div class="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
          <svg lucideAlertOctagon class="w-8 h-8"></svg>
        </div>

        <h1 class="text-4xl font-extrabold text-slate-900">404</h1>
        <h2 class="text-xl font-bold text-slate-800 mt-1">Page Not Found</h2>

        <p class="text-slate-500 text-sm mt-3 mb-6 leading-relaxed">
          The page or employee resource you are looking for doesn't exist, has been removed, or is temporarily unavailable.
        </p>

        <a routerLink="/dashboard">
          <app-button variant="primary" class="w-full py-2.5">
            <svg lucideHome class="w-4 h-4 mr-2" icon></svg>
            Back to Dashboard
          </app-button>
        </a>
      </div>
    </div>
  `
})
export class NotFoundComponent {}
