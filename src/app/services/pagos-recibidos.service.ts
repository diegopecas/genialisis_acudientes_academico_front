import {
    HttpClient,
    HttpErrorResponse,
    HttpResponse,
  } from '@angular/common/http';
  import { Injectable } from '@angular/core';
  import { environment } from '../../environments/environment';
  import { throwError } from 'rxjs';
  import { catchError, tap } from 'rxjs/operators';
  import { httpOptions } from './http';
  
  @Injectable({
    providedIn: 'root',
  })
  export class PagosRecibidosService {
    private servicio = environment.api + 'pagos-recibidos';
  
    constructor(private http: HttpClient) {}
  
    obtenerTodos() {
      return this.http
        .get<HttpResponse<Object>>(this.servicio, { observe: 'response' })
        .pipe(
          tap((response: HttpResponse<Object>) => {
            let respuesta: any = response.body;
            if (respuesta.error) {
              throw respuesta.error;
            }
            return response;
          }),
          catchError(this.handleError)
        );
    }
  
    obtenerById(id: any) {
      return this.http
        .get<HttpResponse<Object>>(this.servicio + `/${id}`, {
          observe: 'response',
        })
        .pipe(
          tap((response: HttpResponse<Object>) => {
            let respuesta: any = response.body;
            if (respuesta.error) {
              throw respuesta.error;
            }
            return response;
          }),
          catchError(this.handleError)
        );
    }
    obtenerByEstudiante(idEstudiante: any) {
      return this.http
        .get<HttpResponse<Object>>(this.servicio + `/estudiante/${idEstudiante}`, {
          observe: 'response',
        })
        .pipe(
          tap((response: HttpResponse<Object>) => {
            let respuesta: any = response.body;
            if (respuesta.error) {
              throw respuesta.error;
            }
            return response;
          }),
          catchError(this.handleError)
        );
    }
    crear(elemento: any) {
      var body = JSON.stringify(elemento);
      return this.http.post<any>(this.servicio, body, httpOptions).pipe(
        tap((respuesta: any) => {
          //Se valida que si existe un mensaje de error
          if (respuesta.error) {
            console.log(respuesta);
            throw respuesta.error;
          }
          console.log(respuesta);
          return respuesta;
        }),
        catchError(this.handleError)
      );
    }
    
    actualizar(elemento: any) {
      var body = JSON.stringify(elemento);
      return this.http.put<any>(this.servicio, body, httpOptions).pipe(
        tap((respuesta: any) => {
          //Se valida que si existe un mensaje de error
          if (respuesta.error) {
            console.log(respuesta);
            throw respuesta.error;
          }
          console.log(respuesta);
          return respuesta;
        }),
        catchError(this.handleError)
      );
    }
  
    eliminar(elemento: any) {
      var body = JSON.stringify(elemento);
      return this.http.request<any>('DELETE', this.servicio, {
        body: body,
        headers: httpOptions.headers
      }).pipe(
        tap((respuesta: any) => {
          //Se valida que si existe un mensaje de error
          if (respuesta.error) {
            console.log(respuesta);
            throw respuesta.error;
          }
          console.log(respuesta);
          return respuesta;
        }),
        catchError(this.handleError)
      );
    }
    anular(elemento: any) {
      var body = JSON.stringify(elemento);
      return this.http.put<any>(this.servicio+ "/anular", body, httpOptions).pipe(
        tap((respuesta: any) => {
          //Se valida que si existe un mensaje de error
          if (respuesta.error) {
            console.log(respuesta);
            throw respuesta.error;
          }
          console.log(respuesta);
          return respuesta;
        }),
        catchError(this.handleError)
      );
    }
    contabilizar(elemento: any) {
      var body = JSON.stringify(elemento);
      return this.http.put<any>(this.servicio+ "/contabilizar", body, httpOptions).pipe(
        tap((respuesta: any) => {
          //Se valida que si existe un mensaje de error
          if (respuesta.error) {
            console.log(respuesta);
            throw respuesta.error;
          }
          console.log(respuesta);
          return respuesta;
        }),
        catchError(this.handleError)
      );
    }
    obtenerDatosComprobante(id: any) {
      return this.http
        .get<HttpResponse<Object>>(this.servicio + `/comprobante/${id}`, {
          observe: 'response',
        })
        .pipe(
          tap((response: HttpResponse<Object>) => {
            let respuesta: any = response.body;
            if (respuesta.error) {
              throw respuesta.error;
            }
            return response;
          }),
          catchError(this.handleError)
        );
    }
    private handleError(error: HttpErrorResponse) {
      return throwError(() => error);
    }
  }