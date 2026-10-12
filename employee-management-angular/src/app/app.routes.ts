import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent)
      },
      {
        path: 'employees',
        loadComponent: () =>
          import('./features/employees/employee-list/employee-list.component').then(
            (m) => m.EmployeeListComponent
          )
      },
      {
        path: 'employees/add',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/employees/add-employee/add-employee.component').then(
            (m) => m.AddEmployeeComponent
          )
      },
      {
        path: 'employees/:id',
        loadComponent: () =>
          import('./features/employees/employee-details/employee-details.component').then(
            (m) => m.EmployeeDetailsComponent
          )
      },
      {
        path: 'employees/:id/edit',
        loadComponent: () =>
          import('./features/employees/edit-employee/edit-employee.component').then(
            (m) => m.EditEmployeeComponent
          )
      }
    ]
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent)
  }
];
