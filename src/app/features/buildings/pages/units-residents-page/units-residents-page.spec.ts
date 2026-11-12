import { ComponentFixture, TestBed } from '@angular/core/testing';

import { of } from 'rxjs';

import { UnitsResidentsPage } from './units-residents-page';
import { provideHttpClient } from '@angular/common/http';

import { UsersService } from '../../../users/services/users.service';
import { UnitsService } from '../../services/units.service';
import { BuildingsService } from '../../services/buildings.service';
import { UserUnitsService } from '../../services/user-units.service';

describe('UnitsResidentsPage', () => {
  let component: UnitsResidentsPage;
  let fixture: ComponentFixture<UnitsResidentsPage>;

  let usersService: { getAll: jasmine.Spy };
  let unitsService: { getByBuildingId: jasmine.Spy };
  let buildingsService: { getAll: jasmine.Spy };
  let userUnitsService: { getResidentsByBuildingId: jasmine.Spy };

  const owners = [
    {
      id: 7,
      fullName: 'Ana Pérez',
      email: 'ana@example.com',
      phone: '987654321',
      roles: ['OWNER'],
      status: 'ACTIVE'
    }
  ];

  const buildings = [
    { idBuilding: 1, name: 'Torre A', district: 'Miraflores' }
  ];

  const units = [
    {
      idUnit: 11,
      idBuilding: 1,
      unitNumber: 101,
      floor: 1,
      status: 'OCCUPIED'
    },
    {
      idUnit: 12,
      idBuilding: 1,
      unitNumber: 102,
      floor: 1,
      status: 'AVAILABLE'
    }
  ];

  const relations = [
    {
      idUserUnit: 1,
      idUnit: 11,
      idUser: 7,
      startDate: '2026-11-01T00:00:00',
      endDate: null,
      status: 'ACTIVE',
      relationType: 'OWNER'
    },
    {
      idUserUnit: 2,
      idBuilding: 1,
      idUnit: 12,
      idUser: null,
      startDate: '2026-11-10T00:00:00',
      endDate: null,
      status: 'FAILED',
      relationType: 'OWNER',
      residentEmail: 'duplicado@example.com',
      failureReason: 'El correo ya está registrado'
    }
  ];

  beforeEach(async () => {
    usersService = {
      getAll: jasmine.createSpy('getAll').and.returnValue(of(owners))
    };

    unitsService = {
      getByBuildingId: jasmine
        .createSpy('getByBuildingId')
        .and.returnValue(of(units))
    };

    buildingsService = {
      getAll: jasmine
        .createSpy('getAll')
        .and.returnValue(of(buildings))
    };

    userUnitsService = {
      getResidentsByBuildingId: jasmine
        .createSpy('getResidentsByBuildingId')
        .and.returnValue(of(relations))
    };

    await TestBed.configureTestingModule({
      imports: [UnitsResidentsPage],
      providers: [
        provideHttpClient(),
        { provide: UsersService, useValue: usersService },
        { provide: UnitsService, useValue: unitsService },
        { provide: BuildingsService, useValue: buildingsService },
        { provide: UserUnitsService, useValue: userUnitsService }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UnitsResidentsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders ACTIVE relations as before', () => {
    const occupied = component.rows.find(row => row.unitId === 11);

    expect(occupied?.residentName).toBe('Ana Pérez');
    expect(occupied?.failedLinks.length).toBe(0);
  });

  it('renders FAILED relations with their reason', () => {
    const failed = component.rows.find(row => row.unitId === 12);

    expect(failed?.failedLinks.length).toBe(1);
    expect(failed?.failedLinks[0].reason).toBe('El correo ya está registrado');
    expect(failed?.residentName).toBe('duplicado@example.com');

    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    const badge = host.querySelector('.failed-links .badge.failed');

    expect(badge).not.toBeNull();
    expect(badge?.getAttribute('title')).toBe('El correo ya está registrado');
    expect(host.textContent).toContain('El correo ya está registrado');
  });
});
