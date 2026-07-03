import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../common/header/header.component';
import { FotoPersonaComponent } from '../../common/foto-persona/foto-persona.component';
import { DocumentosPersonaComponent } from '../../common/documentos-persona/documentos-persona.component';
import { AutorizadosRecogerService } from '../../services/autorizados-recoger.service';
import { AutorizadosRecogerHistorialService } from '../../services/autorizados-recoger-historial.service';
import { TiposAutorizacionRecogerService } from '../../services/tipos-autorizacion-recoger.service';
import { PersonasService } from '../../services/personas.service';
import { TiposIdentificacionService } from '../../services/tipos-identificacion.service';
import { AcudientesService } from '../../services/acudientes.service';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Component({
  selector: 'app-autorizados-recoger',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, FotoPersonaComponent, DocumentosPersonaComponent],
  templateUrl: './autorizados-recoger.component.html',
  styleUrl: './autorizados-recoger.component.scss'
})
export class AutorizadosRecogerComponent implements OnInit {

  titulo = 'Personas Autorizadas para Recoger';

  estudiantes: any[] = [];
  estudianteSeleccionado: any = null;
  autorizados: any[] = [];
  acudientesAutorizados: any[] = [];
  tiposAutorizacion: any[] = [];
  tiposIdentificacion: any[] = [];
  idPersonaActual: string = '';
  cargando = false;
  guardado = false;
  vistaActual: 'estudiantes' | 'autorizados' | 'formulario' | 'detalle' = 'estudiantes';

  // Formulario crear
  model = {
    idPersona: '',
    tipoIdentificacion: '',
    numeroIdentificacion: '',
    primerNombre: '',
    segundoNombre: '',
    primerApellido: '',
    segundoApellido: '',
    telefono: '',
    tipoAutorizacion: '',
    fechaAutorizada: '',
    observaciones: ''
  };
  documentoEncontrado = false;
  camposHabilitados = false;
  submitted = false;

  // Detalle / editar
  autorizadoSeleccionado: any = null;
  historial: any[] = [];
  modelEditar = {
    primerNombre: '',
    segundoNombre: '',
    primerApellido: '',
    segundoApellido: '',
    telefono: '',
    tipoAutorizacion: '',
    observaciones: '',
    activo: 1
  };

  // Datos completos de persona para edición
  personaCompleta: any = null;

  constructor(
    private router: Router,
    private http: HttpClient,
    private autorizadosRecogerService: AutorizadosRecogerService,
    private autorizadosRecogerHistorialService: AutorizadosRecogerHistorialService,
    private tiposAutorizacionRecogerService: TiposAutorizacionRecogerService,
    private personasService: PersonasService,
    private tiposIdentificacionService: TiposIdentificacionService,
    private acudientesService: AcudientesService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.obtenerIdPersonaActual();
    this.cargarEstudiantes();
    this.cargarTiposAutorizacion();
    this.cargarTiposIdentificacion();
  }

  private obtenerIdPersonaActual(): void {
    const usuario = this.authService.getUsuarioActual();
    if (usuario) {
      this.idPersonaActual = usuario.id_persona;
    }
  }

  cargarEstudiantes(): void {
    this.cargando = true;
    const url = environment.api + 'acudientes/mis-estudiantes/' + this.idPersonaActual;
    this.http.get<HttpResponse<Object>>(url, { observe: 'response' }).pipe(
      tap((response: HttpResponse<Object>) => {
        let respuesta: any = response.body;
        if (respuesta.error) throw respuesta.error;
        return response;
      }),
      catchError((error) => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudieron cargar los estudiantes', 'error');
        return throwError(() => error);
      })
    ).subscribe({
      next: (response: any) => {
        this.estudiantes = response.body || [];
        this.cargando = false;
      }
    });
  }

  cargarTiposAutorizacion(): void {
    this.tiposAutorizacionRecogerService.obtenerTodos().subscribe({
      next: (response: any) => { this.tiposAutorizacion = response.body || []; }
    });
  }

  cargarTiposIdentificacion(): void {
    this.tiposIdentificacionService.obtenerTodos().subscribe({
      next: (response: any) => { this.tiposIdentificacion = response.body || []; }
    });
  }

  seleccionarEstudiante(estudiante: any): void {
    this.estudianteSeleccionado = estudiante;
    this.vistaActual = 'autorizados';
    this.cargarAutorizados();
  }

  cargarAutorizados(): void {
    if (!this.estudianteSeleccionado) return;
    this.cargando = true;
    const idEstudiante = this.estudianteSeleccionado.id_estudiante;

    // Cargar autorizados especiales
    this.autorizadosRecogerService.obtenerPorEstudiante(idEstudiante).subscribe({
      next: (response: any) => {
        this.autorizados = response.body || [];
        this.cargando = false;
      },
      error: () => { this.cargando = false; }
    });

    // Cargar acudientes con autorizado_recoger = 1
    this.acudientesService.obtenerPorEstudiante(idEstudiante).subscribe({
      next: (response: any) => {
        const todos = response.body || [];
        this.acudientesAutorizados = todos.filter(
          (a: any) => a.autorizado_recoger === 1 || a.autorizado_recoger === '1'
        );
      }
    });
  }

  volverAEstudiantes(): void {
    this.vistaActual = 'estudiantes';
    this.estudianteSeleccionado = null;
    this.autorizados = [];
  }

  volverAAutorizados(): void {
    this.vistaActual = 'autorizados';
    this.limpiarFormulario();
    this.cargarAutorizados();
  }

  mostrarFormulario(): void {
    this.vistaActual = 'formulario';
    this.limpiarFormulario();
  }

  verificarDocumento(): void {
    if (!this.model.tipoIdentificacion || !this.model.numeroIdentificacion) {
      Swal.fire('Campos incompletos', 'Ingrese tipo y número de documento', 'warning');
      return;
    }

    this.personasService.obtenerByIdentificacion(this.model.tipoIdentificacion, this.model.numeroIdentificacion).subscribe({
      next: (response: any) => {
        if (response.body && response.body.length > 0) {
          const persona = response.body[0];
          this.model.idPersona = persona.id;
          this.model.primerNombre = persona.primer_nombre || '';
          this.model.segundoNombre = persona.segundo_nombre || '';
          this.model.primerApellido = persona.primer_apellido || '';
          this.model.segundoApellido = persona.segundo_apellido || '';
          this.model.telefono = persona.telefono || '';
          this.documentoEncontrado = true;
          this.camposHabilitados = true;

          Swal.fire({
            icon: 'info',
            title: 'Persona encontrada',
            text: `${persona.primer_nombre} ${persona.primer_apellido} ya está registrada en el sistema`,
            confirmButtonText: 'Continuar'
          });
        } else {
          this.documentoEncontrado = false;
          this.camposHabilitados = true;
          this.model.idPersona = '';
          Swal.fire({
            icon: 'info',
            title: 'Persona nueva',
            text: 'Complete los datos de la persona',
            confirmButtonText: 'Continuar'
          });
        }
      },
      error: () => {
        this.camposHabilitados = true;
        this.documentoEncontrado = false;
      }
    });
  }

  guardar(): void {
    this.submitted = true;

    if (!this.model.primerNombre || !this.model.primerApellido || !this.model.tipoAutorizacion || !this.model.numeroIdentificacion) {
      Swal.fire('Campos incompletos', 'Complete los campos obligatorios', 'warning');
      return;
    }

    if (Number(this.model.tipoAutorizacion) === 2 && !this.model.fechaAutorizada) {
      Swal.fire('Fecha requerida', 'Para autorizaciones temporales debe seleccionar la fecha', 'warning');
      return;
    }

    if (this.model.idPersona) {
      this.verificarYCrearAutorizado();
    } else {
      this.crearPersonaYAutorizado();
    }
  }

  private crearPersonaYAutorizado(): void {
    const personaData = {
      id: 0,
      id_tipo_identificacion: this.model.tipoIdentificacion,
      numero_identificacion: this.model.numeroIdentificacion,
      primer_nombre: this.model.primerNombre,
      segundo_nombre: this.model.segundoNombre,
      primer_apellido: this.model.primerApellido,
      segundo_apellido: this.model.segundoApellido,
      telefono: this.model.telefono,
      nacionalidad: 'Colombiana'
    };

    this.personasService.crear(personaData).subscribe({
      next: (response: any) => {
        console.log('persona creada', response);
        const idPersona = response?.id || response?.body?.id;
        if (!idPersona) {
          Swal.fire('Error', 'No se pudo crear la persona', 'error');
          return;
        }
        this.model.idPersona = idPersona;
        this.crearAutorizado();
      },
      error: (error: any) => {
        Swal.fire('Error', 'No se pudo crear la persona', 'error');
        console.error('Error creando persona:', error);
      }
    });
  }

  private verificarYCrearAutorizado(): void {
    const verificacion = {
      id_estudiante: this.estudianteSeleccionado.id_estudiante,
      id_persona: this.model.idPersona
    };

    this.autorizadosRecogerService.verificarDuplicados(verificacion).subscribe({
      next: (response: any) => {
        if (response?.existe) {
          Swal.fire('Atención', 'Esta persona ya está registrada como autorizada para este estudiante', 'warning');
        } else {
          this.crearAutorizado();
        }
      },
      error: () => { this.crearAutorizado(); }
    });
  }

  private crearAutorizado(): void {
    const autorizado = {
      id_estudiante: this.estudianteSeleccionado.id_estudiante,
      id_persona: this.model.idPersona,
      id_tipo_autorizacion: this.model.tipoAutorizacion,
      id_persona_autoriza: this.idPersonaActual,
      observaciones: this.model.observaciones,
      activo: 1
    };

    this.autorizadosRecogerService.crear(autorizado).subscribe({
      next: (response: any) => {
        const idAutorizado = response?.id || response;

        if (Number(this.model.tipoAutorizacion) === 2 && this.model.fechaAutorizada) {
          this.crearHistorialTemporal(idAutorizado);
        }

        this.guardado = true;
      },
      error: (error: any) => {
        Swal.fire('Error', 'No se pudo crear la autorización', 'error');
        console.error('Error creando autorizado:', error);
      }
    });
  }

  private crearHistorialTemporal(idAutorizado: number): void {
    const historial = {
      id_autorizado_recoger: idAutorizado,
      fecha_autorizada: this.model.fechaAutorizada,
      id_persona_autoriza: this.idPersonaActual,
      observaciones: this.model.observaciones
    };

    this.autorizadosRecogerHistorialService.crear(historial).subscribe({
      next: () => console.log('Historial temporal creado'),
      error: (err: any) => console.error('Error creando historial:', err)
    });
  }

  // === DETALLE / EDITAR ===

  verDetalle(autorizado: any): void {
    this.autorizadoSeleccionado = autorizado;
    this.vistaActual = 'detalle';
    this.cargarHistorial(autorizado.id);
    this.cargarDatosPersonaEditar(autorizado.id_persona, autorizado);
  }

  private cargarDatosPersonaEditar(idPersona: string, autorizado: any): void {
    this.personasService.obtenerById(idPersona).subscribe({
      next: (response: any) => {
        const persona = response.body ? response.body[0] : null;
        if (persona) {
          this.personaCompleta = persona;
          this.modelEditar.primerNombre = persona.primer_nombre || '';
          this.modelEditar.segundoNombre = persona.segundo_nombre || '';
          this.modelEditar.primerApellido = persona.primer_apellido || '';
          this.modelEditar.segundoApellido = persona.segundo_apellido || '';
          this.modelEditar.telefono = persona.telefono || '';
        }
        this.modelEditar.tipoAutorizacion = String(autorizado.id_tipo_autorizacion);
        this.modelEditar.observaciones = autorizado.observaciones || '';
        this.modelEditar.activo = autorizado.activo;
      },
      error: () => {
        this.modelEditar.tipoAutorizacion = String(autorizado.id_tipo_autorizacion);
        this.modelEditar.observaciones = autorizado.observaciones || '';
        this.modelEditar.activo = autorizado.activo;
      }
    });
  }

  guardarEdicion(): void {
    if (!this.modelEditar.primerNombre || !this.modelEditar.primerApellido) {
      Swal.fire('Campos incompletos', 'Primer nombre y primer apellido son obligatorios', 'warning');
      return;
    }

    // Construir objeto persona completo con los campos editados
    const personaData = {
      ...this.personaCompleta,
      id: this.autorizadoSeleccionado.id_persona,
      primer_nombre: this.modelEditar.primerNombre,
      segundo_nombre: this.modelEditar.segundoNombre,
      primer_apellido: this.modelEditar.primerApellido,
      segundo_apellido: this.modelEditar.segundoApellido,
      telefono: this.modelEditar.telefono
    };

    this.personasService.actualizar(personaData).subscribe({
      next: () => {
        const autorizadoData = {
          id: this.autorizadoSeleccionado.id,
          id_tipo_autorizacion: this.modelEditar.tipoAutorizacion,
          observaciones: this.modelEditar.observaciones,
          activo: this.modelEditar.activo
        };

        this.autorizadosRecogerService.actualizar(autorizadoData).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Cambios guardados',
              text: 'Los datos fueron actualizados correctamente',
              confirmButtonText: 'Aceptar'
            });
          },
          error: () => {
            Swal.fire('Error', 'No se pudo actualizar la autorización', 'error');
          }
        });
      },
      error: () => {
        Swal.fire('Error', 'No se pudieron actualizar los datos de la persona', 'error');
      }
    });
  }

  cargarHistorial(idAutorizado: number): void {
    this.autorizadosRecogerHistorialService.obtenerPorAutorizado(idAutorizado).subscribe({
      next: (response: any) => { this.historial = response.body || []; }
    });
  }

  autorizarDia(autorizado: any): void {
    Swal.fire({
      title: 'Autorizar un día',
      input: 'date',
      inputLabel: 'Seleccione la fecha',
      inputValue: new Date().toISOString().split('T')[0],
      showCancelButton: true,
      confirmButtonText: 'Autorizar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const historial = {
          id_autorizado_recoger: autorizado.id,
          fecha_autorizada: result.value,
          id_persona_autoriza: this.idPersonaActual,
          observaciones: ''
        };

        this.autorizadosRecogerHistorialService.crear(historial).subscribe({
          next: () => {
            Swal.fire('Autorizado', `Persona autorizada para el día ${result.value}`, 'success');
            this.cargarHistorial(autorizado.id);
          },
          error: () => {
            Swal.fire('Error', 'No se pudo registrar la autorización', 'error');
          }
        });
      }
    });
  }

  toggleActivo(autorizado: any): void {
    const nuevoEstado = autorizado.activo === 1 || autorizado.activo === '1' ? 0 : 1;
    const textoAccion = nuevoEstado === 1 ? 'activar' : 'desactivar';

    Swal.fire({
      title: `${textoAccion.charAt(0).toUpperCase() + textoAccion.slice(1)} autorización?`,
      text: `La persona será ${nuevoEstado === 1 ? 'activada' : 'desactivada'} para recoger`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Si',
      cancelButtonText: 'No'
    }).then((result) => {
      if (result.isConfirmed) {
        const data = {
          id: autorizado.id,
          id_tipo_autorizacion: autorizado.id_tipo_autorizacion,
          observaciones: autorizado.observaciones,
          activo: nuevoEstado
        };

        this.autorizadosRecogerService.actualizar(data).subscribe({
          next: () => {
            Swal.fire('Actualizado', `Autorización ${nuevoEstado === 1 ? 'activada' : 'desactivada'}`, 'success');
            this.cargarAutorizados();
            if (this.vistaActual === 'detalle') {
              this.volverAAutorizados();
            }
          },
          error: () => { Swal.fire('Error', 'No se pudo actualizar', 'error'); }
        });
      }
    });
  }

  obtenerUrlFoto(foto: string): string {
    return this.personasService.obtenerUrlFoto(foto) + '?t=' + new Date().getTime();
  }

  obtenerNombreCompleto(): string {
    if (this.autorizadoSeleccionado) {
      return this.autorizadoSeleccionado.nombre_persona || '';
    }
    return `${this.model.primerNombre} ${this.model.primerApellido}`.trim();
  }

  private limpiarFormulario(): void {
    this.model = {
      idPersona: '',
      tipoIdentificacion: '',
      numeroIdentificacion: '',
      primerNombre: '',
      segundoNombre: '',
      primerApellido: '',
      segundoApellido: '',
      telefono: '',
      tipoAutorizacion: '',
      fechaAutorizada: '',
      observaciones: ''
    };
    this.documentoEncontrado = false;
    this.camposHabilitados = false;
    this.submitted = false;
    this.guardado = false;
  }

  estaActivo(autorizado: any): boolean {
    return autorizado.activo === 1 || autorizado.activo === '1';
  }

  getNombreTipoAutorizacion(autorizado: any): string {
    return autorizado.nombre_tipo_autorizacion || '';
  }
}