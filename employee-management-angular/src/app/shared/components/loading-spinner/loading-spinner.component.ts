import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideLoader2 } from '@lucide/angular';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule, LucideLoader2],
  template: `
    @if (fullScreen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-xs">
        <div class="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 min-w-[200px]">
          <div class="flex flex-col items-center justify-center p-6 space-y-3">
            <svg lucideLoader2 [class]="'animate-spin text-blue-600 ' + spinnerSizeClass()"></svg>
            @if (text()) {
              <p class="text-sm font-medium text-slate-600">{{ text() }}</p>
            }
          </div>
        </div>
      </div>
    } @else {
      <div class="flex flex-col items-center justify-center p-6 space-y-3">
        <svg lucideLoader2 [class]="'animate-spin text-blue-600 ' + spinnerSizeClass()"></svg>
        @if (text()) {
          <p class="text-sm font-medium text-slate-600">{{ text() }}</p>
        }
      </div>
    }
  `
})
export class LoadingSpinnerComponent {
  readonly size = input<'small' | 'medium' | 'large'>('medium');
  readonly text = input<string>('Loading...');
  readonly fullScreen = input<boolean>(false);

  protected readonly spinnerSizeClass = computed(() => {
    switch (this.size()) {
      case 'small':
        return 'w-5 h-5 text-sm';
      case 'large':
        return 'w-12 h-12 text-lg';
      case 'medium':
      default:
        return 'w-8 h-8 text-base';
    }
  });
}
