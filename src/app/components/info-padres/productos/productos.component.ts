import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { ProductosServiciosService } from '../../../services/productos-servicios.service';

interface Producto {
  id: number;
  nombre: string;
  detalles: string;
  valor_sugerido: number;
  id_clasificacion_productos_servicios: number;
  id_categoria_productos_servicios: number;
  id_horario_alimentacion_sugerido: number;
  id_periodicidad_cobro: number;
  nombre_clasificacion: string;
  icono_clasificacion: string;
  nombre_categoria: string;
  nombre_periodicidad: string;
  nombre_horario_alimentacion: string;
}

interface SeccionCatalogo {
  key: string;
  titulo: string;
  icono: string;
  colorClase: string;
  productos: Producto[];
  productosFiltrados: Producto[];
  abierta: boolean;
}

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.scss'
})
export class ProductosComponent implements OnInit {

  titulo = 'Nuestros Productos y Precios';
  isLoading = true;
  errorMessage: string | null = null;
  secciones: SeccionCatalogo[] = [];
  textoBusqueda = '';
  totalProductos = 0;
  totalFiltrados = 0;

  private filtrosSecciones = [
    {
      key: 'onces',
      titulo: 'Onces',
      icono: '🍪',
      colorClase: 'onces',
      filtro: (p: Producto) =>
        p.id_clasificacion_productos_servicios === 3 &&
        p.id_categoria_productos_servicios === 2 &&
        p.id_periodicidad_cobro === 3
    },
    {
      key: 'almuerzo',
      titulo: 'Almuerzo',
      icono: '🍽️',
      colorClase: 'almuerzo',
      filtro: (p: Producto) =>
        p.id_clasificacion_productos_servicios === 3 &&
        [1, 2].includes(p.id_categoria_productos_servicios) &&
        [3].includes(p.id_horario_alimentacion_sugerido) &&
        [2, 3].includes(p.id_periodicidad_cobro)
    },
    {
      key: 'vestuario',
      titulo: 'Vestuario',
      icono: '👕',
      colorClase: 'vestuario',
      filtro: (p: Producto) =>
        p.id_clasificacion_productos_servicios === 4 &&
        p.id_categoria_productos_servicios === 2 &&
        p.id_periodicidad_cobro === 4
    },
    {
      key: 'insumos',
      titulo: 'Insumos',
      icono: '📦',
      colorClase: 'insumos',
      filtro: (p: Producto) =>
        p.id_clasificacion_productos_servicios === 5 &&
        p.id_categoria_productos_servicios === 2 &&
        p.id_periodicidad_cobro === 4
    },
    {
      key: 'horarios-extra',
      titulo: 'Horarios Extra',
      icono: '⏰',
      colorClase: 'horarios-extra',
      filtro: (p: Producto) =>
        p.id_clasificacion_productos_servicios === 2 &&
        p.id_categoria_productos_servicios === 2 &&
        p.id_periodicidad_cobro === 3
    }
  ];

  constructor(
    private router: Router,
    private productosService: ProductosServiciosService
  ) {}

  ngOnInit(): void {
    this.cargarCatalogo();
  }

  private cargarCatalogo(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.productosService.obtenerCatalogoDisponibles().subscribe({
      next: (response: any) => {
        const productos: Producto[] = response.body || [];
        this.construirSecciones(productos);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando catálogo:', error);
        this.errorMessage = 'No pudimos cargar los productos. Intenta de nuevo.';
        this.isLoading = false;
      }
    });
  }

  private construirSecciones(productos: Producto[]): void {
    this.secciones = this.filtrosSecciones
      .map(config => {
        const productosSeccion = productos.filter(config.filtro);
        return {
          key: config.key,
          titulo: config.titulo,
          icono: config.icono,
          colorClase: config.colorClase,
          productos: productosSeccion,
          productosFiltrados: productosSeccion,
          abierta: true
        };
      })
      .filter(seccion => seccion.productos.length > 0);

    this.totalProductos = this.secciones.reduce((sum, s) => sum + s.productos.length, 0);
    this.totalFiltrados = this.totalProductos;
  }

  filtrarProductos(): void {
    const texto = this.textoBusqueda.trim().toLowerCase();

    this.secciones.forEach(seccion => {
      if (!texto) {
        seccion.productosFiltrados = seccion.productos;
      } else {
        seccion.productosFiltrados = seccion.productos.filter(p =>
          p.nombre.toLowerCase().includes(texto) ||
          (p.detalles && p.detalles.toLowerCase().includes(texto))
        );
      }
    });

    this.totalFiltrados = this.secciones.reduce((sum, s) => sum + s.productosFiltrados.length, 0);
  }

  limpiarBusqueda(): void {
    this.textoBusqueda = '';
    this.filtrarProductos();
  }

  toggleSeccion(seccion: SeccionCatalogo): void {
    seccion.abierta = !seccion.abierta;
  }

  tieneResultados(): boolean {
    return this.secciones.some(s => s.productosFiltrados.length > 0);
  }

  formatearPrecio(valor: number): string {
    if (!valor) return 'Consultar';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor);
  }

  trackBySeccion(index: number, seccion: SeccionCatalogo): string {
    return seccion.key;
  }

  trackByProducto(index: number, producto: Producto): number {
    return producto.id;
  }
}