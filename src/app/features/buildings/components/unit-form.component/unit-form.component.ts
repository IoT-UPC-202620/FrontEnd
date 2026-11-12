import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';

import { forkJoin } from 'rxjs';

import { Unit } from '../../model/unit.model';
import { Building } from '../../model/building.model';
import { User } from '../../../users/model/user.model';
import { UserUnit } from '../../model/user-unit.model';
import { CreateUnitResource } from '../../model/create-unit-resource.model';
import { UpdateUnitResource } from '../../model/update-unit-resource.model';

import { UnitsService } from '../../services/units.service';
import { BuildingsService } from '../../services/buildings.service';
import { UserUnitsService } from '../../services/user-units.service';
import { UsersService } from '../../../users/services/users.service';

@Component({
  selector: 'app-unit-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './unit-form.component.html',
  styleUrl: './unit-form.component.css'
})
export class UnitFormComponent implements OnInit {
  @Input() unit!: Unit;
  @Input() isCreateMode = false;

  @Output() close = new EventEmitter<boolean>();

  unitForm!: FormGroup;

  owners: User[] = [];
  buildings: Building[] = [];

  isSaving = false;
  isLoadingData = false;
  errorMessage = '';

  private readonly validStatuses = [
    'AVAILABLE',
    'OCCUPIED',
    'MAINTENANCE'
  ];

  constructor(
    private fb: FormBuilder,
    private unitsService: UnitsService,
    private buildingsService: BuildingsService,
    private userUnitsService: UserUnitsService,
    private usersService: UsersService
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadFormData();
  }

  buildForm(): void {
    const currentBuildingId =
      this.unit?.idBuilding && this.unit.idBuilding > 0
        ? this.unit.idBuilding
        : null;

    this.unitForm = this.fb.group(
      {
        idBuilding: [
          currentBuildingId,
          [
            Validators.required,
            Validators.min(1)
          ]
        ],

        unitNumber: [
          this.unit?.unitNumber ?? 0,
          [
            Validators.required,
            Validators.min(1)
          ]
        ],

        floor: [
          this.unit?.floor ?? 0,
          [
            Validators.required,
            Validators.min(0)
          ]
        ],

        coveredArea: [
          this.unit?.coveredArea ?? 0,
          [
            Validators.required,
            Validators.min(0)
          ]
        ],

        totalArea: [
          this.unit?.totalArea ?? 0,
          [
            Validators.required,
            Validators.min(0)
          ]
        ],

        participationPercentage: [
          this.unit?.participationPercentage ?? 0,
          [
            Validators.required,
            Validators.min(0)
          ]
        ],

        distributionPercentage: [
          this.unit?.distributionPercentage ?? 0,
          [
            Validators.required,
            Validators.min(0)
          ]
        ],

        status: [
          this.unit?.status ?? 'AVAILABLE',
          [
            Validators.required,
            this.statusValidator.bind(this)
          ]
        ],

        idUser: [null]
      },
      {
        validators: this.areaValidator
      }
    );
  }

  loadFormData(): void {
    this.isLoadingData = true;
    this.errorMessage = '';

    forkJoin({
      users: this.usersService.getAll(),
      buildings: this.buildingsService.getAll()
    }).subscribe({
      next: ({ users, buildings }) => {
        this.owners = users.filter(user =>
          user.roles?.some(
            role => role.toUpperCase() === 'OWNER'
          )
        );

        this.buildings = buildings;

        /*
         * Si solo existe un edificio, se selecciona automáticamente.
         */
        if (
          this.isCreateMode &&
          this.buildings.length === 1
        ) {
          this.unitForm.patchValue({
            idBuilding: this.buildings[0].idBuilding
          });
        }

        this.isLoadingData = false;
      },

      error: error => {
        console.error(
          'Error loading unit form information:',
          error
        );

        this.errorMessage =
          'No se pudieron cargar los edificios o propietarios.';

        this.isLoadingData = false;
      }
    });
  }

  onSubmit(): void {
    if (this.isSaving) {
      return;
    }

    if (this.unitForm.invalid) {
      this.unitForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    if (this.isCreateMode) {
      this.createUnit();
      return;
    }

    this.updateUnit();
  }

  createUnit(): void {
    const formValue = this.unitForm.getRawValue();

    const resource: CreateUnitResource =
      this.buildUnitResource();

    console.log(
      'Creating unit with body:',
      resource
    );

    this.unitsService.createUnit(resource).subscribe({
      next: createdUnit => {
        const selectedOwnerId =
          Number(formValue.idUser);

        if (selectedOwnerId <= 0) {
          this.finish();
          return;
        }

        this.assignOwnerToUnit(
          selectedOwnerId,
          Number(createdUnit.idUnit),
          Number(createdUnit.idBuilding)
        );
      },

      error: error => {
        console.error(
          'Error creating unit:',
          error
        );

        this.errorMessage =
          error?.status === 403
            ? 'No tienes autorización para crear unidades.'
            : 'No se pudo crear la unidad. Verifica los datos ingresados.';

        this.isSaving = false;
      }
    });
  }

  private assignOwnerToUnit(
    ownerId: number,
    unitId: number,
    buildingId: number
  ): void {
    const newRelation: UserUnit = {
      idBuilding: buildingId,
      idUnit: unitId,
      idUser: ownerId,
      startDate: new Date().toISOString().slice(0, 19),
      endDate: null,
      status: 'ACTIVE',
      relationType: 'OWNER'
    };

    this.userUnitsService.assignUserToUnit(newRelation).subscribe({
      next: () => {
        this.finish();
      },

      error: error => {
        console.error(
          'Error assigning owner:',
          error
        );

        this.errorMessage =
          error?.error?.message ??
          'La unidad fue creada, pero no se pudo asignar el propietario.';

        this.isSaving = false;
      }
    });
  }

  updateUnit(): void {
    const idUnit =
      Number(this.unit?.idUnit);

    if (!Number.isFinite(idUnit) || idUnit <= 0) {
      this.errorMessage =
        'No se puede actualizar la unidad porque no tiene un ID valido.';

      this.isSaving = false;
      return;
    }

    const resource: UpdateUnitResource =
      this.buildUnitResource();

    const url =
      this.unitsService.getUnitUrl(idUnit);

    this.unitsService
      .update(idUnit, resource)
      .subscribe({
        next: () => {
          this.finish();
        },

        error: (error: HttpErrorResponse) => {
          console.error(
            'Error updating unit:',
            {
              url,
              idUnit,
              body: resource,
              status: error?.status,
              backendResponse: error?.error
            }
          );

          this.errorMessage =
            'No se pudo actualizar la unidad. Verifica los datos ingresados.';

          this.isSaving = false;
        }
      });
  }

  finish(): void {
    this.isSaving = false;
    this.close.emit(true);
  }

  onCancel(): void {
    if (this.isSaving) {
      return;
    }

    this.close.emit(false);
  }

  private buildUnitResource(): UpdateUnitResource {
    const formValue =
      this.unitForm.getRawValue();

    return {
      idBuilding: Number(formValue.idBuilding),
      unitNumber: Number(formValue.unitNumber),
      floor: Number(formValue.floor),
      coveredArea: Number(formValue.coveredArea),
      totalArea: Number(formValue.totalArea),
      participationPercentage: Number(
        formValue.participationPercentage
      ),
      distributionPercentage: Number(
        formValue.distributionPercentage
      ),
      status: String(formValue.status)
    };
  }

  private statusValidator(
    control: AbstractControl
  ): ValidationErrors | null {
    return this.validStatuses.includes(
      String(control.value)
    )
      ? null
      : {
        invalidStatus: true
      };
  }

  private areaValidator(
    control: AbstractControl
  ): ValidationErrors | null {
    const coveredArea =
      Number(
        control.get('coveredArea')?.value
      );

    const totalArea =
      Number(
        control.get('totalArea')?.value
      );

    if (
      Number.isFinite(coveredArea) &&
      Number.isFinite(totalArea) &&
      totalArea < coveredArea
    ) {
      return {
        totalAreaLessThanCoveredArea: true
      };
    }

    return null;
  }
}
