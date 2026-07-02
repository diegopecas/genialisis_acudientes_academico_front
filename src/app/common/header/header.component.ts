import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { InstitucionConfigService } from '../../services/institucion-config.service';
import { AyudaModalService } from '../../services/ayuda-modal.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class HeaderComponent implements OnChanges, OnInit {

  @Input() tituloModulo: any;
  @Input() accion: any;
  @Input() id: any;
  @Input() raiz: any;
  @Input() regresar: any;
  @Input() mostrarCrear: any;
  @Input() iconoTitulo: any;
  
  titulo = "";
  idRegistro = "0";
  path = "";
  pathRegresar = "";
  iconoCrear = false;
  icono = '';

  // Iconos simples de botones
  public createIcon = '+';
  public backIcon = '←';

  // Configuración de la institución
  public logoGenialisis = '/assets/images/logo_app.png';
  public nombreJardin = '';

  constructor(
    private institucionConfigService: InstitucionConfigService,
    private ayudaModalService: AyudaModalService
  ) {}

  ngOnInit(): void {
    this.nombreJardin = this.institucionConfigService.getNombreInstitucion();
  }

  abrirAyuda(): void {
    this.ayudaModalService.abrir();
  }

  /**
   * Capitaliza la primera letra de cada palabra
   */
  capitalizarTitulo(texto: string): string {
    if (!texto) return '';
    return texto
      .toLowerCase()
      .split(' ')
      .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
      .join(' ');
  }

  ngOnChanges(changes: SimpleChanges): void {

    if (changes["tituloModulo"]) {
      this.titulo = changes["tituloModulo"]["currentValue"];
    }

    if (changes["iconoTitulo"]) {
      this.icono = changes["iconoTitulo"]["currentValue"];
    }

    if (changes["mostrarCrear"]) {
      this.iconoCrear = changes["mostrarCrear"]["currentValue"];
    }

    if (changes["id"]) {
      this.idRegistro = changes["id"]["currentValue"];
    }
    
    if (changes["raiz"]) {
      this.path = this.iconoCrear ? changes["raiz"]["currentValue"]+"/crear/0" : changes["raiz"]["currentValue"];
    }

    if (changes["accion"]) {
      const _accion = changes["accion"]["currentValue"];
      switch(_accion) {
        case 'crear':
          this.titulo = "Crear " + this.titulo;
          break;
        case 'editar':
          this.titulo = "Editar " + this.titulo + ": " + this.idRegistro;
          break;
        case 'consultar':
          this.titulo = "Consultar " + this.titulo + ": " + this.idRegistro;
          break;
      }
    }

    if (changes["regresar"]) {
      this.pathRegresar = changes["regresar"]["currentValue"];
    }
  }
}