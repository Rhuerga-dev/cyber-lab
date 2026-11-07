/* Cyber Lab · Cuenta y sincronización con la API (Laravel + Sanctum)
   - El progreso se sigue guardando en el navegador; si hay sesión, se copia a la API.
   - Cada guardado envía la versión conocida; si otro dispositivo guardó antes (409),
     se pregunta qué copia conservar. */
(function (global) {
'use strict';

const DEFAULT_API = 'https://cyber-api.huergalabs.dev/api';
const K = { token: 'cyberlab-token', user: 'cyberlab-user', meta: 'cyberlab-sync', api: 'cyberlab-api' };
const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const set = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} };
const API = () => (get(K.api) || DEFAULT_API).replace(/\/$/, '');
const escH = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let token = get(K.token);
let user = (() => { try { return JSON.parse(get(K.user) || 'null'); } catch (e) { return null; } })();
let meta = (() => { try { return Object.assign({ version: 0, dirty: false, last: null }, JSON.parse(get(K.meta) || '{}')); } catch (e) { return { version: 0, dirty: false, last: null }; } })();
let status = token ? 'idle' : 'out'; // out | idle | saving | ok | offline | error | conflict
let timer = null, applying = false;
const saveMeta = () => set(K.meta, JSON.stringify(meta));

async function call(method, path, body) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = 'Bearer ' + token;
  let res;
  try { res = await fetch(API() + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }); }
  catch (e) { const err = new Error('offline'); err.offline = true; throw err; }
  let json = null; try { json = res.status === 204 ? null : await res.json(); } catch (e) {}
  if (!res.ok) { const err = new Error((json && json.message) || ('HTTP ' + res.status)); err.status = res.status; err.body = json; throw err; }
  return json;
}

function setStatus(s) { status = s; paintButton(); }

// Traduce mensajes que llegan del servidor (en español). El del límite diario llega con el número ya puesto.
function tr(msg) {
  if (msg == null) return '';
  msg = String(msg);
  if (/^HTTP \d+$/.test(msg)) return msg;
  const m = msg.match(/^Has llegado al límite de (\d+) preguntas de hoy\. Mañana se renueva\.$/);
  if (m) return t('Has llegado al límite de {n} preguntas de hoy. Mañana se renueva.', { n: m[1] });
  return t(msg);
}
const CL = () => global.CL;

function summary(d) {
  if (!d) return t('vacía');
  const lessons = d.course && d.course.l ? Object.values(d.course.l).filter(x => x && x.done).length : 0;
  const topics = d.topics ? Object.keys(d.topics).length : 0;
  const certs = d.certs ? Object.values(d.certs).filter(c => c && c.status === 'aprobado').length : 0;
  const levels = Array.isArray(d.done) ? d.done.length : 0;
  return t('{lessons} lecciones, {topics} temas, {levels} niveles, {certs} certificaciones', { lessons, topics, levels, certs });
}
const isEmpty = d => !d || ((!d.done || !d.done.length) && (!d.topics || !Object.keys(d.topics).length) && (!d.log || !d.log.length) && !(d.course && d.course.l && Object.values(d.course.l).some(x => x && (x.done || x.step))));

function apply(data, version) {
  applying = true;
  try { CL().replace(data); } finally { applying = false; }
  meta.version = version; meta.dirty = false; meta.last = new Date().toISOString(); saveMeta();
}

async function push(force) {
  if (!token) return;
  clearTimeout(timer); timer = null;
  setStatus('saving');
  try {
    const r = await call('PUT', '/progress', { data: CL().prog, version: meta.version, force: !!force });
    meta.version = r.version; meta.dirty = false; meta.last = r.updated_at; saveMeta(); setStatus('ok');
  } catch (e) {
    if (e.offline) return setStatus('offline');
    if (e.status === 401) return expired();
    if (e.status === 409) return conflict(e.body);
    setStatus('error');
  }
}

async function pull() {
  if (!token) return;
  try {
    const r = await call('GET', '/progress');
    if (r.version > meta.version) {
      if (meta.dirty && !isEmpty(CL().prog)) return conflict(r);
      if (r.data) apply(r.data, r.version); else { meta.version = r.version; saveMeta(); }
      setStatus('ok');
    } else if (meta.dirty || r.version === 0) push(false);
    else setStatus('ok');
  } catch (e) {
    if (e.offline) return setStatus('offline');
    if (e.status === 401) return expired();
    setStatus('error');
  }
}

function changed() {
  if (applying) return;
  meta.dirty = true; saveMeta();
  if (!token) return;
  clearTimeout(timer); timer = setTimeout(() => push(false), 1500);
  if (status !== 'saving') setStatus('pending');
}

function expired() {
  token = null; user = null; set(K.token, null); set(K.user, null);
  setStatus('out'); open('login', 'Tu sesión ha caducado. Vuelve a entrar para seguir sincronizando.'); // se traduce al pintar
}

/* ---------------- UI ---------------- */
let dlg = null;
let view = null; // lo que muestra el diálogo, para repintarlo al cambiar de idioma
function ensureDialog() {
  if (dlg) return dlg;
  dlg = document.createElement('dialog'); dlg.className = 'acct'; dlg.setAttribute('aria-labelledby', 'acct-h');
  document.body.appendChild(dlg);
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  return dlg;
}
function open(mode, notice) {
  const d = ensureDialog();
  if (token && user && mode !== 'conflict') return openAccount(d);
  const isReg = mode === 'register';
  view = { kind: 'form', mode, notice };
  d.innerHTML = `
    <div class="acct-head"><h2 id="acct-h">${isReg ? t('Crear cuenta') : t('Entrar')}</h2><button type="button" class="btn ghost" data-close>${t('Cerrar')}</button></div>
    <p class="muted">${t('Con una cuenta, tu progreso se guarda en la base de datos y lo recuperas en cualquier dispositivo.')}</p>
    ${notice ? `<div class="fb hint">${escH(tr(notice))}</div>` : ''}
    <form class="acct-form" id="acct-form" novalidate>
      ${isReg ? `<label>${t('Nombre')}<input type="text" id="acct-name" autocomplete="name" required maxlength="80"></label>` : ''}
      <label>${t('Correo')}<input type="email" id="acct-email" autocomplete="email" required></label>
      <label>${t('Contraseña')}<input type="password" id="acct-pass" autocomplete="${isReg ? 'new-password' : 'current-password'}" required></label>
      ${isReg ? `<label>${t('Repite la contraseña')}<input type="password" id="acct-pass2" autocomplete="new-password" required></label><p class="muted small">${t('Mínimo 10 caracteres, con letras y números.')}</p>` : ''}
      <div id="acct-err" aria-live="polite"></div>
      <div class="row"><button class="btn" type="submit" id="acct-go">${isReg ? t('Crear cuenta') : t('Entrar')}</button>
      <button class="btn ghost" type="button" data-switch>${isReg ? t('Ya tengo cuenta') : t('Crear una cuenta')}</button></div>
    </form>
    <details class="acct-adv"><summary>${t('Servidor')}</summary><label>${t('URL de la API')}<input type="url" id="acct-api" value="${escH(API())}"></label></details>`;
  d.querySelector('[data-close]').addEventListener('click', () => d.close());
  d.querySelector('[data-switch]').addEventListener('click', () => open(isReg ? 'login' : 'register'));
  d.querySelector('#acct-api').addEventListener('change', e => { const v = e.target.value.trim(); set(K.api, v && v !== DEFAULT_API ? v : null); });
  d.querySelector('#acct-form').addEventListener('submit', async e => {
    e.preventDefault();
    const err = d.querySelector('#acct-err'), go = d.querySelector('#acct-go');
    const body = { email: d.querySelector('#acct-email').value.trim(), password: d.querySelector('#acct-pass').value, device: navigator.platform || 'navegador' };
    if (isReg) { body.name = d.querySelector('#acct-name').value.trim(); body.password_confirmation = d.querySelector('#acct-pass2').value; }
    go.disabled = true; err.innerHTML = '';
    try {
      const r = await call('POST', isReg ? '/register' : '/login', body);
      token = r.token; user = r.user; set(K.token, token); set(K.user, JSON.stringify(user));
      meta.version = 0; saveMeta();
      await afterLogin();
    } catch (ex) {
      go.disabled = false;
      let msg;
      if (ex.offline) msg = t('No se puede conectar con el servidor. Comprueba que tu API está encendida y que la URL es correcta.');
      else if (ex.status === 422 && ex.body && ex.body.errors) msg = Object.values(ex.body.errors).flat().map(tr).join(' ');
      else if (ex.status === 429) msg = t('Demasiados intentos. Espera un minuto y vuelve a probar.');
      else msg = tr((ex.body && ex.body.message) || ex.message);
      err.innerHTML = `<div class="fb bad">${escH(msg)}</div>`;
    }
  });
  if (!d.open) d.showModal();
  setTimeout(() => { const f = d.querySelector(isReg ? '#acct-name' : '#acct-email'); if (f) f.focus(); }, 0);
}

async function afterLogin() {
  setStatus('saving');
  let r;
  try { r = await call('GET', '/progress'); } catch (e) { setStatus(e.offline ? 'offline' : 'error'); dlg.close(); return; }
  const local = CL().prog;
  if (!r.data || r.version === 0) { meta.version = 0; saveMeta(); dlg.close(); await push(false); return; }
  if (isEmpty(local)) { apply(r.data, r.version); setStatus('ok'); dlg.close(); return; }
  conflict(r, true);
}

function conflict(server, fromLogin) {
  setStatus('conflict');
  const d = ensureDialog();
  view = { kind: 'conflict', server, fromLogin };
  d.innerHTML = `
    <div class="acct-head"><h2 id="acct-h">${t('¿Qué progreso conservas?')}</h2></div>
    <p class="muted">${fromLogin ? t('Tu cuenta ya tiene progreso guardado y este navegador también.') : t('Otro dispositivo guardó cambios mientras usabas este.')} ${t('Elige cuál quieres mantener. La otra copia se reemplaza.')}</p>
    <div class="choice2">
      <button type="button" class="opt" data-keep="server"><b>${t('La de la nube')}</b><br><span class="muted">${escH(summary(server.data))}${server.updated_at ? ' · ' + escH(I18N.dateTime(server.updated_at)) : ''}</span></button>
      <button type="button" class="opt" data-keep="local"><b>${t('La de este navegador')}</b><br><span class="muted">${escH(summary(CL().prog))}</span></button>
    </div>
    <p class="muted small">${t('Consejo: si dudas, descarga antes una copia de seguridad desde Resultados.')}</p>`;
  d.querySelectorAll('[data-keep]').forEach(b => b.addEventListener('click', async () => {
    if (b.dataset.keep === 'server') { apply(server.data, server.version); setStatus('ok'); }
    else { meta.version = server.version; saveMeta(); await push(true); }
    d.close();
  }));
  if (!d.open) d.showModal();
}

function openAccount(d) {
  view = { kind: 'account' };
  d.innerHTML = `
    <div class="acct-head"><h2 id="acct-h">${t('Tu cuenta')}</h2><button type="button" class="btn ghost" data-close>${t('Cerrar')}</button></div>
    <p><b>${escH(user.name)}</b><br><span class="muted">${escH(user.email)}</span></p>
    <p class="muted">${statusText()}${meta.last ? ' · ' + escH(t('Último guardado: {date}', { date: I18N.dateTime(meta.last) })) : ''}</p>
    <div class="row"><button class="btn" type="button" id="acct-sync">${t('Sincronizar ahora')}</button><button class="btn ghost" type="button" id="acct-out">${t('Cerrar sesión')}</button></div>
    <p class="muted small">${t('Al cerrar sesión, el progreso sigue en este navegador y en tu cuenta.')}</p>`;
  d.querySelector('[data-close]').addEventListener('click', () => d.close());
  d.querySelector('#acct-sync').addEventListener('click', async () => { await (meta.dirty ? push(false) : pull()); openAccount(d); });
  d.querySelector('#acct-out').addEventListener('click', async () => {
    try { await call('POST', '/logout'); } catch (e) {}
    token = null; user = null; set(K.token, null); set(K.user, null); meta.version = 0; saveMeta(); setStatus('out'); d.close();
  });
  if (!d.open) d.showModal();
}

function statusText() {
  return { out: t('Sin sesión: el progreso solo está en este navegador'), idle: t('Conectando…'), pending: t('Cambios pendientes de guardar'), saving: t('Guardando…'), ok: t('Sincronizado con la nube'), offline: t('Sin conexión con el servidor: guardado solo en este navegador'), error: t('Error al sincronizar, se reintentará'), conflict: t('Hay que elegir qué copia conservar') }[status] || '';
}
function paintButton() {
  const b = document.getElementById('acct-btn'); if (!b) return;
  const dot = { ok: 'ok', saving: 'busy', pending: 'busy', idle: 'busy', offline: 'warn', error: 'bad', conflict: 'bad', out: 'off' }[status];
  b.innerHTML = `<span class="sdot ${dot}" aria-hidden="true"></span>${token && user ? escH(user.name.split(' ')[0]) : t('Entrar')}`;
  b.title = statusText(); b.setAttribute('aria-label', (token && user ? t('Cuenta de {name}.', { name: user.name }) : t('Entrar.')) + ' ' + statusText());
}

// Al cambiar de idioma: repinta el botón y, si el diálogo está abierto, su contenido
function relang() {
  paintButton();
  if (!dlg || !dlg.open || !view) return;
  if (view.kind === 'conflict') return conflict(view.server, view.fromLogin);
  if (view.kind === 'account') { if (token && user) return openAccount(dlg); return dlg.close(); }
  // Formulario: conserva lo escrito y el mensaje de error visible
  const keep = {};
  dlg.querySelectorAll('input').forEach(i => { if (i.id) keep[i.id] = i.value; });
  const err = dlg.querySelector('#acct-err'), errHtml = err ? err.innerHTML : '';
  const active = document.activeElement && dlg.contains(document.activeElement) ? document.activeElement.id : null;
  open(view.mode, view.notice);
  Object.keys(keep).forEach(id => { const i = dlg.querySelector('#' + id); if (i) i.value = keep[id]; });
  const err2 = dlg.querySelector('#acct-err'); if (err2) err2.innerHTML = errHtml;
  if (active) setTimeout(() => { const f = dlg.querySelector('#' + active); if (f) f.focus(); }, 0);
}
if (global.I18N) global.I18N.onChange(kind => { if (kind === 'lang') relang(); });

function init() {
  const b = document.getElementById('acct-btn');
  if (b) b.addEventListener('click', () => open('login'));
  paintButton();
  if (token) pull();
  global.addEventListener('online', () => { if (token) (meta.dirty ? push(false) : pull()); });
  setInterval(() => { if (token && (status === 'offline' || status === 'error') ) (meta.dirty ? push(false) : pull()); }, 60000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && token && !meta.dirty) pull(); });
}

global.Sync = { init, changed, open, tr, ask: body => call('POST', '/ask', body), get loggedIn() { return !!token; }, get status() { return status; } };
})(window);
