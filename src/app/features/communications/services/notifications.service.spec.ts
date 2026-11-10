import { TestBed } from '@angular/core/testing';

import { NotificationsService } from './notifications.service';
import { provideHttpClient } from '@angular/common/http';

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(NotificationsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
