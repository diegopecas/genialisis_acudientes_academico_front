import { Injectable } from '@angular/core';
import { AcudientesService } from './acudientes.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

/**
 * Maneja los IDs de estudiantes del acudiente en sesión.
 *
 * Vive solo en el portal de acudientes: depende de AcudientesService y del
 * concepto "mis estudiantes", que no existe en el portal institucional. Por
 * eso está aparte de AuthService, que sí es idéntico entre ambos repos.
 */
@Injectable({
  providedIn: 'root'
})
export class EstudiantesSessionService {

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
}