import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ZardButtonComponent } from '@/shared/components/button';

import { forkJoin } from 'rxjs';

import { DeviceTelemetry, TelemetryAlert } from '../../model/telemetry.model';
import { TelemetryService } from '../../services/telemetry.service';

@Component({
  selector: 'app-iot-telemetry-dashboard',
  standalone: true,
  imports: [CommonModule, ZardButtonComponent],
  template: `
    <div class="grid min-h-[780px] gap-4 rounded-lg bg-background p-4 text-foreground">
      <!-- Topbar -->
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <nav class="text-xs font-medium tracking-wide text-muted-foreground" aria-label="Migas de pan">
          Administración <span class="mx-1 text-border">/</span> SmartIOT <span class="mx-1 text-border">/</span> Telemetría
        </nav>
        <div class="flex flex-wrap items-center gap-2">
          <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-success">
            <span class="size-2 rounded-full bg-success animate-pulse" aria-hidden="true"></span>
            En vivo
          </span>
          <button z-button zType="outline" zSize="icon-sm" aria-label="Actualizar" (click)="loadData()">
            <span class="material-icons text-[18px]">refresh</span>
          </button>
        </div>
      </div>

      @if (errorMessage) {
        <div role="alert" class="rounded-md border border-destructive bg-destructive/10 px-4 py-2 text-xs font-medium text-destructive">
          {{ errorMessage }}
        </div>
      }

      @if (loading) {
        <p class="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">Cargando telemetría…</p>
      } @else if (devices.length === 0) {
        <p class="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">Sin dispositivos registrados.</p>
      } @else {
        <!-- KPIs -->
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
          @for (kpi of kpis; track kpi.label) {
            <div class="rounded-lg border border-border bg-card p-4">
              <p class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{{ kpi.label }}</p>
              <p class="mt-1 text-3xl font-bold leading-none tabular-nums" [class.text-destructive]="kpi.alert">
                {{ kpi.value }}<span class="ml-1 text-sm font-semibold text-muted-foreground">{{ kpi.suffix }}</span>
              </p>
              <p class="mt-2 text-xs text-muted-foreground"
                 [class.text-warning]="kpi.trend === 'warn' && !kpi.alert" [class.font-medium]="kpi.trend === 'warn' && !kpi.alert"
                 [class.text-destructive]="kpi.alert" [class.font-semibold]="kpi.alert">{{ kpi.foot }}</p>
            </div>
          }
        </div>

        <div class="grid items-start gap-4 xl:grid-cols-[1fr_360px]">
          <!-- Master -->
          <section class="rounded-lg border border-border bg-card">
            <header class="flex items-baseline justify-between border-b border-border px-4 py-3">
              <p role="heading" aria-level="2" class="text-xs font-semibold text-muted-foreground">Dispositivos <span class="text-muted-foreground/70">· {{ devices.length }} registrados</span></p>
            </header>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="text-left text-[10px] tracking-wide text-muted-foreground">
                  <tr>
                    <th class="px-4 py-2 font-semibold">Código</th>
                    <th class="px-2 py-2 font-semibold">Estado</th>
                    <th class="px-2 py-2 font-semibold">Temp</th>
                    <th class="px-2 py-2 font-semibold">Hum</th>
                    <th class="px-4 py-2 font-semibold">Último heartbeat</th>
                  </tr>
                </thead>
                <tbody>
                  @for (d of devices; track d.deviceCode) {
                    <tr class="cursor-pointer border-t border-border transition-colors hover:bg-muted/60"
                        [class.bg-muted]="d.deviceCode === selectedCode"
                        (click)="selectDevice(d)">
                      <td class="px-4 py-2 font-mono text-xs font-semibold text-foreground"
                          [style.box-shadow]="d.deviceCode === selectedCode ? 'inset 4px 0 0 0 var(--foreground)' : null">{{ d.deviceCode }}</td>
                      <td class="px-2 py-2">
                        @if (d.connectionStatus === 'ACTIVE') {
                          <span class="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground">
                            <span class="size-1.5 rounded-full bg-success" aria-hidden="true"></span>
                            {{ d.connectionStatus }}
                          </span>
                        } @else {
                          <span class="inline-flex items-center rounded-md bg-destructive px-2 py-0.5 text-[10px] font-semibold text-destructive-foreground">
                            {{ d.connectionStatus }}
                          </span>
                        }
                      </td>
                      <td class="px-2 py-2 tabular-nums" [class.opacity-70]="d.connectionStatus === 'OFFLINE'">{{ temperatureOf(d) !== null ? temperatureOf(d)!.toFixed(1) + '°' : '—' }}</td>
                      <td class="px-2 py-2 tabular-nums" [class.opacity-70]="d.connectionStatus === 'OFFLINE'">{{ humidityOf(d) !== null ? humidityOf(d) + '%' : '—' }}</td>
                      <td class="px-4 py-2 tabular-nums text-muted-foreground">{{ d.lastHeartbeatAt ? minutesAgo(d.lastHeartbeatAt) : '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>

          <!-- Detalle -->
          <aside class="grid gap-4 rounded-lg border border-border bg-card p-4">
            @if (selectedDevice) {
              <div class="flex items-center gap-3">
                <span class="grid size-11 place-items-center rounded-lg bg-foreground text-background">
                  <span class="material-icons text-2xl">sensor_door</span>
                </span>
                <div class="min-w-0">
                  <p role="heading" aria-level="2" class="flex items-center gap-2 text-sm font-semibold leading-tight">
                    {{ selectedDevice.name }}
                    <span class="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">{{ selectedDevice.deviceCode }}</span>
                  </p>
                  <p class="mt-1 text-[11px] text-muted-foreground">Edificio {{ selectedDevice.buildingId }} · {{ selectedDevice.connectionStatus }} · heartbeat {{ selectedDevice.lastHeartbeatAt ? minutesAgo(selectedDevice.lastHeartbeatAt) : '—' }}</p>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="rounded-md border border-border bg-muted p-3">
                  <p class="text-[10px] font-medium text-muted-foreground">Temperatura</p>
                  <p class="mt-1 text-3xl font-bold leading-none tabular-nums">{{ temperatureOf(selectedDevice) !== null ? temperatureOf(selectedDevice)!.toFixed(1) : '—' }}<span class="ml-0.5 text-sm font-semibold text-muted-foreground">°C</span></p>
                </div>
                <div class="rounded-md border border-border bg-muted p-3">
                  <p class="text-[10px] font-medium text-muted-foreground">Humedad</p>
                  <p class="mt-1 text-3xl font-bold leading-none tabular-nums">{{ humidityOf(selectedDevice) !== null ? humidityOf(selectedDevice) : '—' }}<span class="ml-0.5 text-sm font-semibold text-muted-foreground">%RH</span></p>
                </div>
              </div>

              <figure class="rounded-md border border-border bg-muted p-3">
                <figcaption class="mb-1 flex items-baseline justify-between text-[10px] text-muted-foreground">
                  <span>Últimas 24 horas</span>
                  <span>cada hora</span>
                </figcaption>
                @if (seriesLoading) {
                  <p class="py-6 text-center text-[11px] text-muted-foreground">Cargando serie…</p>
                } @else if (spark.length > 0) {
                  <svg viewBox="0 0 320 80" class="h-20 w-full" preserveAspectRatio="none" role="img" aria-label="Tendencia de temperatura">
                    <polyline fill="none" stroke="var(--primary)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" [attr.points]="sparkPoints()" />
                    <line x1="0" y1="74" x2="320" y2="74" stroke="var(--border)" stroke-width="1" />
                  </svg>
                } @else {
                  <svg viewBox="0 0 320 80" class="h-20 w-full" preserveAspectRatio="none" role="img" aria-label="Tendencia de temperatura">
                    <line x1="0" y1="74" x2="320" y2="74" stroke="var(--border)" stroke-width="1" />
                  </svg>
                }
                <div class="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>Hace 24 h</span><span>Ahora</span></div>
              </figure>
            }

            <section>
              <p role="heading" aria-level="2" class="mb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                Alertas abiertas
                <span class="rounded-md bg-warning/10 px-1.5 py-0.5 text-[10px] font-bold text-warning">{{ openAlerts.length }}</span>
              </p>
              <ul class="grid gap-1.5">
                @for (al of openAlerts.slice(0, 4); track al.id) {
                  <li class="flex items-start gap-2 rounded-md border-l-2 border-warning bg-warning/10 py-1.5 pl-2 text-xs">
                    <span class="material-icons mt-0.5 text-sm text-warning">warning</span>
                    <span class="min-w-0">
                      <span class="font-semibold">{{ al.deviceCode }}</span> · {{ al.kind }}
                      <span class="block text-[10px] text-muted-foreground">{{ minutesAgo(al.occurredAt) }}</span>
                    </span>
                  </li>
                } @empty {
                  <li class="rounded-md px-2 py-1.5 text-xs text-muted-foreground">Sin alertas abiertas.</li>
                }
              </ul>
            </section>

            <p class="border-t border-border pt-2 text-[10px] text-muted-foreground">Telemetría en vivo · /api/v1/telemetry</p>
          </aside>
        </div>
      }
    </div>
  `
})
export class IotTelemetryDashboard implements OnInit {
  private readonly telemetry = inject(TelemetryService);

  devices: DeviceTelemetry[] = [];
  openAlerts: TelemetryAlert[] = [];
  loading = true;
  errorMessage = '';
  selectedDevice: DeviceTelemetry | null = null;
  spark: number[] = [];
  seriesLoading = false;

  kpis: { label: string; value: string; suffix: string; foot: string; trend: string; alert: boolean }[] = [];

  get selectedCode(): string | null {
    return this.selectedDevice?.deviceCode ?? null;
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      devices: this.telemetry.getDevices(),
      alerts: this.telemetry.getOpenAlerts()
    }).subscribe({
      next: ({ devices, alerts }) => {
        this.devices = devices;
        this.openAlerts = alerts;
        this.selectedDevice =
          devices.find(d => d.connectionStatus === 'ACTIVE') ?? devices[0] ?? null;
        this.kpis = this.buildKpis();
        this.loading = false;
        this.loadSparkline();
      },
      error: () => {
        this.errorMessage = 'No se pudo cargar la telemetría. Inténtalo de nuevo.';
        this.loading = false;
      }
    });
  }

  selectDevice(device: DeviceTelemetry): void {
    this.selectedDevice = device;
    this.loadSparkline();
  }

  private loadSparkline(): void {
    const device = this.selectedDevice;
    if (!device) {
      this.spark = [];
      return;
    }

    this.seriesLoading = true;
    const to = new Date();
    const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);

    this.telemetry.getTemperatureSeries(device.deviceCode, from, to, '1h').subscribe(series => {
      this.spark = series?.points?.map(p => p.value) ?? [];
      this.seriesLoading = false;
    });
  }

  temperatureOf(device: DeviceTelemetry): number | null {
    return device.latest?.find(r => r.magnitude === 'TEMPERATURE')?.value ?? null;
  }

  humidityOf(device: DeviceTelemetry): number | null {
    return device.latest?.find(r => r.magnitude === 'HUMIDITY')?.value ?? null;
  }

  minutesAgo(iso: string): string {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) {
      return '—';
    }
    const minutes = Math.max(0, Math.floor((Date.now() - then) / 60000));
    if (minutes < 1) return 'ahora';
    if (minutes < 60) return `hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours} h`;
    const days = Math.floor(hours / 24);
    return `hace ${days} d`;
  }

  sparkPoints(): string {
    if (this.spark.length === 0) {
      return '';
    }
    const min = Math.min(...this.spark), max = Math.max(...this.spark);
    const range = max - min || 1;
    const denominator = Math.max(this.spark.length - 1, 1);
    return this.spark.map((v, i) => `${((i / denominator) * 320).toFixed(1)},${(74 - ((v - min) / range) * 62).toFixed(1)}`).join(' ');
  }

  private buildKpis() {
    const total = this.devices.length;
    const active = this.devices.filter(d => d.connectionStatus === 'ACTIVE').length;

    const temps = this.devices
      .map(d => this.temperatureOf(d))
      .filter((v): v is number => v !== null);
    const hums = this.devices
      .map(d => this.humidityOf(d))
      .filter((v): v is number => v !== null);

    const mean = (values: number[]): string =>
      values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : '—';

    return [
      { label: 'Dispositivos en línea', value: `${active}`, suffix: `/ ${total}`, foot: `${total - active} offline`, trend: '', alert: false },
      { label: 'Alertas abiertas', value: `${this.openAlerts.length}`, suffix: '', foot: 'estado RAISED', trend: 'warn', alert: this.openAlerts.length > 0 },
      { label: 'Temp. media', value: mean(temps), suffix: '°C', foot: 'media actual', trend: '', alert: false },
      { label: 'Humedad media', value: mean(hums), suffix: '%RH', foot: 'media actual', trend: '', alert: false },
    ];
  }
}
