/* localStorage que nunca truena (modo privado, sitio bloqueado, etc.). */

export function guardar(clave: string, valor: unknown): void {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* sin almacenamiento: la app funciona igual, solo no recuerda */
  }
}

export function leer<T>(clave: string, defecto: T): T {
  try {
    const v = localStorage.getItem(clave);
    return v == null ? defecto : (JSON.parse(v) as T);
  } catch {
    return defecto;
  }
}
