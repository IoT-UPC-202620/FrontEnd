import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { BaseService } from './base.service';

class TestService extends BaseService<{ id: number }> {
  protected override resourceEndpoint = 'things';
}

describe('BaseService', () => {
  let service: TestService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TestService, provideHttpClient()]
    });
    service = TestBed.inject(TestService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
