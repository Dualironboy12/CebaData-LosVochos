import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'mapa' },
  { path: 'mapa', loadComponent: () => import('./features/mapa/mapa-page').then((m) => m.MapaPage) },
  { path: 'parcela', loadComponent: () => import('./features/parcela/parcela-page').then((m) => m.ParcelaPage) },
  { path: 'parcela/:id', loadComponent: () => import('./features/parcela/parcela-page').then((m) => m.ParcelaPage) },
  { path: 'modelo', loadComponent: () => import('./features/modelo/modelo-page').then((m) => m.ModeloPage) },
  { path: 'hallazgos', loadComponent: () => import('./features/hallazgos/hallazgos-page').then((m) => m.HallazgosPage) },
  { path: 'simulador', loadComponent: () => import('./features/simulador/simulador-page').then((m) => m.SimuladorPage) },
  { path: '**', redirectTo: 'mapa' },
];
