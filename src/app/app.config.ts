import {
  ApplicationConfig,
  provideZoneChangeDetection,
  APP_INITIALIZER,
} from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app.routes';
import {
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { authInterceptor } from './core/auth.interceptor';
import { loadingInterceptor } from './core/loading.interceptor';
import { tenantInterceptor } from './core/tenant.interceptor';
import { InstitucionConfigService } from './services/institucion-config.service';

export function initializeInstitucionConfig(
  institucionConfigService: InstitucionConfigService
) {
  return () => institucionConfigService.inicializar();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withHashLocation()),
    provideHttpClient(withInterceptors([authInterceptor, loadingInterceptor, tenantInterceptor])),
    provideAnimations(),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeInstitucionConfig,
      deps: [InstitucionConfigService],
      multi: true,
    },
  ],
};