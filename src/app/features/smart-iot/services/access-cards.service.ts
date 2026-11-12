import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  AccessCredential,
  CardEnrollment,
  CreateCredentialPayload,
  RfidReaderDevice,
  parseCredential,
  parseEnrollment,
  parseReaderDevice
} from '../model/access-cards.model';

@Injectable({
  providedIn: 'root'
})
export class AccessCardsService {
  private readonly http = inject(HttpClient);
  private readonly httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };
  private readonly baseUrl = environment.serverBaseUrl.replace(/\/+$/, '');

  getBuildingId(): number {
    const directBuildingId = localStorage.getItem('buildingId');

    if (directBuildingId) {
      const parsedId = Number(directBuildingId);

      if (!Number.isNaN(parsedId)) {
        return parsedId;
      }
    }

    const storedUser =
      localStorage.getItem('currentUser') ??
      localStorage.getItem('user') ??
      localStorage.getItem('authUser');

    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        const parsedId = Number(
          user.buildingId ??
          user.idBuilding ??
          user.building?.id
        );

        if (!Number.isNaN(parsedId)) {
          return parsedId;
        }
      } catch (error) {
        console.error('No se pudo leer el usuario de localStorage:', error);
      }
    }

    return 1;
  }

  getCredentials(buildingId: number): Observable<AccessCredential[]> {
    return this.http
      .get<AccessCredential[]>(`${this.baseUrl}/access/credentials`, {
        ...this.httpOptions,
        params: { buildingId: String(buildingId) }
      })
      .pipe(
        map(list => (Array.isArray(list) ? list : []).map(parseCredential)),
        catchError(this.handleError)
      );
  }

  changeStatus(id: number, status: string): Observable<AccessCredential> {
    return this.http
      .patch<AccessCredential>(
        `${this.baseUrl}/access/credentials/${id}/status`,
        { status },
        this.httpOptions
      )
      .pipe(
        map(parseCredential),
        catchError(this.handleError)
      );
  }

  createCredential(payload: CreateCredentialPayload): Observable<AccessCredential> {
    return this.http
      .post<AccessCredential>(`${this.baseUrl}/access/credentials`, payload, this.httpOptions)
      .pipe(
        map(parseCredential),
        catchError(this.handleError)
      );
  }

  getOnlineRfidReaders(buildingId: number): Observable<RfidReaderDevice[]> {
    return this.http
      .get<RfidReaderDevice[]>(`${this.baseUrl}/iot/devices`, {
        ...this.httpOptions,
        params: { buildingId: String(buildingId) }
      })
      .pipe(
        map(list => (Array.isArray(list) ? list : []).map(parseReaderDevice)),
        map(devices =>
          devices.filter(device =>
            device.deviceType.toUpperCase() === 'DOOR' &&
            device.capabilities.some(capability => capability.toUpperCase() === 'RFID') &&
            device.status.toUpperCase() === 'ACTIVE'
          )
        ),
        catchError(this.handleError)
      );
  }

  startEnrollment(deviceId: number): Observable<CardEnrollment> {
    return this.http
      .post<CardEnrollment>(`${this.baseUrl}/iot/devices/${deviceId}/enrollment`, {}, this.httpOptions)
      .pipe(
        map(raw => {
          const session = parseEnrollment(raw);

          if (!session) {
            throw new Error('El lector no devolvió una sesión de registro.');
          }

          return session;
        }),
        catchError(this.handleError)
      );
  }

  getEnrollment(deviceId: number): Observable<CardEnrollment | null> {
    return this.http
      .get<CardEnrollment | null>(`${this.baseUrl}/iot/devices/${deviceId}/enrollment`, this.httpOptions)
      .pipe(
        // 204 o cuerpo vacío significan "sin sesión de registro activa"
        switchMap(raw => of(parseEnrollment(raw))),
        catchError(this.handleError)
      );
  }

  cancelEnrollment(deviceId: number): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/iot/devices/${deviceId}/enrollment`)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    console.error(`Error en tarjetas de acceso: ${error.status} - ${error.message}`);

    const message =
      (error.error && typeof error.error === 'object' && (error.error.message ?? error.error.error)) ||
      (typeof error.error === 'string' && error.error) ||
      'No se pudo completar la operación. Inténtalo de nuevo.';

    return throwError(() => new Error(String(message)));
  }
}
