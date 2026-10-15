import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Employee, EmployeePayload } from '../models/employee.model';
import { Page } from '../models/pagination.model';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/employees`;

  /**
   * Search and paginate employees from the backend.
   * GET /api/employees?keyword={keyword}&department={department}&page={page}&size={size}
   */
  getEmployees(
    keyword: string = '',
    department: string = '',
    page: number = 0,
    size: number = 10
  ): Observable<Page<Employee>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (keyword && keyword.trim().length > 0) {
      params = params.set('keyword', keyword.trim());
    }

    if (department && department.trim().length > 0) {
      params = params.set('department', department.trim());
    }

    return this.http.get<Page<Employee>>(this.baseUrl, { params });
  }

  /**
   * Fetch a large batch or all employees (e.g., for dashboard metrics / department aggregation).
   */
  getAllEmployeesForDashboard(size: number = 100): Observable<Page<Employee>> {
    const params = new HttpParams()
      .set('page', '0')
      .set('size', size.toString());

    return this.http.get<Page<Employee>>(this.baseUrl, { params });
  }

  /**
   * Fetch a single employee by ID.
   * GET /api/employees/{id}
   */
  getEmployeeById(id: number | string): Observable<Employee> {
    return this.http.get<Employee>(`${this.baseUrl}/${id}`);
  }

  /**
   * Fetch the employee profile linked to currently authenticated user.
   * GET /api/employees/me
   */
  getMyProfile(): Observable<Employee> {
    return this.http.get<Employee>(`${this.baseUrl}/me`);
  }

  /**
   * Create a new employee.
   * POST /api/employees
   */
  createEmployee(employeeData: EmployeePayload): Observable<string> {
    return this.http.post(this.baseUrl, employeeData, { responseType: 'text' });
  }

  /**
   * Update an existing employee.
   * PUT /api/employees/{id}
   */
  updateEmployee(id: number | string, employeeData: EmployeePayload): Observable<string> {
    return this.http.put(`${this.baseUrl}/${id}`, employeeData, { responseType: 'text' });
  }

  /**
   * Delete an employee by ID.
   * DELETE /api/employees/{id}
   */
  deleteEmployee(id: number | string): Observable<string> {
    return this.http.delete(`${this.baseUrl}/${id}`, { responseType: 'text' });
  }
}
