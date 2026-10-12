import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAlertCircle, LucideArrowLeft } from '@lucide/angular';
import { EmployeeService } from '../../../core/services/employee.service';
import { AuthService } from '../../../core/services/auth.service';
import { Employee, EmployeePayload } from '../../../core/models/employee.model';
import { EmployeeFormComponent } from '../employee-form/employee-form.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-edit-employee',
  standalone: true,
  imports: [
    CommonModule,
    LucideAlertCircle,
    LucideArrowLeft,
    EmployeeFormComponent,
    LoadingSpinnerComponent,
    ButtonComponent
  ],
  template: `
    @if (loading()) {
      <app-loading-spinner [text]="'Loading employee details for ID #' + id + '...'"></app-loading-spinner>
    } @else if (fetchError()) {
      <div class="max-w-xl mx-auto my-12 bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
        <div class="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg lucideAlertCircle class="w-6 h-6"></svg>
        </div>
        <h3 class="text-lg font-bold text-slate-900">Employee Not Found</h3>
        <p class="text-slate-500 text-sm mt-2 mb-6">{{ fetchError() }}</p>
        <app-button
          variant="primary"
          (clicked)="navigateBack()"
        >
          <svg lucideArrowLeft class="w-4 h-4 mr-2" icon></svg>
          Return to Employee Directory
        </app-button>
      </div>
    } @else {
      <div class="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">
            Edit Employee Profile
          </h1>
          <p class="text-slate-500 text-sm mt-0.5">
            Updating information for employee <span class="font-semibold text-slate-800">#{{ id }} - {{ initialData()?.name }}</span>
          </p>
        </div>

        <app-employee-form
          [initialValues]="initialData()"
          [isEdit]="true"
          [isLoading]="submitting()"
          [apiError]="apiError()"
          [isSalaryDisabled]="isEmployee()"
          [isEmailDisabled]="isEmployee()"
          (formSubmit)="handleSubmit($event)"
          (formCancel)="navigateBack()"
        ></app-employee-form>
      </div>
    }
  `
})
export class EditEmployeeComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly employeeService = inject(EmployeeService);
  private readonly authService = inject(AuthService);

  readonly isAdmin = this.authService.isAdmin;
  readonly isEmployee = this.authService.isEmployee;
  readonly myEmployeeId = this.authService.myEmployeeId;
  readonly currentUser = this.authService.user;

  protected id!: string;
  protected readonly initialData = signal<Employee | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly submitting = signal<boolean>(false);
  protected readonly fetchError = signal<string | null>(null);
  protected readonly apiError = signal<string | null>(null);

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') || '';
    if (this.id) {
      this.fetchEmployee();
    }
  }

  private fetchEmployee(): void {
    this.loading.set(true);
    this.fetchError.set(null);

    this.employeeService.getEmployeeById(this.id).subscribe({
      next: (data) => {
        // Enforce frontend boundary: if regular employee, verify this record belongs to them
        if (this.isEmployee()) {
          const isOwner = (this.myEmployeeId() && String(data.id) === String(this.myEmployeeId())) ||
                          (this.currentUser()?.email && data.email === this.currentUser()?.email);
          if (!isOwner) {
            this.fetchError.set('Access Denied: You are not authorized to edit other employee records.');
            this.loading.set(false);
            return;
          }
        }
        this.initialData.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.fetchError.set(
          err.status === 404
            ? `Employee with ID #${this.id} was not found.`
            : err.status === 403
            ? 'Access Denied: You do not have permission to view or edit this employee record.'
            : err.error?.message || 'Failed to load employee details.'
        );
        this.loading.set(false);
      }
    });
  }

  protected handleSubmit(updatedData: EmployeePayload): void {
    this.submitting.set(true);
    this.apiError.set(null);

    const payload = {
      ...this.initialData(),
      ...updatedData
    };

    this.employeeService.updateEmployee(this.id, payload).subscribe({
      next: () => {
        this.router.navigate(['/employees']);
      },
      error: (err) => {
        this.apiError.set(
          err.error?.message || err.error?.error || 'Failed to update employee details.'
        );
        this.submitting.set(false);
      }
    });
  }

  protected navigateBack(): void {
    this.router.navigate(['/employees']);
  }
}
