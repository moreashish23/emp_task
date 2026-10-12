import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAlertTriangle, LucideX } from '@lucide/angular';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, LucideAlertTriangle, LucideX, ButtonComponent],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200">
        <div class="relative bg-white rounded-xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden animate-scale-in">
          <!-- Close button -->
          <button
            type="button"
            (click)="onCancel()"
            [disabled]="isLoading()"
            class="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <svg lucideX class="w-5 h-5"></svg>
          </button>

          <!-- Dialog Body -->
          <div class="p-6">
            <div class="flex items-start space-x-4">
              <div
                class="p-3 rounded-full flex-shrink-0"
                [ngClass]="variant() === 'danger' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'"
              >
                <svg lucideAlertTriangle class="w-6 h-6"></svg>
              </div>

              <div class="mt-1">
                <h3 class="text-lg font-bold text-slate-900">{{ title() }}</h3>
                <p class="mt-2 text-sm text-slate-600 leading-relaxed">{{ message() }}</p>
              </div>
            </div>
          </div>

          <!-- Dialog Actions Footer -->
          <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-3">
            <app-button
              variant="outline"
              [disabled]="isLoading()"
              (clicked)="onCancel()"
            >
              {{ cancelText() }}
            </app-button>

            <app-button
              [variant]="variant() === 'danger' ? 'danger' : 'primary'"
              [isLoading]="isLoading()"
              (clicked)="onConfirm()"
            >
              {{ confirmText() }}
            </app-button>
          </div>
        </div>
      </div>
    }
  `
})
export class ConfirmDialogComponent {
  readonly isOpen = input<boolean>(false);
  readonly title = input<string>('Confirm Action');
  readonly message = input<string>('Are you sure you want to proceed?');
  readonly confirmText = input<string>('Delete');
  readonly cancelText = input<string>('Cancel');
  readonly isLoading = input<boolean>(false);
  readonly variant = input<'danger' | 'warning'>('danger');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  protected onConfirm(): void {
    this.confirmed.emit();
  }

  protected onCancel(): void {
    if (!this.isLoading()) {
      this.cancelled.emit();
    }
  }
}
