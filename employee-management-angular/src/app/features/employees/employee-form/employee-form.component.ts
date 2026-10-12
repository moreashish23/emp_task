import { Component, input, output, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideUser,
  LucideMail,
  LucideBriefcase,
  LucideDollarSign,
  LucidePhone,
  LucideSave,
  LucideArrowLeft,
  LucideAlertCircle
} from '@lucide/angular';
import { Employee, EmployeePayload } from '../../../core/models/employee.model';
import { InputFieldComponent } from '../../../shared/components/input-field/input-field.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { validateEmail, validatePhone } from '../../../shared/utils/formatters';

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideUser,
    LucideMail,
    LucideBriefcase,
    LucideDollarSign,
    LucidePhone,
    LucideSave,
    LucideArrowLeft,
    LucideAlertCircle,
    InputFieldComponent,
    ButtonComponent
  ],
  template: `
    <form (ngSubmit)="handleSubmit()" class="bg-white rounded-xl border border-slate-200 shadow-xs p-6 sm:p-8">
      <!-- Backend API Error Banner -->
      @if (apiError()) {
        <div class="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-start space-x-3">
          <svg lucideAlertCircle class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"></svg>
          <div class="text-sm">
            <span class="font-bold">Submission Failed:</span> {{ apiError() }}
          </div>
        </div>
      }

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Full Name -->
        <app-input-field
          label="Full Name"
          name="name"
          [(ngModel)]="name"
          placeholder="e.g. Rahul Sharma"
          [required]="true"
          [hasIcon]="true"
          [error]="errors().name"
          [disabled]="isLoading()"
        >
          <svg lucideUser class="w-5 h-5 text-slate-400" icon></svg>
        </app-input-field>

        <!-- Email Address -->
        <app-input-field
          label="Email Address"
          name="email"
          type="email"
          [(ngModel)]="email"
          placeholder="e.g. rahul.sharma@company.com"
          [required]="true"
          [hasIcon]="true"
          [error]="errors().email"
          [disabled]="isLoading() || isEmailDisabled()"
          [helperText]="isEmailDisabled() ? 'Account email is tied to user login and cannot be altered directly.' : ''"
        >
          <svg lucideMail class="w-5 h-5 text-slate-400" icon></svg>
        </app-input-field>

        <!-- Department -->
        <app-input-field
          label="Department"
          name="department"
          [(ngModel)]="department"
          placeholder="e.g. Engineering, HR, Finance"
          [required]="true"
          [hasIcon]="true"
          [error]="errors().department"
          [disabled]="isLoading()"
        >
          <svg lucideBriefcase class="w-5 h-5 text-slate-400" icon></svg>
        </app-input-field>

        <!-- Salary -->
        <app-input-field
          label="Salary (₹)"
          name="salary"
          type="number"
          [(ngModel)]="salary"
          placeholder="e.g. 750000"
          [required]="!isSalaryDisabled()"
          [hasIcon]="true"
          [error]="errors().salary"
          [disabled]="isLoading() || isSalaryDisabled()"
          [helperText]="isSalaryDisabled() ? 'Salary is managed by administrative payroll policy.' : ''"
          min="0"
          step="any"
        >
          <svg lucideDollarSign class="w-5 h-5 text-slate-400" icon></svg>
        </app-input-field>

        <!-- Phone -->
        <app-input-field
          label="Phone Number"
          name="phone"
          type="tel"
          [(ngModel)]="phone"
          placeholder="e.g. 9876543210"
          [hasIcon]="true"
          [error]="errors().phone"
          [disabled]="isLoading()"
          helperText="10-digit mobile number"
        >
          <svg lucidePhone class="w-5 h-5 text-slate-400" icon></svg>
        </app-input-field>
      </div>

      <div class="mt-8 pt-6 border-t border-slate-100 flex items-center justify-end space-x-4">
        <app-button
          type="button"
          variant="outline"
          (clicked)="onCancel()"
          [disabled]="isLoading()"
        >
          <svg lucideArrowLeft class="w-4 h-4 mr-2" icon></svg>
          Cancel
        </app-button>

        <app-button
          type="submit"
          variant="primary"
          [isLoading]="isLoading()"
        >
          <svg lucideSave class="w-4 h-4 mr-2" icon></svg>
          {{ isEdit() ? 'Update Employee' : 'Save Employee' }}
        </app-button>
      </div>
    </form>
  `
})
export class EmployeeFormComponent implements OnInit {
  readonly initialValues = input<Employee | null>(null);
  readonly isEdit = input<boolean>(false);
  readonly isLoading = input<boolean>(false);
  readonly apiError = input<string | null>(null);
  readonly isSalaryDisabled = input<boolean>(false);
  readonly isEmailDisabled = input<boolean>(false);

  readonly formSubmit = output<EmployeePayload>();
  readonly formCancel = output<void>();

  protected name = '';
  protected email = '';
  protected department = '';
  protected salary = '';
  protected phone = '';

  protected readonly errors = signal<{
    name?: string | null;
    email?: string | null;
    department?: string | null;
    salary?: string | null;
    phone?: string | null;
  }>({});

  constructor() {
    effect(() => {
      const data = this.initialValues();
      if (data) {
        this.name = data.name || '';
        this.email = data.email || '';
        this.department = data.department || '';
        this.salary = data.salary !== undefined && data.salary !== null ? String(data.salary) : '';
        this.phone = data.phone || '';
      }
    });
  }

  ngOnInit(): void {
    const data = this.initialValues();
    if (data) {
      this.name = data.name || '';
      this.email = data.email || '';
      this.department = data.department || '';
      this.salary = data.salary !== undefined && data.salary !== null ? String(data.salary) : '';
      this.phone = data.phone || '';
    }
  }

  private validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!this.name.trim()) {
      newErrors['name'] = 'Full name is required';
    } else if (this.name.trim().length < 2) {
      newErrors['name'] = 'Name must be at least 2 characters long';
    }

    if (!this.email.trim()) {
      newErrors['email'] = 'Email address is required';
    } else if (!validateEmail(this.email.trim())) {
      newErrors['email'] = 'Please enter a valid email address';
    }

    if (!this.department.trim()) {
      newErrors['department'] = 'Department is required';
    }

    if (!this.isSalaryDisabled()) {
      if (!this.salary || !this.salary.toString().trim()) {
        newErrors['salary'] = 'Salary is required';
      } else if (isNaN(Number(this.salary)) || Number(this.salary) < 0) {
        newErrors['salary'] = 'Salary must be a valid non-negative number';
      }
    }

    if (this.phone && this.phone.trim() !== '') {
      if (!validatePhone(this.phone.trim())) {
        newErrors['phone'] = 'Please enter a valid 10-digit phone number';
      }
    }

    this.errors.set(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  protected handleSubmit(): void {
    if (!this.validateForm()) return;

    const payload: EmployeePayload = {
      name: this.name.trim(),
      email: this.email.trim(),
      department: this.department.trim(),
      salary: this.salary !== '' && !isNaN(Number(this.salary)) ? Number(this.salary) : null,
      phone: this.phone.trim() ? this.phone.trim() : null
    };

    this.formSubmit.emit(payload);
  }

  protected onCancel(): void {
    this.formCancel.emit();
  }
}
