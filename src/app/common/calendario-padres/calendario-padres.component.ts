import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { CalendariosService } from '../../../services/calendarios.service';

interface DiaCalendario {
  dia: number;
  fecha: string;
  id_tipo_dia: number;
  tipo_dia_nombre: string;
  dia_semana_nombre: string;
  eventos: EventoCalendario[];
  cumpleanos: CumpleanosPersona[];
  esHoy: boolean;
  esMesActual: boolean;
}

interface EventoCalendario {
  id: number;
  fecha: string;
  id_tipo_evento_calendario: number;
  descripcion: string;
  tipo_evento_nombre: string;
  tipo_evento_icono: string;
}

interface CumpleanosPersona {
  id_persona: number;
  nombre: string;
  tipo_persona: string;
  dia: number;
}

interface SemanaCalendario {
  dias: (DiaCalendario | null)[];
}

@Component({
  selector: 'app-calendario-padres',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './calendario-padres.component.html',
  styleUrl: './calendario-padres.component.scss'
})
export class CalendarioPadresComponent implements OnInit {

  titulo = 'Nuestro Calendario';
  isLoading = true;
  errorMessage: string | null = null;

  anioActual: number;
  mesActual: number;
  semanas: SemanaCalendario[] = [];
  diaSeleccionado: DiaCalendario | null = null;

  diasSemanaHeader = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  nombresEneroADiciembre = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  coloresEvento: { [key: number]: string } = {
    1: '#E91E63',
    2: '#FF9800',
    3: '#2196F3',
    4: '#4CAF50',
    5: '#9C27B0'
  };

  constructor(
    private router: Router,
    private calendariosService: CalendariosService
  ) {
    const hoy = new Date();
    this.anioActual = hoy.getFullYear();
    this.mesActual = hoy.getMonth() + 1;
  }

  ngOnInit(): void {
    this.cargarMes();
  }

  get nombreMes(): string {
    return this.nombresEneroADiciembre[this.mesActual - 1];
  }

  mesAnterior(): void {
    if (this.mesActual === 1) {
      this.mesActual = 12;
      this.anioActual--;
    } else {
      this.mesActual--;
    }
    this.diaSeleccionado = null;
    this.cargarMes();
  }

  mesSiguiente(): void {
    if (this.mesActual === 12) {
      this.mesActual = 1;
      this.anioActual++;
    } else {
      this.mesActual++;
    }
    this.diaSeleccionado = null;
    this.cargarMes();
  }

  irAHoy(): void {
    const hoy = new Date();
    this.anioActual = hoy.getFullYear();
    this.mesActual = hoy.getMonth() + 1;
    this.diaSeleccionado = null;
    this.cargarMes();
  }

  private cargarMes(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.calendariosService.obtenerCalendarioMes(this.anioActual, this.mesActual).subscribe({
      next: (response: any) => {
        const data = response.body;
        this.construirCalendario(data.dias || [], data.eventos || [], data.cumpleanos || []);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando calendario:', error);
        this.errorMessage = 'No pudimos cargar el calendario. Intenta de nuevo.';
        this.isLoading = false;
      }
    });
  }

  private construirCalendario(dias: any[], eventos: EventoCalendario[], cumpleanos: CumpleanosPersona[]): void {
    const hoy = new Date();
    const hoyDia = hoy.getDate();
    const hoyMes = hoy.getMonth() + 1;
    const hoyAnio = hoy.getFullYear();

    const mapaDias: { [dia: number]: DiaCalendario } = {};

    dias.forEach(d => {
      const numDia = Number(d.dia);
      mapaDias[numDia] = {
        dia: numDia,
        fecha: d.fecha,
        id_tipo_dia: Number(d.id_tipo_dia),
        tipo_dia_nombre: d.tipo_dia_nombre || '',
        dia_semana_nombre: d.dia_semana_nombre || '',
        eventos: [],
        cumpleanos: [],
        esHoy: numDia === hoyDia && this.mesActual === hoyMes && this.anioActual === hoyAnio,
        esMesActual: true
      };
    });

    eventos.forEach(ev => {
      const diaEvento = new Date(ev.fecha + 'T12:00:00').getDate();
      if (mapaDias[diaEvento]) {
        mapaDias[diaEvento].eventos.push(ev);
      }
    });

    cumpleanos.forEach(c => {
      if (mapaDias[c.dia]) {
        mapaDias[c.dia].cumpleanos.push(c);
      }
    });

    const primerDia = dias.length > 0 ? Number(dias[0].id_dia_semana) : 1;
    const totalDias = dias.length;

    this.semanas = [];
    let semanaActual: (DiaCalendario | null)[] = [];

    for (let i = 1; i < primerDia; i++) {
      semanaActual.push(null);
    }

    for (let d = 1; d <= totalDias; d++) {
      semanaActual.push(mapaDias[d] || null);

      if (semanaActual.length === 7) {
        this.semanas.push({ dias: semanaActual });
        semanaActual = [];
      }
    }

    if (semanaActual.length > 0) {
      while (semanaActual.length < 7) {
        semanaActual.push(null);
      }
      this.semanas.push({ dias: semanaActual });
    }
  }

  seleccionarDia(dia: DiaCalendario | null): void {
    if (!dia) return;
    this.diaSeleccionado = this.diaSeleccionado?.dia === dia.dia ? null : dia;
  }

  tieneContenido(dia: DiaCalendario | null): boolean {
    if (!dia) return false;
    return dia.eventos.length > 0 || dia.cumpleanos.length > 0;
  }

  getColorEvento(idTipo: number): string {
    return this.coloresEvento[idTipo] || '#607D8B';
  }

  cerrarDetalle(): void {
    this.diaSeleccionado = null;
  }

  trackBySemana(index: number): number {
    return index;
  }

  trackByDia(index: number, dia: DiaCalendario | null): number {
    return dia ? dia.dia : index;
  }
}