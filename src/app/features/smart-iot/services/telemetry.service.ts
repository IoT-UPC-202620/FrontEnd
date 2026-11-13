import {
  Injectable,
  inject
} from '@angular/core';

import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import {
  Observable,
  catchError,
  of
} from 'rxjs';

import { environment } from
    '../../../../environments/environment';

import {
  DeviceTelemetry,
  ReadingSeries,
  TelemetryAlert
} from '../model/telemetry.model';

@Injectable({
  providedIn: 'root'
})
export class TelemetryService {

  private readonly http =
    inject(HttpClient);

  private readonly baseUrl =
    environment.serverBaseUrl.replace(
      /\/+$/,
      ''
    );

  getDevices(buildingId?: number): Observable<DeviceTelemetry[]> {
    const url =
      `${this.baseUrl}` +
      `${environment.telemetryEndpointPath}/devices`;

    let params = new HttpParams();
    if (buildingId !== undefined) {
      params = params.set('buildingId', String(buildingId));
    }

    return this.http
      .get<DeviceTelemetry[]>(url, { params })
      .pipe(
        catchError(error => {
          console.error(
            'Error obteniendo dispositivos de telemetria:',
            error
          );

          return of([]);
        })
      );
  }

  getTemperatureSeries(
    deviceCode: string,
    from: Date,
    to: Date,
    bucket: '1h'
  ): Observable<ReadingSeries | null> {
    const url =
      `${this.baseUrl}` +
      `${environment.telemetryEndpointPath}/readings`;

    const params = new HttpParams()
      .set('deviceCode', deviceCode)
      .set('magnitude', 'TEMPERATURE')
      .set('from', from.toISOString())
      .set('to', to.toISOString())
      .set('bucket', bucket);

    return this.http
      .get<ReadingSeries>(url, { params })
      .pipe(
        catchError(error => {
          console.error(
            `Error obteniendo la serie de temperatura del dispositivo ${deviceCode}:`,
            error
          );

          return of(null);
        })
      );
  }

  getOpenAlerts(): Observable<TelemetryAlert[]> {
    const url =
      `${this.baseUrl}` +
      `${environment.telemetryEndpointPath}/alerts`;

    const params = new HttpParams()
      .set('state', 'RAISED');

    return this.http
      .get<TelemetryAlert[]>(url, { params })
      .pipe(
        catchError(error => {
          console.error(
            'Error obteniendo las alertas abiertas:',
            error
          );

          return of([]);
        })
      );
  }
}
