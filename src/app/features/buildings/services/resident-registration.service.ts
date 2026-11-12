import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { RegisterResidentResource } from '../model/register-resident-resource.model';
import { UserUnit } from '../model/user-unit.model';

// Not extending BaseService: its create() retries POSTs, which would double-register a resident.
@Injectable({
  providedIn: 'root'
})
export class ResidentRegistrationService {
  private http = inject(HttpClient);
  private options = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  registerResident(resource: RegisterResidentResource): Observable<UserUnit> {
    const baseUrl = environment.serverBaseUrl.replace(/\/+$/, '');
    const path = environment.residentRegisterEndpointPath.replace(/^\/+/, '');

    return this.http.post<UserUnit>(`${baseUrl}/${path}`, resource, this.options);
  }
}
