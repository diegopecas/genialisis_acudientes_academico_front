import { Component } from '@angular/core';
import { EstudiantesService } from '../../services/estudiantes.service';
import { AcudientesService } from '../../services/acudientes.service';
import { AuthService } from '../../services/auth.service';
import { EstudiantesSessionService } from '../../services/estudiantes-session.service';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../common/header/header.component';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-estudiantes',
  templateUrl: './estudiantes.component.html',
  styleUrl: './estudiantes.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, RouterModule],
})
export class EstudiantesComponent {
  titulo = 'Mis estudiantes';
  public datos = [] as any[];
  public estudianteSeleccionado: any = null;

  constructor(
    private estudiantesService: EstudiantesService,
    private acudientesService: AcudientesService,
    private authService: AuthService,
    private estudiantesSessionService: EstudiantesSessionService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.obtenerEstudiantesXGrupo();
  }

  obtenerEstudiantesXGrupo() {
    const usuarioActual = this.authService.getUsuarioActual();
    console.log('Usuario actual:', usuarioActual);

    if (usuarioActual?.id_persona) {
      this.estudiantesSessionService
        .almacenarEstudiantesIds(usuarioActual.id_persona)
        .subscribe(
          (success) => {
            if (success) {
              console.log('IDs de estudiantes almacenados correctamente');
              this.cargarEstudiantes(usuarioActual.id_persona);
            } else {
              console.error('Error almacenando IDs de estudiantes');
              this.usarFallback();
            }
          },
          (error) => {
            console.error('Error en almacenarEstudiantesIds:', error);
            this.usarFallback();
          },
        );
    } else {
      console.log('No hay usuario en sessionStorage');
      this.router.navigate(['/login']);
    }
  }

  private cargarEstudiantes(idPersona: any) {
    console.log('=== DEBUG cargarEstudiantes ===');
    console.log('idPersona enviado:', idPersona);
    console.log(
      'Usuario actual completo:',
      this.authService.getUsuarioActual(),
    );

    this.acudientesService.obtenerMisEstudiantes(idPersona).subscribe(
      (response: any) => {
        console.log('Respuesta completa del servidor:', response);
        const body = response.body as any[];
        console.log('Body (estudiantes):', body);
        console.log('Cantidad de estudiantes:', body?.length || 0);

        this.datos = body;
        this.datos.forEach((e: any) => {
          e.nombre_completo =
            `${e.primer_nombre} ${e.segundo_nombre || ''} ${e.primer_apellido} ${e.segundo_apellido || ''}`.trim();
          e.color = e.activo === 0 ? '#e2e9f3' : '';
          e.estado = e.activo === 0 ? 'Inactivo' : 'Activo';
          e.alimentacion = e.alimentacion === 0 ? 'No' : 'Sí';
        });
      },
      (error) => {
        console.error('Error al obtener estudiantes:', error);
        this.usarFallback();
      },
    );
  }

  private usarFallback() {
    console.log('Usando servicio original como fallback...');
    this.estudiantesService.obtenerTodosXGrupo(0).subscribe((response: any) => {
      const body = response.body as any[];
      console.log('consumo servicio estudiantes original (fallback)', body);
      this.datos = body;
      this.datos.forEach((e: any) => {
        e.nombre_completo = `${e.primer_nombre} ${e.segundo_nombre} ${e.primer_apellido} ${e.segundo_apellido}`;
        e.color = e.activo === 0 ? '#e2e9f3' : '';
        e.estado = e.activo === 0 ? 'Inactivo' : 'Activo';
        e.alimentacion = e.alimentacion === 0 ? 'No' : 'Sí';
      });
    });
  }

  mostrarOpcionesEstudiante(estudiante: any) {
    this.estudianteSeleccionado = estudiante;

    setTimeout(() => {
      if (this.estudianteSeleccionado?.id === estudiante.id) {
        this.estudianteSeleccionado = null;
      }
    }, 5000);
  }

  ejecutarAccionMovil(accionId: string) {
    if (!this.estudianteSeleccionado) return;

    if (accionId === 'vista_360') {
      this.vista_360(this.estudianteSeleccionado.id_estudiante);
    }

    this.estudianteSeleccionado = null;
  }

  verPerfil(event: Event, estudiante: any) {
    event.stopPropagation();
    this.vista_360(estudiante.id_estudiante);
  }

  vista_360(id: any) {
    this.router.navigate(['/estudiantes-vista/' + id]);
  }
}