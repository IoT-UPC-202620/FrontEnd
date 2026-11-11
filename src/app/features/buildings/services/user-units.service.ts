import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';

import { BaseService } from '../../../shared/services/base.service';
import { UserUnit } from '../model/user-unit.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserUnitsService extends BaseService<UserUnit> {
  override http = inject(HttpClient);
  override serverBaseUrl = environment.serverBaseUrl;

  constructor() {
    super();
    this.resourceEndpoint = environment.userUnitEndpointPath;
  }

  assignUserToUnit(resource: UserUnit): Observable<UserUnit> {
    const payload = {
      idUnit: resource.idUnit,
      idUser: resource.idUser,
      idBuilding: resource.idBuilding,
      startDate: resource.startDate,
      endDate: resource.endDate,
      status: resource.status,
      relationType: resource.relationType ?? 'OWNER'
    };

    return this.http.post<UserUnit>(
      this.resourcePath(),
      payload,
      this.httpOptions
    ).pipe(
      catchError(this.handleError)
    );
  }

  getResidentsByBuildingId(idBuilding: number): Observable<UserUnit[]> {
    const baseUrl = this.serverBaseUrl.replace(/\/+$/, '');
    const buildingsPath = environment.buildingEndpointPath.replace(/^\/+/, '');

    return this.http.get<UserUnit[]>(
      `${baseUrl}/${buildingsPath}/${idBuilding}/residents`,
      this.httpOptions
    ).pipe(
      catchError(this.handleError)
    );
  }
  getByBuildingId(
    buildingId: number
  ): Observable<UserUnit[]> {
    return this.http.get<UserUnit[]>(
      `${environment.serverBaseUrl}` +
      `${environment.residentialEndpointPath}` +
      `/buildings/${buildingId}/residents`
    );
  }

  moveUserToUnit(idUser: number, newIdUnit: number, moveDate: string): Observable<UserUnit> {
    return this.http.put<UserUnit>(
      `${this.serverBaseUrl}${environment.userUnitEndpointPath}/move`,
      {
        idUser,
        newIdUnit,
        moveDate
      }
    );
  }
}
