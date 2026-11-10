import { TestBed } from '@angular/core/testing';

import { BuildingsService } from './buildings.service';
import { provideHttpClient } from '@angular/common/http';

describe('BuildingsService', () => {
  let service: BuildingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(BuildingsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
