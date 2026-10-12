import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  LucideShield,
  LucideRefreshCw,
  LucideUserPlus,
  LucideAlertCircle,
  LucideUsers,
  LucideBriefcase,
  LucideDollarSign,
  LucideTrendingUp,
  LucideList
} from '@lucide/angular';
import { AuthService } from '../../core/services/auth.service';
import { EmployeeService } from '../../core/services/employee.service';
import { Employee } from '../../core/models/employee.model';
import { formatCurrency } from '../../shared/utils/formatters';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ButtonComponent } from '../../shared/components/button/button.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LucideShield,
    LucideRefreshCw,
    LucideUserPlus,
    LucideAlertCircle,
    LucideUsers,
    LucideBriefcase,
    LucideDollarSign,
    LucideTrendingUp,
    LucideList,
    LoadingSpinnerComponent,
    ButtonComponent
  ],
  template: `
    @if (loading()) {
      <app-loading-spinner text="Computing dashboard metrics..."></app-loading-spinner>
    } @else {
      <div class="space-y-8">
        <!-- Welcome Banner -->
        <div class="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div class="inline-flex items-center space-x-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold mb-3 border border-blue-100">
              <svg lucideShield class="w-3.5 h-3.5"></svg>
              <span>Role: {{ user()?.role || 'ROLE_USER' }}</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome back, <span class="text-blue-600">{{ userFirstName() }}</span>!
            </h1>
            <p class="text-slate-500 text-sm mt-1">
              Here is your live employee management overview based on actual database records.
            </p>
          </div>

          <div class="flex items-center space-x-3 w-full md:w-auto">
            <app-button
              variant="outline"
              (clicked)="fetchDashboardData()"
            >
              <svg lucideRefreshCw class="w-4 h-4 mr-2" icon></svg>
              Refresh Data
            </app-button>

            @if (isAdmin()) {
              <a routerLink="/employees/add">
                <app-button variant="primary">
                  <svg lucideUserPlus class="w-4 h-4 mr-2" icon></svg>
                  Add Employee
                </app-button>
              </a>
            }

            @if (isEmployee() && myEmployeeId()) {
              <a [routerLink]="['/employees', myEmployeeId()]">
                <app-button variant="primary">
                  <svg lucideUsers class="w-4 h-4 mr-2" icon></svg>
                  My Profile
                </app-button>
              </a>
            }
          </div>
        </div>

        <!-- Error state if API fails -->
        @if (error()) {
          <div class="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 flex items-start justify-between">
            <div class="flex items-start space-x-3">
              <svg lucideAlertCircle class="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5"></svg>
              <div>
                <h3 class="font-bold text-base">Backend Connection Error</h3>
                <p class="text-sm mt-1">{{ error() }}</p>
              </div>
            </div>
            <app-button variant="danger" size="small" (clicked)="fetchDashboardData()">
              Retry
            </app-button>
          </div>
        }

        <!-- Key Metric Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- Total Employees Card -->
          <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Total Staff
                </p>
                <h3 class="text-3xl font-extrabold text-slate-900 mt-1">
                  {{ totalEmployees() }}
                </h3>
              </div>
              <div class="p-3.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <svg lucideUsers class="w-6 h-6"></svg>
              </div>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Active database records</span>
              <a routerLink="/employees" class="text-blue-600 font-semibold hover:underline">
                View All &rarr;
              </a>
            </div>
          </div>

          <!-- Departments Count Card -->
          <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Active Departments
                </p>
                <h3 class="text-3xl font-extrabold text-slate-900 mt-1">
                  {{ totalDepartments() }}
                </h3>
              </div>
              <div class="p-3.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                <svg lucideBriefcase class="w-6 h-6"></svg>
              </div>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Categorized teams</span>
              <span class="font-semibold text-slate-700">{{ totalDepartments() }} Unique</span>
            </div>
          </div>

          <!-- Average Salary / Compensation Card -->
          <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
            @if (isAdmin()) {
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Average Salary
                  </p>
                  <h3 class="text-3xl font-extrabold text-slate-900 mt-1">
                    {{ formatCurrencyVal(avgSalary()) }}
                  </h3>
                </div>
                <div class="p-3.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <svg lucideDollarSign class="w-6 h-6"></svg>
                </div>
              </div>
              <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Total Payroll: {{ formatCurrencyVal(totalPayroll()) }}</span>
                <svg lucideTrendingUp class="w-4 h-4 text-emerald-500"></svg>
              </div>
            } @else {
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    My Compensation
                  </p>
                  <h3 class="text-3xl font-extrabold text-slate-900 mt-1">
                    {{ formatCurrencyVal(mySalary()) }}
                  </h3>
                </div>
                <div class="p-3.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <svg lucideDollarSign class="w-6 h-6"></svg>
                </div>
              </div>
              <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Personal Annual Salary</span>
                <span class="text-emerald-600 font-semibold">Verified</span>
              </div>
            }
          </div>
        </div>

        <!-- Bottom Grid: Department Breakdown & Recent Employees -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Department Distribution Breakdown -->
          <div class="lg:col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <h3 class="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <svg lucideBriefcase class="w-5 h-5 text-blue-600"></svg>
                <span>Department Distribution</span>
              </h3>

              @if (totalDepartments() === 0) {
                <p class="text-sm text-slate-500 py-6 text-center">No department data available.</p>
              } @else {
                <div class="space-y-4">
                  @for (dept of departmentList(); track dept.name) {
                    <div>
                      <div class="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                        <span>{{ dept.name }}</span>
                        <span>{{ dept.count }} staff ({{ dept.percentage }}%)</span>
                      </div>
                      <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          class="bg-blue-600 h-full rounded-full transition-all duration-300"
                          [style.width.%]="dept.percentage"
                        ></div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <div class="mt-6 pt-4 border-t border-slate-100">
              <a routerLink="/employees" class="w-full inline-flex justify-center text-xs font-semibold text-blue-600 hover:text-blue-700">
                Manage Employee Records &rarr;
              </a>
            </div>
          </div>

          <!-- Recent Employees Table Preview -->
          <div class="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
                  <svg lucideList class="w-5 h-5 text-blue-600"></svg>
                  <span>Recently Added Employees</span>
                </h3>
                <a
                  routerLink="/employees"
                  class="text-xs font-semibold text-blue-600 hover:underline"
                >
                  View All ({{ totalEmployees() }})
                </a>
              </div>

              @if (recentEmployees().length === 0) {
                <p class="text-sm text-slate-500 py-8 text-center">No recent employee records.</p>
              } @else {
                <div class="overflow-x-auto">
                  <table class="w-full text-left border-collapse">
                    <thead>
                      <tr class="border-b border-slate-200 text-xs font-semibold text-slate-400 uppercase">
                        <th class="py-2 px-3">Name</th>
                        <th class="py-2 px-3">Department</th>
                        <th class="py-2 px-3">Salary</th>
                        <th class="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 text-sm">
                      @for (emp of recentEmployees(); track emp.id) {
                        <tr class="hover:bg-slate-50">
                          <td class="py-3 px-3">
                            <div class="font-semibold text-slate-800">{{ emp.name }}</div>
                            <div class="text-xs text-slate-400">{{ emp.email }}</div>
                          </td>
                          <td class="py-3 px-3">
                            <span class="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                              {{ emp.department || 'N/A' }}
                            </span>
                          </td>
                          <td class="py-3 px-3 font-medium text-slate-700">
                            @if (emp.salary !== null && emp.salary !== undefined) {
                              {{ formatCurrencyVal(emp.salary) }}
                            } @else {
                              <span class="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                                Confidential
                              </span>
                            }
                          </td>
                          <td class="py-3 px-3 text-right">
                            <a
                              [routerLink]="['/employees', emp.id]"
                              class="text-xs font-semibold text-blue-600 hover:text-blue-800"
                            >
                              Details
                            </a>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly employeeService = inject(EmployeeService);

  readonly user = this.authService.user;
  readonly isAdmin = this.authService.isAdmin;
  readonly isEmployee = this.authService.isEmployee;
  readonly myEmployeeId = this.authService.myEmployeeId;
  protected readonly employees = signal<Employee[]>([]);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  protected readonly totalEmployees = computed(() => this.employees().length);

  protected readonly totalPayroll = computed(() =>
    this.employees().reduce((sum, emp) => sum + (Number(emp.salary) || 0), 0)
  );

  protected readonly avgSalary = computed(() => {
    const total = this.totalEmployees();
    return total > 0 ? Math.round(this.totalPayroll() / total) : 0;
  });

  protected readonly departmentMap = computed(() => {
    const map: Record<string, number> = {};
    for (const emp of this.employees()) {
      const dept = emp.department || 'Unassigned';
      map[dept] = (map[dept] || 0) + 1;
    }
    return map;
  });

  protected readonly totalDepartments = computed(() =>
    Object.keys(this.departmentMap()).length
  );

  protected readonly departmentList = computed(() => {
    const total = this.totalEmployees();
    return Object.entries(this.departmentMap()).map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }));
  });

  protected readonly recentEmployees = computed(() => {
    return [...this.employees()]
      .sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return String(b.id).localeCompare(String(a.id));
      })
      .slice(0, 5);
  });

  protected readonly mySalary = computed(() => {
    const myId = this.myEmployeeId();
    const myEmail = this.user()?.email;
    const found = this.employees().find(e => (myId && String(e.id) === String(myId)) || (myEmail && e.email === myEmail));
    return found?.salary ?? null;
  });

  protected userFirstName(): string {
    const email = this.user()?.email;
    return email ? email.split('@')[0] : 'User';
  }

  protected formatCurrencyVal(amount?: number | null): string {
    if (amount === null || amount === undefined) return 'Confidential';
    return formatCurrency(amount);
  }

  ngOnInit(): void {
    this.fetchDashboardData();
  }

  fetchDashboardData(): void {
    this.loading.set(true);
    this.error.set(null);

    this.employeeService.getAllEmployeesForDashboard(100).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.content ?? []);
        this.employees.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(
          err.error?.message || err.message || 'Failed to load dashboard metrics from server.'
        );
        this.loading.set(false);
      }
    });
  }
}
