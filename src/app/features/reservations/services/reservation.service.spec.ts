import { TestBed } from '@angular/core/testing';

import { ReservationService } from './reservation.service';
import { provideHttpClient } from '@angular/common/http';

describe('ReservationService', () => {
  let service: ReservationService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(ReservationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
