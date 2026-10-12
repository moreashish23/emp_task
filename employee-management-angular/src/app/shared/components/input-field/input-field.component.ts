import { Component, input, forwardRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-input-field',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputFieldComponent),
      multi: true
    }
  ],
  template: `
    <div [class]="'flex flex-col space-y-1.5 ' + containerClass()">
      @if (label()) {
        <label [for]="id() || name()" class="text-sm font-semibold text-slate-700">
          {{ label() }} @if (required()) { <span class="text-red-500">*</span> }
        </label>
      }

      <div class="relative rounded-lg shadow-xs">
        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <ng-content select="[icon]"></ng-content>
        </div>

        <input
          [id]="id() || name()"
          [name]="name()"
          [type]="type()"
          [value]="val()"
          (input)="onInputChange($event)"
          (blur)="onBlur()"
          [placeholder]="placeholder()"
          [disabled]="disabled()"
          [step]="step()"
          [min]="min()"
          [class]="
            'w-full px-3.5 py-2 text-sm text-slate-900 bg-white border rounded-lg transition-all duration-150 outline-none ' +
            (hasIcon() ? 'pl-10 ' : 'pl-3.5 ') +
            (error()
              ? 'border-red-500 focus:ring-2 focus:ring-red-200 focus:border-red-500 '
              : 'border-slate-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-600 ') +
            (disabled() ? 'bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200' : '')
          "
        />
      </div>

      @if (error()) {
        <p class="text-xs font-medium text-red-600 animate-fade-in">{{ error() }}</p>
      } @else if (helperText()) {
        <p class="text-xs text-slate-500">{{ helperText() }}</p>
      }
    </div>
  `
})
export class InputFieldComponent implements ControlValueAccessor {
  readonly label = input<string>();
  readonly id = input<string>();
  readonly name = input<string>('');
  readonly type = input<string>('text');
  readonly placeholder = input<string>('');
  readonly error = input<string | null>();
  readonly required = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly helperText = input<string>();
  readonly step = input<string>();
  readonly min = input<string>();
  readonly containerClass = input<string>('', { alias: 'class' });
  readonly hasIcon = input<boolean>(false);

  protected readonly val = signal<any>('');

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: any): void {
    this.val.set(value ?? '');
  }

  registerOnChange(fn: (value: any) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    // Disabled input binding is already handled
  }

  protected onInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    this.val.set(value);
    this.onChange(value);
  }

  protected onBlur(): void {
    this.onTouched();
  }
}
