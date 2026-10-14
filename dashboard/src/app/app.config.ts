import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withHashLocation, withInMemoryScrolling } from '@angular/router';

import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { CebaApi, DemoCebaApi, HttpCebaApi } from './core/api/ceba-api';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    /* rutas con # (#/mapa, #/parcela/AGC_003), igual que la versión anterior */
    provideRouter(routes, withHashLocation(), withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(),
    { provide: CebaApi, useClass: environment.demo ? DemoCebaApi : HttpCebaApi },
  ],
};
