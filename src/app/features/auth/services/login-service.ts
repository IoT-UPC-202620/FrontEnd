import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { SignInResource } from '../models/sign-in-resource.model';
import { AuthenticatedUserResource } from '../models/authenticated-user-resource.model';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  private http = inject(HttpClient);
  private serverBaseUrl = environment.serverBaseUrl;

  signIn(resource: SignInResource): Observable<AuthenticatedUserResource> {
    return this.http.post<AuthenticatedUserResource>(
      `${this.serverBaseUrl}${environment.authenticationEndpointPath}/sign-in`,
      resource
    ).pipe(
      tap(response => {
        localStorage.setItem('edifika_token', response.token);
        localStorage.setItem('edifika_user', JSON.stringify(response));
      })
    );
  }

  getToken(): string | null {
    return localStorage.getItem('edifika_token');
  }

  getCurrentUser(): AuthenticatedUserResource | null {
    const user = localStorage.getItem('edifika_user');
    return user ? JSON.parse(user) : null;
  }

  isLoggedIn(): boolean {
    const token = this.getToken();

    if (!token || this.isTokenExpired(token)) {
      this.logout();
      return false;
    }

    return true;
  }

  /** Roles del usuario, leidos del claim "roles" del JWT (IAM no los devuelve en el sign-in). */
  getRoles(): string[] {
    const payload = this.decodePayload(this.getToken());
    return Array.isArray(payload?.['roles']) ? (payload['roles'] as string[]) : [];
  }

  /** La web es solo para administradores; propietarios y tenants usan la app movil. */
  isAdmin(): boolean {
    return this.getRoles().includes('ADMIN');
  }

  logout(): void {
    localStorage.removeItem('edifika_token');
    localStorage.removeItem('edifika_user');
  }

  private decodePayload(token: string | null): Record<string, unknown> | null {
    const part = token?.split('.')[1];
    if (!part) {
      return null;
    }
    try {
      const base64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
  }

  private isTokenExpired(token: string): boolean {
    const parts = token.split('.');

    if (parts.length !== 3) {
      return false;
    }

    try {
      const payload = JSON.parse(atob(parts[1]));
      const expiration = payload.exp;

      if (!expiration) {
        return false;
      }

      return Date.now() >= expiration * 1000;
    } catch {
      return true;
    }
  }
}
