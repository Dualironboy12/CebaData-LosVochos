import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

export type Tema = 'light' | 'dark';
const CLAVE = 'cebadata-tema';

function leerTema(): Tema | null {
  try {
    const v = localStorage.getItem(CLAVE);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly doc = inject(DOCUMENT);
  private readonly preferencia = signal<Tema | null>(leerTema());
  private readonly sistemaOscuro = signal(false);

  readonly actual = computed<Tema>(() => this.preferencia() ?? (this.sistemaOscuro() ? 'dark' : 'light'));
  readonly oscuro = computed(() => this.actual() === 'dark');

  constructor() {
    const mq = this.doc.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');
    if (mq) {
      this.sistemaOscuro.set(mq.matches);
      mq.addEventListener?.('change', (e) => this.sistemaOscuro.set(e.matches));
    }
    const t = this.preferencia();
    if (t) this.doc.documentElement.setAttribute('data-theme', t);
  }

  alternar(): void {
    const nuevo: Tema = this.actual() === 'dark' ? 'light' : 'dark';
    this.preferencia.set(nuevo);
    this.doc.documentElement.setAttribute('data-theme', nuevo);
    try {
      localStorage.setItem(CLAVE, nuevo);
    } catch {
      /* sin almacenamiento */
    }
  }
}
