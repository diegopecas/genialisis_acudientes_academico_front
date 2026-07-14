import { Injectable } from '@angular/core';
import { AcudientesService } from './acudientes.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private acudientesService: AcudientesService) { }

  /**
   * Almacena los IDs de estudiantes del usuario en sessionStorage
   */
  almacenarEstudiantesIds(idPersona: any): Observable<boolean> {
    return this.acudientesService.obtenerMisEstudiantesIds(idPersona).pipe(
      map((response: any) => {
        const body = response.body as any[];
        const idsEstudiantes: string[] = body.map(e => e.id_estudiante);

        sessionStorage.setItem('estudiantesIds', JSON.stringify(idsEstudiantes));
        console.log('IDs de estudiantes almacenados:', idsEstudiantes);

        return true;
      }),
      catchError((error) => {
        console.error('Error al obtener IDs de estudiantes:', error);
        return of(false);
      })
    );
  }

  /**
   * Verifica si un estudiante pertenece al usuario actual
   */
  esEstudianteDelUsuario(idEstudiante: string): boolean {
    try {
      const idsString = sessionStorage.getItem('estudiantesIds');
      if (!idsString) {
        console.warn('No hay IDs de estudiantes en sessionStorage');
        return false;
      }
      const idsEstudiantes: string[] = JSON.parse(idsString);
      const perteneceAlUsuario = idsEstudiantes.includes(idEstudiante);

      console.log(`Verificando acceso: estudiante ${idEstudiante}, permitido: ${perteneceAlUsuario}`);
      console.log('IDs permitidos:', idsEstudiantes);

      return perteneceAlUsuario;
    } catch (error) {
      console.error('Error verificando estudiante:', error);
      return false;
    }
  }

  /**
   * Obtiene los IDs de estudiantes del usuario
   */
  getEstudiantesIds(): string[] {
    try {
      const idsString = sessionStorage.getItem('estudiantesIds');
      return idsString ? JSON.parse(idsString) : [];
    } catch (error) {
      console.error('Error obteniendo IDs de estudiantes:', error);
      return [];
    }
  }

  /**
   * Limpia los IDs de estudiantes del sessionStorage
   */
  limpiarEstudiantesIds(): void {
    sessionStorage.removeItem('estudiantesIds');
  }

  /**
   * Obtiene el usuario actual desde sessionStorage
   */
  getUsuarioActual(): any {
    try {
      const usuarioString = sessionStorage.getItem('usuario');
      return usuarioString ? JSON.parse(usuarioString) : null;
    } catch (error) {
      console.error('Error obteniendo usuario actual:', error);
      return null;
    }
  }

  /**
   * Decodifica el payload del JWT sin validarlo.
   *
   * Sirve solo para decidir qué mostrar. La firma la valida el servidor:
   * un payload alterado aquí no abre nada, porque el backend rechaza el
   * token en cada petición.
   */
  getTokenPayload(): any {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) return null;

      const partes = token.split('.');
      if (partes.length !== 3) return null;

      const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
      const relleno = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const json = decodeURIComponent(
        atob(relleno)
          .split('')
          .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
          .join('')
      );

      return JSON.parse(json)?.data ?? null;
    } catch (error) {
      console.error('Error decodificando token:', error);
      return null;
    }
  }

  /**
   * True si el token trae el pasaporte de habeas data, o si el portal
   * del token no lo exige (institucional, o tokens previos al cambio).
   */
  tieneHabeasDataVigente(): boolean {
    const payload = this.getTokenPayload();
    if (!payload) return false;

    if (payload.portal !== 'padres') return true;

    return payload.hd_ok === true;
  }

  guardarSesion(usuario: any): void {
    sessionStorage.setItem('usuario', JSON.stringify(usuario));
  }

  reemplazarToken(token: string): void {
    sessionStorage.setItem('token', token);
  }

  limpiarSesion(): void {
    sessionStorage.removeItem('usuario');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('institucion_actual');
    sessionStorage.removeItem('estudiantesIds');
    sessionStorage.removeItem('cumpleanos_cache');
  }
}