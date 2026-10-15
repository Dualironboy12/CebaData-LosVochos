import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

import { environment } from '../environments/environment';
import { SECCIONES, Seccion } from './secciones';
import { EstadoApp } from './core/state';
import { TemaService } from './core/theme';
import { IconComponent } from './shared/icon';
import { TooltipComponent } from './shared/tooltip';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, TooltipComponent],
  templateUrl: './app.html',
})
export class App {
  protected readonly secciones = SECCIONES;
  protected readonly demo = environment.demo;
  protected readonly tema = inject(TemaService);
  private readonly estado = inject(EstadoApp);
  private readonly router = inject(Router);
  private readonly titulo = inject(Title);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );
  protected readonly actual = computed<Seccion>(() => {
    const id = this.url().replace(/^\//, '').split(/[/?#]/)[0] || 'mapa';
    return SECCIONES.find((s) => s.id === id) ?? SECCIONES[0];
  });

  constructor() {
    effect(() => this.titulo.setTitle(`${this.actual().titulo} · CebaData`));
  }

  /** La ficha recuerda la última parcela vista. */
  protected enlace(s: Seccion): string[] {
    const id = this.estado.parcelaId();
    return s.id === 'parcela' && id ? ['/parcela', id] : ['/' + s.id];
  }
}
