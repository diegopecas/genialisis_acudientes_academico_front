import { Component, OnInit } from '@angular/core';
import { UsuariosService } from '../../services/usuarios.service';
import { AuthMasterService } from '../../services/auth-master.service';
import { AuthService } from '../../services/auth.service';
import { AutorizacionesHabeasDataService } from '../../services/autorizaciones-habeas-data.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InstitucionConfigService } from '../../services/institucion-config.service';
import { HabeasDataModalComponent } from '../habeas-data-modal/habeas-data-modal.component';

interface Tenant {
  id: number;
  codigo: string;
  nombre: string;
  logo_url?: string;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HabeasDataModalComponent],
})
export class LoginComponent implements OnInit {
  public usuario: string = '';
  public password: string = '';
  public showPassword: boolean = false;
  public isLoading: boolean = false;

  public mostrarSelectorTenant: boolean = false;
  public tenantsDisponibles: Tenant[] = [];
  public tenantSeleccionado: Tenant | null = null;

  // Habeas Data
  public mostrarHabeasData: boolean = false;
  public usuarioLogueado: any = null;

  public logoGenialisis: string = '/assets/images/logo_app.png';
  public currentYear: number = new Date().getFullYear();

  public logoBasicoUrl: string = '';
  public nombreInstitucion: string = 'Genialisis';

  constructor(
    private usuariosService: UsuariosService,
    private authMasterService: AuthMasterService,
    private authService: AuthService,
    private autorizacionesHabeasDataService: AutorizacionesHabeasDataService,
    private router: Router,
    private institucionConfigService: InstitucionConfigService,
  ) {}

  ngOnInit(): void {
    this.authService.limpiarSesion();
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  ingresar(): void {
    if (!this.usuario || !this.password) {
      Swal.fire({
        title: 'Campos incompletos',
        text: 'Por favor ingresa tu usuario y contraseña',
        icon: 'warning',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#FFC107',
      });
      return;
    }

    this.isLoading = true;

    this.authMasterService.preLogin(this.usuario).subscribe({
      next: (response) => {
        if (response.cantidad === 0) {
          this.isLoading = false;
          Swal.fire({
            title: 'Usuario no encontrado',
            text: 'No existe una cuenta asociada a este usuario',
            icon: 'error',
            confirmButtonText: 'Reintentar',
            confirmButtonColor: '#FFC107',
          });
          return;
        }

        if (response.cantidad === 1) {
          this.seleccionarTenantYContinuar(response.tenants[0]);
        } else {
          this.isLoading = false;
          this.tenantsDisponibles = response.tenants;
          this.mostrarSelectorTenant = true;
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error en pre-login:', error);
        Swal.fire({
          title: 'Error de conexión',
          text: 'No se pudo conectar con el servidor',
          icon: 'error',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#FFC107',
        });
      },
    });
  }

  seleccionarTenant(tenant: Tenant): void {
    this.tenantSeleccionado = tenant;
  }

  confirmarSeleccionTenant(): void {
    if (this.tenantSeleccionado) {
      this.mostrarSelectorTenant = false;
      this.isLoading = true;
      this.seleccionarTenantYContinuar(this.tenantSeleccionado);
    }
  }

  cerrarSelectorTenant(): void {
    this.mostrarSelectorTenant = false;
    this.tenantsDisponibles = [];
    this.tenantSeleccionado = null;
  }

  private seleccionarTenantYContinuar(tenant: Tenant): void {
    this.institucionConfigService.setTenantManual(tenant.codigo, tenant.nombre);
    this.nombreInstitucion = tenant.nombre;
    this.logoBasicoUrl = `/assets/images/instituciones/${tenant.codigo}/logo_basico.png`;

    const credenciales = {
      usuario: this.usuario,
      clave: this.password,
      portal: 'padres',
    };

    this.usuariosService.autenticacion(credenciales).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        const data = response[0];

        // Verificar si es error de usuario inactivo
        if (data?.error && data?.code === 'USER_INACTIVE') {
          Swal.fire({
            title: 'Usuario inactivo',
            text: 'Tu cuenta no está activa en esta institución. Contacta al administrador.',
            icon: 'warning',
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#FFC107',
          });
          return;
        }

        if (data) {
          // Verificar acceso al portal de padres
          if (!data.acceso_portal_padres || data.acceso_portal_padres == 0) {
            Swal.fire({
              title: 'Sin acceso al portal',
              text: 'Tu usuario no tiene habilitado el acceso al Portal de Padres. Contacta al administrador de tu institución.',
              icon: 'warning',
              confirmButtonText: 'Entendido',
              confirmButtonColor: '#FFC107',
            });
            return;
          }

          // El token si se guarda: el interceptor lo necesita para llamar a
          // los endpoints de habeas data. El 'usuario' NO, porque es lo unico
          // que mira AuthGuard. Sin esa clave, el boton atras, la URL directa
          // y el recargar quedan cerrados.
          if (data.token) {
            this.authService.reemplazarToken(data.token);
          }

          const usuarioSinToken = { ...data };
          delete usuarioSinToken.token;
          usuarioSinToken.portal = 'padres';

          this.usuarioLogueado = usuarioSinToken;
          this.verificarHabeasData();
        } else {
          Swal.fire({
            title: 'Contraseña incorrecta',
            text: 'La contraseña ingresada no es válida',
            icon: 'error',
            confirmButtonText: 'Reintentar',
            confirmButtonColor: '#FFC107',
          });
        }
      },
      error: (error) => {
        this.isLoading = false;
        Swal.fire({
          title: 'Error de conexión',
          text: 'No se pudo conectar con el servidor',
          icon: 'error',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#FFC107',
        });
      },
    });
  }

  /**
   * El backend decide si la politica es exigible. El front solo obedece.
   * Ante un error tecnico NO se deja pasar: se aborta el login.
   */
  private verificarHabeasData(): void {
    this.autorizacionesHabeasDataService.verificar().subscribe({
      next: (response: any) => {
        const data: any = response.body;

        if (data.requiere_autorizacion) {
          this.mostrarHabeasData = true;
          return;
        }

        this.iniciarSesion();
      },
      error: (error: any) => {
        console.error('Error al verificar habeas data:', error);
        this.abortarLogin(
          'No se pudo verificar la política de tratamiento de datos. Intenta de nuevo.'
        );
      },
    });
  }

  /**
   * Unico punto donde la sesion queda establecida.
   */
  private iniciarSesion(): void {
    this.authService.guardarSesion(this.usuarioLogueado);
    this.navegarAlMenu();
  }

  private abortarLogin(mensaje: string): void {
    this.mostrarHabeasData = false;
    this.usuarioLogueado = null;
    this.authService.limpiarSesion();
    Swal.fire({
      title: 'No pudimos continuar',
      text: mensaje,
      icon: 'error',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#FFC107',
    });
  }

  onHabeasDataAutorizado(tokenNuevo: string): void {
    // El token nuevo trae el pasaporte hd_ok firmado por el servidor.
    this.authService.reemplazarToken(tokenNuevo);
    this.mostrarHabeasData = false;
    this.iniciarSesion();
  }

  private navegarAlMenu(): void {
    this.institucionConfigService
      .cargarConfiguracionTenant()
      .then(() => {
        this.router.navigate(['/menu']);
      })
      .catch(() => {
        this.router.navigate(['/menu']);
      });
  }

  mostrarAyudaContrasena(): void {
    Swal.fire({
      title: '¿Olvidaste tu contraseña?',
      html: `
        <div style="text-align: center; padding: 20px 10px;">
          <p style="font-size: 16px; color: #2D2D2D; margin-bottom: 20px; line-height: 1.6;">
            Para recuperar tu contraseña, por favor contacta al administrador de tu institución.
          </p>
          <div style="background: #FAF8F3; padding: 16px; border-radius: 12px; border-left: 4px solid #FFC107;">
            <p style="font-size: 14px; color: #757575; margin: 0;">
              💡 El administrador podrá restablecer tu contraseña de forma segura
            </p>
          </div>
        </div>
      `,
      icon: 'info',
      iconColor: '#FFC107',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#FFC107',
    });
  }

  private limpiarCampos(): void {
    this.password = '';
    this.usuario = '';
    this.showPassword = false;
    this.tenantSeleccionado = null;
    this.tenantsDisponibles = [];
  }

}