import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, delay, forkJoin, map, of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  AccessDeniedEvent,
  IrrigationEvent,
  LightingEvent,
  SmartIotData,
  SmartIotDashboardData,
  SmartIotEvent,
  SmartIotSummaryCard
} from '../model/smart-iot.model';
import {
  ACCESS_REASON_LABELS,
  AccessAttempt,
  ReadingSeries,
  TelemetryAlert,
  TelemetryDevice,
  TelemetryMagnitude
} from '../model/telemetry.model';

interface UserSummary { id: number; fullName: string }

/**
 * Accesos y telemetria vienen del backend (ApiGateway -> IoT-Access / IoT-Telemetry).
 * Iluminacion y riego siguen con datos de demostracion: el backend solo modela puertas.
 */
@Injectable({
  providedIn: 'root'
})
export class SmartIotService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.serverBaseUrl.replace(/\/+$/, '');

  // ---- Telemetria (IoT-Telemetry) ----

  getTelemetryDevices(buildingId?: number): Observable<TelemetryDevice[]> {
    const params = buildingId ? new HttpParams().set('buildingId', buildingId) : undefined;
    return this.http.get<TelemetryDevice[]>(`${this.baseUrl}${environment.telemetryDevicesEndpointPath}`, { params });
  }

  getLatest(deviceCode: string): Observable<TelemetryDevice> {
    return this.http.get<TelemetryDevice>(
      `${this.baseUrl}${environment.telemetryDevicesEndpointPath}/${encodeURIComponent(deviceCode)}/latest`
    );
  }

  /** Serie agregada por hora (el bucket "raw" del backend esta limitado a 24 h). */
  getReadings(deviceCode: string, magnitude: TelemetryMagnitude, hours = 24, bucket = '1h'): Observable<ReadingSeries> {
    const params = new HttpParams()
      .set('deviceCode', deviceCode)
      .set('magnitude', magnitude)
      .set('from', new Date(Date.now() - hours * 3600_000).toISOString())
      .set('bucket', bucket);
    return this.http.get<ReadingSeries>(`${this.baseUrl}${environment.telemetryReadingsEndpointPath}`, { params });
  }

  getAlerts(state?: 'RAISED' | 'CLEARED'): Observable<TelemetryAlert[]> {
    const params = state ? new HttpParams().set('state', state) : undefined;
    return this.http.get<TelemetryAlert[]>(`${this.baseUrl}${environment.telemetryAlertsEndpointPath}`, { params });
  }

  /** Firmware por codigo de dispositivo (GET /iot/devices): de ahi sale el origen Seed / Simulado / Real. */
  getFirmwareByDevice(): Observable<Record<string, string | null>> {
    return this.http
      .get<Array<{ deviceCode: string; firmwareVersion: string | null }>>(`${this.baseUrl}${environment.iotDevicesEndpointPath}`)
      .pipe(map(devices => Object.fromEntries(devices.map(d => [d.deviceCode, d.firmwareVersion]))));
  }

  // ---- Bitacora de accesos (IoT-Access) ----

  getAccessAttempts(result?: 'GRANTED' | 'DENIED', limit = 100): Observable<AccessAttempt[]> {
    let params = new HttpParams().set('limit', limit);
    if (result) {
      params = params.set('result', result);
    }
    return this.http.get<AccessAttempt[]>(`${this.baseUrl}${environment.accessAttemptsEndpointPath}`, { params });
  }

  getAccessDeniedEvents(): Observable<AccessDeniedEvent[]> {
    return forkJoin({
      attempts: this.getAccessAttempts('DENIED'),
      users: this.http
        .get<UserSummary[]>(`${this.baseUrl}${environment.userEndpointPath}`)
        .pipe(catchError(() => of([] as UserSummary[])))
    }).pipe(
      map(({ attempts, users }) => {
        const names = new Map(users.map(user => [user.id, user.fullName]));
        return this.sortEvents(attempts.map(attempt => this.toDeniedEvent(attempt, names)));
      })
    );
  }

  private toDeniedEvent(attempt: AccessAttempt, names: Map<number, string>): AccessDeniedEvent {
    const card = attempt.rfidUidMasked ? `Tarjeta ${attempt.rfidUidMasked}` : 'Tarjeta desconocida';
    const user = attempt.userId != null ? names.get(attempt.userId) ?? `Usuario #${attempt.userId}` : card;
    return {
      id: `attempt-${attempt.id}`,
      type: 'access-control',
      user,
      reason: ACCESS_REASON_LABELS[attempt.reason] ?? attempt.reason,
      device: attempt.deviceCode,
      occurredAt: attempt.occurredAt
    };
  }

  // ---- Resumen SmartIOT ----

  getSmartIotData(): Observable<SmartIotData> {
    const lighting = this.sortEvents(this.lightingEvents);
    const irrigation = this.sortEvents(this.irrigationEvents);

    return this.getAccessDeniedEvents().pipe(
      map(accessDenied => ({
        isDemo: false,
        lighting,
        accessDenied,
        irrigation,
        activityFrom: this.earliest(accessDenied),
        activityTo: this.latest(accessDenied)
      }))
    );
  }

  getDashboard(): Observable<SmartIotDashboardData> {
    return this.getSmartIotData().pipe(
      map(data => ({
        cards: this.buildSummaryCards(data),
        activityFrom: data.activityFrom,
        activityTo: data.activityTo
      }))
    );
  }

  private buildSummaryCards(data: SmartIotData): SmartIotSummaryCard[] {
    return [
      {
        type: 'lighting',
        icon: 'lightbulb',
        title: 'Iluminaria',
        description: 'Sensores que encienden las luces en las zonas comunes.',
        metricLabel: 'encendidos registrados',
        count: data.lighting.length,
        route: '/app/smart-iot/lighting',
        demo: true,
        lastEvent: data.lighting[0] ?? null
      },
      {
        type: 'access-control',
        icon: 'lock',
        title: 'Control de accesos',
        description: 'Cerradura inteligente y registro de usuarios con acceso denegado.',
        metricLabel: 'accesos denegados',
        count: data.accessDenied.length,
        route: '/app/smart-iot/access-control',
        demo: false,
        lastEvent: data.accessDenied[0] ?? null
      },
      {
        type: 'irrigation',
        icon: 'water_drop',
        title: 'Riego automático',
        description: 'Riego de plantas y activación de regadores en áreas verdes.',
        metricLabel: 'activaciones registradas',
        count: data.irrigation.length,
        route: '/app/smart-iot/irrigation',
        demo: true,
        lastEvent: data.irrigation[0] ?? null
      }
    ];
  }

  /** Demo: no hay luminarias en el backend. */
  getLightingEvents(): Observable<LightingEvent[]> {
    return of(this.sortEvents(this.lightingEvents)).pipe(delay(250));
  }

  /** Demo: no hay regadores en el backend. */
  getIrrigationEvents(): Observable<IrrigationEvent[]> {
    return of(this.sortEvents(this.irrigationEvents)).pipe(delay(250));
  }

  private sortEvents<T extends SmartIotEvent>(events: T[]): T[] {
    return [...events].sort(
      (first, second) =>
        new Date(second.occurredAt).getTime() - new Date(first.occurredAt).getTime()
    );
  }

  private earliest(events: SmartIotEvent[]): Date | null {
    if (events.length === 0) {
      return null;
    }

    return new Date(Math.min(...events.map(event => new Date(event.occurredAt).getTime())));
  }

  private latest(events: SmartIotEvent[]): Date | null {
    if (events.length === 0) {
      return null;
    }

    return new Date(Math.max(...events.map(event => new Date(event.occurredAt).getTime())));
  }

  private readonly lightingEvents: LightingEvent[] = [
    {
      id: 'light-1',
      type: 'lighting',
      zone: 'Vestíbulo torre A',
      device: 'Foco 018',
      occurredAt: '2026-10-09T08:42:00'
    },
    {
      id: 'light-2',
      type: 'lighting',
      zone: 'Pasillo - Piso 2',
      device: 'Foco 024',
      occurredAt: '2026-10-09T08:15:00'
    },
    {
      id: 'light-3',
      type: 'lighting',
      zone: 'Estacionamiento',
      device: 'Foco 006',
      occurredAt: '2026-10-09T07:58:00'
    },
    {
      id: 'light-4',
      type: 'lighting',
      zone: 'Escaleras torre B',
      device: 'Foco 032',
      occurredAt: '2026-10-09T07:30:00'
    },
    {
      id: 'light-5',
      type: 'lighting',
      zone: 'Estacionamiento',
      device: 'Foco 011',
      occurredAt: '2026-10-08T20:15:00'
    },
    {
      id: 'light-6',
      type: 'lighting',
      zone: 'Vestíbulo torre B',
      device: 'Foco 041',
      occurredAt: '2026-10-08T19:48:00'
    },
    {
      id: 'light-7',
      type: 'lighting',
      zone: 'Escaleras torre A',
      device: 'Foco 027',
      occurredAt: '2026-10-08T18:30:00'
    },
    {
      id: 'light-8',
      type: 'lighting',
      zone: 'Pasillo - Piso 1',
      device: 'Foco 003',
      occurredAt: '2026-10-08T17:05:00'
    }
  ];

  private readonly irrigationEvents: IrrigationEvent[] = [
    {
      id: 'irrigation-1',
      type: 'irrigation',
      sprinkler: 'Regador R-03',
      zone: 'Jardín central',
      occurredAt: '2026-10-09T06:30:00'
    },
    {
      id: 'irrigation-2',
      type: 'irrigation',
      sprinkler: 'Regador R-02',
      zone: 'Jardín torre B',
      occurredAt: '2026-10-09T06:15:00'
    },
    {
      id: 'irrigation-3',
      type: 'irrigation',
      sprinkler: 'Regador R-01',
      zone: 'Jardín torre A',
      occurredAt: '2026-10-09T06:00:00'
    },
    {
      id: 'irrigation-4',
      type: 'irrigation',
      sprinkler: 'Regador R-04',
      zone: 'Jardineras de acceso',
      occurredAt: '2026-10-09T05:45:00'
    },
    {
      id: 'irrigation-5',
      type: 'irrigation',
      sprinkler: 'Regador R-05',
      zone: 'Jardín de entrada',
      occurredAt: '2026-10-08T18:00:00'
    },
    {
      id: 'irrigation-6',
      type: 'irrigation',
      sprinkler: 'Regador R-01',
      zone: 'Jardín torre A',
      occurredAt: '2026-10-08T06:05:00'
    },
    {
      id: 'irrigation-7',
      type: 'irrigation',
      sprinkler: 'Regador R-03',
      zone: 'Jardín central',
      occurredAt: '2026-10-08T05:50:00'
    },
    {
      id: 'irrigation-8',
      type: 'irrigation',
      sprinkler: 'Regador R-06',
      zone: 'Área de picnic',
      occurredAt: '2026-10-08T05:35:00'
    }
  ];
}
