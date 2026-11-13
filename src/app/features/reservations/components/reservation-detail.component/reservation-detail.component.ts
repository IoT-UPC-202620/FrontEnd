import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCalendarX, lucideX } from '@ng-icons/lucide';

import { ZardButtonComponent } from '@/shared/components/button';
import { ZardBadgeComponent } from '@/shared/components/badge';

@Component({
  selector: 'app-reservation-detail',
  standalone: true,
  imports: [CommonModule, NgIcon, ZardButtonComponent, ZardBadgeComponent],
  viewProviders: [
    provideIcons({
      lucideCalendarX,
      lucideX,
    }),
  ],
  templateUrl: './reservation-detail.component.html',
  styleUrl: './reservation-detail.component.css',
})
export class ReservationDetailComponent {
  @Input() reservationDetail: any = null;
  @Output() cancelReservation = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

  formatHour(hour: number): string {
    return `${hour.toString().padStart(2, '0')}:00`;
  }
}
