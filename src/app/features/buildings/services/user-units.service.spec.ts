import { TestBed } from '@angular/core/testing';

import { UserUnitsService } from './user-units.service';
import { provideHttpClient } from '@angular/common/http';

describe('UserUnitsService', () => {
  let service: UserUnitsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(UserUnitsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
