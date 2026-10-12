import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { EmployeeService } from '../../../core/services/employee.service';
import { EmployeePayload } from '../../../core/models/employee.model';
import { EmployeeFormComponent } from '../employee-form/employee-form.component';

@Component({
  selector: 'app-add-employee',
  standalone: true,
  imports: [CommonModule, EmployeeFormComponent],
  template: `
    <div class="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">
          Add New Employee
        </h1>
        <p class="text-slate-500 text-sm mt-0.5">
          Enter the new employee's details to register them in the system
        </p>
      </div>

      <app-employee-form
        (formSubmit)="handleSubmit($event)"
        (formCancel)="navigateBack()"
        [isLoading]="submitting()"
        [apiError]="apiError()"
      ></app-employee-form>
    </div>
  `
})
export class AddEmployeeComponent {
  private readonly employeeService = inject(EmployeeService);
  private readonly router = inject(Router);

  protected readonly submitting = signal<boolean>(false);
  protected readonly apiError = signal<string | null>(null);

  protected handleSubmit(employeeData: EmployeePayload): void {
    this.submitting.set(true);
    this.apiError.set(null);

    this.employeeService.createEmployee(employeeData).subscribe({
      next: () => {
        this.router.navigate(['/employees']);
      },
      error: (err) => {
        if (err.status === 403) {
          this.apiError.set('Access Denied: Administrative privileges (ROLE_ADMIN) required to create employee records.');
        } else if (err.error?.message) {
          this.apiError.set(err.error.message);
        } else if (err.error?.error) {
          this.apiError.set(err.error.error);
        } else if (err.status === 0) {
          this.apiError.set('Unable to connect to the backend server. Please verify your connection.');
        } else {
          this.apiError.set('Failed to create employee record. Check server constraints.');
        }
        this.submitting.set(false);
      }
    });
  }

  protected navigateBack(): void {
    this.router.navigate(['/employees']);
  }
}
