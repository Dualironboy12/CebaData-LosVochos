/** Producción: el front pide los datos a la API desplegada.
 * Sustituye apiUrl por la URL pública del backend (sin barra final), p. ej.
 * 'https://cebadata-api.onrender.com'. Agrega ese origen en CORS_ALLOWED_ORIGINS
 * de la API.
 */
export const environment = {
  demo: false,
  apiUrl: 'https://SUSTITUIR-URL-API',
};
