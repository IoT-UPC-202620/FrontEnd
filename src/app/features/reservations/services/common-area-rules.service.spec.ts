import { TestBed } from '@angular/core/testing';

import { CommonAreaRulesService } from './common-area-rules.service';
import { provideHttpClient } from '@angular/common/http';

describe('CommonAreaRulesService', () => {
  let service: CommonAreaRulesService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(CommonAreaRulesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
