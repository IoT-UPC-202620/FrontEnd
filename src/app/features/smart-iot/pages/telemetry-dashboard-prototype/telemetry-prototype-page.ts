import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { SmartIotDashboard } from '../smart-iot-dashboard/smart-iot-dashboard';
import { PrototypeSwitcherComponent } from '../../../../shared/components/prototype-switcher/prototype-switcher.component';
import { TelemetryVariantA } from './variant-a-control-room';
import { TelemetryVariantB } from './variant-b-monitoring-wall';
import { TelemetryVariantC } from './variant-c-event-feed';

/**
 * PROTOTYPE — wrapper de las variantes del dashboard IoT de administrador.
 * Sin `?variant=` muestra la página SmartIOT existente; con `?variant=A|B|C` muestra la variante.
 */
@Component({
  selector: 'app-telemetry-prototype-page',
  standalone: true,
  imports: [CommonModule, SmartIotDashboard, TelemetryVariantA, TelemetryVariantB, TelemetryVariantC, PrototypeSwitcherComponent],
  template: `
    @switch (variant) {
      @case ('A') { <app-variant-a /> }
      @case ('B') { <app-variant-b /> }
      @case ('C') { <app-variant-c /> }
      @default { <app-smart-iot-dashboard /> }
    }
    @if (variant) {
      <app-prototype-switcher />
    }
  `
})
export class TelemetryPrototypePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  variant = '';

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.variant = (params.get('variant') ?? '').toUpperCase();
    });
  }
}
