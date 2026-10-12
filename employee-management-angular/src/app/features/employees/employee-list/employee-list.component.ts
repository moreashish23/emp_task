import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideUserPlus,
  LucideRefreshCw,
  LucideAlertCircle,
  LucideCheckCircle,
  LucideSearch,
  LucideX,
  LucideFilter,
  LucideEye,
  LucideEdit2,
  LucideTrash2,
  LucideUserX,
  LucideMail,
  LucidePhone,
  LucideChevronLeft,
  LucideChevronRight
} from '@lucide/angular';
import { EmployeeService } from '../../../core/services/employee.service';
import { AuthService } from '../../../core/services/auth.service';
import { Employee } from '../../../core/models/employee.model';
import { formatCurrency } from '../../../shared/utils/formatters';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LucideUserPlus,
    LucideRefreshCw,
    LucideAlertCircle,
    LucideCheckCircle,
    LucideSearch,
    LucideX,
    LucideFilter,
    LucideEye,
    LucideEdit2,
    LucideTrash2,
    LucideUserX,
    LucideMail,
    LucidePhone,
    LucideChevronLeft,
    LucideChevronRight,
    LoadingSpinnerComponent,
    ButtonComponent,
    ConfirmDialogComponent
  ],
  template: `
    <div class="space-y-6">
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">
            Employee Directory
          </h1>
          <p class="text-slate-500 text-sm mt-0.5">
            Manage, search, and view all registered staff members
          </p>
        </div>

        <div class="flex items-center space-x-3 w-full sm:w-auto">
          <app-button
            variant="outline"
            (clicked)="fetchEmployees()"
            [disabled]="loading()"
          >
            <svg lucideRefreshCw class="w-4 h-4 mr-2" icon></svg>
            Refresh
          </app-button>

          @if (isAdmin()) {
            <a routerLink="/employees/add">
              <app-button variant="primary">
                <svg lucideUserPlus class="w-4 h-4 mr-2" icon></svg>
                Add Employee
              </app-button>
            </a>
          }
        </div>
      </div>

      <!-- Success Notification -->
      @if (successMessage()) {
        <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between animate-fade-in">
          <div class="flex items-center gap-2">
            <svg lucideCheckCircle class="w-5 h-5 text-emerald-600 flex-shrink-0"></svg>
            <span>{{ successMessage() }}</span>
          </div>
          <button
            type="button"
            (click)="successMessage.set('')"
            class="text-emerald-700 text-xs font-bold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      }

      <!-- API Error State Banner -->
      @if (error()) {
        <div class="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
          <div class="flex items-center gap-3">
            <svg lucideAlertCircle class="w-5 h-5 text-red-500 flex-shrink-0"></svg>
            <span>{{ error() }}</span>
          </div>
          <app-button variant="danger" size="small" (clicked)="fetchEmployees()">
            Retry Request
          </app-button>
        </div>
      }

      <!-- Search & Filter Controls -->
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-6">
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <!-- Search Text Input -->
          <div class="relative flex-1">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg lucideSearch class="w-5 h-5"></svg>
            </div>
            <input
              type="text"
              [ngModel]="searchTerm"
              (ngModelChange)="onSearchInputChange($event)"
              placeholder="Search by name, email, or department..."
              class="w-full pl-10 pr-9 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all"
            />
            @if (searchTerm) {
              <button
                type="button"
                (click)="clearSearch()"
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <svg lucideX class="w-4 h-4"></svg>
              </button>
            }
          </div>

          <!-- Filter by Department Dropdown -->
          <div class="flex items-center space-x-2">
            <div class="relative flex-1 sm:w-48">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg lucideFilter class="w-4 h-4"></svg>
              </div>
              <select
                [ngModel]="selectedDepartment"
                (ngModelChange)="onDepartmentChange($event)"
                class="w-full pl-9 pr-8 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all appearance-none cursor-pointer"
              >
                <option value="">All Departments</option>
                @for (dept of uniqueDepartments(); track dept) {
                  <option [value]="dept">{{ dept }}</option>
                }
              </select>
            </div>

            @if (searchTerm || selectedDepartment) {
              <button
                type="button"
                (click)="resetFilters()"
                class="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                Reset Filters
              </button>
            }
          </div>
        </div>
      </div>

      <!-- Table Content / Loading / Empty -->
      @if (loading()) {
        <app-loading-spinner text="Fetching employee records..."></app-loading-spinner>
      } @else if (employees().length === 0) {
        <div class="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
          <div class="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg lucideUserX class="w-8 h-8"></svg>
          </div>
          <h3 class="text-lg font-bold text-slate-800">No Employees Found</h3>
          <p class="text-slate-500 text-sm mt-1 max-w-md mx-auto">
            No records match your search criteria or no employee data is currently recorded in the system.
          </p>
        </div>
      } @else {
        <div class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-900 text-white text-xs font-semibold uppercase tracking-wider">
                  <th class="px-6 py-4">ID</th>
                  <th class="px-6 py-4">Employee</th>
                  <th class="px-6 py-4">Department</th>
                  <th class="px-6 py-4">Salary</th>
                  <th class="px-6 py-4">Phone</th>
                  <th class="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody class="divide-y divide-slate-200 text-sm">
                @for (emp of employees(); track emp.id) {
                  <tr class="hover:bg-slate-50/80 transition-colors duration-150">
                    <!-- ID -->
                    <td class="px-6 py-4 font-semibold text-slate-600">
                      #{{ emp.id }}
                    </td>

                    <!-- Employee Name & Email -->
                    <td class="px-6 py-4">
                      <div class="flex flex-col">
                        <span class="font-semibold text-slate-900 text-base">
                          {{ emp.name }}
                        </span>
                        <span class="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <svg lucideMail class="w-3.5 h-3.5 text-slate-400"></svg>
                          {{ emp.email }}
                        </span>
                      </div>
                    </td>

                    <!-- Department Tag -->
                    <td class="px-6 py-4">
                      <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                        {{ emp.department || 'Unassigned' }}
                      </span>
                    </td>

                    <!-- Formatted Salary -->
                    <td class="px-6 py-4 font-medium text-slate-800">
                      @if (emp.salary !== null && emp.salary !== undefined) {
                        {{ formatCurrencyVal(emp.salary) }}
                      } @else {
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                          Confidential
                        </span>
                      }
                    </td>

                    <!-- Phone -->
                    <td class="px-6 py-4 text-slate-600">
                      @if (emp.phone) {
                        <span class="flex items-center gap-1.5 text-slate-700">
                          <svg lucidePhone class="w-3.5 h-3.5 text-slate-400"></svg>
                          {{ emp.phone }}
                        </span>
                      } @else {
                        <span class="text-slate-400 italic">N/A</span>
                      }
                    </td>

                    <!-- Actions -->
                    <td class="px-6 py-4 text-right">
                      <div class="flex items-center justify-end space-x-2">
                        <!-- View Action: open to all authenticated roles -->
                        <a
                          [routerLink]="['/employees', emp.id]"
                          class="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <svg lucideEye class="w-4 h-4"></svg>
                        </a>

                        <!-- Edit Action: Admin or own profile -->
                        @if (canEdit(emp)) {
                          <a
                            [routerLink]="['/employees', emp.id, 'edit']"
                            class="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Edit Employee"
                          >
                            <svg lucideEdit2 class="w-4 h-4"></svg>
                          </a>
                        }

                        <!-- Delete Action: Admin only -->
                        @if (isAdmin()) {
                          <button
                            type="button"
                            (click)="handleDeleteClick(emp)"
                            class="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Employee"
                          >
                            <svg lucideTrash2 class="w-4 h-4"></svg>
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Server-side Pagination & Results Counter -->
          <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="flex items-center space-x-4 text-xs text-slate-500">
              <span>
                Showing <strong class="text-slate-700">{{ paginationRangeStart() }}</strong> to
                <strong class="text-slate-700">{{ paginationRangeEnd() }}</strong> of
                <strong class="text-slate-700">{{ totalElements() }}</strong> results
              </span>

              <!-- Page Size Selector -->
              <div class="flex items-center space-x-1.5 border-l border-slate-200 pl-4">
                <label for="pageSizeSelect" class="text-slate-500">Per page:</label>
                <select
                  id="pageSizeSelect"
                  [ngModel]="pageSize()"
                  (ngModelChange)="onPageSizeChange($event)"
                  class="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                >
                  <option [value]="5">5</option>
                  <option [value]="10">10</option>
                  <option [value]="20">20</option>
                  <option [value]="50">50</option>
                </select>
              </div>
            </div>

            <!-- Page Navigation Controls -->
            <div class="flex items-center space-x-1.5">
              <button
                type="button"
                [disabled]="currentPage() === 0"
                (click)="goToPage(currentPage() - 1)"
                class="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <svg lucideChevronLeft class="w-3.5 h-3.5 mr-1"></svg>
                Previous
              </button>

              <span class="px-3 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg">
                Page {{ currentPage() + 1 }} of {{ totalPages() > 0 ? totalPages() : 1 }}
              </span>

              <button
                type="button"
                [disabled]="currentPage() >= totalPages() - 1 || totalPages() <= 1"
                (click)="goToPage(currentPage() + 1)"
                class="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
                <svg lucideChevronRight class="w-3.5 h-3.5 ml-1"></svg>
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Delete Confirmation Dialog Modal -->
      <app-confirm-dialog
        [isOpen]="deleteModal().isOpen"
        title="Delete Employee Record"
        [message]="'Are you sure you want to delete employee &quot;' + (deleteModal().employee?.name || '') + '&quot; (ID: #' + (deleteModal().employee?.id || '') + ')? This action cannot be undone.'"
        confirmText="Confirm Delete"
        cancelText="Cancel"
        [isLoading]="deleteModal().isDeleting"
        variant="danger"
        (confirmed)="handleConfirmDelete()"
        (cancelled)="closeDeleteModal()"
      ></app-confirm-dialog>
    </div>
  `
})
export class EmployeeListComponent implements OnInit {
  private readonly employeeService = inject(EmployeeService);
  private readonly authService = inject(AuthService);

  readonly isAdmin = this.authService.isAdmin;
  readonly isEmployee = this.authService.isEmployee;
  readonly myEmployeeId = this.authService.myEmployeeId;
  readonly currentUser = this.authService.user;

  protected readonly employees = signal<Employee[]>([]);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);
  protected readonly successMessage = signal<string>('');

  // Search & Filter State
  protected searchTerm = '';
  protected selectedDepartment = '';
  protected readonly uniqueDepartments = signal<string[]>([]);

  // Server-side Pagination State
  protected readonly currentPage = signal<number>(0);
  protected readonly pageSize = signal<number>(10);
  protected readonly totalElements = signal<number>(0);
  protected readonly totalPages = signal<number>(1);

  // Delete modal state
  protected readonly deleteModal = signal<{
    isOpen: boolean;
    employee: Employee | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    employee: null,
    isDeleting: false
  });

  private searchDebounceTimer: any;

  ngOnInit(): void {
    this.fetchEmployees();
    this.loadDepartmentOptions();
  }

  private loadDepartmentOptions(): void {
    this.employeeService.getAllEmployeesForDashboard(100).subscribe({
      next: (res: any) => {
        const list: Employee[] = Array.isArray(res) ? res : (res?.content ?? []);
        const depts = Array.from(
          new Set(list.map((emp) => emp.department).filter(Boolean))
        ).sort();
        this.uniqueDepartments.set(depts);
      },
      error: () => { }
    });
  }

  fetchEmployees(): void {
    this.loading.set(true);
    this.error.set(null);

    this.employeeService.getEmployees(
      this.searchTerm,
      this.selectedDepartment,
      this.currentPage(),
      this.pageSize()
    ).subscribe({
      next: (pageData: any) => {
        if (Array.isArray(pageData)) {
          this.employees.set(pageData);
          this.totalElements.set(pageData.length);
          this.totalPages.set(1);
        } else if (pageData && pageData.content) {
          this.employees.set(pageData.content);
          this.totalElements.set(pageData.totalElements ?? pageData.content.length);
          this.totalPages.set(pageData.totalPages ?? 1);
        } else {
          this.employees.set([]);
          this.totalElements.set(0);
          this.totalPages.set(1);
        }
        this.loading.set(false);
      },
      error: (err) => {
        const errorMsg =
          typeof err.error === 'string' && err.error.length > 0
            ? err.error
            : err.error?.message || err.message || 'Failed to fetch employee list from backend API.';
        this.error.set(errorMsg);
        this.loading.set(false);
      }
    });
  }

  protected onSearchInputChange(val: string): void {
    this.searchTerm = val;
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.currentPage.set(0);
      this.fetchEmployees();
    }, 300);
  }

  protected onDepartmentChange(dept: string): void {
    this.selectedDepartment = dept;
    this.currentPage.set(0);
    this.fetchEmployees();
  }

  protected clearSearch(): void {
    this.searchTerm = '';
    this.currentPage.set(0);
    this.fetchEmployees();
  }

  protected resetFilters(): void {
    this.searchTerm = '';
    this.selectedDepartment = '';
    this.currentPage.set(0);
    this.fetchEmployees();
  }

  protected onPageSizeChange(newSize: number): void {
    this.pageSize.set(Number(newSize));
    this.currentPage.set(0);
    this.fetchEmployees();
  }

  protected goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages()) {
      this.currentPage.set(page);
      this.fetchEmployees();
    }
  }

  protected paginationRangeStart(): number {
    if (this.totalElements() === 0) return 0;
    return this.currentPage() * this.pageSize() + 1;
  }

  protected paginationRangeEnd(): number {
    return Math.min((this.currentPage() + 1) * this.pageSize(), this.totalElements());
  }

  protected handleDeleteClick(emp: Employee): void {
    this.deleteModal.set({
      isOpen: true,
      employee: emp,
      isDeleting: false
    });
  }

  protected closeDeleteModal(): void {
    this.deleteModal.set({
      isOpen: false,
      employee: null,
      isDeleting: false
    });
  }

  protected handleConfirmDelete(): void {
    const emp = this.deleteModal().employee;
    if (!emp) return;

    this.deleteModal.update((s) => ({ ...s, isDeleting: true }));

    this.employeeService.deleteEmployee(emp.id).subscribe({
      next: () => {
        this.successMessage.set(`Employee "${emp.name}" was deleted successfully.`);
        this.closeDeleteModal();
        this.fetchEmployees();
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (err) => {
        this.error.set(
          err.error?.message || 'Failed to delete employee. Please try again.'
        );
        this.closeDeleteModal();
      }
    });
  }

  protected canEdit(emp: Employee): boolean {
    if (this.isAdmin()) return true;
    if (this.myEmployeeId() && String(emp.id) === String(this.myEmployeeId())) return true;
    if (this.currentUser()?.email && emp.email === this.currentUser()?.email) return true;
    return false;
  }

  protected formatCurrencyVal(salary?: number | null): string {
    if (salary === null || salary === undefined) return 'Confidential';
    return formatCurrency(salary);
  }
}
