import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  AccessDeniedEvent,
  IrrigationEvent,
  LightingEvent,
  SmartIotEvent,
  SmartIotSummaryCard
} from '../../model/smart-iot.model';
import { SmartIotService } from '../../services/smart-iot.service';
import { TelemetryLivePanel } from './telemetry-live-panel';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

@Component({
  selector: 'app-smart-iot-dashboard',
  standalone: true,
  imports: [RouterLink, TelemetryLivePanel],
  templateUrl: './smart-iot-dashboard.html',
  styleUrl: './smart-iot-dashboard.css'
})
export class SmartIotDashboard implements OnInit {
  private readonly smartIotService = inject(SmartIotService);

  cards: SmartIotSummaryCard[] = [];
  activityRange = '';
  isLoading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadSummary();
  }

  loadSummary(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.smartIotService.getDashboard().subscribe({
      next: data => {
        this.cards = data.cards;
        this.activityRange = this.buildActivityRange(data.activityFrom, data.activityTo);
        this.isLoading = false;
      },
      error: error => {
        console.error('Error cargando SmartIOT:', error);
        this.errorMessage = 'No se pudo cargar la actividad SmartIOT.';
        this.isLoading = false;
      }
    });
  }

  /** "09 oct 2026 · 08:42" */
  lastEventStamp(event: SmartIotEvent): string {
    const date = new Date(event.occurredAt);
    return `${this.formatDate(date)} · ${this.formatTime(date)}`;
  }

  /** "Foco 018 · Vestíbulo torre A" */
  lastEventDetail(event: SmartIotEvent): string {
    if (event.type === 'lighting') {
      const lighting = event as LightingEvent;
      return `${lighting.device} · ${lighting.zone}`;
    }

    if (event.type === 'access-control') {
      const access = event as AccessDeniedEvent;
      return [access.user, access.reason, access.device].filter(Boolean).join(' · ');
    }

    const irrigation = event as IrrigationEvent;
    return `${irrigation.sprinkler} · ${irrigation.zone}`;
  }

  /** "08–09 oct 2026" */
  buildActivityRange(from: Date | null, to: Date | null): string {
    if (!from || !to) {
      return '';
    }

    if (this.isSameDay(from, to)) {
      return this.formatDate(to);
    }

    if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
      return `${this.pad(from.getDate())}–${this.formatDate(to)}`;
    }

    return `${this.formatDate(from)} – ${this.formatDate(to)}`;
  }

  private formatDate(date: Date): string {
    return `${this.pad(date.getDate())} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  }

  private formatTime(date: Date): string {
    return `${this.pad(date.getHours())}:${this.pad(date.getMinutes())}`;
  }

  private isSameDay(first: Date, second: Date): boolean {
    return (
      first.getDate() === second.getDate() &&
      first.getMonth() === second.getMonth() &&
      first.getFullYear() === second.getFullYear()
    );
  }

  private pad(value: number): string {
    return value.toString().padStart(2, '0');
  }
}