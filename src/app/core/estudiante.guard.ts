import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class EstudianteGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // Obtener el ID del estudiante de los parámetros de la ruta
    const idEstudiante = route.params['id'];

    if (!idEstudiante) {
      console.warn('No se encontró ID de estudiante en la ruta');
      this.mostrarErrorYRedirigir('ID de estudiante no válido');
      return false;
    }

    // Verificar si el estudiante pertenece al usuario actual
    const tieneAcceso = this.authService.esEstudianteDelUsuario(idEstudiante);

    if (!tieneAcceso) {
      console.warn(`Acceso denegado al estudiante ${idEstudiante}`);
      this.mostrarErrorYRedirigir('No tienes permisos para acceder a la información de este estudiante');
      return false;
    }

    console.log(`Acceso permitido al estudiante ${idEstudiante}`);
    return true;
  }

  private mostrarErrorYRedirigir(mensaje: string): void {
    Swal.fire({
      title: 'Acceso denegado',
      text: mensaje,
      icon: 'error',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#dc3545'
    }).then(() => {
      // Redirigir al menú principal o lista de estudiantes
      this.router.navigate(['/estudiantes']);
    });
  }
}