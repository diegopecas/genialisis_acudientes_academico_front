import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { AcudientesService } from '../../../services/acudientes.service';
import { HorariosService } from '../../../services/horarios.service';
import { AuthService } from '../../../services/auth_acudientes.service';

interface Estudiante {
  id_estudiante: number;
  id_grupo: number;
  nombre_grupo: string;
  primer_nombre: string;
  primer_apellido: string;
  nombre_completo: string;
}

interface BloqueHorario {
  id: number;
  id_area_academica: number;
  id_dia_semana: number;
  hora_inicial: string;
  hora_final: string;
  total_minutos: number;
  area_academica_nombre: string;
  area_academica_color: string;
  dia_semana_nombre: string;
  docente_nombre_completo: string | null;
}

interface FranjaHora {
  hora: string;
  minutos: number;
}

@Component({
  selector: 'app-horario-padres',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './horario-padres.component.html',
  styleUrl: './horario-padres.component.scss'
})
export class HorarioPadresComponent implements OnInit {

  titulo = 'Nuestro Horario';
  isLoading = true;
  errorMessage: string | null = null;
  esMobile = false;

  estudiantes: Estudiante[] = [];
  estudianteActivo: Estudiante | null = null;
  horarios: BloqueHorario[] = [];
  franjasHorarias: FranjaHora[] = [];

  diasSemana = [
    { id: 1, nombre: 'Lunes', corto: 'Lun' },
    { id: 2, nombre: 'Martes', corto: 'Mar' },
    { id: 3, nombre: 'Miércoles', corto: 'Mié' },
    { id: 4, nombre: 'Jueves', corto: 'Jue' },
    { id: 5, nombre: 'Viernes', corto: 'Vie' },
    { id: 6, nombre: 'Sábado', corto: 'Sáb' }
  ];

  diasConHorario: { id: number; nombre: string; corto: string }[] = [];
  diaHoyId: number = 0; // 1=Lun...6=Sáb, 0=Dom

  constructor(
    private router: Router,
    private acudientesService: AcudientesService,
    private horariosService: HorariosService,
    private authService: AuthService
  ) {
    this.checkMobile();
    this.calcularDiaHoy();
  }

  ngOnInit(): void {
    this.cargarEstudiantes();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkMobile();
  }

  private checkMobile(): void {
    this.esMobile = window.innerWidth <= 768;
  }

  private calcularDiaHoy(): void {
    const jsDay = new Date().getDay(); // 0=Dom, 1=Lun...6=Sáb
    this.diaHoyId = jsDay === 0 ? 0 : jsDay;
  }

  private cargarEstudiantes(): void {
    const usuario = this.authService.getUsuarioActual();
    if (!usuario?.id_persona) {
      this.errorMessage = 'No se pudo identificar el usuario.';
      this.isLoading = false;
      return;
    }

    this.acudientesService.obtenerMisEstudiantes(usuario.id_persona).subscribe({
      next: (response: any) => {
        const data = response.body || [];
        this.estudiantes = data.map((e: any) => ({
          id_estudiante: e.id_estudiante,
          id_grupo: e.id_grupo,
          nombre_grupo: e.nombre_grupo || '',
          primer_nombre: e.primer_nombre || '',
          primer_apellido: e.primer_apellido || '',
          nombre_completo: `${e.primer_nombre || ''} ${e.primer_apellido || ''}`.trim()
        }));

        if (this.estudiantes.length > 0) {
          this.seleccionarEstudiante(this.estudiantes[0]);
        } else {
          this.errorMessage = 'No se encontraron estudiantes asociados.';
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Error cargando estudiantes:', error);
        this.errorMessage = 'No pudimos cargar la información. Intenta de nuevo.';
        this.isLoading = false;
      }
    });
  }

  seleccionarEstudiante(estudiante: Estudiante): void {
    this.estudianteActivo = estudiante;
    this.cargarHorario(estudiante.id_grupo);
  }

  private cargarHorario(idGrupo: number): void {
    this.isLoading = true;

    this.horariosService.obtenerByGrupo(idGrupo).subscribe({
      next: (response: any) => {
        this.horarios = response.body || [];
        this.calcularFranjas();
        this.calcularDiasConHorario();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando horario:', error);
        this.errorMessage = 'No pudimos cargar el horario.';
        this.isLoading = false;
      }
    });
  }

  private calcularFranjas(): void {
    if (this.horarios.length === 0) {
      this.franjasHorarias = [];
      return;
    }

    let minMin = 24 * 60;
    let maxMin = 0;

    this.horarios.forEach(h => {
      const [hi, mi] = h.hora_inicial.split(':').map(Number);
      const [hf, mf] = h.hora_final.split(':').map(Number);
      const inicio = hi * 60 + mi;
      const fin = hf * 60 + mf;
      if (inicio < minMin) minMin = inicio;
      if (fin > maxMin) maxMin = fin;
    });

    const inicioR = Math.floor(minMin / 30) * 30;
    const finR = Math.ceil(maxMin / 30) * 30;

    this.franjasHorarias = [];
    for (let m = inicioR; m < finR; m += 30) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      this.franjasHorarias.push({
        hora: `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`,
        minutos: m
      });
    }
  }

  private calcularDiasConHorario(): void {
    const diasIds = new Set(this.horarios.map(h => h.id_dia_semana));
    this.diasConHorario = this.diasSemana.filter(d => diasIds.has(d.id));
  }

  getBloqueEnFranja(idDia: number, franja: FranjaHora): BloqueHorario | null {
    return this.horarios.find(h => {
      if (h.id_dia_semana !== idDia) return false;
      const [hi, mi] = h.hora_inicial.split(':').map(Number);
      const [hf, mf] = h.hora_final.split(':').map(Number);
      return franja.minutos >= (hi * 60 + mi) && franja.minutos < (hf * 60 + mf);
    }) || null;
  }

  esInicioBloque(idDia: number, franja: FranjaHora): boolean {
    const bloque = this.getBloqueEnFranja(idDia, franja);
    if (!bloque) return false;
    const [hi, mi] = bloque.hora_inicial.split(':').map(Number);
    return franja.minutos === (hi * 60 + mi);
  }

  getCantidadFranjas(bloque: BloqueHorario): number {
    const [hi, mi] = bloque.hora_inicial.split(':').map(Number);
    const [hf, mf] = bloque.hora_final.split(':').map(Number);
    return Math.ceil(((hf * 60 + mf) - (hi * 60 + mi)) / 30);
  }

  getHoraCorta(hora: string): string {
    return hora ? hora.substring(0, 5) : '';
  }

  getHorariosPorDia(idDia: number): BloqueHorario[] {
    return this.horarios
      .filter(h => h.id_dia_semana === idDia)
      .sort((a, b) => {
        const [ha, ma] = a.hora_inicial.split(':').map(Number);
        const [hb, mb] = b.hora_inicial.split(':').map(Number);
        return (ha * 60 + ma) - (hb * 60 + mb);
      });
  }

  esDiaHoy(idDia: number): boolean {
    return this.diaHoyId === idDia;
  }

  trackByEstudiante(index: number, est: Estudiante): number {
    return est.id_estudiante;
  }

  trackByDia(index: number, dia: any): number {
    return dia.id;
  }

  trackByFranja(index: number, franja: FranjaHora): string {
    return franja.hora;
  }
}