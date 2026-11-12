import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';

import { of, throwError } from 'rxjs';

import { UnitFormComponent } from './unit-form.component';

import { UnitsService } from '../../services/units.service';
import { BuildingsService } from '../../services/buildings.service';
import { UserUnitsService } from '../../services/user-units.service';
import { UsersService } from '../../../users/services/users.service';

describe('UnitFormComponent', () => {
  let component: UnitFormComponent;
  let fixture: ComponentFixture<UnitFormComponent>;

  let unitsService: { createUnit: jasmine.Spy; update: jasmine.Spy; getUnitUrl: jasmine.Spy };
  let buildingsService: { getAll: jasmine.Spy };
  let userUnitsService: { assignUserToUnit: jasmine.Spy };
  let usersService: { getAll: jasmine.Spy };

  const building = {
    idBuilding: 1,
    name: 'Edificio Los Olivos',
    district: 'Miraflores'
  };

  const owner = {
    id: 7,
    fullName: 'Ana Pérez',
    email: 'ana@example.com',
    roles: ['OWNER'],
    status: 'ACTIVE'
  };

  const fillValidForm = (idUser: number | null) => {
    component.unitForm.patchValue({
      idBuilding: 1,
      unitNumber: 101,
      floor: 1,
      coveredArea: 50,
      totalArea: 80,
      participationPercentage: 10,
      distributionPercentage: 10,
      status: 'AVAILABLE',
      idUser
    });
  };

  beforeEach(async () => {
    unitsService = {
      createUnit: jasmine.createSpy('createUnit').and.returnValue(
        of({ idUnit: 10, idBuilding: 1, unitNumber: 101 })
      ),
      update: jasmine.createSpy('update').and.returnValue(of({})),
      getUnitUrl: jasmine.createSpy('getUnitUrl').and.returnValue('http://x/units/10')
    };

    buildingsService = {
      getAll: jasmine.createSpy('getAll').and.returnValue(of([building]))
    };

    usersService = {
      getAll: jasmine.createSpy('getAll').and.returnValue(of([owner]))
    };

    userUnitsService = {
      assignUserToUnit: jasmine.createSpy('assignUserToUnit').and.returnValue(of({}))
    };

    await TestBed.configureTestingModule({
      imports: [UnitFormComponent],
      providers: [
        { provide: UnitsService, useValue: unitsService },
        { provide: BuildingsService, useValue: buildingsService },
        { provide: UserUnitsService, useValue: userUnitsService },
        { provide: UsersService, useValue: usersService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UnitFormComponent);
    component = fixture.componentInstance;
    component.isCreateMode = true;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the backend 409 message when assigning the owner conflicts', () => {
    userUnitsService.assignUserToUnit.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { message: 'La unidad ya tiene un titular activo' }
          })
      )
    );

    fillValidForm(owner.id);
    component.onSubmit();

    expect(userUnitsService.assignUserToUnit).toHaveBeenCalledTimes(1);
    expect(component.errorMessage).toBe('La unidad ya tiene un titular activo');
    expect(component.isSaving).toBeFalse();
  });

  it('sends relationType OWNER and the building when assigning the owner', () => {
    fillValidForm(owner.id);
    component.onSubmit();

    const relation = userUnitsService.assignUserToUnit.calls.mostRecent().args[0];
    expect(relation.relationType).toBe('OWNER');
    expect(Number(relation.idBuilding)).toBe(1);
    expect(relation.status).toBe('ACTIVE');
  });

  it('falls back to the generic message only when the backend sends none', () => {
    userUnitsService.assignUserToUnit.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500, error: null }))
    );

    fillValidForm(owner.id);
    component.onSubmit();

    expect(component.errorMessage).toBe(
      'La unidad fue creada, pero no se pudo asignar el propietario.'
    );
  });
});
