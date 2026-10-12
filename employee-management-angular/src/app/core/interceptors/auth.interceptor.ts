import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  let modifiedReq = req;
  if (token) {
    modifiedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(modifiedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // 401 indicates expired or invalid token -> force re-login
      if (error.status === 401) {
        const currentUrl = router.url;
        if (!currentUrl.includes('/login') && !currentUrl.includes('/register')) {
          authService.logout(false);
          router.navigate(['/login'], { queryParams: { expired: 'true' } });
        }
      }
      // 403 indicates permission denied -> do not clear auth session, allow components to show access denied
      return throwError(() => error);
    })
  );
};
