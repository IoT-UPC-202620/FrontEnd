import { TestBed } from '@angular/core/testing';

import { AnnouncementReadsService } from './announcement-reads.service';
import { provideHttpClient } from '@angular/common/http';

describe('AnnouncementReadsService', () => {
  let service: AnnouncementReadsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(AnnouncementReadsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
