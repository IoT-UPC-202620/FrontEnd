import { TestBed } from '@angular/core/testing';

import { PostsService } from './posts.service';
import { provideHttpClient } from '@angular/common/http';

describe('PostsService', () => {
  let service: PostsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(PostsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
