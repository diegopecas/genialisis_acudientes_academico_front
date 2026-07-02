import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { MenuMinutasService } from '../../../services/menu-minutas.service';

interface MinutaCelda {
  semana: number;
  dia: number;
  id_menu: number | null;
  nombre_menu: string;
  descripcion_menu: string;
}

interface SemanaMinuta {
  numero: number;
  celdas: MinutaCelda[];
}

@Component({
  selector: 'app-menu-alimentacion-padres',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './menu-alimentacion-padres.component.html',
  styleUrl: './menu-alimentacion-padres.component.scss'
})
export class MenuAlimentacionPadresComponent implements OnInit {

  titulo = 'Nuestro Menú';
  isLoading = true;
  errorMessage: string | null = null;
  esMobile = false;

  semanas: SemanaMinuta[] = [];
  celdaSeleccionada: MinutaCelda | null = null;
  semanaHoy: number = 0;
  diaHoy: number = 0; // 1=Lun...6=Sáb, 0=Domingo (no resalta)
  menuHoy: MinutaCelda | null = null;

  diasSemana = [
    { valor: 1, nombre: 'Lunes', corto: 'Lun' },
    { valor: 2, nombre: 'Martes', corto: 'Mar' },
    { valor: 3, nombre: 'Miércoles', corto: 'Mié' },
    { valor: 4, nombre: 'Jueves', corto: 'Jue' },
    { valor: 5, nombre: 'Viernes', corto: 'Vie' },
    { valor: 6, nombre: 'Sábado', corto: 'Sáb' }
  ];

  numSemanas = [1, 2, 3, 4, 5];

  constructor(
    private router: Router,
    private menuMinutasService: MenuMinutasService
  ) {
    this.checkMobile();
  }

  ngOnInit(): void {
    this.calcularHoy();
    this.cargarMinuta();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkMobile();
  }

  private checkMobile(): void {
    this.esMobile = window.innerWidth <= 768;
  }

  private cargarMinuta(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.menuMinutasService.obtenerMinutaCompleta().subscribe({
      next: (response: any) => {
        const data = response.body || [];
        this.construirGrilla(data);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando minuta:', error);
        this.errorMessage = 'No pudimos cargar el menú. Intenta de nuevo.';
        this.isLoading = false;
      }
    });
  }

  private construirGrilla(data: any[]): void {
    this.semanas = [];

    for (const numSemana of this.numSemanas) {
      const celdas: MinutaCelda[] = [];

      for (const dia of this.diasSemana) {
        const registro = data.find(
          (d: any) => Number(d.semana) === numSemana && Number(d.dia) === dia.valor
        );

        celdas.push({
          semana: numSemana,
          dia: dia.valor,
          id_menu: registro ? Number(registro.id_menu) : null,
          nombre_menu: registro ? registro.nombre_menu : '',
          descripcion_menu: registro ? (registro.descripcion_menu || '') : ''
        });
      }

      this.semanas.push({ numero: numSemana, celdas });
    }

    // Buscar el menú de hoy para el banner móvil
    this.menuHoy = null;
    if (this.diaHoy > 0) {
      for (const semana of this.semanas) {
        for (const celda of semana.celdas) {
          if (this.esHoy(celda) && this.tieneMenu(celda)) {
            this.menuHoy = celda;
            break;
          }
        }
        if (this.menuHoy) break;
      }
    }
  }

  /**
   * Calcula la semana (fila del calendario) y día de la semana de hoy.
   * Semana = fila del calendario mensual considerando en qué día empieza el mes.
   * Día: Lun=1...Sáb=6. Domingo=0 (no se resalta).
   */
  private calcularHoy(): void {
    const hoy = new Date();
    const diaDelMes = hoy.getDate();

    // Día de la semana de hoy: JS: 0=Dom, 1=Lun...6=Sáb → convertir a Lun=1...Sáb=6, Dom=0
    const jsDay = hoy.getDay();
    this.diaHoy = jsDay === 0 ? 0 : jsDay; // Dom=0 (no resalta), Lun=1...Sáb=6

    // Calcular fila del calendario (semana del mes)
    // Obtener día de la semana del día 1 del mes: convertir a Lun=1...Dom=7
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const jsDayPrimero = primerDiaMes.getDay();
    const diaSemPrimero = jsDayPrimero === 0 ? 7 : jsDayPrimero; // Lun=1...Dom=7

    // Offset: columnas vacías antes del día 1
    const offset = diaSemPrimero - 1;

    // Fila del calendario = semana
    this.semanaHoy = Math.ceil((diaDelMes + offset) / 7);
  }

  esHoy(celda: MinutaCelda): boolean {
    if (this.diaHoy === 0) return false; // Domingo, no resalta
    return celda.semana === this.semanaHoy && celda.dia === this.diaHoy;
  }

  seleccionarCelda(celda: MinutaCelda): void {
    if (!celda.id_menu) return;
    this.celdaSeleccionada = this.celdaSeleccionada === celda ? null : celda;
  }

  scrollAHoy(): void {
    const el = document.getElementById('celda-hoy');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Pulso visual
      el.classList.add('pulso');
      setTimeout(() => el.classList.remove('pulso'), 1500);
    }
  }

  cerrarDetalle(): void {
    this.celdaSeleccionada = null;
  }

  getNombreDia(valor: number): string {
    return this.diasSemana.find(d => d.valor === valor)?.nombre || '';
  }

  getNombreDiaCorto(valor: number): string {
    return this.diasSemana.find(d => d.valor === valor)?.corto || '';
  }

  tieneMenu(celda: MinutaCelda): boolean {
    return celda.id_menu !== null && celda.nombre_menu !== '';
  }

  trackBySemana(index: number): number {
    return index;
  }

  trackByCelda(index: number, celda: MinutaCelda): string {
    return celda.semana + '-' + celda.dia;
  }
}