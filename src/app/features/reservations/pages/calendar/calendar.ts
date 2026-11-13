import { ReservationService } from '../../services/reservation.service';
import { CommonAreaService } from '../../services/common-area.service';
import { Reservation } from '../../model/reservation.model';
import { CreateReservationResource } from '../../model/create-reservation-resource.model';
import { CommonArea } from '../../model/common-area.model';
import { UsersService } from '../../../users/services/users.service';
import { User } from '../../../users/model/user.model';
import {
  catchError,
  forkJoin,
  map,
  of,
  Subject,
  switchMap
} from 'rxjs';
import { ReservationListComponent } from '../../components/reservation-list.component/reservation-list.component';
import { ReservationDetailComponent } from '../../components/reservation-detail.component/reservation-detail.component';
import { BuildingsService } from '../../../buildings/services/buildings.service';
import { UserUnitsService } from '../../../buildings/services/user-units.service';
import { UserUnit } from '../../../buildings/model/user-unit.model';

import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
  TemplateRef,
  OnInit,
} from '@angular/core';

import {
  isSameMonth,
} from 'date-fns';

import {
  provideCalendar,
  CalendarEvent,
  CalendarEventAction,
  CalendarView,
  CalendarPreviousViewDirective,
  CalendarTodayDirective,
  CalendarNextViewDirective,
  CalendarMonthViewComponent,
  CalendarDatePipe,
  DateAdapter,
} from 'angular-calendar';

import { EventColor } from 'calendar-utils';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  buildAreaColorMap,
  CANCELLED_COLOR,
  FALLBACK_AREA_COLOR,
  tint,
} from '../../utils/area-color.util';

import {
  provideFlatpickrDefaults,
} from 'angularx-flatpickr';

import { DatePipe, CommonModule } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronLeft,
  lucideChevronRight,
  lucidePlus,
  lucideX,
} from '@ng-icons/lucide';

import { ZardButtonComponent } from '@/shared/components/button';
import { ZardFieldImports } from '@/shared/components/field';
import { ZardInputComponent } from '@/shared/components/input';
import { ZardSelectImports } from '@/shared/components/select';

import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';

interface LegendEntry {
  label: string;
  color: string;
}

function buildReservationFormGroup(fb: FormBuilder) {
  return fb.nonNullable.group({
    residentId: ['', Validators.required],
    commonAreaId: ['', Validators.required],
    reservationDate: ['', Validators.required],
    timeSlot: [9, [Validators.required, Validators.min(0), Validators.max(23)]],
    numberOfGuests: [1, [Validators.required, Validators.min(1)]],
  });
}

type ReservationFormGroup = ReturnType<typeof buildReservationFormGroup>;

@Component({
  selector: 'app-calendar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './calendar.css',
  templateUrl: './calendar.html',
  imports: [
    CommonModule,
    NgIcon,
    ZardButtonComponent,
    ZardFieldImports,
    ZardInputComponent,
    ZardSelectImports,
    CalendarPreviousViewDirective,
    CalendarTodayDirective,
    CalendarNextViewDirective,
    CalendarMonthViewComponent,
    ReactiveFormsModule,
    CalendarDatePipe,
    DatePipe,
    ReservationListComponent,
    ReservationDetailComponent
  ],
  providers: [
    provideFlatpickrDefaults(),
    provideCalendar({ provide: DateAdapter, useFactory: adapterFactory }),
  ],
  viewProviders: [
    provideIcons({
      lucideChevronLeft,
      lucideChevronRight,
      lucidePlus,
      lucideX,
    }),
  ],
})
export class Calendar implements OnInit {
  constructor(
    private reservationService: ReservationService,
    private commonAreaService: CommonAreaService,
    private usersService: UsersService,
    private buildingsService: BuildingsService,
    private userUnitsService: UserUnitsService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.reservationForm = buildReservationFormGroup(this.fb);
    this.loadCalendarData();
  }

  @ViewChild('modalContent', { static: true }) modalContent!: TemplateRef<any>;

  showCreateReservationModal = false;
  showDayReservationsModal = false;
  showReservationDetailModal = false;

  commonAreas: CommonArea[] = [];
  users: User[] = [];
  reservations: Reservation[] = [];

  todayDate = new Date().toISOString().split('T')[0];
  reservationError = '';

  reservationForm!: ReservationFormGroup;

  view: CalendarView = CalendarView.Month;
  CalendarView = CalendarView;
  viewDate: Date = new Date();

  modalData?: {
    action: string;
    event: CalendarEvent;
  };

  refresh = new Subject<void>();
  events: CalendarEvent[] = [];

  areaColors = new Map<number, string>();
  legend: LegendEntry[] = [];

  selectedDayReservations: CalendarEvent[] = [];
  selectedReservationDetail: any = null;
  activeDayIsOpen = true;

  actions: CalendarEventAction[] = [
    {
      label: '<i class="fas fa-fw fa-pencil-alt"></i>',
      a11yLabel: 'Edit',
      onClick: ({ event }: { event: CalendarEvent }): void => {
        this.handleEvent('Edited', event);
      },
    },
    {
      label: '<i class="fas fa-fw fa-trash-alt"></i>',
      a11yLabel: 'Delete',
      onClick: ({ event }: { event: CalendarEvent }): void => {
        this.events = this.events.filter(iEvent => iEvent !== event);
        this.handleEvent('Deleted', event);
      },
    },
  ];

  loadCalendarData(): void {
    forkJoin({
      reservations: this.reservationService.getAll(),
      commonAreas: this.commonAreaService.getAll(),
      users: this.usersService.getAll(),
      buildings: this.buildingsService.getAll()
    }).pipe(
      switchMap(({
                   reservations,
                   commonAreas,
                   users,
                   buildings
                 }) => {

        if (buildings.length === 0) {
          return of({
            reservations,
            commonAreas,
            users,
            relations: [] as UserUnit[]
          });
        }

        const relationRequests = buildings.map(building =>
          this.userUnitsService
            .getByBuildingId(building.idBuilding)
            .pipe(
              catchError(error => {
                console.error(
                  `Error loading residents from building ${building.idBuilding}:`,
                  error
                );

                return of([] as UserUnit[]);
              })
            )
        );

        return forkJoin(relationRequests).pipe(
          map(relationsByBuilding => ({
            reservations,
            commonAreas,
            users,
            relations: relationsByBuilding.flat()
          }))
        );
      })
    ).subscribe({
      next: ({
               reservations,
               commonAreas,
               users,
               relations
             }) => {
        this.commonAreas = commonAreas;
        this.reservations = reservations;
        this.areaColors = buildAreaColorMap(commonAreas);

        /*
         * Identificadores de usuarios que tienen una relación
         * activa con alguna unidad.
         */
        const activeResidentIds = new Set(
          relations
            .filter(relation =>
              relation.status === 'ACTIVE' &&
              relation.endDate == null
            )
            .map(relation => Number(relation.idUser))
        );

        /*
         * Mostrar únicamente:
         * - Usuarios relacionados con una unidad.
         * - OWNER o TENANT.
         * - No inactivos.
         *
         * No usamos status === ACTIVE porque los usuarios nuevos
         * pueden encontrarse como PENDING o VERIFIED.
         */
        this.users = users.filter(user => {
          const hasResidentRole = user.roles?.some(role => {
            const normalizedRole = role.toUpperCase();

            return (
              normalizedRole === 'OWNER' ||
              normalizedRole === 'TENANT'
            );
          });

          return (
            activeResidentIds.has(Number(user.id)) &&
            hasResidentRole &&
            user.status !== 'INACTIVE'
          );
        });

        this.events = reservations.map(
          (reservation: Reservation): CalendarEvent => {
            const area = commonAreas.find(
              commonArea =>
                Number(commonArea.id) ===
                Number(reservation.commonAreaId)
            );

            const user = users.find(
              currentUser =>
                Number(currentUser.id) ===
                Number(reservation.residentId)
            );

            return {
              title:
                `${area?.name ?? 'Área común'} - ` +
                `${user?.fullName?.split(' ')[0] ?? 'Residente'}`,

              start: new Date(
                `${reservation.reservationDate}` +
                `T${reservation.timeSlot}:00:00`
              ),

              end: new Date(
                `${reservation.reservationDate}` +
                `T${Number(reservation.timeSlot) + 1}:00:00`
              ),

              color: this.getReservationColor(
                reservation,
                area
              ),

              meta: {
                reservation,
                area,
                user
              }
            };
          }
        );

        this.buildLegend();

        this.refresh.next();
        this.cdr.markForCheck();
      },

      error: error => {
        console.error(
          'Error loading calendar information:',
          error
        );

        this.reservationError =
          'No se pudo cargar la información del calendario.';

        this.cdr.markForCheck();
      }
    });
  }

  dayClicked({ date, events }: { date: Date; events: CalendarEvent[] }): void {
    if (!isSameMonth(date, this.viewDate)) return;

    this.viewDate = date;

    if (events.length === 1) {
      this.openReservationDetail(events[0]);
      return;
    }

    if (events.length > 1) {
      this.selectedDayReservations = events;
      this.showDayReservationsModal = true;
    }
  }

  /**
   * Cada area comun tiene su propio color. Las reservas canceladas
   * siempre se muestran en rojo.
   */
  getReservationColor(
    reservation: Reservation,
    commonArea?: CommonArea
  ): EventColor {
    if (reservation.status === 'CANCELLED') {
      return this.toEventColor(CANCELLED_COLOR);
    }

    const primary =
      (commonArea && this.areaColors.get(Number(commonArea.id))) ||
      FALLBACK_AREA_COLOR;

    return this.toEventColor(primary);
  }

  private toEventColor(primary: string): EventColor {
    return {
      primary,
      secondary: tint(primary),
    };
  }

  /**
   * Leyenda al pie del calendario: un color por area utilizada
   * y, al final, el color reservado para las reservas canceladas.
   */
  private buildLegend(): void {
    const entries: LegendEntry[] = [];
    const seen = new Set<number>();

    for (const event of this.events) {
      const reservation = event.meta?.reservation as Reservation | undefined;
      const area = event.meta?.area as CommonArea | undefined;

      if (!area || reservation?.status === 'CANCELLED') {
        continue;
      }

      const areaId = Number(area.id);

      if (seen.has(areaId)) {
        continue;
      }

      seen.add(areaId);

      entries.push({
        label: area.name,
        color: this.areaColors.get(areaId) ?? FALLBACK_AREA_COLOR,
      });
    }

    if (this.reservations.some(item => item.status === 'CANCELLED')) {
      entries.push({ label: 'Cancelled', color: CANCELLED_COLOR });
    }

    this.legend = entries;
  }

  handleEvent(action: string, event: CalendarEvent): void {
    this.modalData = { event, action };
    console.log(action, event);
  }

  openCreateReservationModal(): void {
    this.showCreateReservationModal = true;
  }

  closeCreateReservationModal(): void {
    this.showCreateReservationModal = false;
    this.reservationError = '';

    this.reservationForm.reset({
      residentId: '',
      commonAreaId: '',
      reservationDate: '',
      timeSlot: 9,
      numberOfGuests: 1
    });

    this.cdr.markForCheck();
  }

  createReservation(): void {
    this.reservationError = '';

    if (this.reservationForm.invalid) {
      this.reservationForm.markAllAsTouched();
      return;
    }

    const { residentId, commonAreaId, reservationDate, timeSlot, numberOfGuests } =
      this.reservationForm.getRawValue();

    const selectedArea = this.commonAreas.find(
      area => String(area.id) === String(commonAreaId)
    );

    if (!Number.isInteger(timeSlot) || !Number.isInteger(numberOfGuests)) {
      this.reservationError = 'Time slot and number of guests must be whole numbers.';
      return;
    }

    if (reservationDate < this.todayDate) {
      this.reservationError = 'You cannot reserve a date before today.';
      return;
    }

    if (!selectedArea) {
      this.reservationError = 'Please select a common area.';
      return;
    }

    if (numberOfGuests > selectedArea.maxCapacity) {
      this.reservationError = `This area only allows up to ${selectedArea.maxCapacity} guests.`;
      return;
    }

    const maxReservationHours = selectedArea.rules?.maxReservationHours ?? 1;

    const newStart = timeSlot;
    const newEnd = timeSlot + maxReservationHours;

    const hasConflict = this.reservations.some(reservation => {
      if (reservation.status === 'CANCELLED') return false;

      const sameArea =
        String(reservation.commonAreaId) === String(commonAreaId);

      const sameDate =
        reservation.reservationDate === reservationDate;

      if (!sameArea || !sameDate) return false;

      const existingArea = this.commonAreas.find(
        area => Number(area.id) === Number(reservation.commonAreaId)
      );

      const existingDuration = existingArea?.rules?.maxReservationHours ?? 1;

      const existingStart = Number(reservation.timeSlot);
      const existingEnd = existingStart + existingDuration;

      return newStart < existingEnd && newEnd > existingStart;
    });

    if (hasConflict) {
      this.reservationError =
        'This area already has a reservation that overlaps with this time slot.';
      return;
    }

    const newReservation: CreateReservationResource = {
      residentId: Number(residentId),
      commonAreaId: Number(commonAreaId),
      reservationDate,
      timeSlot
    };

    this.reservationService.createReservation(newReservation).subscribe({
      next: () => {
        this.closeCreateReservationModal();
        this.loadCalendarData();
      },
      error: error => {
        console.error(error);
        this.reservationError =
          error?.error?.message ??
          error?.error ??
          'No se pudo crear la reserva.';
      }
    });
  }

  get selectedAreaCapacity(): number {
    const commonAreaId = this.reservationForm?.controls.commonAreaId.value;

    const area = this.commonAreas.find(
      area => String(area.id) === String(commonAreaId)
    );

    return area?.maxCapacity ?? 1;
  }

  openReservationDetail(event: CalendarEvent): void {
    this.selectedReservationDetail = event.meta;
    this.showDayReservationsModal = false;
    this.showReservationDetailModal = true;
  }

  closeDayReservationsModal(): void {
    this.showDayReservationsModal = false;
    this.selectedDayReservations = [];
  }

  closeReservationDetailModal(): void {
    this.showReservationDetailModal = false;
    this.selectedReservationDetail = null;
  }

  cancelReservation(detail: any): void {
    this.reservationService.cancelReservation(detail.reservation.id).subscribe({
      next: () => {
        this.closeReservationDetailModal();
        this.loadCalendarData();
      },
      error: error => console.error(error)
    });
  }

  formatHour(hour: number): string {
    return `${hour.toString().padStart(2, '0')}:00`;
  }
}
