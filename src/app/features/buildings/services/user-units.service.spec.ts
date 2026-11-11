import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController
} from '@angular/common/http/testing';

import { UserUnitsService } from './user-units.service';
import { environment } from '../../../../environments/environment';

describe('UserUnitsService', () => {
  let service: UserUnitsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(UserUnitsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('posts the relationType and idBuilding when assigning a user to a unit', () => {
    service.assignUserToUnit({
      idBuilding: 3,
      idUnit: 11,
      idUser: 7,
      startDate: '2026-11-10T00:00:00',
      endDate: null,
      status: 'ACTIVE',
      relationType: 'OWNER'
    }).subscribe();

    const baseUrl = environment.serverBaseUrl.replace(/\/+$/, '');
    const path = environment.userUnitEndpointPath.replace(/^\/+/, '');
    const request = httpMock.expectOne(`${baseUrl}/${path}`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body.relationType).toBe('OWNER');
    expect(request.request.body.idBuilding).toBe(3);
    expect(request.request.body.status).toBe('ACTIVE');

    request.flush({});
  });

  it('defaults relationType to OWNER when the resource omits it', () => {
    service.assignUserToUnit({
      idUnit: 11,
      idUser: 7,
      startDate: '2026-11-10T00:00:00',
      endDate: null,
      status: 'ACTIVE'
    }).subscribe();

    const baseUrl = environment.serverBaseUrl.replace(/\/+$/, '');
    const path = environment.userUnitEndpointPath.replace(/^\/+/, '');
    const request = httpMock.expectOne(`${baseUrl}/${path}`);

    expect(request.request.body.relationType).toBe('OWNER');

    request.flush({});
  });
});
