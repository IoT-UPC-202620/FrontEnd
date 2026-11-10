import {
  Component,
  EventEmitter,
  OnInit,
  Output
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { Unit } from '../../model/unit.model';
import { Building } from '../../model/building.model';

import { BuildingsService } from '../../services/buildings.service';
import { UnitsService } from '../../services/units.service';
import { ResidentRegistrationService } from '../../services/resident-registration.service';

@Component({
  selector: 'app-resident-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './resident-form.component.html',
  styleUrl: './resident-form.component.css'
})
export class ResidentFormComponent implements OnInit {

  @Output() close = new EventEmitter<boolean>();

  residentForm!: FormGroup;

  buildings: Building[] = [];
  units: Unit[] = [];

  isSubmitting = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private buildingsService: BuildingsService,
    private unitsService: UnitsService,
    private residentRegistrationService: ResidentRegistrationService
  ) {}

  ngOnInit(): void {
    this.residentForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern('^9[0-9]{8}$')]],
      documentType: ['DNI', Validators.required],
      documentNumber: ['', [Validators.required, Validators.pattern('^[0-9A-Za-z-]{6,20}$')]],
      buildingId: [null as number | null, Validators.required],
      unitId: [{ value: null as number | null, disabled: true }, Validators.required]
    });

    this.buildingsService.getAll().subscribe({
      next: buildings => {
        this.buildings = buildings;
      },
      error: error => {
        console.error('Error loading buildings:', error);
        this.errorMessage = 'No se pudieron cargar las torres.';
      }
    });
  }

  onBuildingChange(): void {
    const buildingId = Number(this.residentForm.get('buildingId')?.value);
    const unitControl = this.residentForm.get('unitId');

    this.units = [];
    unitControl?.reset(null);

    if (!buildingId) {
      unitControl?.disable();
      return;
    }

    this.unitsService.getByBuildingId(buildingId).subscribe({
      next: units => {
        this.units = units.filter(u => (u.status ?? '').toUpperCase() !== 'INACTIVE');
        unitControl?.enable();
      },
      error: error => {
        console.error('Error loading units:', error);
        this.errorMessage = 'No se pudieron cargar las unidades de la torre.';
        unitControl?.disable();
      }
    });
  }

  onSubmit(): void {
    if (this.residentForm.invalid) {
      this.residentForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const value = this.residentForm.getRawValue();

    this.residentRegistrationService.registerResident({
      fullName: value.fullName.trim(),
      email: value.email.trim(),
      phone: value.phone.trim(),
      documentType: value.documentType,
      documentNumber: value.documentNumber.trim(),
      buildingId: Number(value.buildingId),
      unitId: Number(value.unitId)
    }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.close.emit(true);
      },
      error: error => {
        console.error('Error registering resident:', error);
        this.isSubmitting = false;
        this.errorMessage =
          error?.error?.message ??
          (typeof error?.error === 'string' ? error.error : null) ??
          'No se pudo registrar al residente.';
      }
    });
  }

  onCancel(): void {
    if (this.isSubmitting) {
      return;
    }

    this.close.emit(false);
  }
}
