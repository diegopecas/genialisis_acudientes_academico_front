import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../common/header/header.component';

@Component({
  selector: 'app-info-padres',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './info-padres.component.html',
  styleUrl: './info-padres.component.scss'
})
export class InfoPadresComponent {

  titulo = 'Info para todos';

  opciones = [
    {
      key: 'productos',
      titulo: 'Nuestros Productos y Precios',
      descripcion: 'Conoce todos nuestros servicios, alimentación, vestuario e insumos con sus precios',
      icono: '/assets/images/servicios-alimentacion.png',
      colorClase: 'productos',
      accionTexto: 'Ver catálogo'
    },
    {
      key: 'calendario',
      titulo: 'Nuestro Calendario',
      descripcion: 'Consulta las fechas importantes, eventos y actividades programadas',
      icono: '/assets/images/calendario.png',
      colorClase: 'calendario',
      accionTexto: 'Ver calendario'
    },
    {
      key: 'menu-alimentacion',
      titulo: 'Nuestro Menú',
      descripcion: 'Revisa el menú semanal de alimentación para los estudiantes',
      icono: '/assets/images/menu-alimentacion.png',
      colorClase: 'menu-alimentacion',
      accionTexto: 'Ver menú'
    },
    {
      key: 'horario',
      titulo: 'Nuestro Horario',
      descripcion: 'Consulta el horario de clases y actividades de tus hijos',
      icono: '/assets/images/horario.png',
      colorClase: 'horario',
      accionTexto: 'Ver horario'
    }
  ];

  constructor(private router: Router) {}

  seleccionarOpcion(key: string): void {
    switch (key) {
      case 'productos':
        this.router.navigate(['/info-padres/productos']);
        break;
      case 'calendario':
        this.router.navigate(['/info-padres/calendario']);
        break;
      case 'menu-alimentacion':
        this.router.navigate(['/info-padres/menu-alimentacion']);
        break;
      case 'horario':
        this.router.navigate(['/info-padres/horario']);
        break;
    }
  }
}