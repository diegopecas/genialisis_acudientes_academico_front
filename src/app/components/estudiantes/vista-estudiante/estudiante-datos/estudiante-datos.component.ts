import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { EstudiantesService } from '../../../../services/estudiantes.service';
import { PersonasService } from '../../../../services/personas.service';
import { AcudientesService } from '../../../../services/acudientes.service';
import { TiposIdentificacionService } from '../../../../services/tipos-identificacion.service';
import { GenerosService } from '../../../../services/generos.service';
import { GruposService } from '../../../../services/grupos.service';
import { CiudadesService } from '../../../../services/ciudades.service';
import { HistorialCambiosPersonaService } from '../../../../services/historial-cambios-persona.service';
import { AuthService } from '../../../../services/auth.service';
import { FotoPersonaComponent } from '../../../../common/foto-persona/foto-persona.component';
import { DocumentosPersonaComponent } from '../../../../common/documentos-persona/documentos-persona.component';

interface DatosEditables {
  primerNombre: string;
  segundoNombre: string;
  primerApellido: string;
  segundoApellido: string;
  fechaNacimiento: string;
  genero: number | string;
  rh: string;
  nacionalidad: string;
  direccion: string;
  ciudad: number | string;
  correoElectronico: string;
  telefono: string;
  telefonoEmergencia: string;
  eps: string;
}

@Component({
  selector: 'app-estudiante-datos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FotoPersonaComponent,
    DocumentosPersonaComponent,
  ],
  templateUrl: './estudiante-datos.component.html',
  styleUrl: './estudiante-datos.component.scss',
})
export class EstudianteDatosComponent implements OnInit {
  @Input() idEstudiante: string = '0';
  @Input() fotoEditable = true;

  public estudiante: any = null;
  public acudientes: any[] = [];
  public tiposIdentificacion: any[] = [];
  public generos: any[] = [];
  public grupos: any[] = [];
  public ciudades: any[] = [];
  public grupoActual: any = null;
  public nombreCompleto = '';

  public modoEdicion = false;
  public guardando = false;
  public submitted = false;
  public datosEditables: DatosEditables = this.crearDatosEditablesVacios();
  public datosOriginales: DatosEditables | null = null;

  public gruposRh = [
    { id: 'O+', nombre: 'O+' },
    { id: 'O-', nombre: 'O-' },
    { id: 'A+', nombre: 'A+' },
    { id: 'A-', nombre: 'A-' },
    { id: 'B+', nombre: 'B+' },
    { id: 'B-', nombre: 'B-' },
    { id: 'AB+', nombre: 'AB+' },
    { id: 'AB-', nombre: 'AB-' },
  ];

  public cargando = {
    datos: false,
    acudientes: false,
  };

  public acudienteExpandido: boolean[] = [];

  private usuario: any = null;

  constructor(
    private estudiantesService: EstudiantesService,
    private personasService: PersonasService,
    private acudientesService: AcudientesService,
    private tiposIdentificacionService: TiposIdentificacionService,
    private generosService: GenerosService,
    private gruposService: GruposService,
    private ciudadesService: CiudadesService,
    private historialService: HistorialCambiosPersonaService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.usuario = this.authService.getUsuarioActual();

    if (this.idEstudiante && this.idEstudiante !== '0') {
      this.cargarListas();
      this.cargarDatosEstudiante();
    }
  }

  crearDatosEditablesVacios(): DatosEditables {
    return {
      primerNombre: '',
      segundoNombre: '',
      primerApellido: '',
      segundoApellido: '',
      fechaNacimiento: '',
      genero: '',
      rh: '',
      nacionalidad: 'Colombiana',
      direccion: '',
      ciudad: '',
      correoElectronico: '',
      telefono: '',
      telefonoEmergencia: '',
      eps: '',
    };
  }

  cargarListas(): void {
    this.tiposIdentificacionService
      .obtenerTodos()
      .subscribe((response: any) => {
        this.tiposIdentificacion = response.body;
      });
    this.generosService.obtenerTodos().subscribe((response: any) => {
      this.generos = response.body;
    });
    this.gruposService.obtenerTodos().subscribe((response: any) => {
      this.grupos = response.body;
    });
    this.ciudadesService.obtenerTodos().subscribe((response: any) => {
      this.ciudades = response.body;
    });
  }

  cargarDatosEstudiante(): void {
    this.cargando.datos = true;
    this.estudiantesService.obtenerById(this.idEstudiante).subscribe({
      next: (response: any) => {
        if (response.body && response.body.length > 0) {
          this.estudiante = response.body[0];
          this.cargarDatosPersona(this.estudiante.id_persona);
          this.obtenerGrupoEstudiante();
          this.cargarAcudientes();
        } else {
          Swal.fire('Error', 'No se encontró el estudiante', 'error');
        }
        this.cargando.datos = false;
      },
      error: (error: any) => {
        console.error('Error al obtener estudiante', error);
        Swal.fire('Error', 'Error al cargar los datos del estudiante', 'error');
        this.cargando.datos = false;
      },
    });
  }

  cargarDatosPersona(idPersona: any): void {
    this.personasService.obtenerById(idPersona).subscribe({
      next: (response: any) => {
        if (response.body && response.body.length > 0) {
          const persona = response.body[0];
          const idEstudiante = this.estudiante.id;
          this.estudiante = { ...this.estudiante, ...persona };
          this.estudiante.id = idEstudiante;
          this.nombreCompleto = [
            persona.primer_nombre,
            persona.segundo_nombre,
            persona.primer_apellido,
            persona.segundo_apellido,
          ]
            .filter(Boolean)
            .join(' ');
        }
      },
      error: (error: any) => {
        console.error('Error al obtener datos de persona', error);
      },
    });
  }

  obtenerGrupoEstudiante(): void {
    this.estudiantesService
      .obtenerGrupoByEstudiante(this.idEstudiante)
      .subscribe({
        next: (response: any) => {
          if (response.body && response.body.length > 0) {
            this.grupoActual = response.body[0];
          }
        },
        error: (error: any) => {
          console.error('Error al obtener grupo del estudiante', error);
        },
      });
  }

  cargarAcudientes(): void {
    this.cargando.acudientes = true;
    this.acudientesService.obtenerPorEstudiante(this.idEstudiante).subscribe({
      next: (response: any) => {
        this.acudientes = response.body;
        this.acudienteExpandido = this.acudientes.map(
          (_, index) => index === 0,
        );
        if (this.acudientes && this.acudientes.length > 0) {
          this.acudientes.forEach((acudiente, index) => {
            this.cargarDatosAcudiente(acudiente, index);
          });
        }
        this.cargando.acudientes = false;
      },
      error: (error: any) => {
        console.error('Error al obtener acudientes', error);
        this.cargando.acudientes = false;
      },
    });
  }

  cargarDatosAcudiente(acudiente: any, index: number): void {
    if (acudiente && acudiente.id_persona) {
      this.personasService.obtenerById(acudiente.id_persona).subscribe({
        next: (response: any) => {
          if (response.body && response.body.length > 0) {
            this.acudientes[index] = {
              ...this.acudientes[index],
              persona_data: response.body[0],
            };
          }
        },
        error: (error: any) => {
          console.error(
            `Error al obtener datos del acudiente ${acudiente.id}`,
            error,
          );
        },
      });
    }
  }

  toggleAcudiente(index: number): void {
    this.acudienteExpandido[index] = !this.acudienteExpandido[index];
  }

  // ============ MODO EDICIÓN ============

  activarEdicion(): void {
    this.datosEditables = {
      primerNombre: this.estudiante.primer_nombre || '',
      segundoNombre: this.estudiante.segundo_nombre || '',
      primerApellido: this.estudiante.primer_apellido || '',
      segundoApellido: this.estudiante.segundo_apellido || '',
      fechaNacimiento: this.estudiante.fecha_nacimiento || '',
      genero: this.estudiante.id_genero || '',
      rh: this.estudiante.rh || '',
      nacionalidad: this.estudiante.nacionalidad || 'Colombiana',
      direccion: this.estudiante.direccion || '',
      ciudad: this.estudiante.id_ciudad || '',
      correoElectronico: this.estudiante.correo_electronico || '',
      telefono: this.estudiante.telefono || '',
      telefonoEmergencia: this.estudiante.telefono_emergencia || '',
      eps: this.estudiante.eps || '',
    };
    this.datosOriginales = { ...this.datosEditables };
    this.modoEdicion = true;
    this.submitted = false;
  }

  cancelarEdicion(): void {
    this.modoEdicion = false;
    this.submitted = false;
  }

  guardarDatos(): void {
    this.submitted = true;

    if (
      !this.datosEditables.primerNombre ||
      !this.datosEditables.primerApellido
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Primer nombre y primer apellido son obligatorios',
        confirmButtonColor: '#FFC107',
      });
      return;
    }

    const cambios = this.detectarCambios();

    if (cambios.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sin cambios',
        text: 'No se detectaron modificaciones',
        confirmButtonColor: '#FFC107',
      });
      return;
    }

    this.guardando = true;

    const personaData = {
      id: this.estudiante.id_persona,
      id_tipo_identificacion: this.estudiante.id_tipo_identificacion,
      numero_identificacion: this.estudiante.numero_identificacion,
      primer_nombre: this.datosEditables.primerNombre,
      segundo_nombre: this.datosEditables.segundoNombre || null,
      primer_apellido: this.datosEditables.primerApellido,
      segundo_apellido: this.datosEditables.segundoApellido || null,
      fecha_nacimiento: this.datosEditables.fechaNacimiento || null,
      id_genero:
        this.datosEditables.genero === '' ? null : this.datosEditables.genero,
      rh: this.datosEditables.rh || null,
      nacionalidad: this.datosEditables.nacionalidad || 'Colombiana',
      direccion: this.datosEditables.direccion || null,
      id_ciudad:
        this.datosEditables.ciudad === '' ? null : this.datosEditables.ciudad,
      correo_electronico: this.datosEditables.correoElectronico || null,
      telefono: this.datosEditables.telefono || null,
      ocupacion: 'Estudiante',
    };

    this.personasService.actualizar(personaData).subscribe({
      next: () => {
        const estudianteData = {
          id: this.estudiante.id,
          id_persona: this.estudiante.id_persona,
          fecha_ingreso: this.estudiante.fecha_ingreso,
          telefono_emergencia: this.datosEditables.telefonoEmergencia || '',
          eps: this.datosEditables.eps || '',
          alimentacion: this.estudiante.alimentacion,
          anno: this.estudiante.anno,
          activo: this.estudiante.activo,
        };

        this.estudiantesService.actualizar(estudianteData).subscribe({
          next: () => {
            this.registrarHistorial(cambios);
            this.actualizarDatosLocales();
            this.modoEdicion = false;
            this.guardando = false;
            this.submitted = false;

            Swal.fire({
              icon: 'success',
              title: '¡Datos actualizados!',
              text: 'La información del estudiante ha sido actualizada',
              confirmButtonColor: '#FFC107',
            });
          },
          error: (error: any) => {
            this.guardando = false;
            console.error('Error al actualizar estudiante:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudieron actualizar los datos del estudiante',
              confirmButtonColor: '#FFC107',
            });
          },
        });
      },
      error: (error: any) => {
        this.guardando = false;
        console.error('Error al actualizar persona:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron actualizar los datos personales',
          confirmButtonColor: '#FFC107',
        });
      },
    });
  }

  actualizarDatosLocales(): void {
    this.estudiante.primer_nombre = this.datosEditables.primerNombre;
    this.estudiante.segundo_nombre = this.datosEditables.segundoNombre;
    this.estudiante.primer_apellido = this.datosEditables.primerApellido;
    this.estudiante.segundo_apellido = this.datosEditables.segundoApellido;
    this.estudiante.fecha_nacimiento = this.datosEditables.fechaNacimiento;
    this.estudiante.id_genero = this.datosEditables.genero;
    this.estudiante.rh = this.datosEditables.rh;
    this.estudiante.nacionalidad = this.datosEditables.nacionalidad;
    this.estudiante.direccion = this.datosEditables.direccion;
    this.estudiante.id_ciudad = this.datosEditables.ciudad;
    this.estudiante.correo_electronico = this.datosEditables.correoElectronico;
    this.estudiante.telefono = this.datosEditables.telefono;
    this.estudiante.telefono_emergencia =
      this.datosEditables.telefonoEmergencia;
    this.estudiante.eps = this.datosEditables.eps;

    this.nombreCompleto = [
      this.datosEditables.primerNombre,
      this.datosEditables.segundoNombre,
      this.datosEditables.primerApellido,
      this.datosEditables.segundoApellido,
    ]
      .filter(Boolean)
      .join(' ');
  }

  detectarCambios(): {
    campo: string;
    valor_anterior: string;
    valor_nuevo: string;
  }[] {
    if (!this.datosOriginales) return [];
    const cambios: {
      campo: string;
      valor_anterior: string;
      valor_nuevo: string;
    }[] = [];
    const camposComparar: { key: keyof DatosEditables; label: string }[] = [
      { key: 'primerNombre', label: 'Primer Nombre' },
      { key: 'segundoNombre', label: 'Segundo Nombre' },
      { key: 'primerApellido', label: 'Primer Apellido' },
      { key: 'segundoApellido', label: 'Segundo Apellido' },
      { key: 'fechaNacimiento', label: 'Fecha de Nacimiento' },
      { key: 'genero', label: 'Género' },
      { key: 'rh', label: 'Grupo Sanguíneo (RH)' },
      { key: 'nacionalidad', label: 'Nacionalidad' },
      { key: 'direccion', label: 'Dirección' },
      { key: 'ciudad', label: 'Ciudad' },
      { key: 'correoElectronico', label: 'Correo Electrónico' },
      { key: 'telefono', label: 'Teléfono' },
      { key: 'telefonoEmergencia', label: 'Teléfono de Emergencia' },
      { key: 'eps', label: 'EPS' },
    ];
    for (const campo of camposComparar) {
      const anterior = String(this.datosOriginales[campo.key] || '');
      const nuevo = String(this.datosEditables[campo.key] || '');
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

  registrarHistorial(
    cambios: { campo: string; valor_anterior: string; valor_nuevo: string }[],
  ): void {
    if (cambios.length === 0 || !this.usuario) return;
    this.historialService
      .registrar({
        id_persona: this.estudiante.id_persona,
        id_usuario: this.usuario.id,
        cambios: cambios,
      })
      .subscribe({
        next: () => console.log('Historial registrado'),
        error: (error: any) =>
          console.error('Error al registrar historial:', error),
      });
  }

  // ============ MÉTODOS DE AYUDA ============

  obtenerTipoDocumento(id: any): string {
    const tipo = this.tiposIdentificacion.find((t) => t.id === id);
    return tipo ? tipo.nombre : 'No especificado';
  }

  obtenerGenero(id: any): string {
    const genero = this.generos.find((g) => g.id === id);
    return genero ? genero.nombre : 'No especificado';
  }

  obtenerGrupo(id: any): string {
    const grupo = this.grupos.find((g) => g.id === id);
    return grupo ? grupo.nombre : 'No especificado';
  }

  obtenerCiudad(id: any): string {
    const ciudad = this.ciudades.find((c) => c.id === id);
    return ciudad ? ciudad.nombre : 'No especificada';
  }

  obtenerAnios(fechaNacimiento: string): number {
    if (!fechaNacimiento) return 0;
    const fechaNac = new Date(fechaNacimiento);
    const hoy = new Date();
    if (isNaN(fechaNac.getTime())) return 0;
    let años = hoy.getFullYear() - fechaNac.getFullYear();
    const meses = hoy.getMonth() - fechaNac.getMonth();
    if (meses < 0 || (meses === 0 && hoy.getDate() < fechaNac.getDate())) {
      años--;
    }
    return años;
  }

  obtenerMeses(fechaNacimiento: string): number {
    if (!fechaNacimiento) return 0;
    const fechaNac = new Date(fechaNacimiento);
    const hoy = new Date();
    if (isNaN(fechaNac.getTime())) return 0;
    let meses = hoy.getMonth() - fechaNac.getMonth();
    if (hoy.getDate() < fechaNac.getDate()) meses--;
    if (meses < 0) meses = meses + 12;
    return meses;
  }
}
