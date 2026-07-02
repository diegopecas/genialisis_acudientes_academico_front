import { Routes } from '@angular/router';
import { MenuComponent } from './components/menu/menu.component';
import { EstudiantesComponent } from './components/estudiantes/estudiantes.component';
import { LoginComponent } from './components/login/login.component';
import { UsuariosComponent } from './components/usuarios/usuarios.component';
import { VistaEstudianteComponent } from './components/estudiantes/vista-estudiante/vista-estudiante.component';
import { AuthGuard } from './core/auth.guard';
import { EstudianteGuard } from './core/estudiante.guard';
import { GaleriaComponent } from './components/galeria/galeria.component';
import { MiPerfilComponent } from './components/mi-perfil/mi-perfil.component';
import { InfoPadresComponent } from './components/info-padres/info-padres.component';
import { ProductosComponent } from './components/info-padres/productos/productos.component';
import { CalendarioPadresComponent } from './components/info-padres/calendario-padres/calendario-padres.component';
import { MenuAlimentacionPadresComponent } from './components/info-padres/menu-alimentacion-padres/menu-alimentacion-padres.component';
import { HorarioPadresComponent } from './components/info-padres/horario-padres/horario-padres.component';
import { AutorizadosRecogerComponent } from './components/autorizados-recoger/autorizados-recoger.component';
import { ReportesPagoComponent } from './components/reportes-pago/reportes-pago.component';
import { MiCuentaComponent } from './components/mi-cuenta/mi-cuenta.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  
  { 
    path: 'menu', 
    component: MenuComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'estudiantes', 
    component: EstudiantesComponent,
    canActivate: [AuthGuard],
    data: { trackear: true, labelAcceso: 'Estudiantes', iconoAcceso: '🎓' }
  },
  { 
    path: 'galeria', 
    component: GaleriaComponent,
    canActivate: [AuthGuard],
    data: { trackear: true, labelAcceso: 'Galería', iconoAcceso: '🖼️' }
  },
  { 
    path: 'usuarios', 
    component: UsuariosComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'mi-perfil', 
    component: MiPerfilComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'info-padres', 
    component: InfoPadresComponent,
    canActivate: [AuthGuard],
    data: { trackear: true, labelAcceso: 'Info para todos', iconoAcceso: '📢' }
  },
  { 
    path: 'info-padres/productos', 
    component: ProductosComponent,
    canActivate: [AuthGuard],
    data: { trackear: true, labelAcceso: 'Productos', iconoAcceso: '📦' }
  },
  { 
    path: 'info-padres/calendario', 
    component: CalendarioPadresComponent,
    canActivate: [AuthGuard],
    data: { trackear: true, labelAcceso: 'Calendario', iconoAcceso: '📅' }
  },
  { 
    path: 'info-padres/menu-alimentacion', 
    component: MenuAlimentacionPadresComponent,
    canActivate: [AuthGuard],
    data: { trackear: true, labelAcceso: 'Menú Alimentación', iconoAcceso: '🍽️' }
  },
  { 
    path: 'info-padres/horario', 
    component: HorarioPadresComponent,
    canActivate: [AuthGuard],
    data: { trackear: true, labelAcceso: 'Horario', iconoAcceso: '🕐' }
  },
  { 
    path: 'autorizados-recoger', 
    component: AutorizadosRecogerComponent,
    canActivate: [AuthGuard],
    data: { trackear: true, labelAcceso: 'Autorizados', iconoAcceso: '🚗' }
  },
  { 
    path: 'reportes-pago', 
    component: ReportesPagoComponent,
    canActivate: [AuthGuard],
    data: { trackear: true, labelAcceso: 'Reportar Pago', iconoAcceso: '💰' }
  },
  { 
    path: 'mi-cuenta', 
    component: MiCuentaComponent,
    canActivate: [AuthGuard],
    data: { trackear: true, labelAcceso: 'Mi Cuenta', iconoAcceso: '💳' }
  },
  
  { 
    path: 'estudiantes-vista/:id', 
    component: VistaEstudianteComponent,
    canActivate: [AuthGuard, EstudianteGuard]
  },
  
  { path: 'salir', component: MenuComponent },
  
  { path: '**', redirectTo: 'login' }
];