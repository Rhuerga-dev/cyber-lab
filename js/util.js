/* Cyber Lab · Utilidades comunes (se carga antes que los demás módulos).
   Pone en window.CLUtil las funciones que antes estaban copiadas en cada archivo:
   - esc:   escapa texto para meterlo en HTML sin riesgo de inyección (&, <, >, ", ').
   - isLocal: ¿la web corre en este Mac (localhost)? Para el modo de pruebas sin API.
   - store:  leer/guardar en localStorage sin que un fallo rompa la página.
   Mantiene EXACTAMENTE el comportamiento que tenían las copias. */
(function (global) {
  'use strict';

  const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => MAP[c]);

  const isLocal = () => /^(localhost|127\.0\.0\.1|\[::1\])$/.test(global.location.hostname);

  const store = {
    get(k) { try { return global.localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { v === null ? global.localStorage.removeItem(k) : global.localStorage.setItem(k, v); } catch (e) {} },
  };

  global.CLUtil = { esc, isLocal, store };
})(window);
