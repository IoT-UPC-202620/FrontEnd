import { TestBed } from '@angular/core/testing';

import { CommonAreaService } from './common-area.service';
import { provideHttpClient } from '@angular/common/http';

describe('CommonAreaService', () => {
  let service: CommonAreaService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(CommonAreaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
