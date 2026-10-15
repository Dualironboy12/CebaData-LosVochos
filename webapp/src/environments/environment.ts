/** Desarrollo y producción: el front pide los datos a cebadata_api. */
export const environment = {
  demo: false,
  /** Vacío = mismo origen (en `ng serve` el proxy de proxy.conf.json manda /api a Django). */
  apiUrl: '',
};
