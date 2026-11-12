import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  forkJoin,
  map,
  of,
  switchMap
} from 'rxjs';

import { UserFormComponent } from
    '../../../users/components/user-form/user-form.component';

import { UsersService } from
    '../../../users/services/users.service';

import { User } from
    '../../../users/model/user.model';

import { UnitsService } from
    '../../services/units.service';

import { BuildingsService } from
    '../../services/buildings.service';

import { UserUnitsService } from
    '../../services/user-units.service';

import { Unit } from
    '../../model/unit.model';

import { Building } from
    '../../model/building.model';

import { UserUnit } from
    '../../model/user-unit.model';

import { UnitResidentView } from
    '../../model/unit-resident-view.model';

import { UnitFormComponent } from
    '../../components/unit-form.component/unit-form.component';

import { BuildingFormComponent } from
    '../../components/building-form.component/building-form.component';

import { ResidentFormComponent } from
    '../../components/resident-form.component/resident-form.component';

import { ZardButtonComponent } from '@/shared/components/button';

@Component({
  selector: 'app-units-residents-page',
  standalone: true,
  imports: [
    CommonModule,
    UnitFormComponent,
    UserFormComponent,
    BuildingFormComponent,
    ResidentFormComponent,
    ZardButtonComponent
  ],
  templateUrl: './units-residents-page.html',
  styleUrl: './units-residents-page.css',
})
export class UnitsResidentsPage implements OnInit {

  rows: UnitResidentView[] = [];
  units: Unit[] = [];
  owners: User[] = [];

  selectedUnit: Unit | null = null;

  isCreatingUnit = false;
  isEditingUnit = false;
  isCreatingUser = false;
  isCreatingBuilding = false;
  isRegisteringResident = false;
  successMessage = '';

  totalUnits = 0;
  outstandingDebt = 0;
  newMoveIns = 0;
  maintenanceRequests = 0;

  constructor(
    private usersService: UsersService,
    private unitsService: UnitsService,
    private buildingsService: BuildingsService,
    private userUnitsService: UserUnitsService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    forkJoin({
      users: this.usersService.getAll(),
      buildings: this.buildingsService.getAll()
    }).pipe(
      switchMap(({ users, buildings }) => {

        if (buildings.length === 0) {
          return of({
            users,
            buildingUnits: [] as Array<{
              building: Building;
              units: Unit[];
              residents: UserUnit[];
            }>
          });
        }

        const requests = buildings.map(building =>
          this.unitsService
            .getByBuildingId(building.idBuilding)
            .pipe(
              switchMap(units =>
                this.userUnitsService
                  .getResidentsByBuildingId(building.idBuilding)
                  .pipe(
                    map(residents => ({
                      building,
                      units,
                      residents
                    }))
                  )
              )
            )
        );

        return forkJoin(requests).pipe(
          map(buildingUnits => ({
            users,
            buildingUnits
          }))
        );
      })
    ).subscribe({
      next: ({ users, buildingUnits }) => {

        this.owners = users.filter(user =>
          user.roles.some(
            role => role.toUpperCase() === 'OWNER'
          )
        );

        this.units = buildingUnits.flatMap(
          item => item.units
        );

        this.totalUnits = this.units.length;

        this.maintenanceRequests = this.units.filter(
          unit => unit.status === 'MAINTENANCE'
        ).length;

        this.newMoveIns = this.owners.filter(
          owner => owner.status === 'PENDING'
        ).length;

        this.rows = buildingUnits.flatMap(
          ({ building, units, residents }) =>
            units.map(unit =>
              this.toView(unit, building, residents, users)
            )
        );

        this.outstandingDebt = this.rows.filter(
          row => row.debtStatus === 'LATE'
        ).length;
      },

      error: error => {
        console.error(
          'Error loading units, buildings and users:',
          error
        );
      }
    });
  }

  private toView(
    unit: Unit,
    building: Building,
    residents: UserUnit[],
    users: User[]
  ): UnitResidentView {

    let displayedStatus = 'VACANT';

    if (unit.status === 'MAINTENANCE') {
      displayedStatus = 'MAINTENANCE';
    }

    if (unit.status === 'OCCUPIED') {
      displayedStatus = 'OCCUPIED';
    }

    const activeRelation = residents.find(
      resident =>
        Number(resident.idUnit) === Number(unit.idUnit) &&
        resident.status === 'ACTIVE' &&
        !resident.endDate
    );

    const residentUser = activeRelation
      ? users.find(
        user =>
          Number(user.id) === Number(activeRelation.idUser)
      )
      : undefined;

    return {
      unitId: unit.idUnit,
      unitNumber: unit.unitNumber,

      tower:
        building.name ??
        'Unknown Building',

      unitStatus: displayedStatus,

      residentId: residentUser?.id,
      residentName: residentUser?.fullName ?? 'No Resident',
      residentRole: residentUser?.roles?.join(', ') ?? 'Not assigned',
      email: residentUser?.email ?? '—',
      phone: residentUser?.phone ?? '',

      debtStatus: 'N/A',
      debtLabel: 'N/A'
    };
  }

  createBuilding(): void {
    this.isCreatingBuilding = true;
  }

  onBuildingFormClose(refresh: boolean): void {
    this.isCreatingBuilding = false;

    if (refresh) {
      this.loadData();
    }
  }

  createUser(): void {
    this.isCreatingUser = true;
  }

  onUserFormClose(refresh: boolean): void {
    this.isCreatingUser = false;

    if (refresh) {
      this.loadData();
    }
  }

  editRow(row: UnitResidentView): void {
    this.selectedUnit =
      this.units.find(
        unit =>
          Number(unit.idUnit) ===
          Number(row.unitId)
      ) ?? null;

    if (!this.selectedUnit) {
      return;
    }

    this.isEditingUnit = true;
    this.isCreatingUnit = false;
  }

  createUnit(): void {
    this.selectedUnit = {
      id: 0,
      idUnit: 0,
      idBuilding: 0,
      unitNumber: 0,
      floor: 0,
      coveredArea: 0,
      totalArea: 0,
      participationPercentage: 0,
      distributionPercentage: 0,
      status: 'AVAILABLE'
    };

    this.isCreatingUnit = true;
    this.isEditingUnit = false;
  }

  onUnitFormClose(refresh: boolean): void {
    this.isEditingUnit = false;
    this.isCreatingUnit = false;
    this.selectedUnit = null;

    if (refresh) {
      this.loadData();
    }
  }

  registerResident(): void {
    this.isRegisteringResident = true;
    this.successMessage = '';
  }

  onResidentFormClose(registered: boolean): void {
    this.isRegisteringResident = false;

    if (registered) {
      this.successMessage =
        'Residente vinculado a la unidad. Sus credenciales llegarán por correo.';
      this.loadData();
    }
  }
}
