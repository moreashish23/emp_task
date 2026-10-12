import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideLoader2 } from '@lucide/angular';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule, LucideLoader2],
  template: `
    <button
      [type]="type()"
      [disabled]="disabled() || isLoading()"
      (click)="onClick($event)"
      [class]="computedClasses()"
    >
      @if (isLoading()) {
        <svg lucideLoader2 class="w-4 h-4 animate-spin"></svg>
        <span>Processing...</span>
      } @else {
        <ng-content select="[icon]"></ng-content>
        <ng-content></ng-content>
      }
    </button>
  `
})
export class ButtonComponent {
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly variant = input<'primary' | 'secondary' | 'danger' | 'outline' | 'ghost'>('primary');
  readonly size = input<'small' | 'medium' | 'large'>('medium');
  readonly isLoading = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly customClass = input<string>('', { alias: 'class' });

  readonly clicked = output<MouseEvent>();

  protected readonly computedClasses = computed(() => {
    const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shadow-xs';

    const variants: Record<string, string> = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 active:bg-blue-800',
      secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 focus:ring-slate-400 active:bg-slate-300 border border-slate-200',
      danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 active:bg-red-800',
      outline: 'border border-slate-300 hover:bg-slate-50 text-slate-700 focus:ring-blue-500 active:bg-slate-100 bg-white',
      ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-400 shadow-none'
    };

    const sizes: Record<string, string> = {
      small: 'px-3 py-1.5 text-xs gap-1.5',
      medium: 'px-4 py-2 text-sm gap-2',
      large: 'px-5 py-2.5 text-base gap-2.5'
    };

    const vClass = variants[this.variant()] || variants['primary'];
    const sClass = sizes[this.size()] || sizes['medium'];

    return `${base} ${vClass} ${sClass} ${this.customClass()}`.trim();
  });

  protected onClick(event: MouseEvent): void {
    if (!this.disabled() && !this.isLoading()) {
      this.clicked.emit(event);
    }
  }
}
