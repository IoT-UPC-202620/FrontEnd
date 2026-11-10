import { TestBed } from '@angular/core/testing';

import { AnnouncementsService } from './announcements.service';
import { provideHttpClient } from '@angular/common/http';

describe('AnnouncementsService', () => {
  let service: AnnouncementsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(AnnouncementsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
