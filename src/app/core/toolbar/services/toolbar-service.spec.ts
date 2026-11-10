import { TestBed } from '@angular/core/testing';

import { ToolbarService } from './toolbar-service';
import { provideHttpClient } from '@angular/common/http';

describe('ToolbarService', () => {
  let service: ToolbarService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(ToolbarService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
