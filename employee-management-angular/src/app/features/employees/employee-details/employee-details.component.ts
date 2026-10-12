import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LucideUser,
  LucideMail,
  LucideBriefcase,
  LucideDollarSign,
  LucidePhone,
  LucideCalendar,
  LucideEdit2,
  LucideArrowLeft,
  LucideHash,
  LucideAlertCircle
} from '@lucide/angular';
import { EmployeeService } from '../../../core/services/employee.service';
import { AuthService } from '../../../core/services/auth.service';
import { Employee } from '../../../core/models/employee.model';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-employee-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LucideUser,
    LucideMail,
    LucideBriefcase,
    LucideDollarSign,
    LucidePhone,
    LucideCalendar,
    LucideEdit2,
    LucideArrowLeft,
    LucideHash,
    LucideAlertCircle,
    LoadingSpinnerComponent,
    ButtonComponent
  ],
  template: `
    <div class="max-w-4xl mx-auto">
      @if (loading()) {
        <app-loading-spinner [text]="'Fetching profile for employee #' + id + '...'"></app-loading-spinner>
      } @else if (error()) {
        <div class="max-w-xl mx-auto my-12 bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
          <div class="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg lucideAlertCircle class="w-6 h-6"></svg>
          </div>
          <h3 class="text-lg font-bold text-slate-900">Record Not Available</h3>
          <p class="text-slate-500 text-sm mt-2 mb-6">{{ error() }}</p>
          <a routerLink="/employees">
            <app-button variant="primary">
              <svg lucideArrowLeft class="w-4 h-4 mr-2" icon></svg>
              Return to Employee Directory
            </app-button>
          </a>
        </div>
      } @else if (employee(); as emp) {
        <div class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <!-- Header Banner -->
          <div class="bg-gradient-to-r from-slate-900 to-slate-800 p-6 sm:p-8 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="flex items-center space-x-4">
              <div class="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center font-bold text-2xl text-white shadow-lg border-2 border-white/20">
                {{ emp.name ? emp.name.charAt(0).toUpperCase() : 'E' }}
              </div>
              <div>
                <h2 class="text-2xl font-bold tracking-tight">{{ emp.name }}</h2>
                <p class="text-slate-300 text-sm flex items-center gap-2 mt-1">
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-200 border border-blue-400/30">
                    {{ emp.department || 'Employee' }}
                  </span>
                  <span>•</span>
                  <span>ID: #{{ emp.id }}</span>
                </p>
              </div>
            </div>

            <div class="flex items-center space-x-3 w-full sm:w-auto">
              <a routerLink="/employees">
                <app-button variant="outline" class="bg-white/10 text-white hover:bg-white/20 border-white/20">
                  <svg lucideArrowLeft class="w-4 h-4 mr-2" icon></svg>
                  Back
                </app-button>
              </a>
              @if (canEdit(emp)) {
                <a [routerLink]="['/employees', emp.id, 'edit']">
                  <app-button variant="primary">
                    <svg lucideEdit2 class="w-4 h-4 mr-2" icon></svg>
                    Edit Profile
                  </app-button>
                </a>
              }
            </div>
          </div>

          <!-- Profile Details Grid -->
          <div class="p-6 sm:p-8">
            <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-6">
              Detailed Information
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Employee ID -->
              <div class="flex items-start space-x-3.5 p-4 rounded-lg bg-slate-50/70 border border-slate-100">
                <div class="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 shadow-xs">
                  <svg lucideHash class="w-5 h-5 text-blue-600"></svg>
                </div>
                <div>
                  <span class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Employee ID</span>
                  <p class="text-base font-semibold mt-0.5 text-slate-800">#{{ emp.id }}</p>
                </div>
              </div>

              <!-- Full Name -->
              <div class="flex items-start space-x-3.5 p-4 rounded-lg bg-slate-50/70 border border-slate-100">
                <div class="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 shadow-xs">
                  <svg lucideUser class="w-5 h-5 text-blue-600"></svg>
                </div>
                <div>
                  <span class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Full Name</span>
                  <p class="text-base font-semibold mt-0.5 text-slate-800">{{ emp.name }}</p>
                </div>
              </div>

              <!-- Email Address -->
              <div class="flex items-start space-x-3.5 p-4 rounded-lg bg-slate-50/70 border border-slate-100">
                <div class="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 shadow-xs">
                  <svg lucideMail class="w-5 h-5 text-blue-600"></svg>
                </div>
                <div>
                  <span class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Email Address</span>
                  <p class="text-base font-semibold mt-0.5 text-slate-800">{{ emp.email }}</p>
                </div>
              </div>

              <!-- Department -->
              <div class="flex items-start space-x-3.5 p-4 rounded-lg bg-slate-50/70 border border-slate-100">
                <div class="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 shadow-xs">
                  <svg lucideBriefcase class="w-5 h-5 text-blue-600"></svg>
                </div>
                <div>
                  <span class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Department</span>
                  <p class="text-base font-semibold mt-0.5 text-slate-800">{{ emp.department || 'Not Assigned' }}</p>
                </div>
              </div>

              <!-- Annual Salary -->
              <div class="flex items-start space-x-3.5 p-4 rounded-lg bg-slate-50/70 border border-slate-100">
                <div class="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 shadow-xs">
                  <svg lucideDollarSign class="w-5 h-5 text-blue-600"></svg>
                </div>
                <div>
                  <span class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Annual Salary</span>
                  @if (emp.salary !== null && emp.salary !== undefined) {
                    <p class="text-base font-bold mt-0.5 text-blue-600">{{ formatCurrencyVal(emp.salary) }}</p>
                  } @else {
                    <p class="text-base font-semibold mt-0.5 text-slate-500">Confidential</p>
                  }
                </div>
              </div>

              <!-- Phone Contact -->
              <div class="flex items-start space-x-3.5 p-4 rounded-lg bg-slate-50/70 border border-slate-100">
                <div class="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 shadow-xs">
                  <svg lucidePhone class="w-5 h-5 text-blue-600"></svg>
                </div>
                <div>
                  <span class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Phone Contact</span>
                  <p class="text-base font-semibold mt-0.5 text-slate-800">{{ emp.phone || 'Not Provided' }}</p>
                </div>
              </div>

              <!-- Record Created -->
              <div class="flex items-start space-x-3.5 p-4 rounded-lg bg-slate-50/70 border border-slate-100">
                <div class="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 shadow-xs">
                  <svg lucideCalendar class="w-5 h-5 text-blue-600"></svg>
                </div>
                <div>
                  <span class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Record Created</span>
                  <p class="text-base font-semibold mt-0.5 text-slate-800">{{ formatDateVal(emp.createdAt) }}</p>
                </div>
              </div>

              <!-- Last Updated -->
              <div class="flex items-start space-x-3.5 p-4 rounded-lg bg-slate-50/70 border border-slate-100">
                <div class="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 shadow-xs">
                  <svg lucideCalendar class="w-5 h-5 text-blue-600"></svg>
                </div>
                <div>
                  <span class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Last Updated</span>
                  <p class="text-base font-semibold mt-0.5 text-slate-800">{{ formatDateVal(emp.updatedAt) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class EmployeeDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly employeeService = inject(EmployeeService);
  private readonly authService = inject(AuthService);

  readonly isAdmin = this.authService.isAdmin;
  readonly isEmployee = this.authService.isEmployee;
  readonly myEmployeeId = this.authService.myEmployeeId;
  readonly currentUser = this.authService.user;

  protected id!: string;
  protected readonly employee = signal<Employee | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') || '';
    if (this.id) {
      this.fetchEmployee();
    }
  }

  private fetchEmployee(): void {
    this.loading.set(true);
    this.error.set(null);

    this.employeeService.getEmployeeById(this.id).subscribe({
      next: (data) => {
        this.employee.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        const errorMsg =
          err.status === 404
            ? `Employee with ID #${this.id} was not found.`
            : typeof err.error === 'string' && err.error.length > 0
            ? err.error
            : err.error?.message || 'Failed to fetch employee details.';
        this.error.set(errorMsg);
        this.loading.set(false);
      }
    });
  }

  protected canEdit(emp: Employee): boolean {
    if (this.isAdmin()) return true;
    if (this.myEmployeeId() && String(emp.id) === String(this.myEmployeeId())) return true;
    if (this.currentUser()?.email && emp.email === this.currentUser()?.email) return true;
    return false;
  }

  protected formatCurrencyVal(amount?: number | null): string {
    if (amount === null || amount === undefined) return 'Confidential';
    return formatCurrency(amount);
  }

  protected formatDateVal(dateStr?: string): string {
    return formatDate(dateStr);
  }
}
