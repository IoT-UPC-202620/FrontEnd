import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LoginService } from '../../features/auth/services/login-service';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const loginService = inject(LoginService);

  if (loginService.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

/** /app/** solo para ADMIN: si hay un token guardado de otro rol, se limpia y vuelve al login. */
export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const loginService = inject(LoginService);

  if (loginService.isLoggedIn() && loginService.isAdmin()) {
    return true;
  }

  loginService.logout();
  return router.createUrlTree(['/login'], { queryParams: { reason: 'resident' } });
};
