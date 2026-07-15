import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../../common/header/header.component';
import { AuthService } from '../../services/auth.service';
import { EstudiantesSessionService } from '../../services/estudiantes-session.service';
import { AcudientesService } from '../../services/acudientes.service';
import { CuentasPorCobrarService } from '../../services/cuentas-por-cobrar.service';
import { PagosRecibidosService } from '../../services/pagos-recibidos.service';
import { CuentaPagadaService } from '../../services/cuenta-pagada.service';
import { InstitucionConfigService } from '../../services/institucion-config.service';
import { ExportarPdfComprobanteService, DatosComprobantePDF } from '../../services/exportar-pdf-comprobante.service';

interface ResumenEstudiante {
  id_estudiante: string;
  id_persona: string;
  nombre_completo: string;
  nombre_grupo: string;
  cargando: boolean;
  saldoVencido: number;
  saldoPendiente: number;
  saldoProximo10: number;
  totalPagado: number;
  ultimoPago: number;
  fechaUltimoPago: string;
  movimientos: any[];
  pagos: any[];
}

@Component({
  selector: 'app-mi-cuenta',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HeaderComponent],
  templateUrl: './mi-cuenta.component.html',
  styleUrl: './mi-cuenta.component.scss'
})
export class MiCuentaComponent implements OnInit, OnDestroy {
  titulo = 'Mi Cuenta';

  public estudiantes: ResumenEstudiante[] = [];
  public estudianteActivo: ResumenEstudiante | null = null;
  public tabActiva: 'resumen' | 'pagos' | 'cobros' | 'movimientos' = 'resumen';
  public cargandoEstudiantes: boolean = true;
  public fechaConsulta: string = '';

  // DDL año — global para todos los tabs
  public anioSeleccionado: number = new Date().getFullYear();
  public aniosDisponibles: number[] = [];

  // Acordeón — abierto/cerrado
  public pagosAbiertos: Set<number> = new Set();
  public cobrosAbiertos: Set<number> = new Set();
  public movsAbiertos: Set<string> = new Set(); // key: `${tipo}-${id}`

  // Cache de detalles (lazy + no repetir llamada)
  public detallesPago: Map<number, any[]> = new Map();
  public detallesCobro: Map<number, any[]> = new Map();
  public cargandoDetalle: Set<number> = new Set();

  // Filtros pagos
  public filtroPagosTexto: string = '';
  public filtroPagosFechaInicio: string = '';
  public filtroPagosFechaFin: string = '';

  // Filtros cobros
  public filtroCobrosTexto: string = '';
  public filtroCobrosEstado: string = '';
  public filtroCobrosFeInicio: string = '';
  public filtroCobrosFeFin: string = '';

  // Filtros movimientos
  public filtroMovTexto: string = '';
  public filtroMovEstado: string = ''; // 'cobro' | 'pago' | ''
  public filtroMovFeInicio: string = '';
  public filtroMovFeFin: string = '';

  // Filtro conceptos pendientes
  public filtroPendientesTexto: string = '';
  public filtroPendientesFeInicio: string = '';
  public filtroPendientesFeFin: string = '';

  get totalVencidoGlobal(): number {
    return this.estudiantes.reduce((s, e) => s + this.saldoVencidoEstudiante(e), 0);
  }
  get totalPendienteGlobal(): number {
    return this.estudiantes.reduce((s, e) => s + this.saldoPendienteEstudiante(e), 0);
  }

  saldoVencidoEstudiante(est: any): number {
    const anio = Number(this.anioSeleccionado);
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    return (est.movimientos || [])
      .filter((m: any) => {
        const f = this.parsearFecha(m.fecha);
        const anioOk = !anio || f.getFullYear() === anio;
        return anioOk && f < hoy && (Number(m.saldo) || 0) > 0;
      })
      .reduce((s: number, m: any) => s + (Number(m.saldo) || 0), 0);
  }

  saldoPendienteEstudiante(est: any): number {
    const anio = Number(this.anioSeleccionado);
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    return (est.movimientos || [])
      .filter((m: any) => {
        const f = this.parsearFecha(m.fecha);
        const anioOk = !anio || f.getFullYear() === anio;
        return anioOk && f >= hoy && (Number(m.saldo) || 0) > 0;
      })
      .reduce((s: number, m: any) => s + (Number(m.saldo) || 0), 0);
  }

  totalPagadoEstudiante(est: any): number {
    const anio = Number(this.anioSeleccionado);
    return (est.pagos || [])
      .filter((p: any) => {
        const anioOk = !anio || this.parsearFecha(p.fecha).getFullYear() === anio;
        return anioOk && p.estadoPago !== 'Anulado';
      })
      .reduce((s: number, p: any) => s + (Number(p.valor_recibido) || 0), 0);
  }

  estadoGeneralEstudiante(est: any): 'aldia' | 'pendiente' | 'vencido' {
    if (this.saldoVencidoEstudiante(est) > 0) return 'vencido';
    if (this.saldoPendienteEstudiante(est) > 0) return 'pendiente';
    return 'aldia';
  }

  // Descarga comprobante
  public descargandoComprobante: Set<number> = new Set();

  private scrollHandler = this.checkScroll.bind(this);
  public mostrarBotonArriba: boolean = false;

  constructor(
    private authService: AuthService,
    private estudiantesSessionService: EstudiantesSessionService,
    private acudientesService: AcudientesService,
    private cuentasPorCobrarService: CuentasPorCobrarService,
    private pagosRecibidosService: PagosRecibidosService,
    private cuentaPagadaService: CuentaPagadaService,
    private institucionConfigService: InstitucionConfigService,
    private exportarPdfComprobanteService: ExportarPdfComprobanteService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.fechaConsulta = this.formatearFechaHoy();
    this.cargarEstudiantes();
    window.addEventListener('scroll', this.scrollHandler);
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.scrollHandler);
  }

  // ──────────────────────────────────────────────
  // CARGA DE DATOS
  // ──────────────────────────────────────────────

  private cargarEstudiantes(): void {
    const usuario = this.authService.getUsuarioActual();
    if (!usuario?.id_persona) {
      this.router.navigate(['/login']);
      return;
    }
    this.estudiantesSessionService.almacenarEstudiantesIds(usuario.id_persona).subscribe({
      next: () => this.obtenerListaEstudiantes(usuario.id_persona),
      error: () => this.obtenerListaEstudiantes(usuario.id_persona)
    });
  }

  private obtenerListaEstudiantes(idPersona: any): void {
    this.acudientesService.obtenerMisEstudiantes(idPersona).subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        this.estudiantes = body.map(e => ({
          id_estudiante: e.id_estudiante,
          id_persona: e.id_persona,
          nombre_completo: `${e.primer_nombre} ${e.segundo_nombre || ''} ${e.primer_apellido} ${e.segundo_apellido || ''}`.trim(),
          nombre_grupo: e.nombre_grupo || '',
          cargando: true,
          saldoVencido: 0, saldoPendiente: 0, saldoProximo10: 0,
          totalPagado: 0, ultimoPago: 0, fechaUltimoPago: '',
          movimientos: [], pagos: []
        }));
        this.cargandoEstudiantes = false;
        if (this.estudiantes.length === 1) {
          this.seleccionarEstudiante(this.estudiantes[0]);
        } else if (this.estudiantes.length > 1) {
          this.estudiantes.forEach(e => this.cargarDatosEstudiante(e));
        }
      },
      error: () => { this.cargandoEstudiantes = false; }
    });
  }

  private cargarDatosEstudiante(estudiante: ResumenEstudiante): void {
    estudiante.cargando = true;

    this.cuentasPorCobrarService.obtenerTodosXPersona(estudiante.id_persona).subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        const en10dias = new Date(hoy); en10dias.setDate(en10dias.getDate() + 10);

        let saldoVencido = 0, saldoPendiente = 0, totalPagado = 0;

        estudiante.movimientos = body.map(item => {
          const fechaItem = this.parsearFecha(item.fecha);
          const saldo = Number(item.saldo) || 0;
          const vencido = fechaItem < hoy && saldo > 0;
          const estadoCobro = saldo <= 0 ? 'Pagado' : (vencido ? 'Vencido' : 'Pendiente');

          totalPagado += Number(item.valor_pagado) || 0;
          if (vencido) saldoVencido += saldo;
          else if (saldo > 0) saldoPendiente += saldo;

          return { ...item, vencido, estadoCobro };
        });

        estudiante.saldoVencido = saldoVencido;
        estudiante.saldoPendiente = saldoPendiente;
        estudiante.saldoProximo10 = 0;
        estudiante.totalPagado = totalPagado;
        estudiante.cargando = false;
        this.recalcularAnios(estudiante);
      },
      error: () => { estudiante.cargando = false; }
    });

    this.pagosRecibidosService.obtenerByEstudiante(estudiante.id_estudiante).subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        // Excluir anulados completamente
        estudiante.pagos = body
          .filter(item => item.anulado !== 1)
          .map(item => ({
            ...item,
            estadoPago: item.id_usuario_contable ? 'Contabilizado' : 'Registrado'
          }))
          .sort((a, b) => this.parsearFecha(b.fecha).getTime() - this.parsearFecha(a.fecha).getTime());

        const ultimoPago = estudiante.pagos[0];
        if (ultimoPago) {
          estudiante.ultimoPago = Number(ultimoPago.valor_recibido) || 0;
          estudiante.fechaUltimoPago = this.formatearFecha(ultimoPago.fecha);
        }
        this.recalcularAnios(estudiante);
      },
      error: () => {}
    });
  }

  // ──────────────────────────────────────────────
  // DDL AÑOS
  // ──────────────────────────────────────────────

  private recalcularAnios(est?: ResumenEstudiante): void {
    const fuente = est || this.estudianteActivo;
    if (!fuente) return;
    const anios = new Set<number>();

    fuente.movimientos.forEach(m => anios.add(this.parsearFecha(m.fecha).getFullYear()));
    fuente.pagos.forEach(p => anios.add(this.parsearFecha(p.fecha).getFullYear()));

    this.aniosDisponibles = Array.from(anios).sort((a, b) => a - b);
    if (this.aniosDisponibles.length > 0) {
      this.anioSeleccionado = this.aniosDisponibles[this.aniosDisponibles.length - 1];
    }
  }

  // ──────────────────────────────────────────────
  // NAVEGACIÓN
  // ──────────────────────────────────────────────

  seleccionarEstudiante(estudiante: ResumenEstudiante): void {
    this.estudianteActivo = estudiante;
    this.tabActiva = 'resumen';
    this.limpiarFiltros();
    if (estudiante.cargando || estudiante.movimientos.length === 0) {
      this.cargarDatosEstudiante(estudiante);
    } else {
      this.recalcularAnios(estudiante);
    }
  }

  volver(): void {
    if (this.estudiantes.length > 1) {
      this.estudianteActivo = null;
    } else {
      this.router.navigate(['/menu']);
    }
  }

  cambiarTab(tab: 'resumen' | 'pagos' | 'cobros' | 'movimientos'): void {
    this.tabActiva = tab;
    this.limpiarFiltros();
  }

  private limpiarFiltros(): void {
    this.filtroPagosTexto = ''; this.filtroPagosFechaInicio = ''; this.filtroPagosFechaFin = '';
    this.filtroCobrosTexto = ''; this.filtroCobrosEstado = '';
    this.filtroCobrosFeInicio = ''; this.filtroCobrosFeFin = '';
    this.filtroMovTexto = ''; this.filtroMovEstado = '';
    this.filtroMovFeInicio = ''; this.filtroMovFeFin = '';
    this.filtroPendientesTexto = ''; this.filtroPendientesFeInicio = ''; this.filtroPendientesFeFin = '';
  }

  // ──────────────────────────────────────────────
  // ACORDEÓN CON LAZY LOAD Y CACHE
  // ──────────────────────────────────────────────

  togglePago(id: number): void {
    if (this.pagosAbiertos.has(id)) {
      this.pagosAbiertos.delete(id);
    } else {
      this.pagosAbiertos.add(id);
      if (!this.detallesPago.has(id)) this.cargarDetallePago(id);
    }
  }

  toggleCobro(id: number): void {
    if (this.cobrosAbiertos.has(id)) {
      this.cobrosAbiertos.delete(id);
    } else {
      this.cobrosAbiertos.add(id);
      if (!this.detallesCobro.has(id)) this.cargarDetalleCobro(id);
    }
  }

  toggleMov(tipo: string, id: number): void {
    const key = `${tipo}-${id}`;
    if (this.movsAbiertos.has(key)) {
      this.movsAbiertos.delete(key);
    } else {
      this.movsAbiertos.add(key);
      if (tipo === 'pago' && !this.detallesPago.has(id)) this.cargarDetallePago(id);
      if (tipo === 'cobro' && !this.detallesCobro.has(id)) this.cargarDetalleCobro(id);
    }
  }

  private cargarDetallePago(id: number): void {
    this.cargandoDetalle.add(id);
    this.cuentaPagadaService.getByPagoRecibido(id).subscribe({
      next: (response: any) => {
        this.detallesPago.set(id, response.body as any[]);
        this.cargandoDetalle.delete(id);
      },
      error: () => {
        this.detallesPago.set(id, []);
        this.cargandoDetalle.delete(id);
      }
    });
  }

  private cargarDetalleCobro(id: number): void {
    this.cargandoDetalle.add(id);
    this.cuentaPagadaService.obtenerPorCuentaPorCobrar(id).subscribe({
      next: (response: any) => {
        this.detallesCobro.set(id, response.body as any[]);
        this.cargandoDetalle.delete(id);
      },
      error: () => {
        this.detallesCobro.set(id, []);
        this.cargandoDetalle.delete(id);
      }
    });
  }

  esPagoAbierto(id: number): boolean { return this.pagosAbiertos.has(id); }
  esCobrosAbierto(id: number): boolean { return this.cobrosAbiertos.has(id); }
  esMovAbierto(tipo: string, id: number): boolean { return this.movsAbiertos.has(`${tipo}-${id}`); }
  esCargandoDetalle(id: number): boolean { return this.cargandoDetalle.has(id); }

  getDetallePago(id: number): any[] { return this.detallesPago.get(id) || []; }
  getDetalleCobro(id: number): any[] { return this.detallesCobro.get(id) || []; }

  // ──────────────────────────────────────────────
  // GETTERS FILTRADOS (con año y fechas)
  // ──────────────────────────────────────────────

  get pagosFiltrados(): any[] {
    if (!this.estudianteActivo) return [];
    const txt = this.filtroPagosTexto.toLowerCase();
    const anio = Number(this.anioSeleccionado);
    const fi = this.filtroPagosFechaInicio ? this.parsearFecha(this.filtroPagosFechaInicio) : null;
    const ff = this.filtroPagosFechaFin   ? this.parsearFecha(this.filtroPagosFechaFin)    : null;
    return this.estudianteActivo.pagos.filter(p => {
      const fecha = this.parsearFecha(p.fecha);
      const anioOk = !anio || fecha.getFullYear() === anio;
      const fiOk = !fi || fecha >= fi;
      const ffOk = !ff || fecha <= ff;
      const textoOk = !txt ||
        p.tipo_pago?.toLowerCase().includes(txt) ||
        p.nombre_acudiente?.toLowerCase().includes(txt) ||
        String(p.referencia_bancaria).toLowerCase().includes(txt) ||
        String(p.valor_recibido).includes(txt);
      return anioOk && fiOk && ffOk && textoOk;
    });
  }

  get cobrosFiltrados(): any[] {
    if (!this.estudianteActivo) return [];
    const txt = this.filtroCobrosTexto.toLowerCase();
    const anio = Number(this.anioSeleccionado);
    const fi = this.filtroCobrosFeInicio ? this.parsearFecha(this.filtroCobrosFeInicio) : null;
    const ff = this.filtroCobrosFeFin   ? this.parsearFecha(this.filtroCobrosFeFin)    : null;
    return this.estudianteActivo.movimientos.filter(m => {
      const fecha = this.parsearFecha(m.fecha);
      const anioOk = !anio || fecha.getFullYear() === anio;
      const fiOk = !fi || fecha >= fi;
      const ffOk = !ff || fecha <= ff;
      const textoOk = !txt ||
        m.nombre_producto_servicio?.toLowerCase().includes(txt) ||
        m.nombre_clasificacion?.toLowerCase().includes(txt) ||
        String(m.valor).includes(txt);
      const estadoOk = !this.filtroCobrosEstado || m.estadoCobro === this.filtroCobrosEstado;
      return anioOk && fiOk && ffOk && textoOk && estadoOk;
    });
  }

  get movimientosFiltrados(): any[] {
    if (!this.estudianteActivo) return [];
    const txt = this.filtroMovTexto.toLowerCase();
    const anio = Number(this.anioSeleccionado);
    const fi = this.filtroMovFeInicio ? this.parsearFecha(this.filtroMovFeInicio) : null;
    const ff = this.filtroMovFeFin   ? this.parsearFecha(this.filtroMovFeFin)    : null;

    const cobros = this.estudianteActivo.movimientos.map(m => ({
      ...m, _tipo: 'cobro', _fecha: this.parsearFecha(m.fecha),
      _estado: m.estadoCobro, _monto: Number(m.valor) || 0, _descripcion: m.nombre_producto_servicio
    }));

    const pagos = this.estudianteActivo.pagos.map(p => ({
      ...p, _tipo: 'pago', _fecha: this.parsearFecha(p.fecha),
      _estado: p.estadoPago, _monto: Number(p.valor_recibido) || 0, _descripcion: p.tipo_pago
    }));

    return [...cobros, ...pagos]
      .filter(item => {
        const anioOk = !anio || item._fecha.getFullYear() === anio;
        const fiOk = !fi || item._fecha >= fi;
        const ffOk = !ff || item._fecha <= ff;
        const textoOk = !txt ||
          item._descripcion?.toLowerCase().includes(txt) ||
          String(item._monto).includes(txt);
        // filtroMovEstado ahora es 'cobro' | 'pago' | ''
        const tipoOk = !this.filtroMovEstado || item._tipo === this.filtroMovEstado;
        return anioOk && fiOk && ffOk && textoOk && tipoOk;
      })
      .sort((a, b) => a._fecha.getTime() - b._fecha.getTime());
  }

  get movimientosPendientes(): any[] {
    if (!this.estudianteActivo) return [];
    return this.estudianteActivo.movimientos.filter(m => (Number(m.saldo) || 0) > 0);
  }

  get movimientosPendientesFiltrados(): any[] {
    const txt = this.filtroPendientesTexto.toLowerCase();
    const fi = this.filtroPendientesFeInicio ? this.parsearFecha(this.filtroPendientesFeInicio) : null;
    const ff = this.filtroPendientesFeFin   ? this.parsearFecha(this.filtroPendientesFeFin)    : null;
    return this.movimientosPendientes.filter(m => {
      const fecha = this.parsearFecha(m.fecha);
      const textoOk = !txt || m.nombre_producto_servicio?.toLowerCase().includes(txt);
      const fiOk = !fi || fecha >= fi;
      const ffOk = !ff || fecha <= ff;
      return textoOk && fiOk && ffOk;
    });
  }

  // ── Totales filtrados por año para el resumen ──
  private get movimientosAnio(): any[] {
    if (!this.estudianteActivo) return [];
    const anio = Number(this.anioSeleccionado);
    if (!anio) return this.estudianteActivo.movimientos;
    return this.estudianteActivo.movimientos.filter(m =>
      this.parsearFecha(m.fecha).getFullYear() === anio
    );
  }

  private get pagosAnio(): any[] {
    if (!this.estudianteActivo) return [];
    const anio = Number(this.anioSeleccionado);
    if (!anio) return this.estudianteActivo.pagos;
    return this.estudianteActivo.pagos.filter(p =>
      this.parsearFecha(p.fecha).getFullYear() === anio
    );
  }

  get saldoVencidoAnio(): number {
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    return this.movimientosAnio
      .filter(m => this.parsearFecha(m.fecha) < hoy && (Number(m.saldo) || 0) > 0)
      .reduce((s, m) => s + (Number(m.saldo) || 0), 0);
  }

  get saldoPendienteAnio(): number {
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    return this.movimientosAnio
      .filter(m => this.parsearFecha(m.fecha) >= hoy && (Number(m.saldo) || 0) > 0)
      .reduce((s, m) => s + (Number(m.saldo) || 0), 0);
  }

  get saldoProximo10Anio(): number {
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const en10 = new Date(hoy); en10.setDate(en10.getDate() + 10);
    return this.movimientosAnio
      .filter(m => {
        const f = this.parsearFecha(m.fecha);
        return f >= hoy && f <= en10 && (Number(m.saldo) || 0) > 0;
      })
      .reduce((s, m) => s + (Number(m.saldo) || 0), 0);
  }

  get totalPagadoAnio(): number {
    return this.pagosAnio
      .filter(p => p.estadoPago !== 'Anulado')
      .reduce((s, p) => s + (Number(p.valor_recibido) || 0), 0);
  }

  get ultimoPagoAnio(): number {
    const ultimo = this.pagosAnio.find(p => p.estadoPago !== 'Anulado');
    return ultimo ? Number(ultimo.valor_recibido) || 0 : 0;
  }

  get fechaUltimoPagoAnio(): string {
    const ultimo = this.pagosAnio.find(p => p.estadoPago !== 'Anulado');
    return ultimo ? this.formatearFecha(ultimo.fecha) : '';
  }

  get estadoGeneralAnio(): 'aldia' | 'pendiente' | 'vencido' {
    if (this.saldoVencidoAnio > 0) return 'vencido';
    if (this.saldoPendienteAnio > 0) return 'pendiente';
    return 'aldia';
  }

  // ──────────────────────────────────────────────
  // UTILIDADES
  // ──────────────────────────────────────────────

  estadoGeneral(estudiante: ResumenEstudiante): 'aldia' | 'pendiente' | 'vencido' {
    if (estudiante.saldoVencido > 0) return 'vencido';
    if (estudiante.saldoPendiente > 0) return 'pendiente';
    return 'aldia';
  }

  // ──────────────────────────────────────────────
  // DESCARGA COMPROBANTE PDF
  // ──────────────────────────────────────────────

  descargarComprobante(idPago: number, event: Event): void {
    event.stopPropagation(); // No abrir/cerrar el acordeón
    if (this.descargandoComprobante.has(idPago)) return;

    this.descargandoComprobante.add(idPago);

    this.pagosRecibidosService.obtenerDatosComprobante(idPago).subscribe({
      next: (response: any) => {
        const datos = response.body;
        if (!datos) {
          this.descargandoComprobante.delete(idPago);
          return;
        }

        const datosPDF: DatosComprobantePDF = {
          pago: datos.pago,
          estudiante: datos.estudiante,
          acudiente: datos.acudiente,
          tipoPago: datos.tipoPago,
          fechaGeneracion: new Date()
        };

        this.exportarPdfComprobanteService.generarPDF(datosPDF);
        this.descargandoComprobante.delete(idPago);
      },
      error: () => {
        this.descargandoComprobante.delete(idPago);
      }
    });
  }

  esDescargandoComprobante(id: number): boolean {
    return this.descargandoComprobante.has(id);
  }

  formatPeso(valor: number | string): string {
    const num = Number(valor) || 0;
    return '$\u200B' + num.toLocaleString('es-CO', { maximumFractionDigits: 0 });
  }

  parsearFecha(fecha: string): Date {
    try {
      const parte = (fecha || '').substring(0, 10);
      const [a, m, d] = parte.split('-').map(Number);
      const dt = new Date(a, m - 1, d);
      dt.setHours(0, 0, 0, 0);
      return dt;
    } catch { return new Date(); }
  }

  formatearFecha(fecha: string): string {
    try {
      const d = this.parsearFecha(fecha);
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    } catch { return ''; }
  }

  private formatearFechaHoy(): string {
    const h = new Date();
    return `${h.getDate().toString().padStart(2, '0')}/${(h.getMonth() + 1).toString().padStart(2, '0')}/${h.getFullYear()} ${h.getHours().toString().padStart(2, '0')}:${h.getMinutes().toString().padStart(2, '0')}`;
  }

  private checkScroll(): void {
    this.mostrarBotonArriba = (window.pageYOffset || document.documentElement.scrollTop) > 300;
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}