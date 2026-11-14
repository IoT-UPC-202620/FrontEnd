import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription, catchError, forkJoin, of, switchMap, timer } from 'rxjs';

import { SmartIotService } from '../../services/smart-iot.service';
import {
  ACCESS_REASON_LABELS,
  ALERT_KIND_LABELS,
  AccessAttempt,
  DEVICE_ORIGIN_LABELS,
  DeviceOrigin,
  ReadingPoint,
  TelemetryAlert,
  TelemetryDevice,
  TelemetryMagnitude,
  deviceOrigin
} from '../../model/telemetry.model';

interface DeviceView {
  device: TelemetryDevice;
  origin: DeviceOrigin | null;
  temperature: number | null;
  humidity: number | null;
  readingAt: string | null;
  spark: string;
}

const REFRESH_MS = 30_000;

/** Telemetria real: GET /telemetry/devices, /telemetry/readings (bucket 1h), /telemetry/alerts y /access/attempts. */
@Component({
  selector: 'app-telemetry-live-panel',
  standalone: true,
  imports: [DecimalPipe, RouterLink],
  template: `
    <div class="section-header">
      <h2>Telemetría en vivo</h2>
      <span class="activity-range">
        @if (updatedAt) { Actualizado {{ clock(updatedAt) }} · } se refresca cada 30 s
        <button type="button" class="refresh" (click)="reload()" aria-label="Actualizar">
          <span class="material-icons-outlined">refresh</span>
        </button>
      </span>
    </div>

    @if (errorMessage) {
      <div class="error-banner">{{ errorMessage }}</div>
    }

    @if (isLoading && !devices.length) {
      <div class="state-card">Cargando telemetría...</div>
    } @else {
      <div class="device-grid">
        @for (view of devices; track view.device.deviceCode) {
          <article class="device-card" [class.offline]="view.device.connectionStatus !== 'ACTIVE'">
            <header>
              <div>
                <h3>{{ view.device.name }}</h3>
                <span class="code">{{ view.device.deviceCode }}</span>
              </div>
              <span class="chips">
                @if (view.origin) {
                  <span class="origin" [attr.data-origin]="view.origin" title="Según el firmware que reporta el nodo">{{ originLabels[view.origin] }}</span>
                }
                <span class="status" [class.ok]="view.device.connectionStatus === 'ACTIVE'">
                  {{ view.device.connectionStatus === 'ACTIVE' ? 'En línea' : 'Sin conexión' }}
                </span>
              </span>
            </header>

            <div class="readings">
              <div>
                <span class="label">Temperatura</span>
                <strong>{{ view.temperature === null ? '—' : (view.temperature | number: '1.1-1') }}<small>°C</small></strong>
              </div>
              <div>
                <span class="label">Humedad</span>
                <strong>{{ view.humidity === null ? '—' : (view.humidity | number: '1.0-1') }}<small>%</small></strong>
              </div>
            </div>

            @if (view.spark) {
              <svg viewBox="0 0 240 48" preserveAspectRatio="none" role="img" aria-label="Temperatura últimas 24 horas">
                <polyline [attr.points]="view.spark" fill="none" stroke="#8A0B80" stroke-width="2" stroke-linejoin="round" />
              </svg>
              <span class="spark-caption">Temperatura · últimas 24 h (promedio por hora)</span>
            }

            <footer>
              Última lectura: {{ view.readingAt ? ago(view.readingAt) : 'sin lecturas' }}
              · heartbeat: {{ view.device.lastHeartbeatAt ? ago(view.device.lastHeartbeatAt) : '—' }}
            </footer>
          </article>
        } @empty {
          <div class="state-card">No hay dispositivos con telemetría.</div>
        }
      </div>

      <div class="two-cols">
        <section class="list-card">
          <h3>Alertas abiertas <span class="badge">{{ alerts.length }}</span></h3>
          <ul>
            @for (alert of alerts; track alert.id) {
              <li>
                <span class="material-icons-outlined warn">warning</span>
                <span class="grow"><strong>{{ alert.deviceCode }}</strong> · {{ alertLabel(alert) }}</span>
                <span class="when">{{ ago(alert.occurredAt) }}</span>
              </li>
            } @empty {
              <li class="empty">Sin alertas abiertas.</li>
            }
          </ul>
        </section>

        <section class="list-card">
          <h3>
            Últimos accesos
            <a routerLink="/app/smart-iot/access-control" class="more">Ver denegados</a>
          </h3>
          <ul>
            @for (attempt of attempts; track attempt.id) {
              <li>
                <span class="material-icons-outlined" [class.ok]="attempt.result === 'GRANTED'" [class.warn]="attempt.result === 'DENIED'">
                  {{ attempt.result === 'GRANTED' ? 'lock_open' : 'block' }}
                </span>
                <span class="grow">
                  <strong>{{ attempt.deviceCode }}</strong> · {{ attempt.rfidUidMasked ?? 'sin tarjeta' }} · {{ reasonLabel(attempt.reason) }}
                </span>
                <span class="when">{{ ago(attempt.occurredAt) }}</span>
              </li>
            } @empty {
              <li class="empty">Sin intentos de acceso.</li>
            }
          </ul>
        </section>
      </div>
    }
  `,
  styles: [`
    :host { display: block; margin-bottom: 32px; }
    .section-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
    h2 { font-size: 20px; font-weight: 800; margin: 0; }
    h3 { margin: 0; font-size: 15px; font-weight: 700; }
    .activity-range { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #847280; }
    .refresh { border: 1px solid #e8e0e6; background: #fff; border-radius: 6px; padding: 2px 4px; cursor: pointer; color: #8A0B80; display: inline-flex; }
    .refresh span { font-size: 18px; }
    .error-banner, .state-card { padding: 13px 16px; margin-bottom: 16px; border: 1px solid #e8e0e6; border-radius: 8px; background: #fff; }
    .error-banner { color: #b91c1c; background: #fef2f2; border-color: #fecaca; }
    .device-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; margin-bottom: 16px; }
    .device-grid .state-card { grid-column: 1 / -1; }
    .device-card { background: #fff; border: 1px solid #e8e0e6; border-radius: 8px; padding: 16px; display: grid; gap: 12px; }
    .device-card.offline { background: #fafafa; }
    .device-card header { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
    .code { font-family: monospace; font-size: 12px; color: #847280; }
    .chips { display: inline-flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
    .origin { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 999px; white-space: nowrap; border: 1px solid #e8e0e6; color: #5f4b5c; background: #fff; }
    .origin[data-origin='real'] { background: #dcfce7; color: #15803d; border-color: #bbf7d0; }
    .origin[data-origin='simulated'] { background: #e0f2fe; color: #0369a1; border-color: #bae6fd; }
    .origin[data-origin='seed'] { background: #fff4d6; color: #8a5a00; border-color: #f5d98b; }
    .status { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 999px; background: #fee2e2; color: #b91c1c; white-space: nowrap; }
    .status.ok { background: #dcfce7; color: #15803d; }
    .readings { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .readings div { background: #fcf1fb; border-radius: 6px; padding: 8px 10px; }
    .label { display: block; font-size: 11px; color: #847280; }
    .readings strong { font-size: 24px; font-variant-numeric: tabular-nums; }
    .readings small { font-size: 12px; margin-left: 2px; color: #847280; }
    svg { width: 100%; height: 48px; }
    .spark-caption, footer { font-size: 11px; color: #847280; }
    .two-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
    .list-card { background: #fff; border: 1px solid #e8e0e6; border-radius: 8px; padding: 16px; }
    .list-card h3 { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .badge { font-size: 11px; background: #fee2e2; color: #b91c1c; border-radius: 999px; padding: 1px 8px; }
    .more { margin-left: auto; font-size: 12px; color: #8A0B80; font-weight: 600; text-decoration: none; }
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; max-height: 320px; overflow-y: auto; }
    li { display: flex; align-items: center; gap: 8px; font-size: 13px; }
    li .material-icons-outlined { font-size: 18px; }
    .grow { flex: 1; min-width: 0; }
    .when { font-size: 11px; color: #847280; white-space: nowrap; }
    .warn { color: #b91c1c; }
    .ok { color: #15803d; }
    .empty { color: #847280; }
  `]
})
export class TelemetryLivePanel implements OnInit, OnDestroy {
  private readonly smartIotService = inject(SmartIotService);
  private subscription?: Subscription;

  devices: DeviceView[] = [];
  alerts: TelemetryAlert[] = [];
  attempts: AccessAttempt[] = [];
  isLoading = false;
  errorMessage = '';
  updatedAt: Date | null = null;
  readonly originLabels = DEVICE_ORIGIN_LABELS;
  private firmware: Record<string, string | null> = {};

  ngOnInit(): void {
    this.reload();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  reload(): void {
    this.subscription?.unsubscribe();
    this.isLoading = true;
    this.subscription = timer(0, REFRESH_MS)
      .pipe(switchMap(() => this.load()))
      .subscribe();
  }

  private load() {
    return forkJoin({
      devices: this.smartIotService.getTelemetryDevices(),
      alerts: this.smartIotService.getAlerts('RAISED'),
      attempts: this.smartIotService.getAccessAttempts(undefined, 15),
      firmware: this.smartIotService.getFirmwareByDevice().pipe(catchError(() => of({} as Record<string, string | null>)))
    }).pipe(
      switchMap(({ devices, alerts, attempts, firmware }) => {
        this.firmware = firmware;
        this.alerts = alerts;
        this.attempts = attempts;
        const sorted = [...devices].sort((a, b) => a.deviceCode.localeCompare(b.deviceCode));
        if (!sorted.length) {
          return of([] as DeviceView[]);
        }
        return forkJoin(
          sorted.map(device =>
            this.smartIotService.getReadings(device.deviceCode, 'TEMPERATURE').pipe(
              catchError(() => of(null)),
              switchMap(series => of(this.toView(device, series?.points ?? [])))
            )
          )
        );
      }),
      switchMap(views => {
        this.devices = views;
        this.errorMessage = '';
        this.isLoading = false;
        this.updatedAt = new Date();
        return of(null);
      }),
      catchError(error => {
        console.error('Error cargando telemetría:', error);
        this.errorMessage = 'No se pudo cargar la telemetría. ¿Están arriba el ApiGateway e IoT-Telemetry?';
        this.isLoading = false;
        return of(null);
      })
    );
  }

  private toView(device: TelemetryDevice, points: ReadingPoint[]): DeviceView {
    const latest = (magnitude: TelemetryMagnitude) => device.latest?.find(reading => reading.magnitude === magnitude);
    const temperature = latest('TEMPERATURE');
    const humidity = latest('HUMIDITY');
    const readingAt = [temperature?.capturedAt, humidity?.capturedAt].filter(Boolean).sort().pop() ?? null;
    return {
      device,
      origin: deviceOrigin(this.firmware[device.deviceCode]),
      temperature: temperature?.value ?? null,
      humidity: humidity?.value ?? null,
      readingAt,
      spark: this.sparkPoints(points.map(point => point.value))
    };
  }

  private sparkPoints(values: number[]): string {
    if (values.length < 2) {
      return '';
    }
    const min = Math.min(...values);
    const range = Math.max(...values) - min || 1;
    return values
      .map((value, i) => `${((i / (values.length - 1)) * 240).toFixed(1)},${(44 - ((value - min) / range) * 40).toFixed(1)}`)
      .join(' ');
  }

  alertLabel(alert: TelemetryAlert): string {
    const message = alert.details?.['message'];
    const label = ALERT_KIND_LABELS[alert.kind] ?? alert.kind;
    return typeof message === 'string' ? `${label} (${message})` : label;
  }

  reasonLabel(reason: string): string {
    return ACCESS_REASON_LABELS[reason] ?? reason;
  }

  ago(value: string): string {
    const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
    if (minutes < 1) return 'ahora';
    if (minutes < 60) return `hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 48) return `hace ${hours} h`;
    return `hace ${Math.floor(hours / 24)} d`;
  }

  clock(date: Date): string {
    return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}
