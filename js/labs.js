/* Cyber Lab · Laboratorios aislados bajo demanda (dentro de Mi lab)
   Un clic crea Juice Shop o DVWA en su propia red Docker sin salida a internet; se apaga solo a las 2 horas.
   La web solo habla con la API (con tu sesión); la API habla con el Runner de tu Mac. */
(function (global) {
'use strict';

const t = (s, v) => (global.I18N ? global.I18N.t(s, v) : String(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ACTIVE = ['pending', 'starting', 'ready', 'stopping'];
const SCEN = {
  'juice-shop': { name: 'OWASP Juice Shop', what: 'Tienda web moderna con más de 100 retos: inyección, XSS, control de acceso, lógica de negocio…', login: 'Sin usuario: regístrate dentro de la tienda.' },
  dvwa: { name: 'DVWA', what: 'App PHP clásica con un módulo por vulnerabilidad y cuatro niveles de dificultad.', login: 'admin / password. La primera vez pulsa «Create / Reset Database».' },
};
const STATUS = { pending: ['En cola', 'pendiente'], starting: ['Preparando', 'programado'], ready: ['Listo', 'aprobado'], stopping: ['Apagando', 'programado'], stopped: ['Detenido', 'pendiente'], failed: ['Error', 'pendiente'] };
const START_CMD = 'cd ~/Code/cyber-lab-api/runner && ./start.sh';

let root = null, labs = [], runner = { configured: true, error: null }, ttl = 120, msg = '', busy = false, timer = null, tick = null, armed = 0, loaded = false;

function render(el) {
  root = el;
  if (!root) return;
  if (!global.Sync || !global.Sync.loggedIn) {
    root.innerHTML = `<h2>${esc(t('Laboratorio aislado con un clic'))}</h2><p class="muted">${esc(t('Entra con tu cuenta para crear laboratorios aislados.'))}</p>`;
    return;
  }
  if (!loaded) root.innerHTML = `<h2>${esc(t('Laboratorio aislado con un clic'))}</h2><p class="muted">${esc(t('Cargando…'))}</p>`;
  refresh();
}

async function refresh() {
  clearTimeout(timer);
  if (!root || !root.isConnected) return;
  try {
    const r = await global.Sync.labs.list();
    labs = Array.isArray(r.data) ? r.data : []; runner = r.runner || runner; ttl = r.ttl_minutes || ttl; loaded = true;
  } catch (e) {
    runner = { configured: true, error: e.offline ? t('No puedo conectar con el servidor ahora mismo. Comprueba que tu API está encendida.') : (e.body && e.body.message ? global.Sync.tr(e.body.message) : t('No se pudo consultar los laboratorios.')) };
    loaded = true;
  }
  paint();
  const cur = labs.find(l => ACTIVE.includes(l.status));
  // Mientras se prepara o apaga, se consulta cada 3 s; listo, cada 30 s (para ver si caducó).
  if (cur && root && root.isConnected) timer = setTimeout(refresh, cur.status === 'ready' ? 30000 : 3000);
}

function left(iso) {
  const ms = Date.parse(iso) - Date.now();
  if (!(ms > 0)) return t('a punto de apagarse');
  const m = Math.ceil(ms / 60000);
  return m >= 60 ? t('{h} h {m} min', { h: Math.floor(m / 60), m: m % 60 }) : t('{m} min', { m });
}

function paint() {
  if (!root || !root.isConnected) return;
  clearInterval(tick);
  const cur = labs.find(l => ACTIVE.includes(l.status));
  const past = labs.filter(l => !ACTIVE.includes(l.status)).slice(0, 3);
  const needRunner = !runner.configured || !!runner.error;
  let html = `<h2>${esc(t('Laboratorio aislado con un clic'))} <span class="pill aprobado">${esc(t('Recomendado'))}</span></h2>
    <p>${esc(t('Sin comandos: eliges la app y se crea en su propia red de Docker, sin salida a internet ni a tu red. Solo este Mac puede abrirla y se apaga sola a los {m} minutos.', { m: ttl }))}</p>`;
  if (needRunner) {
    html += `<div class="fb hint"><p><b>${esc(runner.configured ? t('El Runner no responde.') : t('Falta configurar el Runner en la API.'))}</b> ${esc(runner.error || '')}</p>
      <p>${esc(t('Abre Docker Desktop y, en la Terminal del Mac, arranca el Runner (déjalo abierto mientras practicas):'))}</p>
      <div class="lab-cmd"><pre>${esc(START_CMD)}</pre><button class="btn ghost" type="button" id="lb-copy">${esc(t('Copiar'))}</button></div>
      <div class="row"><button class="btn ghost" type="button" id="lb-retry">${esc(t('Reintentar'))}</button></div></div>`;
  }
  if (cur) {
    const sc = SCEN[cur.scenario] || { name: cur.scenario, login: '' }, [label, pill] = STATUS[cur.status] || [cur.status, 'pendiente'];
    html += `<div class="lab-app lb-cur"><h3>${esc(sc.name)} <span class="pill ${pill}">${esc(t(label))}</span></h3>
      ${cur.status === 'ready' ? `<p><b>${esc(t('Acceso:'))}</b> ${esc(t(sc.login))}</p><p class="muted">${esc(t('Se apaga sola en {x}.', { x: left(cur.expires_at) }))} <span id="lb-left"></span></p>` : ''}
      ${cur.status !== 'ready' ? `<p class="muted lb-step"><span class="lb-spin" aria-hidden="true"></span> ${esc(cur.step ? t(cur.step) : cur.status === 'stopping' ? t('Borrando los contenedores…') : t('Preparando el laboratorio…'))}</p>` : ''}
      <div class="row">${cur.status === 'ready' && cur.access_url ? `<a class="btn" href="${esc(cur.access_url)}" target="_blank" rel="noopener noreferrer">${esc(t('Abrir'))} ${esc(cur.access_url.replace('http://', ''))} ↗</a>` : ''}
      <button class="btn ghost" type="button" id="lb-stop"${busy ? ' disabled' : ''}>${esc(cur.status === 'stopping' ? t('Reintentar apagado') : t('Detener y borrar'))}</button></div>
      ${cur.status === 'ready' && !cur.access_url ? `<p class="muted small">${esc(t('Está encendido, pero el acceso solo funciona desde el mismo Mac del Runner.'))}</p>` : ''}</div>`;
  } else {
    html += `<div class="lab-apps">${Object.entries(SCEN).map(([id, s]) => `<div class="lab-app"><h3>${esc(s.name)}</h3><p>${esc(t(s.what))}</p>
      <div class="row"><button class="btn" type="button" data-lb-create="${id}"${busy || needRunner ? ' disabled' : ''}>${esc(t('Crear laboratorio'))}</button></div></div>`).join('')}</div>
      <p class="muted small">${esc(t('Uno a la vez por cuenta. La primera vez de cada app tarda unos minutos: Docker descarga la imagen.'))}</p>`;
  }
  if (msg) html += `<p class="fb bad" role="alert">${esc(msg)}</p>`;
  if (past.length) html += `<details class="lb-past"><summary>${esc(t('Anteriores'))}</summary><ul>${past.map(l => `<li>${esc((SCEN[l.scenario] || {}).name || l.scenario)} · ${esc(t((STATUS[l.status] || [l.status])[0]))}${l.created_at && global.I18N && global.I18N.dateTime ? ' · ' + esc(global.I18N.dateTime(l.created_at)) : ''}${l.error ? ` · <span class="muted">${esc(global.Sync.tr(l.error))}</span>` : ''}</li>`).join('')}</ul></details>`;
  root.innerHTML = html;

  root.querySelectorAll('[data-lb-create]').forEach(b => b.addEventListener('click', () => create(b.dataset.lbCreate)));
  const st = root.querySelector('#lb-stop'); if (st) st.addEventListener('click', () => stop(cur, st));
  const rt = root.querySelector('#lb-retry'); if (rt) rt.addEventListener('click', () => { msg = ''; refresh(); });
  const cp = root.querySelector('#lb-copy'); if (cp) cp.addEventListener('click', async () => { try { await navigator.clipboard.writeText(START_CMD); cp.textContent = t('Copiado ✓'); } catch (e) { cp.textContent = t('Selecciónalo y copia'); } setTimeout(() => { if (cp.isConnected) cp.textContent = t('Copiar'); }, 1800); });
}

async function create(scenario) {
  if (busy) return;
  busy = true; msg = ''; paint();
  try { await global.Sync.labs.create(scenario); }
  catch (e) { msg = e.offline ? t('No puedo conectar con el servidor ahora mismo. Comprueba que tu API está encendida.') : (e.body && e.body.message ? global.Sync.tr(e.body.message) : t('No se pudo crear el laboratorio.')); }
  busy = false; refresh();
}

async function stop(cur, btn) {
  if (busy || !cur) return;
  // Sin diálogos del navegador: el primer clic avisa y el segundo (en 4 s) confirma.
  if (Date.now() - armed > 4000) { armed = Date.now(); btn.textContent = t('¿Seguro? Se borra todo lo que hiciste dentro. Pulsa otra vez'); return; }
  armed = 0; busy = true; msg = ''; btn.disabled = true; btn.textContent = t('Borrando…');
  try { await global.Sync.labs.stop(cur.id); }
  catch (e) { msg = e.offline ? t('No puedo conectar con el servidor ahora mismo. Comprueba que tu API está encendida.') : (e.body && e.body.message ? global.Sync.tr(e.body.message) : t('No se pudo detener el laboratorio.')); }
  busy = false; refresh();
}

if (global.I18N && global.I18N.onChange) global.I18N.onChange(kind => { if (kind === 'lang' && root && root.isConnected) paint(); });
global.Labs = { render };
})(window);
