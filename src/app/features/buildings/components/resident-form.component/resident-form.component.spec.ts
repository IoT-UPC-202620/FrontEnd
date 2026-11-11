import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';

import { of, Subject, throwError } from 'rxjs';

import { ResidentFormComponent } from './resident-form.component';

import { BuildingsService } from '../../services/buildings.service';
import { UnitsService } from '../../services/units.service';
import { ResidentRegistrationService } from '../../services/resident-registration.service';

describe('ResidentFormComponent', () => {
  let component: ResidentFormComponent;
  let fixture: ComponentFixture<ResidentFormComponent>;

  let buildingsService: { getAll: jasmine.Spy };
  let unitsService: { getByBuildingId: jasmine.Spy };
  let registrationService: { registerResident: jasmine.Spy };

  const buildings = [
    { idBuilding: 1, name: 'Edificio Los Olivos', district: 'Miraflores' },
    { idBuilding: 2, name: 'Condominio San Gabriel', district: 'Surco' }
  ];

  const unitsOf = (idBuilding: number) => [
    {
      idUnit: idBuilding * 10 + 1,
      idBuilding,
      unitNumber: '101',
      floor: 1,
      status: 'AVAILABLE'
    }
  ];

  beforeEach(async () => {
    buildingsService = { getAll: jasmine.createSpy('getAll').and.returnValue(of(buildings)) };
    unitsService = {
      getByBuildingId: jasmine
        .createSpy('getByBuildingId')
        .and.callFake((id: number) => of(unitsOf(id)))
    };
    registrationService = {
      registerResident: jasmine.createSpy('registerResident').and.returnValue(of({}))
    };

    await TestBed.configureTestingModule({
      imports: [ResidentFormComponent],
      providers: [
        { provide: BuildingsService, useValue: buildingsService },
        { provide: UnitsService, useValue: unitsService },
        { provide: ResidentRegistrationService, useValue: registrationService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResidentFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads buildings on init', () => {
    expect(component.buildings.length).toBe(2);
  });

  const fillValidForm = () => {
    component.residentForm.patchValue({ buildingId: 1 });
    component.onBuildingChange();

    const unit = unitsOf(1)[0];
    component.residentForm.patchValue({
      fullName: 'Luis Torres Ramos',
      email: 'luis@example.com',
      phone: '987654321',
      documentNumber: '12345678',
      unitId: unit.idUnit
    });
  };

  it('shows the backend E3 409 message in the alert box', () => {
    registrationService.registerResident.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { message: 'El correo ya está registrado' }
          })
      )
    );

    fillValidForm();
    component.onSubmit();
    fixture.detectChanges();

    expect(component.errorMessage).toBe('El correo ya está registrado');

    const alert = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('El correo ya está registrado');
  });

  it('shows the backend 503 message when IAM cannot be verified', () => {
    registrationService.registerResident.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 503,
            error: {
              message: 'No se pudo verificar el correo; inténtalo de nuevo'
            }
          })
      )
    );

    fillValidForm();
    component.onSubmit();
    fixture.detectChanges();

    expect(component.errorMessage).toBe(
      'No se pudo verificar el correo; inténtalo de nuevo'
    );

    const alert = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain(
      'No se pudo verificar el correo; inténtalo de nuevo'
    );
  });

  it('does not submit while the unit control is disabled', () => {
    component.residentForm.patchValue({
      fullName: 'Luis Torres Ramos',
      email: 'luis@example.com',
      phone: '987654321',
      documentNumber: '12345678',
      buildingId: 1
    });

    component.onSubmit();

    expect(registrationService.registerResident).not.toHaveBeenCalled();
    expect(component.errorMessage).toContain('unidad');
  });

  it('ignores a stale units response after switching towers', () => {
    const firstTower = new Subject<any[]>();
    const secondTower = new Subject<any[]>();

    unitsService.getByBuildingId.and.callFake((id: number) =>
      id === 1 ? firstTower.asObservable() : secondTower.asObservable()
    );

    component.residentForm.patchValue({ buildingId: 1 });
    component.onBuildingChange();

    component.residentForm.patchValue({ buildingId: 2 });
    component.onBuildingChange();

    secondTower.next(unitsOf(2) as any);
    secondTower.complete();

    firstTower.next(unitsOf(1) as any);
    firstTower.complete();

    expect(component.units.every(u => u.idBuilding === 2)).toBeTrue();
    expect(component.residentForm.get('unitId')?.enabled).toBeTrue();
  });

  it('emits close(true) after a successful registration', () => {
    const closeSpy = jasmine.createSpy('close');
    component.close.subscribe(closeSpy);

    component.residentForm.patchValue({ buildingId: 1 });
    component.onBuildingChange();

    const unit = unitsOf(1)[0];
    component.residentForm.patchValue({
      fullName: 'Luis Torres Ramos',
      email: 'luis@example.com',
      phone: '987654321',
      documentNumber: '12345678',
      unitId: unit.idUnit
    });

    component.onSubmit();

    expect(registrationService.registerResident).toHaveBeenCalledTimes(1);
    expect(closeSpy).toHaveBeenCalledWith(true);
  });

  it('does not post when the form is invalid', () => {
    component.onSubmit();

    expect(registrationService.registerResident).not.toHaveBeenCalled();
  });
});
