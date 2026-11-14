import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { UserUnit } from '../model/user-unit.model';

export type ResidentRole = 'OWNER' | 'TENANT';

export interface CreateResidentRequest {
  fullName: string;
  email: string;
  phone: string;
  documentType: string;
  documentNumber: string;
  role: ResidentRole;
}

/** GET /users/search: solo OWNER/TENANT. */
export interface ResidentSearchResult {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  documentType: string;
  documentNumber: string;
  role: ResidentRole;
}

/**
 * Alta de residentes (IAM, solo ADMIN), busqueda y asignacion a unidad (Residential, solo ADMIN).
 * POST no usa BaseService a proposito: su create() reintenta y podria duplicar el alta.
 */
@Injectable({ providedIn: 'root' })
export class ResidentManagementService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.serverBaseUrl.replace(/\/+$/, '');

  createResident(request: CreateResidentRequest): Observable<unknown> {
    return this.http.post(`${this.baseUrl}${environment.residentUsersEndpointPath}`, request);
  }

  /** Solo digitos = DNI (prefijo); otro texto = nombre (contiene). */
  search(term: string): Observable<ResidentSearchResult[]> {
    const value = term.trim();
    const params = /^\d+$/.test(value)
      ? new HttpParams().set('documentNumber', value)
      : new HttpParams().set('name', value);
    return this.http.get<ResidentSearchResult[]>(`${this.baseUrl}${environment.userSearchEndpointPath}`, { params });
  }

  assignToUnit(userId: number, buildingId: number, unitId: number): Observable<UserUnit> {
    return this.http.post<UserUnit>(`${this.baseUrl}${environment.residentAssignmentsEndpointPath}`, {
      userId,
      buildingId,
      unitId
    });
  }
}

export const RESIDENT_ROLE_LABELS: Record<string, string> = {
  OWNER: 'Propietario',
  TENANT: 'Inquilino',
  ADMIN: 'Administrador'
};
