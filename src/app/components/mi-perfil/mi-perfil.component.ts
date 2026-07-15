import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../common/header/header.component';
import { PersonasService } from '../../services/personas.service';
import { GenerosService } from '../../services/generos.service';
import { CiudadesService } from '../../services/ciudades.service';
import { TiposIdentificacionService } from '../../services/tipos-identificacion.service';
import { AuthService } from '../../services/auth.service';
import { HistorialCambiosPersonaService } from '../../services/historial-cambios-persona.service';
import { AutorizacionesHabeasDataService } from '../../services/autorizaciones-habeas-data.service';
import { UsuariosService } from '../../services/usuarios.service';
import { DocumentosPersonaComponent } from '../../common/documentos-persona/documentos-persona.component';
import { FotoPersonaComponent } from '../../common/foto-persona/foto-persona.component';
import { HabeasDataModalComponent } from '../habeas-data-modal/habeas-data-modal.component';
import { ConfiguracionGlobalService } from '../../services/configuracion-global.service';

interface DatosPersonales {
  idPersona: string;
  tipoIdentificacion: number | string;
  numeroIdentificacion: number | string;
  primerNombre: string;
  segundoNombre: string;
  primerApellido: string;
  segundoApellido: string;
  fechaNacimiento: string;
  genero: number | string;
  direccion: string;
  correoElectronico: string;
  telefono: string;
  nacionalidad: string;
  ciudad: number | string;
  ocupacion: string;
  rh: string;
}

@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    DocumentosPersonaComponent,
    FotoPersonaComponent,
    HabeasDataModalComponent,
  ],
  templateUrl: './mi-perfil.component.html',
  styleUrl: './mi-perfil.component.scss',
})
export class MiPerfilComponent implements OnInit {
  public titulo = 'Mi Perfil';
  public regresar = '/menu';
  public seccionActiva: 'datos-personales' | 'documentos' | 'cambiar-clave' = 'datos-personales';
  public cargando = true;
  public guardando = false;
  public submitted = false;

  // Habeas Data
  public mostrarHabeasData = false;
  public habeasDataVerificado = false;

  // Control foto editable por configuración global
  public fotoAcudienteEditable = false;

  public usuario: any = null;
  public datosOriginales: DatosPersonales | null = null;

  public listas = {
    tiposIdentificacion: [] as any[],
    generos: [] as any[],
    ciudades: [] as any[],
    gruposRh: [
      { id: 'O+', nombre: 'O+' },
      { id: 'O-', nombre: 'O-' },
      { id: 'A+', nombre: 'A+' },
      { id: 'A-', nombre: 'A-' },
      { id: 'B+', nombre: 'B+' },
      { id: 'B-', nombre: 'B-' },
      { id: 'AB+', nombre: 'AB+' },
      { id: 'AB-', nombre: 'AB-' },
    ],
  };

  public model: DatosPersonales = {
    idPersona: '',
    tipoIdentificacion: '',
    numeroIdentificacion: '',
    primerNombre: '',
    segundoNombre: '',
    primerApellido: '',
    segundoApellido: '',
    fechaNacimiento: '',
    genero: '',
    direccion: '',
    correoElectronico: '',
    telefono: '',
    nacionalidad: 'Colombiana',
    ciudad: '',
    ocupacion: '',
    rh: '',
  };

  // ========== CAMBIAR CLAVE ==========
  public claveActual = '';
  public claveNueva = '';
  public confirmarClave = '';
  public cargandoClave = false;
  public mostrarClaveActual = false;
  public mostrarClaveNueva = false;
  public mostrarConfirmarClave = false;
  public erroresClave: any = {
    claveActual: '',
    claveNueva: '',
    confirmarClave: ''
  };

  constructor(
    private router: Router,
    private personasService: PersonasService,
    private generosService: GenerosService,
    private ciudadesService: CiudadesService,
    private tiposIdentificacionService: TiposIdentificacionService,
    private authService: AuthService,
    private historialService: HistorialCambiosPersonaService,
    private autorizacionesHabeasDataService: AutorizacionesHabeasDataService,
    private configuracionService: ConfiguracionGlobalService,
    private usuariosService: UsuariosService,
  ) {}

  ngOnInit(): void {
    this.usuario = this.authService.getUsuarioActual();

    if (!this.usuario || !this.usuario.id_persona) {
      Swal.fire('Error', 'No se pudo obtener la información del usuario', 'error');
      this.router.navigate(['/menu']);
      return;
    }

    this.verificarHabeasData();
    this.cargarConfiguracionFoto();
  }

  cargarConfiguracionFoto(): void {
    this.configuracionService.obtenerByClave('portal_padres_foto_acudiente_editable').subscribe({
      next: (response: any) => {
        const config = response.body;
        if (config && config.valor_texto) {
          this.fotoAcudienteEditable = String(config.valor_texto) === '1';
        }
      },
      error: (error: any) => {
        console.error('Error al cargar configuración de foto:', error);
        this.fotoAcudienteEditable = false;
      },
    });
  }

  verificarHabeasData(): void {
    this.autorizacionesHabeasDataService.verificar().subscribe({
      next: (response: any) => {
        const data: any = response.body;
        if (data.requiere_autorizacion) {
          this.mostrarHabeasData = true;
        } else {
          this.habeasDataVerificado = true;
          this.iniciarCarga();
        }
      },
      error: (error: any) => {
        console.error('Error al verificar habeas data:', error);
        // No se deja pasar ante error: el guard ya valido el acceso, y una
        // falla aqui no debe habilitar la carga como si estuviera autorizado.
        this.router.navigate(['/menu']);
      },
    });
  }

  onHabeasDataAutorizado(tokenNuevo: string): void {
    this.authService.reemplazarToken(tokenNuevo);
    this.mostrarHabeasData = false;
    this.habeasDataVerificado = true;
    this.iniciarCarga();
  }

  iniciarCarga(): void {
    this.cargarListas();
    this.cargarDatosPersona();
  }

  cargarListas(): void {
    this.tiposIdentificacionService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.listas.tiposIdentificacion = response.body;
      },
    });

    this.generosService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.listas.generos = response.body;
      },
    });

    this.ciudadesService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.listas.ciudades = response.body;
      },
    });
  }

  cargarDatosPersona(): void {
    this.cargando = true;

    this.personasService.obtenerById(this.usuario.id_persona).subscribe({
      next: (response: any) => {
        const persona = response.body[0];
        if (persona) {
          this.llenarFormulario(persona);
          this.datosOriginales = { ...this.model };
        }
        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error al cargar datos:', error);
        this.cargando = false;
        Swal.fire('Error', 'No se pudieron cargar los datos personales', 'error');
      },
    });
  }

  llenarFormulario(persona: any): void {
    this.model = {
      idPersona: persona.id,
      tipoIdentificacion: persona.id_tipo_identificacion,
      numeroIdentificacion: persona.numero_identificacion,
      primerNombre: persona.primer_nombre || '',
      segundoNombre: persona.segundo_nombre || '',
      primerApellido: persona.primer_apellido || '',
      segundoApellido: persona.segundo_apellido || '',
      fechaNacimiento: persona.fecha_nacimiento || '',
      genero: persona.id_genero || '',
      direccion: persona.direccion || '',
      correoElectronico: persona.correo_electronico || '',
      telefono: persona.telefono || '',
      nacionalidad: persona.nacionalidad || 'Colombiana',
      ciudad: persona.id_ciudad || '',
      ocupacion: persona.ocupacion || '',
      rh: persona.rh || '',
    };
  }

  guardarDatos(): void {
    this.submitted = true;

    if (!this.model.primerNombre || !this.model.primerApellido) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor complete los campos obligatorios',
      });
      return;
    }

    const cambios = this.detectarCambios();

    if (cambios.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sin cambios',
        text: 'No se detectaron modificaciones en los datos',
      });
      return;
    }

    this.guardando = true;

    const personaData = {
      id: this.model.idPersona,
      primer_nombre: this.model.primerNombre,
      segundo_nombre: this.model.segundoNombre || null,
      primer_apellido: this.model.primerApellido,
      segundo_apellido: this.model.segundoApellido || null,
      id_tipo_identificacion: this.model.tipoIdentificacion,
      numero_identificacion: this.model.numeroIdentificacion,
      fecha_nacimiento: this.model.fechaNacimiento || null,
      id_genero: this.model.genero === '' ? null : this.model.genero,
      direccion: this.model.direccion || null,
      correo_electronico: this.model.correoElectronico || null,
      nacionalidad: this.model.nacionalidad || 'Colombiana',
      telefono: this.model.telefono || null,
      id_ciudad: this.model.ciudad === '' ? null : this.model.ciudad,
      ocupacion: this.model.ocupacion || null,
      rh: this.model.rh || null,
    };

    this.personasService.actualizar(personaData).subscribe({
      next: (response: any) => {
        this.registrarHistorial(cambios);
        this.datosOriginales = { ...this.model };
        this.guardando = false;
        this.submitted = false;

        Swal.fire({
          icon: 'success',
          title: '¡Datos actualizados!',
          text: 'Tu información personal ha sido actualizada correctamente',
          confirmButtonText: 'Entendido',
        });
      },
      error: (error: any) => {
        this.guardando = false;
        console.error('Error al actualizar:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron actualizar los datos. Intenta de nuevo.',
        });
      },
    });
  }

  detectarCambios(): { campo: string; valor_anterior: string; valor_nuevo: string }[] {
    if (!this.datosOriginales) return [];

    const cambios: { campo: string; valor_anterior: string; valor_nuevo: string }[] = [];

    const camposComparar: { key: keyof DatosPersonales; label: string }[] = [
      { key: 'primerNombre', label: 'Primer Nombre' },
      { key: 'segundoNombre', label: 'Segundo Nombre' },
      { key: 'primerApellido', label: 'Primer Apellido' },
      { key: 'segundoApellido', label: 'Segundo Apellido' },
      { key: 'fechaNacimiento', label: 'Fecha de Nacimiento' },
      { key: 'genero', label: 'Género' },
      { key: 'direccion', label: 'Dirección' },
      { key: 'correoElectronico', label: 'Correo Electrónico' },
      { key: 'telefono', label: 'Teléfono' },
      { key: 'nacionalidad', label: 'Nacionalidad' },
      { key: 'ciudad', label: 'Ciudad' },
      { key: 'ocupacion', label: 'Ocupación' },
      { key: 'rh', label: 'Grupo Sanguíneo (RH)' },
    ];

    for (const campo of camposComparar) {
      const anterior = String(this.datosOriginales[campo.key] || '');
      const nuevo = String(this.model[campo.key] || '');

      if (anterior !== nuevo) {
        cambios.push({
          campo: campo.label,
          valor_anterior: anterior,
          valor_nuevo: nuevo,
        });
      }
    }

    return cambios;
  }

  registrarHistorial(cambios: { campo: string; valor_anterior: string; valor_nuevo: string }[]): void {
    if (cambios.length === 0) return;

    this.historialService
      .registrar({
        id_persona: this.model.idPersona,
        id_usuario: this.usuario.id,
        cambios: cambios,
      })
      .subscribe({
        next: () => { console.log('Historial registrado'); },
        error: (error: any) => { console.error('Error al registrar historial:', error); },
      });
  }

  obtenerNombreCompleto(): string {
    return [
      this.model.primerNombre,
      this.model.segundoNombre,
      this.model.primerApellido,
      this.model.segundoApellido,
    ]
      .filter(Boolean)
      .join(' ');
  }

  cambiarSeccion(seccion: 'datos-personales' | 'documentos' | 'cambiar-clave'): void {
    this.seccionActiva = seccion;
  }

  volver(): void {
    this.router.navigate(['/menu']);
  }


  // ========== MÉTODOS DE CAMBIAR CLAVE ==========

  validarCampoClave(campo: string): void {
    this.erroresClave[campo] = '';

    switch (campo) {
      case 'claveActual':
        if (!this.claveActual.trim()) {
          this.erroresClave.claveActual = 'La contraseña actual es requerida';
        } else if (this.claveActual.length < 4) {
          this.erroresClave.claveActual = 'La contraseña debe tener al menos 4 caracteres';
        }
        break;

      case 'claveNueva':
        if (!this.claveNueva.trim()) {
          this.erroresClave.claveNueva = 'La nueva contraseña es requerida';
        } else if (this.claveNueva.length < 6) {
          this.erroresClave.claveNueva = 'La nueva contraseña debe tener al menos 6 caracteres';
        } else if (this.claveNueva === this.claveActual) {
          this.erroresClave.claveNueva = 'La nueva contraseña debe ser diferente a la actual';
        } else if (!/[a-zA-Z]/.test(this.claveNueva) || !/[0-9]/.test(this.claveNueva)) {
          this.erroresClave.claveNueva = 'La contraseña debe contener al menos una letra y un número';
        }
        if (this.confirmarClave) {
          this.validarCampoClave('confirmarClave');
        }
        break;

      case 'confirmarClave':
        if (!this.confirmarClave.trim()) {
          this.erroresClave.confirmarClave = 'Confirma tu nueva contraseña';
        } else if (this.confirmarClave !== this.claveNueva) {
          this.erroresClave.confirmarClave = 'Las contraseñas no coinciden';
        }
        break;
    }
  }

  getNivelFortaleza(): { nivel: string, clase: string, porcentaje: number } {
    if (!this.claveNueva) {
      return { nivel: '', clase: '', porcentaje: 0 };
    }

    let puntos = 0;
    if (this.claveNueva.length >= 6) puntos++;
    if (this.claveNueva.length >= 8) puntos++;
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

  tieneMinusculas(): boolean { return /[a-z]/.test(this.claveNueva); }
  tieneMayusculas(): boolean { return /[A-Z]/.test(this.claveNueva); }
  tieneNumeros(): boolean { return /[0-9]/.test(this.claveNueva); }
  tieneSimbolos(): boolean { return /[^a-zA-Z0-9]/.test(this.claveNueva); }

  cambiarClave(): void {
    this.validarCampoClave('claveActual');
    this.validarCampoClave('claveNueva');
    this.validarCampoClave('confirmarClave');

    if (this.erroresClave.claveActual || this.erroresClave.claveNueva || this.erroresClave.confirmarClave) {
      Swal.fire('Error', 'Por favor corrige los errores en el formulario', 'error');
      return;
    }

    this.cargandoClave = true;

    const datosActualizacion = {
      id: this.usuario.id,
      usuario: this.usuario.usuario,
      claveActual: this.claveActual,
      claveNueva: this.claveNueva
    };

    this.usuariosService.cambiarClave(datosActualizacion).subscribe({
      next: (response: any) => {
        this.cargandoClave = false;
        if (response && response.success !== false) {
          Swal.fire({
            title: '¡Contraseña actualizada!',
            text: 'Tu contraseña ha sido cambiada exitosamente. Se recomienda cerrar sesión.',
            icon: 'success',
            showCancelButton: true,
            confirmButtonText: 'Cerrar sesión',
            cancelButtonText: 'Continuar'
          }).then((result) => {
            this.limpiarFormularioClave();
            if (result.isConfirmed) {
              sessionStorage.removeItem('usuario');
              sessionStorage.removeItem('token');
              sessionStorage.removeItem('institucion_actual');
              sessionStorage.removeItem('cumpleanos_cache');
              this.router.navigate(['/login']);
            }
          });
        } else {
          Swal.fire('Error', response.message || 'Error al cambiar la contraseña', 'error');
        }
      },
      error: (error: any) => {
        this.cargandoClave = false;
        console.error('Error al cambiar contraseña:', error);
        Swal.fire('Error', 'Error de conexión. Intenta nuevamente.', 'error');
      }
    });
  }

  limpiarFormularioClave(): void {
    this.claveActual = '';
    this.claveNueva = '';
    this.confirmarClave = '';
    this.erroresClave = { claveActual: '', claveNueva: '', confirmarClave: '' };
  }
}