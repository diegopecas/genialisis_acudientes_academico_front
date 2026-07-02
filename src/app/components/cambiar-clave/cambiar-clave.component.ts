import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { UsuariosService } from '../../services/usuarios.service';
import { HeaderComponent } from '../../common/header/header.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cambiar-clave',
  templateUrl: './cambiar-clave.component.html',
  styleUrls: ['./cambiar-clave.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CambiarClaveComponent implements OnInit {

  // Datos del formulario
  public claveActual = '';
  public claveNueva = '';
  public confirmarClave = '';

  // Estado del componente
  public cargando = false;
  public mostrarClaveActual = false;
  public mostrarClaveNueva = false;
  public mostrarConfirmarClave = false;

  // Datos del usuario
  public usuario: any = null;
  public nombreCompleto = '';

  // Validaciones
  public errores: any = {
    claveActual: '',
    claveNueva: '',
    confirmarClave: ''
  };

  constructor(
    private router: Router,
    private authService: AuthService,
    private usuariosService: UsuariosService
  ) {}

  ngOnInit(): void {
    this.cargarDatosUsuario();
  }

  /**
   * Cargar datos del usuario actual
   */
  private cargarDatosUsuario(): void {
    this.usuario = this.authService.getUsuarioActual();
    
    if (!this.usuario) {
      console.warn('No hay usuario en sesión');
      this.router.navigate(['/login']);
      return;
    }

    this.nombreCompleto = `${this.usuario.primer_nombre || ''} ${this.usuario.primer_apellido || ''}`.trim();
    console.log('Usuario cargado para cambio de clave:', this.nombreCompleto);
  }

  /**
   * Alternar visibilidad de contraseñas
   */
  toggleMostrarClave(campo: string): void {
    switch (campo) {
      case 'actual':
        this.mostrarClaveActual = !this.mostrarClaveActual;
        break;
      case 'nueva':
        this.mostrarClaveNueva = !this.mostrarClaveNueva;
        break;
      case 'confirmar':
        this.mostrarConfirmarClave = !this.mostrarConfirmarClave;
        break;
    }
  }

  /**
   * Validar formulario en tiempo real
   */
  validarCampo(campo: string): void {
    this.errores[campo] = '';

    switch (campo) {
      case 'claveActual':
        if (!this.claveActual.trim()) {
          this.errores.claveActual = 'La contraseña actual es requerida';
        } else if (this.claveActual.length < 4) {
          this.errores.claveActual = 'La contraseña debe tener al menos 4 caracteres';
        }
        break;

      case 'claveNueva':
        if (!this.claveNueva.trim()) {
          this.errores.claveNueva = 'La nueva contraseña es requerida';
        } else if (this.claveNueva.length < 6) {
          this.errores.claveNueva = 'La nueva contraseña debe tener al menos 6 caracteres';
        } else if (this.claveNueva === this.claveActual) {
          this.errores.claveNueva = 'La nueva contraseña debe ser diferente a la actual';
        } else if (!this.validarFortalezaClave(this.claveNueva)) {
          this.errores.claveNueva = 'La contraseña debe contener al menos una letra y un número';
        }

        // Re-validar confirmación si ya tiene valor
        if (this.confirmarClave) {
          this.validarCampo('confirmarClave');
        }
        break;

      case 'confirmarClave':
        if (!this.confirmarClave.trim()) {
          this.errores.confirmarClave = 'Confirma tu nueva contraseña';
        } else if (this.confirmarClave !== this.claveNueva) {
          this.errores.confirmarClave = 'Las contraseñas no coinciden';
        }
        break;
    }
  }

  /**
   * Validar fortaleza de la contraseña
   */
  private validarFortalezaClave(clave: string): boolean {
    const tieneLetra = /[a-zA-Z]/.test(clave);
    const tieneNumero = /[0-9]/.test(clave);
    return tieneLetra && tieneNumero;
  }

  /**
   * Validar todo el formulario
   */
  private validarFormulario(): boolean {
    this.validarCampo('claveActual');
    this.validarCampo('claveNueva');
    this.validarCampo('confirmarClave');

    return !this.errores.claveActual && 
           !this.errores.claveNueva && 
           !this.errores.confirmarClave;
  }

  /**
   * Obtener nivel de fortaleza de la contraseña
   */
  getNivelFortaleza(): { nivel: string, clase: string, porcentaje: number } {
    if (!this.claveNueva) {
      return { nivel: '', clase: '', porcentaje: 0 };
    }

    let puntos = 0;
    
    // Longitud
    if (this.claveNueva.length >= 6) puntos++;
    if (this.claveNueva.length >= 8) puntos++;
    
    // Caracteres
    if (/[a-z]/.test(this.claveNueva)) puntos++;
    if (/[A-Z]/.test(this.claveNueva)) puntos++;
    if (/[0-9]/.test(this.claveNueva)) puntos++;
    if (/[^a-zA-Z0-9]/.test(this.claveNueva)) puntos++;

    if (puntos <= 2) {
      return { nivel: 'Débil', clase: 'debil', porcentaje: 30 };
    } else if (puntos <= 4) {
      return { nivel: 'Media', clase: 'media', porcentaje: 60 };
    } else {
      return { nivel: 'Fuerte', clase: 'fuerte', porcentaje: 100 };
    }
  }

  /**
   * Métodos para verificar requisitos de contraseña
   */
  tieneMinCaracteres(): boolean {
    return this.claveNueva.length >= 6;
  }

  tieneMinusculas(): boolean {
    return /[a-z]/.test(this.claveNueva);
  }

  tieneMayusculas(): boolean {
    return /[A-Z]/.test(this.claveNueva);
  }

  tieneNumeros(): boolean {
    return /[0-9]/.test(this.claveNueva);
  }

  tieneSimbolos(): boolean {
    return /[^a-zA-Z0-9]/.test(this.claveNueva);
  }

  /**
   * Procesar cambio de contraseña
   */
  async cambiarClave(): Promise<void> {
    if (!this.validarFormulario()) {
      this.mostrarError('Por favor corrige los errores en el formulario');
      return;
    }

    this.cargando = true;

    try {
      const datosActualizacion = {
        id: this.usuario.id,
        usuario: this.usuario.usuario,
        claveActual: this.claveActual,
        claveNueva: this.claveNueva
      };

      console.log('Enviando cambio de contraseña para usuario:', this.usuario.usuario);

      // Llamar al servicio para cambiar la contraseña
      this.usuariosService.cambiarClave(datosActualizacion).subscribe({
        next: async (response: any) => {
          console.log('Respuesta del servidor:', response);
          
          if (response && response.success !== false) {
            await this.mostrarExito();
            this.limpiarFormulario();
            // Opcionalmente, cerrar sesión para que el usuario entre con la nueva clave
            await this.preguntarCerrarSesion();
          } else {
            this.mostrarError(response.message || 'Error al cambiar la contraseña');
          }
        },
        error: (error: any) => {
          console.error('Error al cambiar contraseña:', error);
          this.mostrarError('Error de conexión. Intenta nuevamente.');
        }
      });

    } catch (error) {
      console.error('Error inesperado:', error);
      this.mostrarError('Error inesperado. Intenta nuevamente.');
    } finally {
      this.cargando = false;
    }
  }

  /**
   * Preguntar si cerrar sesión después del cambio
   */
  private async preguntarCerrarSesion(): Promise<void> {
    const result = await Swal.fire({
      title: '¿Cerrar sesión?',
      text: 'Se recomienda cerrar sesión para aplicar los cambios',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Cerrar sesión',
      cancelButtonText: 'Continuar',
      confirmButtonColor: '#007bff'
    });

    if (result.isConfirmed) {
      this.cerrarSesion();
    } else {
      this.router.navigate(['/menu']);
    }
  }

  /**
   * Cerrar sesión
   */
  private cerrarSesion(): void {
    sessionStorage.removeItem('usuario');
    this.authService.limpiarEstudiantesIds();
    this.router.navigate(['/login']);
  }

  /**
   * Limpiar formulario
   */
  private limpiarFormulario(): void {
    this.claveActual = '';
    this.claveNueva = '';
    this.confirmarClave = '';
    this.errores = {
      claveActual: '',
      claveNueva: '',
      confirmarClave: ''
    };
  }

  /**
   * Cancelar y volver al menú
   */
  cancelar(): void {
    if (this.claveActual || this.claveNueva || this.confirmarClave) {
      Swal.fire({
        title: '¿Cancelar cambios?',
        text: 'Se perderán los datos ingresados',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, cancelar',
        cancelButtonText: 'Continuar editando'
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/menu']);
        }
      });
    } else {
      this.router.navigate(['/menu']);
    }
  }

  /**
   * Mostrar mensaje de éxito
   */
  private mostrarExito(): Promise<any> {
    return Swal.fire({
      title: '¡Contraseña actualizada!',
      text: 'Tu contraseña ha sido cambiada exitosamente',
      icon: 'success',
      confirmButtonText: 'Excelente'
    });
  }

  /**
   * Mostrar mensaje de error
   */
  private mostrarError(mensaje: string): void {
    Swal.fire({
      title: 'Error',
      text: mensaje,
      icon: 'error',
      confirmButtonText: 'Entendido'
    });
  }
}