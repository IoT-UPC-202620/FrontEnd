import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ZardButtonComponent } from '@/shared/components/button';

import { STUB_ALERTS, STUB_DEVICES, STUB_EVENTS, minutesAgoLabel } from './prototype-telemetry-data';

/**
 * PROTOTYPE — Variante A "Sala de control".
 * Consola clara sobre los tokens zard en modo light. Master table + detalle.
 */
@Component({
  selector: 'app-variant-a',
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
          <button type="button" class="inline-flex h-7 items-center rounded-md border border-foreground bg-foreground px-3 text-[0.8rem] font-medium text-background transition-colors hover:opacity-90">Todas las torres</button>
          <button z-button zType="ghost" zSize="sm">Torre A</button>
          <button z-button zType="ghost" zSize="sm">Torre B</button>
          <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-success">
            <span class="size-2 rounded-full bg-success animate-pulse" aria-hidden="true"></span>
            En vivo
          </span>
          <button z-button zType="outline" zSize="icon-sm" aria-label="Actualizar">
            <span class="material-icons text-[18px]">refresh</span>
          </button>
        </div>
      </div>

      <!-- KPIs -->
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        @for (kpi of kpis; track kpi.label) {
          <div class="rounded-lg border border-border bg-card p-4">
            <p class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{{ kpi.label }}</p>
            <p class="mt-1 text-3xl font-bold leading-none tabular-nums" [class.text-destructive]="kpi.alert">
              {{ kpi.value }}<span class="ml-1 text-sm font-semibold text-muted-foreground">{{ kpi.suffix }}</span>
            </p>
            <p class="mt-2 text-xs text-muted-foreground"
               [class.text-success]="kpi.trend === 'up'" [class.font-medium]="kpi.trend === 'up'"
               [class.text-warning]="kpi.trend === 'warn' && !kpi.alert" [class.font-medium]="kpi.trend === 'warn' && !kpi.alert"
               [class.text-destructive]="kpi.alert" [class.font-semibold]="kpi.alert">{{ kpi.foot }}</p>
          </div>
        }
      </div>

      <div class="grid items-start gap-4 xl:grid-cols-[1fr_360px]">
        <!-- Master -->
        <section class="rounded-lg border border-border bg-card">
          <header class="flex items-baseline justify-between border-b border-border px-4 py-3">
            <p role="heading" aria-level="2" class="text-xs font-semibold text-muted-foreground">Dispositivos <span class="text-muted-foreground/70">· 8 registrados</span></p>
            <button z-button zType="ghost" zSize="sm">Ver todos</button>
          </header>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="text-left text-[10px] tracking-wide text-muted-foreground">
                <tr>
                  <th class="px-4 py-2 font-semibold">Código</th>
                  <th class="px-2 py-2 font-semibold">Ubicación</th>
                  <th class="px-2 py-2 font-semibold">Estado</th>
                  <th class="px-2 py-2 font-semibold">Temp</th>
                  <th class="px-2 py-2 font-semibold">Hum</th>
                  <th class="px-2 py-2 font-semibold">Bat</th>
                  <th class="px-4 py-2 font-semibold">Señal</th>
                </tr>
              </thead>
              <tbody>
                @for (d of devices; track d.code) {
                  <tr class="border-t border-border transition-colors hover:bg-muted/60"
                      [class.bg-muted]="d.code === selectedCode">
                    <td class="px-4 py-2 font-mono text-xs font-semibold text-foreground"
                        [style.box-shadow]="d.code === selectedCode ? 'inset 4px 0 0 0 var(--foreground)' : null">{{ d.code }}</td>
                    <td class="px-2 py-2 text-muted-foreground" [class.opacity-70]="d.status === 'OFFLINE'">{{ d.location }}</td>
                    <td class="px-2 py-2">
                      @if (d.status === 'ACTIVE') {
                        <span class="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground">
                          <span class="size-1.5 rounded-full bg-success" aria-hidden="true"></span>
                          {{ d.status }}
                        </span>
                      } @else {
                        <span class="inline-flex items-center rounded-md bg-destructive px-2 py-0.5 text-[10px] font-semibold text-destructive-foreground">
                          {{ d.status }}
                        </span>
                      }
                    </td>
                    <td class="px-2 py-2 tabular-nums" [class.opacity-70]="d.status === 'OFFLINE'">{{ d.temperature?.toFixed(1) }}°</td>
                    <td class="px-2 py-2 tabular-nums" [class.opacity-70]="d.status === 'OFFLINE'">{{ d.humidity }}%</td>
                    <td class="px-2 py-2 tabular-nums" [class.text-warning]="d.battery < 20" [class.font-semibold]="d.battery < 20">{{ d.battery }}%</td>
                    <td class="px-4 py-2 tabular-nums text-muted-foreground">{{ d.rssi }} dBm</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <header class="flex items-baseline justify-between border-t border-border px-4 py-3">
            <p role="heading" aria-level="2" class="text-xs font-semibold text-muted-foreground">Últimos eventos <span class="text-muted-foreground/70">· bitácora</span></p>
          </header>
          <ul class="grid gap-1 px-2 pb-3">
            @for (e of events; track e.id) {
              <li class="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/60">
                <span class="material-icons text-base text-muted-foreground" [class.text-destructive]="e.kind === 'alert'" [class.text-success]="e.kind === 'recovery'" [class.text-warning]="e.kind === 'access'">{{ iconFor(e.kind) }}</span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-xs font-semibold">{{ e.title }}</span>
                  <span class="block truncate text-[11px] text-muted-foreground">{{ e.detail }}</span>
                </span>
                <span class="shrink-0 text-[10px] text-muted-foreground">{{ ago(e.minutesAgo) }}</span>
              </li>
            }
          </ul>
        </section>

        <!-- Detalle -->
        <aside class="grid gap-4 rounded-lg border border-border bg-card p-4">
          <div class="flex items-center gap-3">
            <span class="grid size-11 place-items-center rounded-lg bg-foreground text-background">
              <span class="material-icons text-2xl">sensor_door</span>
            </span>
            <div class="min-w-0">
              <p role="heading" aria-level="2" class="flex items-center gap-2 text-sm font-semibold leading-tight">
                Puerta principal torre A
                <span class="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">DOOR-001</span>
              </p>
              <p class="mt-1 text-[11px] text-muted-foreground">Hall · Torre A · firmware 1.4.2 · heartbeat hace 1 min</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-md border border-border bg-muted p-3">
              <p class="text-[10px] font-medium text-muted-foreground">Temperatura</p>
              <p class="mt-1 text-3xl font-bold leading-none tabular-nums">24.3<span class="ml-0.5 text-sm font-semibold text-muted-foreground">°C</span></p>
            </div>
            <div class="rounded-md border border-border bg-muted p-3">
              <p class="text-[10px] font-medium text-muted-foreground">Humedad</p>
              <p class="mt-1 text-3xl font-bold leading-none tabular-nums">57<span class="ml-0.5 text-sm font-semibold text-muted-foreground">%RH</span></p>
            </div>
          </div>

          <figure class="rounded-md border border-border bg-muted p-3">
            <figcaption class="mb-1 flex items-baseline justify-between text-[10px] text-muted-foreground">
              <span>Últimas 24 horas</span>
              <span>cada hora</span>
            </figcaption>
            <svg viewBox="0 0 320 80" class="h-20 w-full" preserveAspectRatio="none" role="img" aria-label="Tendencia de temperatura">
              <polyline fill="none" stroke="var(--primary)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" [attr.points]="sparkPoints()" />
              <line x1="0" y1="74" x2="320" y2="74" stroke="var(--border)" stroke-width="1" />
            </svg>
            <div class="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>Hace 24 h</span><span>Ahora</span></div>
          </figure>

          <dl class="grid gap-2 text-xs">
            <div class="grid grid-cols-[64px_1fr_56px] items-center gap-2">
              <dt class="text-muted-foreground">Batería</dt>
              <dd class="h-1.5 overflow-hidden rounded-full bg-muted"><div class="h-full rounded-full bg-foreground" style="width:82%"></div></dd>
              <dd class="text-right tabular-nums">82 %</dd>
            </div>
            <div class="grid grid-cols-[64px_1fr_56px] items-center gap-2">
              <dt class="text-muted-foreground">Señal</dt>
              <dd class="h-1.5 overflow-hidden rounded-full bg-muted"><div class="h-full rounded-full bg-foreground" style="width:64%"></div></dd>
              <dd class="text-right tabular-nums">-61 dBm</dd>
            </div>
          </dl>

          <section>
            <p role="heading" aria-level="2" class="mb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground">
              Alertas abiertas
              <span class="rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">{{ alerts.length }}</span>
            </p>
            <ul class="grid gap-1.5">
              @for (al of alerts; track al.id) {
                <li class="flex items-start gap-2 rounded-md border-l-2 py-1.5 pl-2 text-xs"
                    [class.border-destructive]="al.severity === 'critica'" [class.border-warning]="al.severity !== 'critica'"
                    [class.bg-destructive/5]="al.severity === 'critica'" [class.bg-warning/10]="al.severity !== 'critica'">
                  <span class="material-icons mt-0.5 text-sm" [class.text-destructive]="al.severity === 'critica'" [class.text-warning]="al.severity !== 'critica'">warning</span>
                  <span class="min-w-0">
                    <span class="font-semibold">{{ al.deviceCode }}</span> · {{ al.message }}
                    <span class="block text-[10px] text-muted-foreground">{{ ago(al.minutesAgo) }}</span>
                  </span>
                </li>
              }
            </ul>
          </section>

          <p class="border-t border-border pt-2 text-[10px] text-muted-foreground">Prototype · US44 US41 US42 US34 · datos stub</p>
        </aside>
      </div>
    </div>
  `
})
export class TelemetryVariantA {
  readonly devices = STUB_DEVICES;
  readonly alerts = STUB_ALERTS;
  readonly events = STUB_EVENTS.slice(0, 6);
  readonly ago = minutesAgoLabel;
  readonly selectedCode = 'DOOR-001';

  readonly kpis = [
    { label: 'Dispositivos en línea', value: '6', suffix: '/ 8', foot: '+2 vs ayer', trend: 'up' as const, alert: false },
    { label: 'Alertas abiertas', value: '3', suffix: '', foot: '1 crítica sin asignar', trend: 'warn' as const, alert: true },
    { label: 'Temp. media', value: '24.6', suffix: '°C', foot: '+1.3° vs 07:00', trend: 'up' as const, alert: false },
    { label: 'Humedad media', value: '54.1', suffix: '%RH', foot: '-4.2 % vs 07:00', trend: 'down' as const, alert: false },
  ];

  sparkPoints(): string {
    const data = STUB_DEVICES[0].spark;
    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    return data.map((v, i) => `${((i / (data.length - 1)) * 320).toFixed(1)},${(74 - ((v - min) / range) * 62).toFixed(1)}`).join(' ');
  }

  iconFor(kind: string): string {
    return { heartbeat: 'sensors', access: 'badge', alert: 'warning', command: 'bolt', recovery: 'restart_alt' }[kind] ?? 'circle';
  }
}
