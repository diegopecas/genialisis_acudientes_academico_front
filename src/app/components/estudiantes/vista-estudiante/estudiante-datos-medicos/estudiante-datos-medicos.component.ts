import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { DatosMedicosService } from '../../../../services/datos-medicos.service';
import { DatosMedicosXEstudianteService } from '../../../../services/datos-medicos-x-estudiante.service';

interface DatoDinamicoVista {
  id_dato: number;
  nombre: string;
  nombre_tipo: string;
  icono_tipo: string;
  id_tipo: number;
  es_numero: boolean;
  es_texto: boolean;
  es_parrafo: boolean;
  es_fecha: boolean;
  opciones: string[];
  valor_numero: any;
  valor_texto: string;
  valor_parrafo: string;
  valor_fecha: string;
  observacion: string;
  valor_display: string;
}

interface GrupoVista {
  nombre_tipo: string;
  icono: string;
  id_tipo: number;
  orden_tipo: number;
  datos: DatoDinamicoVista[];
}

@Component({
  selector: 'app-estudiante-datos-medicos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './estudiante-datos-medicos.component.html',
  styleUrl: './estudiante-datos-medicos.component.scss'
})
export class EstudianteDatosMedicosComponent implements OnInit {

  @Input() idEstudiante: any;

  public grupos: GrupoVista[] = [];
  public gruposEdicion: GrupoVista[] = [];
  public cargando = true;
  public sinDatos = false;
  public modoEdicion = false;
  public guardando = false;

  constructor(
    private datosMedicosService: DatosMedicosService,
    private datosMedicosXEstudianteService: DatosMedicosXEstudianteService
  ) {}

  ngOnInit(): void {
    if (this.idEstudiante) {
      this.cargarDatos();
    }
  }

  cargarDatos() {
    this.cargando = true;

    this.datosMedicosService.obtenerTodos().subscribe({
      next: (responseCatalogo: any) => {
        const catalogo = responseCatalogo.body || responseCatalogo;

        this.datosMedicosXEstudianteService.obtenerPorEstudiante(this.idEstudiante).subscribe({
          next: (responseValores: any) => {
            const valores = responseValores.body || responseValores;
            this.grupos = this.construirGrupos(catalogo, valores, true);
            this.sinDatos = this.grupos.length === 0;
            this.cargando = false;
          },
          error: () => {
            this.grupos = this.construirGrupos(catalogo, [], true);
            this.sinDatos = true;
            this.cargando = false;
          }
        });
      },
      error: () => {
        this.cargando = false;
        this.sinDatos = true;
      }
    });
  }

  construirGrupos(catalogo: any[], valores: any[], soloConValor: boolean): GrupoVista[] {
    const valoresMap = new Map<number, any>();
    valores.forEach((v: any) => {
      valoresMap.set(Number(v.id_dato_medico), v);
    });

    const gruposMap = new Map<number, GrupoVista>();

    catalogo.forEach((item: any) => {
      const idTipo = Number(item.id_tipo_dato_medico);
      const valor = valoresMap.get(Number(item.id));
      const opciones = item.opciones ? item.opciones.split(',').map((o: string) => o.trim()) : [];

      let valorNumero = valor ? valor.valor_numero : null;
      let valorTexto = valor ? (valor.valor_texto || '') : '';
      let valorParrafo = valor ? (valor.valor_parrafo || '') : '';
      let valorFecha = valor ? (valor.valor_fecha || '') : '';
      let observacion = valor ? (valor.observacion || '') : '';

      let valorDisplay = '';
      if (Number(item.es_numero) === 1 && valorNumero !== null) {
        valorDisplay = String(valorNumero);
      } else if (Number(item.es_texto) === 1 && valorTexto) {
        valorDisplay = valorTexto;
      } else if (Number(item.es_parrafo) === 1 && valorParrafo) {
        valorDisplay = valorParrafo;
      } else if (Number(item.es_fecha) === 1 && valorFecha) {
        valorDisplay = this.formatearFecha(valorFecha);
      }

      if (soloConValor && !valorDisplay && !observacion) return;

      if (!gruposMap.has(idTipo)) {
        gruposMap.set(idTipo, {
          nombre_tipo: item.nombre_tipo,
          icono: item.icono_tipo || '',
          id_tipo: idTipo,
          orden_tipo: Number(item.orden_tipo || 0),
          datos: []
        });
      }

      gruposMap.get(idTipo)!.datos.push({
        id_dato: Number(item.id),
        nombre: item.nombre,
        nombre_tipo: item.nombre_tipo,
        icono_tipo: item.icono_tipo || '',
        id_tipo: idTipo,
        es_numero: Number(item.es_numero) === 1,
        es_texto: Number(item.es_texto) === 1,
        es_parrafo: Number(item.es_parrafo) === 1,
        es_fecha: Number(item.es_fecha) === 1,
        opciones: opciones,
        valor_numero: valorNumero,
        valor_texto: valorTexto,
        valor_parrafo: valorParrafo,
        valor_fecha: valorFecha,
        observacion: observacion,
        valor_display: valorDisplay
      });
    });

    return Array.from(gruposMap.values()).sort((a, b) => a.orden_tipo - b.orden_tipo);
  }

  // ============ MODO EDICIÓN ============

  activarEdicion(): void {
    this.cargando = true;
    this.datosMedicosService.obtenerTodos().subscribe({
      next: (responseCatalogo: any) => {
        const catalogo = responseCatalogo.body || responseCatalogo;

        this.datosMedicosXEstudianteService.obtenerPorEstudiante(this.idEstudiante).subscribe({
          next: (responseValores: any) => {
            const valores = responseValores.body || responseValores;
            this.gruposEdicion = this.construirGrupos(catalogo, valores, false);
            this.modoEdicion = true;
            this.cargando = false;
          },
          error: () => {
            this.gruposEdicion = this.construirGrupos(catalogo, [], false);
            this.modoEdicion = true;
            this.cargando = false;
          }
        });
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudo cargar el catálogo de datos médicos', 'error');
      }
    });
  }

  cancelarEdicion(): void {
    this.modoEdicion = false;
  }

  guardarDatos(): void {
    this.guardando = true;

    const datos: any[] = [];
    this.gruposEdicion.forEach(grupo => {
      grupo.datos.forEach(dato => {
        datos.push({
          id_dato_medico: dato.id_dato,
          valor_numero: dato.es_numero ? dato.valor_numero : null,
          valor_texto: dato.es_texto ? dato.valor_texto : null,
          valor_parrafo: dato.es_parrafo ? dato.valor_parrafo : null,
          valor_fecha: dato.es_fecha ? dato.valor_fecha : null,
          observacion: dato.observacion || null,
        });
      });
    });

    this.datosMedicosXEstudianteService.guardarPorEstudiante(this.idEstudiante, datos).subscribe({
      next: () => {
        this.guardando = false;
        this.modoEdicion = false;
        this.cargarDatos();
        Swal.fire({
          icon: 'success',
          title: '¡Datos actualizados!',
          text: 'Los datos médicos han sido actualizados',
          confirmButtonColor: '#FFC107',
        });
      },
      error: () => {
        this.guardando = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron actualizar los datos médicos',
          confirmButtonColor: '#FFC107',
        });
      }
    });
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    const parts = fecha.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return fecha;
  }
}