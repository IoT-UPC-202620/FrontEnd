import { Component, OnInit, ViewChild } from '@angular/core';import { Calendar } from '../../features/reservations/pages/calendar/calendar';
import { CommonAreaListComponent } from '../../features/reservations/components/common-area-list.component/common-area-list.component';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideWrench, lucideX } from '@ng-icons/lucide';

import { ZardButtonComponent } from '@/shared/components/button';

import { CommonArea } from '../../features/reservations/model/common-area.model';
import { CommonAreaRule } from '../../features/reservations/model/common-area-rule.model';
import { CommonAreaService } from '../../features/reservations/services/common-area.service';

@Component({
  selector: 'app-common-areas',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    Calendar,
    CommonAreaListComponent,
    NgIcon,
    ZardButtonComponent
  ],
  viewProviders: [
    provideIcons({
      lucidePlus,
      lucideWrench,
      lucideX,
    }),
  ],
  templateUrl: './common-areas.html',
  styleUrl: './common-areas.css'
})
export class CommonAreas implements OnInit {
  showCreateModal = false;
  showEditModal = false;
  showHistoryModal = false;

  selectedArea: CommonArea | null = null;
  commonAreas: CommonArea[] = [];

  areaForm!: FormGroup;
  editForm!: FormGroup;
  @ViewChild(CommonAreaListComponent)
  commonAreaList!: CommonAreaListComponent;

  constructor(
    private fb: FormBuilder,
    private commonAreaService: CommonAreaService
  ) {}

  ngOnInit(): void {
    this.areaForm = this.buildAreaForm();
    this.editForm = this.buildAreaForm();
    this.loadAreas();
  }

  /**
   * Areas que quedaron fuera de servicio. Alimenta la tarjeta
   * "Maintenance Schedule" del panel lateral.
   */
  get areasInMaintenance(): CommonArea[] {
    return this.commonAreas.filter(area => area.status === 'MAINTENANCE');
  }

  get maintenanceSummary(): string {
    const areas = this.areasInMaintenance;

    if (areas.length === 0) {
      return 'No hay áreas en mantenimiento.';
    }

    const names = areas.map(area => area.name).join(', ');

    return areas.length === 1
      ? `Mantenimiento programado para ${names}.`
      : `Mantenimiento programado en ${areas.length} áreas: ${names}.`;
  }

  private loadAreas(): void {
    this.commonAreaService.getAll().subscribe({
      next: areas => (this.commonAreas = areas),
      error: error => console.error(error),
    });
  }

  private buildAreaForm(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      type: ['POOL', Validators.required],
      status: ['AVAILABLE', Validators.required],
      maxCapacity: [1, [Validators.required, Validators.min(1)]],
      bookingType: ['SHARED', Validators.required],

      maxReservationHours: [1, [Validators.required, Validators.min(1)]],
      price: [0, [Validators.required, Validators.min(0)]],
      guaranteeAmount: [0, [Validators.required, Validators.min(0)]],
      allowCancellation: [true],
      penaltyHoursBefore: [24, [Validators.required, Validators.min(0)]],
      penaltyAmount: [0, [Validators.required, Validators.min(0)]],
      requiresApproval: [false]
    });
  }

  openCreateModal(): void {
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;

    this.areaForm.reset({
      name: '',
      type: 'POOL',
      status: 'AVAILABLE',
      maxCapacity: 1,
      bookingType: 'SHARED',
      maxReservationHours: 1,
      price: 0,
      guaranteeAmount: 0,
      allowCancellation: true,
      penaltyHoursBefore: 24,
      penaltyAmount: 0,
      requiresApproval: false
    });
  }

  createArea(): void {
    if (this.areaForm.invalid) {
      this.areaForm.markAllAsTouched();
      return;
    }

    const value = this.areaForm.getRawValue();

    const price = Number(value.price);
    const guaranteeAmount = Number(value.guaranteeAmount);
    const penaltyAmount = Number(value.penaltyAmount);

    const rules: CommonAreaRule = {
      maxReservationHours: Number(value.maxReservationHours),
      requiresPayment: price > 0,
      price,
      requiresGuarantee: guaranteeAmount > 0,
      guaranteeAmount,
      allowCancellation: Boolean(value.allowCancellation),
      penaltyHoursBefore: Number(value.penaltyHoursBefore),
      penaltyAmount,
      requiresApproval: Boolean(value.requiresApproval)
    };

    const newArea: CommonArea = {
      id: Date.now(),
      name: value.name,
      type: value.type,
      status: value.status,
      maxCapacity: Number(value.maxCapacity),
      bookingType: value.bookingType,
      rules
    };

    this.commonAreaService.create(newArea).subscribe({
      next: () => {
        this.closeCreateModal();
        this.refreshCommonAreas();
      },
      error: error => console.error(error)
    });
  }
  private refreshCommonAreas(): void {
    this.loadAreas();
    this.commonAreaList?.loadAreas();
  }

  openHistoryModal(area: CommonArea): void {
    this.selectedArea = area;
    this.showHistoryModal = true;
  }

  closeHistoryModal(): void {
    this.showHistoryModal = false;
    this.selectedArea = null;
  }
  openEditModal(area: CommonArea): void {
    this.selectedArea = area;

    this.editForm.patchValue({
      name: area.name,
      type: area.type,
      status: area.status,
      maxCapacity: area.maxCapacity,
      bookingType: area.bookingType,

      maxReservationHours: area.rules?.maxReservationHours ?? 1,
      price: area.rules?.price ?? 0,
      guaranteeAmount: area.rules?.guaranteeAmount ?? 0,
      allowCancellation: area.rules?.allowCancellation ?? true,
      penaltyHoursBefore: area.rules?.penaltyHoursBefore ?? 24,
      penaltyAmount: area.rules?.penaltyAmount ?? 0,
      requiresApproval: area.rules?.requiresApproval ?? false
    });

    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedArea = null;
  }

  updateRules(): void {
    if (!this.selectedArea || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const value = this.editForm.getRawValue();

    const price = Number(value.price);
    const guaranteeAmount = Number(value.guaranteeAmount);
    const penaltyAmount = Number(value.penaltyAmount);

    const updatedArea: CommonArea = {
      ...this.selectedArea,
      name: value.name,
      type: value.type,
      status: value.status,
      maxCapacity: Number(value.maxCapacity),
      bookingType: value.bookingType,
      rules: {
        maxReservationHours: Number(value.maxReservationHours),
        requiresPayment: price > 0,
        price,
        requiresGuarantee: guaranteeAmount > 0,
        guaranteeAmount,
        allowCancellation: Boolean(value.allowCancellation),
        penaltyHoursBefore: Number(value.penaltyHoursBefore),
        penaltyAmount,
        requiresApproval: Boolean(value.requiresApproval)
      }
    };

    this.commonAreaService.update(this.selectedArea.id, updatedArea).subscribe({
      next: () => {
        this.closeEditModal();
        this.refreshCommonAreas();
      },
      error: error => console.error(error)
    });
  }

  updateAreaStatus(area: CommonArea): void {
    this.commonAreaService.update(area.id, area).subscribe({
      next: () =>   this.refreshCommonAreas()
      ,
      error: error => console.error(error)
    });
  }
}
