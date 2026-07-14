import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../common/header/header.component';
import { DocumentosPersonaComponent } from '../../common/documentos-persona/documentos-persona.component';
import { ReportesPagoService } from '../../services/reportes-pago.service';
import { TiposPagosService } from '../../services/tipos-pagos.service';
import { ColaboradoresService } from '../../services/colaboradores.service';
import { PersonasService } from '../../services/personas.service';
import { AuthService } from '../../services/auth_acudientes.service';
import { environment } from '../../../environments/environment';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Component({
  selector: 'app-reportes-pago',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, DocumentosPersonaComponent],
  templateUrl: './reportes-pago.component.html',
  styleUrl: './reportes-pago.component.scss'
})
export class ReportesPagoComponent implements OnInit {

  titulo = 'Reportar Pago';

  estudiantes: any[] = [];
  estudianteSeleccionado: any = null;
  reportes: any[] = [];
  tiposPago: any[] = [];
  colaboradores: any[] = [];
  idPersonaActual: string = '';
  idReporteCreado: string = '';
  cargando = false;
  guardado = false;
  vistaActual: 'estudiantes' | 'reportes' | 'formulario' | 'detalle' = 'estudiantes';

  // Formulario crear
  model = {
    idColaboradorRecibio: '',
    idTipoPago: '',
    valor: '',
    fechaPago: '',
    observaciones: ''
  };
  submitted = false;

  // Detalle
  reporteSeleccionado: any = null;

  // Modal foto ampliada
  fotoAmpliada: { url: string; nombre: string; cargo: string } | null = null;

  constructor(
    private router: Router,
    private http: HttpClient,
    private reportesPagoService: ReportesPagoService,
    private tiposPagosService: TiposPagosService,
    private colaboradoresService: ColaboradoresService,
    private personasService: PersonasService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.obtenerIdPersonaActual();
    this.cargarEstudiantes();
    this.cargarTiposPago();
    this.cargarColaboradores();
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

  cargarTiposPago(): void {
    this.tiposPagosService.obtenerTodos().subscribe({
      next: (response: any) => {
        const todos = response.body || [];
        this.tiposPago = todos.filter((tp: any) => tp.visible_portal_padres == 1 || tp.visible_portal_padres === '1');
      }
    });
  }

  cargarColaboradores(): void {
    this.colaboradoresService.obtenerTodos().subscribe({
      next: (response: any) => {
        const todos = response.body || [];
        this.colaboradores = todos.filter((c: any) => c.activo == 1 || c.activo === '1');
      }
    });
  }

  seleccionarEstudiante(estudiante: any): void {
    this.estudianteSeleccionado = estudiante;
    this.vistaActual = 'reportes';
    this.cargarReportes();
  }

  cargarReportes(): void {
    if (!this.estudianteSeleccionado) return;
    this.cargando = true;
    const idEstudiante = this.estudianteSeleccionado.id_estudiante;

    this.reportesPagoService.obtenerByEstudiante(idEstudiante).subscribe({
      next: (response: any) => {
        this.reportes = response.body || [];
        this.cargando = false;
      },
      error: () => { this.cargando = false; }
    });
  }

  volverAEstudiantes(): void {
    this.vistaActual = 'estudiantes';
    this.estudianteSeleccionado = null;
    this.reportes = [];
  }

  volverAReportes(): void {
    this.vistaActual = 'reportes';
    this.limpiarFormulario();
    this.cargarReportes();
  }

  mostrarFormulario(): void {
    this.vistaActual = 'formulario';
    this.limpiarFormulario();
    const hoy = new Date();
    this.model.fechaPago = hoy.toISOString().split('T')[0];
  }

  guardar(): void {
    this.submitted = true;

    if (!this.model.idColaboradorRecibio || !this.model.idTipoPago || !this.model.valor || !this.model.fechaPago) {
      Swal.fire('Campos incompletos', 'Complete todos los campos obligatorios', 'warning');
      return;
    }

    const valorNumerico = this.obtenerValorNumerico(this.model.valor);
    if (valorNumerico <= 0) {
      Swal.fire('Valor inválido', 'El valor debe ser mayor a cero', 'warning');
      return;
    }

    const data = {
      id_estudiante: this.estudianteSeleccionado.id_estudiante,
      id_persona_reporta: this.idPersonaActual,
      id_colaborador_recibio: this.model.idColaboradorRecibio,
      id_tipo_pago: this.model.idTipoPago,
      valor: valorNumerico,
      fecha_pago: this.model.fechaPago,
      observaciones: this.model.observaciones
    };

    Swal.fire({
      title: 'Confirmar reporte',
      html: `¿Está seguro de reportar un pago por <strong>${this.formatearMoneda(valorNumerico)}</strong>?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, reportar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.reportesPagoService.crear(data).subscribe({
          next: (response: any) => {
            this.idReporteCreado = response?.id || '';
            this.guardado = true;
          },
          error: (error: any) => {
            Swal.fire('Error', 'No se pudo registrar el reporte de pago', 'error');
            console.error('Error creando reporte:', error);
          }
        });
      }
    });
  }

  verDetalle(reporte: any): void {
    this.reporteSeleccionado = reporte;
    this.vistaActual = 'detalle';
  }

  eliminarReporte(reporte: any): void {
    if (reporte.estado !== 'pendiente') {
      Swal.fire('No permitido', 'Solo se pueden eliminar reportes pendientes', 'warning');
      return;
    }

    Swal.fire({
      title: '¿Eliminar reporte?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545'
    }).then((result) => {
      if (result.isConfirmed) {
        this.reportesPagoService.eliminar(reporte.id).subscribe({
          next: () => {
            Swal.fire('Eliminado', 'El reporte ha sido eliminado', 'success');
            this.cargarReportes();
            if (this.vistaActual === 'detalle') {
              this.volverAReportes();
            }
          },
          error: () => { Swal.fire('Error', 'No se pudo eliminar el reporte', 'error'); }
        });
      }
    });
  }

  // Íconos para tipos de pago
  getIconoTipoPago(nombre: string): string {
    const n = nombre.toLowerCase();
    if (n.includes('efectivo')) return 'fa-money-bill-wave';
    if (n.includes('nequi')) return 'fa-mobile-alt';
    if (n.includes('bancolombia') || n.includes('transferencia')) return 'fa-university';
    if (n.includes('daviplata')) return 'fa-mobile-alt';
    if (n.includes('tarjeta')) return 'fa-credit-card';
    return 'fa-wallet';
  }

  // Foto de colaborador
  obtenerUrlFoto(foto: string): string {
    return this.personasService.obtenerUrlFoto(foto) + '?t=' + new Date().getTime();
  }

  ampliarFoto(col: any, event: Event): void {
    event.stopPropagation();
    if (!col.foto) return;
    this.fotoAmpliada = {
      url: this.obtenerUrlFoto(col.foto),
      nombre: (col.primer_nombre || '') + ' ' + (col.primer_apellido || ''),
      cargo: col.nombre_cargo || ''
    };
  }

  cerrarFoto(): void {
    this.fotoAmpliada = null;
  }

  // Documento subido desde app-documentos-persona
  onDocumentoSubido(evento: any): void {
    if (evento.eliminado) return;
    if (!this.idReporteCreado) return;

    const idDocumento = evento.id_documento;
    if (!idDocumento) return;

    this.reportesPagoService.actualizarDocumento({
      id: this.idReporteCreado,
      id_documento_persona: idDocumento
    }).subscribe({
      next: () => {
        console.log('Documento asociado al reporte:', this.idReporteCreado, '-> doc:', idDocumento);
      },
      error: (error: any) => {
        console.error('Error al asociar documento al reporte:', error);
      }
    });
  }

  // Helpers para comprobante en vista detalle
  obtenerUrlComprobante(ruta: string): string {
    if (!ruta) return '';
    return environment.api.replace('/api/', '/') + ruta;
  }

  esImagen(nombre: string): boolean {
    if (!nombre) return false;
    const ext = nombre.toLowerCase().split('.').pop() || '';
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  }

  esPdf(nombre: string): boolean {
    if (!nombre) return false;
    return nombre.toLowerCase().endsWith('.pdf');
  }

  // Formateo de moneda
  onInputValor(event: any): void {
    let valor = event.target.value.replace(/[^0-9]/g, '');
    if (valor) {
      this.model.valor = Number(valor).toLocaleString('es-CO');
    } else {
      this.model.valor = '';
    }
  }

  obtenerValorNumerico(valorFormateado: string): number {
    if (!valorFormateado) return 0;
    return Number(valorFormateado.replace(/[^0-9]/g, ''));
  }

  formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor);
  }

  getEstadoClase(estado: string): string {
    return estado === 'asociado' ? 'asociado' : 'pendiente';
  }

  getEstadoTexto(estado: string): string {
    return estado === 'asociado' ? 'Registrado' : 'Pendiente';
  }

  private limpiarFormulario(): void {
    this.model = {
      idColaboradorRecibio: '',
      idTipoPago: '',
      valor: '',
      fechaPago: '',
      observaciones: ''
    };
    this.submitted = false;
    this.guardado = false;
    this.idReporteCreado = '';
  }
}