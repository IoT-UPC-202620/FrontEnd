import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ZardButtonComponent } from '@/shared/components/button';

import { STUB_DEVICES, STUB_EVENTS, minutesAgoLabel } from './prototype-telemetry-data';

/**
 * PROTOTYPE — Variante C "Bitácora de eventos".
 * Filtros laterales + línea de tiempo vertical. Pensada para auditoría, no para wallboard.
 */
@Component({
  selector: 'app-variant-c',
  standalone: true,
  imports: [CommonModule, FormsModule, ZardButtonComponent],
  template: `
    <div class="grid gap-4 lg:grid-cols-[260px_1fr] items-start">
      <!-- Rail de filtros -->
      <aside class="grid gap-5 rounded-lg border border-border bg-card p-4 text-sm">
        <section class="grid gap-1">
          <p role="heading" aria-level="2" class="text-[10px] font-semibold text-muted-foreground">Edificio</p>
          <label class="mt-1 flex items-center gap-2 rounded-md px-1 py-1.5 hover:bg-muted/40"><input type="checkbox" class="accent-[var(--primary)]" checked>Todas las torres <span class="ml-auto tabular-nums text-muted-foreground">8</span></label>
          <label class="flex items-center gap-2 rounded-md px-1 py-1.5 hover:bg-muted/40"><input type="checkbox" class="accent-[var(--primary)]">Torre A <span class="ml-auto tabular-nums text-muted-foreground">5</span></label>
          <label class="flex items-center gap-2 rounded-md px-1 py-1.5 hover:bg-muted/40"><input type="checkbox" class="accent-[var(--primary)]">Torre B <span class="ml-auto tabular-nums text-muted-foreground">3</span></label>
        </section>

        <section class="grid gap-1 border-t border-border pt-4">
          <p role="heading" aria-level="2" class="text-[10px] font-semibold text-muted-foreground">Tipo de evento</p>
          @for (t of eventTypes; track t.label) {
            <label class="mt-1 flex items-center gap-2 rounded-md px-1 py-1.5 hover:bg-muted/40">
              <input type="checkbox" class="accent-[var(--primary)]" [checked]="t.checked">{{ t.label }}
              <span class="ml-auto tabular-nums text-muted-foreground">{{ t.count }}</span>
            </label>
          }
        </section>

        <section class="grid gap-1 border-t border-border pt-4">
          <p role="heading" aria-level="2" class="text-[10px] font-semibold text-muted-foreground">Severidad</p>
          <div class="mt-1.5 flex flex-wrap gap-1.5">
            <span class="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-[11px] font-semibold text-destructive">Crítica · 1</span>
            <span class="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-700">Alta · 1</span>
            <span class="rounded-md border border-border bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">Media · 1</span>
          </div>
        </section>

        <section class="grid gap-1 border-t border-border pt-4">
          <p role="heading" aria-level="2" class="text-[10px] font-semibold text-muted-foreground">Rango</p>
          <div class="mt-1.5 inline-flex rounded-lg border border-border bg-muted p-0.5 text-xs" role="group" aria-label="Rango de fechas">
            @for (r of ranges; track r) {
              <button type="button" class="rounded-md px-2.5 py-1 font-medium text-muted-foreground transition-colors"
                      [class.bg-background]="r === selectedRange" [class.text-foreground]="r === selectedRange" [class.shadow-sm]="r === selectedRange"
                      (click)="selectedRange = r">{{ r }}</button>
            }
          </div>
        </section>

        <section class="border-t border-border pt-4">
          <p role="heading" aria-level="2" class="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
            Requieren atención
            <span class="rounded-md bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold text-destructive">{{ offline.length }}</span>
          </p>
          <ul class="mt-2 grid gap-2">
            @for (d of offline; track d.code) {
              <li class="flex items-start gap-2 text-xs">
                <span class="mt-1 size-2 shrink-0 rounded-full bg-destructive"></span>
                <span>
                  <strong class="font-semibold text-foreground">{{ d.code }}</strong><br>
                  <span class="text-muted-foreground">Sin heartbeat {{ ago(d.lastSeenMinutesAgo) }} · batería {{ d.battery }} %</span>
                </span>
              </li>
            }
          </ul>
        </section>
      </aside>

      <!-- Timeline -->
      <main class="grid gap-3">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p role="heading" aria-level="1" class="text-2xl font-bold tracking-tight text-foreground">Actividad del edificio</p>
            <p class="text-sm text-muted-foreground">Hoy · acceso, alertas y heartbeats en orden cronológico</p>
          </div>
          <button z-button zType="outline" zSize="sm">
            <span class="material-icons text-base">download</span>
            Exportar CSV
          </button>
        </div>

        <ol class="relative ml-2 border-l-2 border-border">
          @for (e of events; track e.id) {
            <li class="relative grid gap-1 py-2 pl-6 sm:grid-cols-[64px_1fr] sm:gap-4">
              <span class="absolute -left-[7px] top-4 size-3 rounded-full border-2 border-background"
                    [class.bg-destructive]="e.kind === 'alert'" [class.bg-emerald-500]="e.kind === 'recovery'"
                    [class.bg-amber-500]="e.kind === 'access'" [class.bg-sky-500]="e.kind === 'command'" [class.bg-muted-foreground]="e.kind === 'heartbeat'"></span>
              <time class="tabular-nums text-xs text-muted-foreground sm:pt-3 sm:text-right">{{ ago(e.minutesAgo) }}</time>
              <div class="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
                   [class.border-l-4]="e.kind === 'alert'" [class.border-l-destructive]="e.kind === 'alert'">
                <span class="material-icons mt-0.5 text-lg text-muted-foreground"
                      [class.text-destructive]="e.kind === 'alert'" [class.text-emerald-600]="e.kind === 'recovery'"
                      [class.text-amber-600]="e.kind === 'access'" [class.text-sky-600]="e.kind === 'command'">{{ iconFor(e.kind) }}</span>
                <span class="min-w-0">
                  <span class="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                    {{ e.title }}
                    @if (e.kind === 'alert') {
                      <span class="rounded-md bg-destructive/15 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-destructive">ALERTA</span>
                    }
                  </span>
                  <span class="mt-0.5 block text-xs leading-snug text-muted-foreground">{{ e.detail }}</span>
                </span>
              </div>
            </li>
          }
        </ol>
        <p class="text-[10px] text-muted-foreground/70">Prototype · US34 US42 US44 · datos stub</p>
      </main>
    </div>
  `
})
export class TelemetryVariantC {
  readonly events = STUB_EVENTS;
  readonly offline = STUB_DEVICES.filter(d => d.status === 'OFFLINE');
  readonly ago = minutesAgoLabel;
  readonly ranges = ['24 h', '7 días', '30 días'] as const;
  selectedRange: (typeof this.ranges)[number] = '24 h';

  readonly eventTypes = [
    { label: 'Alertas', count: '3', checked: true },
    { label: 'Accesos', count: '1 247', checked: true },
    { label: 'Comandos', count: '86', checked: true },
    { label: 'Heartbeats', count: '12.4 k', checked: true },
  ];

  iconFor(kind: string): string {
    return { heartbeat: 'sensors', access: 'badge', alert: 'warning', command: 'bolt', recovery: 'restart_alt' }[kind] ?? 'circle';
  }
}
