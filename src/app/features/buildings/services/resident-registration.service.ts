import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { RegisterResidentResource } from '../model/register-resident-resource.model';
import { UserUnit } from '../model/user-unit.model';

@Injectable({
  providedIn: 'root'
})
export class ResidentRegistrationService {
  private http = inject(HttpClient);
  private options = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  registerResident(resource: RegisterResidentResource): Observable<UserUnit> {
    const baseUrl = environment.serverBaseUrl.replace(/\/+$/, '');
    const path = environment.residentRegisterEndpointPath.replace(/^\/+/, '');

    return this.http.post<UserUnit>(`${baseUrl}/${path}`, resource, this.options)
      .pipe(catchError(err => {
        console.error('Error registering resident:', err);
        throw err;
      }));
  }
}
