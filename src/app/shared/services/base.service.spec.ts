import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { BaseService } from './base.service';

class TestService extends BaseService<{ id: number }> {
  constructor() {
    super();
    this.resourceEndpoint = '/test-resource';
  }

  exposeHandleError(error: HttpErrorResponse) {
    return this.handleError(error);
  }
}

describe('BaseService', () => {
  let service: TestService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), TestService]
    });
    service = TestBed.inject(TestService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('propagates the HttpErrorResponse so the backend message survives', async () => {
    const backendError = new HttpErrorResponse({
      status: 409,
      error: { message: 'La unidad ya tiene un titular activo' }
    });

    const error = await firstValueFrom(
      service.exposeHandleError(backendError)
    ).catch(err => err);

    expect(error instanceof HttpErrorResponse).toBeTrue();
    expect(error.status).toBe(409);
    expect(error.error?.message).toBe('La unidad ya tiene un titular activo');
  });
});
