import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

export interface TipoDocumento {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  tipo_persona: string;
  requiere_vencimiento: number;
  requiere_firma?: number;
  dias_alerta_vencimiento?: number;
  permite_multiples: number; // 0=único, 1=múltiples
  obligatorio: number;
  activo: number;
}

@Injectable({
  providedIn: 'root'
})
export class TiposDocumentosService {

  private servicio = environment.api + 'tipos-documentos';

  constructor(private http: HttpClient) { }

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

  obtenerPorTipoPersona(codigoTipoPersona: string) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/tipo-persona/${codigoTipoPersona}`, { observe: 'response' })
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

  obtenerById(id: number) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/${id}`, { observe: 'response' })
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