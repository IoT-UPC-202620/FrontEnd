import { TestBed } from '@angular/core/testing';

import { UnitsService } from './units.service';
import { provideHttpClient } from '@angular/common/http';

describe('UnitsService', () => {
  let service: UnitsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(UnitsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
