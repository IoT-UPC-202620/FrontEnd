import {
  CommonModule,
} from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
  signal
} from '@angular/core';

import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';

import { forkJoin } from 'rxjs';

import { ZardButtonComponent } from '@/shared/components/button';
import { ZardDialogImports } from '@/shared/components/dialog/dialog.imports';
import { ZardFieldImports } from '@/shared/components/field';
import { ZardInputComponent } from '@/shared/components/input';
import { ZardSelectImports } from '@/shared/components/select';

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

type UnitFormControls = {
  idBuilding: FormControl<string>;
  unitNumber: FormControl<number>;
  floor: FormControl<number>;
  coveredArea: FormControl<number>;
  totalArea: FormControl<number>;
  participationPercentage: FormControl<number>;
  distributionPercentage: FormControl<number>;
  status: FormControl<string>;
  idUser: FormControl<string>;
};

@Component({
  selector: 'app-unit-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ZardButtonComponent,
    ...ZardDialogImports,
    ...ZardFieldImports,
    ZardInputComponent,
    ...ZardSelectImports,
  ],
  templateUrl: './unit-form.component.html',
})
export class UnitFormComponent implements OnInit {
  @Input() unit!: Unit;
  @Input() isCreateMode = false;

  @Output() readonly close = new EventEmitter<boolean>();

  unitForm!: FormGroup<UnitFormControls>;

  owners: User[] = [];
  buildings: Building[] = [];

  isSaving = false;
  isLoadingData = false;
  errorMessage = '';

  protected readonly visible = signal(true);

  private result = false;

  private readonly validStatuses = [
    'AVAILABLE',
    'OCCUPIED',
    'MAINTENANCE'
  ];

  private readonly fb = inject(FormBuilder);
  private readonly unitsService = inject(UnitsService);
  private readonly buildingsService = inject(BuildingsService);
  private readonly userUnitsService = inject(UserUnitsService);
  private readonly usersService = inject(UsersService);

  ngOnInit(): void {
    this.buildForm();
    this.loadFormData();
  }

  buildForm(): void {
    const currentBuildingId =
      this.unit?.idBuilding && this.unit.idBuilding > 0
        ? String(this.unit.idBuilding)
        : '';

    this.unitForm = this.fb.nonNullable.group(
      {
        idBuilding: [
          currentBuildingId,
          [
            Validators.required
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

        idUser: ['0']
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
            idBuilding: String(this.buildings[0].idBuilding)
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
          'Could not load the buildings or owners.';

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
            ? 'You are not authorized to create units.'
            : 'Could not create the unit. Check the entered data.';

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
        'The unit cannot be updated because it does not have a valid ID.';

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
            'Could not update the unit. Check the entered data.';

          this.isSaving = false;
        }
      });
  }

  finish(): void {
    this.isSaving = false;
    this.result = true;
    this.visible.set(false);
  }

  protected onDialogClosed(): void {
    this.close.emit(this.result);
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
