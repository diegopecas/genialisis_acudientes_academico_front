import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {

  private servicio = environment.api + 'usuarios';
  private servicioAuth = environment.api + 'usuarios-auth';

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

  autenticacion(elemento:any) {
    const body = JSON.stringify(elemento);
    
    return this.http.post<any>(this.servicioAuth, body, httpOptions).pipe(
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
  /**
   * Cambiar contraseña del usuario
   */
  cambiarClave(datos: any): Observable<any> {
    const body = JSON.stringify(datos);
    const headers = {
      'Content-Type': 'application/json'
    };

    return this.http.put<any>(`${this.servicio}/cambiar-clave`, body, { headers })
      .pipe(
        tap((response: any) => {
          if (response?.error) {
            throw new Error(response.error);
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
