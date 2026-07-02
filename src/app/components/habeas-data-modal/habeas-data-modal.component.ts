import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AutorizacionesHabeasDataService } from '../../services/autorizaciones-habeas-data.service';

@Component({
  selector: 'app-habeas-data-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './habeas-data-modal.component.html',
  styleUrl: './habeas-data-modal.component.scss',
})
export class HabeasDataModalComponent implements OnInit {
  @Input() idUsuario: number = 0;
  @Input() idPersona: number = 0;
  @Output() autorizado = new EventEmitter<void>();
  @Output() errorPlantilla = new EventEmitter<void>();

  public plantilla: any = null;
  public cargando = true;
  public aceptado = false;
  public guardando = false;
  public scrollCompleto = false;
  public errorCarga = false;
  public mensajeError = '';

  constructor(
    private autorizacionesService: AutorizacionesHabeasDataService
  ) {}

  ngOnInit(): void {
    this.cargarPlantilla();
  }

  cargarPlantilla(): void {
    this.cargando = true;
    this.errorCarga = false;
    this.mensajeError = '';

    this.autorizacionesService.obtenerPlantilla().subscribe({
      next: (response: any) => {
        const data: any = response.body;

        if (data.error) {
          this.cargando = false;
          this.errorCarga = true;
          this.mensajeError = data.error;
          return;
        }

        this.plantilla = data.contenido;
        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error al cargar plantilla:', error);
        this.cargando = false;
        this.errorCarga = true;
        this.mensajeError = 'No se pudo cargar la política de tratamiento de datos. Intenta de nuevo más tarde.';
      },
    });
  }

  cerrarConError(): void {
    this.errorPlantilla.emit();
  }

  onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const threshold = 50;
    const position = element.scrollTop + element.clientHeight;
    const height = element.scrollHeight;

    if (position >= height - threshold) {
      this.scrollCompleto = true;
    }
  }

  aceptarPolitica(): void {
    if (!this.aceptado || !this.scrollCompleto) return;

    this.guardando = true;

    this.autorizacionesService
      .registrar({
        id_usuario: this.idUsuario,
        id_persona: this.idPersona,
        version_politica: this.plantilla?.version || '1.0',
      })
      .subscribe({
        next: () => {
          this.guardando = false;
          this.autorizado.emit();
        },
        error: (error: any) => {
          this.guardando = false;
          this.errorCarga = true;
          this.mensajeError = 'No se pudo registrar la autorización. Intenta de nuevo.';
          console.error('Error al registrar autorización:', error);
        },
      });
  }
}