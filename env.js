/* Cyber Lab · Configuración (el equivalente al .env de la web).
   Este archivo se publica: NO pongas aquí claves ni contraseñas, solo direcciones. */
window.CL_ENV = {
  // API de cuentas, progreso, contenido y agentes (cyber-lab-api detrás del túnel de Cloudflare).
  API_URL: 'https://cyber-api.huergalabs.dev/api',
  // Solo en tu Mac (localhost): URL de tu API local, por ejemplo 'http://127.0.0.1:8002/api'.
  // Vacío = usa API_URL para entrar, y el contenido se lee de private/js.
  API_URL_LOCAL: '',
};
