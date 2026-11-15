/* Cyber Lab · Utilidades comunes (se carga antes que los demás módulos).
   Pone en window.CLUtil las funciones que antes estaban copiadas en cada archivo:
   - esc:   escapa texto para meterlo en HTML sin riesgo de inyección (&, <, >, ", ').
   - isLocal: ¿la web corre en este Mac (localhost)? Para el modo de pruebas sin API.
   - store:  leer/guardar en localStorage sin que un fallo rompa la página.
   - fresh:  pide un ejercicio nuevo a un generador sin repetir los últimos (Práctica).
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

  // Ejercicio "siempre distinto": vuelve a generar mientras salga uno de los últimos `n`
  // (si el generador tiene pocos posibles, se rinde a los `tries` intentos y acepta el último).
  // `recent` es la lista de claves ya vistas: la guarda quien llama, una por nivel.
  const keyOf = x => (x && typeof x === 'object') ? [x.q, x.big, x.answer].join('|') : String(x);
  function fresh(gen, recent, n = 8, tries = 40) {
    let x, k, i = 0;
    do { x = gen(); k = keyOf(x); } while (recent.includes(k) && ++i < tries);
    recent.push(k);
    if (recent.length > n) recent.splice(0, recent.length - n);
    return x;
  }

  global.CLUtil = { esc, isLocal, store, fresh };
})(window);
