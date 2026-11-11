import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { catchError, Observable, retry, throwError } from 'rxjs';

export abstract class BaseService<T> {
  protected httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };
  protected serverBaseUrl: string = `${environment.serverBaseUrl}`;
  protected resourceEndpoint: string = '';
  protected http: HttpClient = inject(HttpClient);

  protected handleError(error: HttpErrorResponse) {
    console.error(`Server-side error: ${error.status} - ${error.message}`);
    /*
     * Propagate the HttpErrorResponse instead of a generic Error so callers
     * can read the backend body (e.g. `{"message": "..."}` on a 409 conflict).
     */
    return throwError(() => error);
  }

  protected resourcePath(): string {

    return `${this.serverBaseUrl.replace(/\/+$/, '')}/${this.resourceEndpoint.replace(/^\/+/, '')}`;
  }

  public getAll(): Observable<T[]> {
    return this.http.get<T[]>(this.resourcePath(), this.httpOptions)
      .pipe(retry(2), catchError(this.handleError));
  }

  public getById(id: number | string): Observable<T> {
    return this.http.get<T>(`${this.resourcePath()}/${id}`, this.httpOptions)
      .pipe(retry(2), catchError(this.handleError));
  }

  public create(resource: T): Observable<T> {
    const sanitizedResource = { ...resource } as T & { [key: string]: any };
    delete sanitizedResource['apiId'];

    return this.http.post<T>(this.resourcePath(), sanitizedResource, this.httpOptions)
      .pipe(retry(2), catchError(this.handleError));
  }


  public update(id: number | string, resource: T): Observable<T> {
    return this.http.put<T>(`${this.resourcePath()}/${id}`, resource, this.httpOptions)
      .pipe(retry(2), catchError(this.handleError));
  }

  public patch(id: number | string, payload: Partial<T>): Observable<T> {
    return this.http.patch<T>(`${this.resourcePath()}/${id}`, payload, this.httpOptions)
      .pipe(retry(2), catchError(this.handleError));
  }

  public delete(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.resourcePath()}/${id}`, this.httpOptions)
      .pipe(retry(2), catchError(this.handleError));
  }
}
