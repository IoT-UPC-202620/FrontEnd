import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ZardButtonComponent } from '@/shared/components/button';

import { AVG_TEMP, STUB_DEVICES, minutesAgoLabel } from './prototype-telemetry-data';

/**
 * PROTOTYPE — Variante B "Muro de monitoreo".
 * Fondo claro sobre tokens zard. Banner crítico + gráfico full-width + tarjetas con lectura principal.
 */
@Component({
  selector: 'app-variant-b',
  standalone: true,
  imports: [CommonModule, ZardButtonComponent],
  template: `
    <div class="grid gap-4 font-sans">
      <!-- Banner de alerta -->
      <div class="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
        <span class="material-icons grid size-6 place-items-center rounded-full bg-destructive text-sm text-background">priority_high</span>
        <p class="min-w-0 flex-1">
          <strong class="font-semibold">1 dispositivo crítico sin heartbeat.</strong>
          DHT-102 lleva 147 min sin reportar. Revisa la batería (12 %).
        </p>
        <button z-button zType="destructive" zSize="sm">Revisar dispositivo</button>
      </div>

      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p role="heading" aria-level="1" class="text-2xl font-bold tracking-tight text-foreground">Telemetría del edificio</p>
          <p class="text-sm text-muted-foreground">Torre A y Torre B · lectura de los últimos 24 h</p>
        </div>
        <p class="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span class="material-icons text-sm">schedule</span>
          Actualizado ahora
        </p>
      </header>

      <!-- Gráfico hero -->
      <figure class="rounded-lg border border-border bg-card p-5">
        <figcaption class="flex flex-wrap items-start justify-between gap-3">
          <span>
            <p role="heading" aria-level="2" class="text-base font-semibold text-foreground">Temperatura media del edificio</p>
            <p class="text-xs text-muted-foreground">Consolidado de los sensores de clima activos · bucket 1 h</p>
          </span>
          <div class="flex items-center gap-4 text-xs text-muted-foreground">
            <span class="inline-flex items-center gap-1.5"><span class="size-2.5 rounded-sm bg-foreground"></span>Temperatura</span>
            <span class="tabular-nums font-semibold text-foreground">28.2 °C máx</span>
          </div>
        </figcaption>
        <svg viewBox="0 0 900 180" preserveAspectRatio="none" class="mt-3 h-44 w-full" role="img" aria-label="Tendencia de temperatura 24 h">
          <path [attr.d]="areaPath()" fill="var(--primary)" fill-opacity="0.12" />
          <polyline fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" [attr.points]="tempPoints()" />
        </svg>
        <div class="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>Ahora</span></div>
      </figure>

      <!-- Muro de dispositivos -->
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        @for (d of devices; track d.code) {
          <article class="group flex flex-col rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-foreground/30"
                   [class.border-dashed]="d.status === 'OFFLINE'" [class.opacity-70]="d.status === 'OFFLINE'">
            <div class="flex items-center justify-between gap-2">
              <span class="material-icons rounded-md bg-muted p-1.5 text-xl text-muted-foreground">{{ iconFor(d.type) }}</span>
              <span class="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <span class="size-1.5 rounded-full" [class.bg-emerald-500]="d.status === 'ACTIVE'" [class.bg-destructive]="d.status === 'OFFLINE'"></span>
                {{ d.status === 'ACTIVE' ? 'En línea' : 'Sin conexión' }}
              </span>
            </div>
            <p role="heading" aria-level="3" class="mt-2 text-sm font-semibold leading-snug text-foreground">{{ d.name }}</p>
            <p class="text-xs text-muted-foreground">{{ d.location }}</p>
            <p class="mt-3 text-4xl font-bold tabular-nums leading-none text-foreground">
              {{ d.temperature?.toFixed(1) }}<span class="ml-0.5 align-top text-base font-semibold text-muted-foreground">°C</span>
            </p>
            <p class="mt-1 text-[11px] text-muted-foreground">{{ d.humidity }} % humedad · {{ ago(d.lastSeenMinutesAgo) }}</p>
            <svg viewBox="0 0 120 30" preserveAspectRatio="none" class="mt-2 h-8 w-full" aria-hidden="true">
              <polyline fill="none" [attr.stroke]="d.status === 'ACTIVE' ? 'var(--primary)' : 'var(--muted-foreground)'" stroke-width="1.75" stroke-linejoin="round" [attr.points]="miniPoints(d.spark)" />
            </svg>
            @if (d.battery < 20) {
              <p class="mt-2 inline-flex w-fit items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">
                <span class="material-icons text-xs">battery_alert</span>Batería {{ d.battery }} %
              </p>
            }
          </article>
        }
      </div>

      <p class="text-[10px] text-muted-foreground/70">Prototype · US44 US41 · datos stub · objetivo: lectura en menos de 3 s</p>
    </div>
  `
})
export class TelemetryVariantB {
  readonly devices = STUB_DEVICES;
  readonly ago = minutesAgoLabel;

  iconFor(type: string): string {
    return { DOOR: 'sensor_door', CLIMATE: 'thermostat', LIGHT: 'lightbulb', VALVE: 'water_drop' }[type] ?? 'sensors';
  }

  tempPoints(): string {
    const data = AVG_TEMP, min = Math.min(...data), max = Math.max(...data), range = (max - min) || 1;
    return data.map((v, i) => `${((i / (data.length - 1)) * 900).toFixed(1)},${(170 - ((v - min) / range) * 145).toFixed(1)}`).join(' ');
  }

  areaPath(): string {
    const pts = this.tempPoints().split(' ');
    return `M ${pts[0]} L ${pts.join(' L ')} L 900,180 L 0,180 Z`;
  }

  miniPoints(data: number[]): string {
    const min = Math.min(...data), max = Math.max(...data), range = (max - min) || 1;
    return data.map((v, i) => `${((i / (data.length - 1)) * 120).toFixed(1)},${(27 - ((v - min) / range) * 23).toFixed(1)}`).join(' ');
  }
}
