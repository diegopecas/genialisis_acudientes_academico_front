import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth_acudientes.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    const usuario = this.authService.getUsuarioActual();
    
    if (usuario) {
      console.log('Usuario autenticado:', usuario.primer_nombre);
      return true;
    }
    
    console.warn('Usuario no autenticado, redirigiendo a login');
    this.router.navigate(['/login']);
    return false;
  }
}