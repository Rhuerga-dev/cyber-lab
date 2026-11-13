/* Cyber Lab · Cuenta y sincronización con la API (Laravel + Sanctum)
   - El progreso se sigue guardando en el navegador; si hay sesión, se copia a la API.
   - Cada guardado envía la versión conocida; si otro dispositivo guardó antes (409),
     se pregunta qué copia conservar. */
(function (global) {
'use strict';

const DEFAULT_API = 'https://cyber-api.huergalabs.dev/api';   // si falta env.js
const K = { token: 'cyberlab-token', user: 'cyberlab-user', meta: 'cyberlab-sync', api: 'cyberlab-api' };
const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const set = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} };
// La URL de la API sale de env.js (window.CL_ENV), no de la pantalla de login.
const IS_LOCALHOST = window.CLUtil.isLocal();
const ENV = global.CL_ENV || {};
const API = () => String((IS_LOCALHOST && ENV.API_URL_LOCAL) || ENV.API_URL || DEFAULT_API).replace(/\/$/, '');
set(K.api, null);   // limpia la URL que se guardaba antes desde el login
const escH = window.CLUtil.esc;

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
  setStatus('out'); if (!LOCAL) goLogin('expired');
}

/* ---------------- Contenido protegido ---------------- */
// Las lecciones, los simuladores y los ejercicios no están en la web pública: la API los entrega
// solo con sesión iniciada. En local (localhost) sin API, se leen de la carpeta private/js.
const CONTENT_FILES = ['lang/en-course.js', 'lang/en-terminal.js', 'lang/en-review.js', 'lang/en-netlab.js', 'lessons/mis-lecciones.js', 'lessons/mis-retos.js', 'terminal.js', 'netlab.js', 'course.js', 'review.js'];
let contentLoaded = false, contentLoading = null;
function runCode(code) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
    const s = document.createElement('script'); s.src = url;
    s.onload = () => { URL.revokeObjectURL(url); resolve(); };
    s.onerror = () => { URL.revokeObjectURL(url); reject(new Error('script')); };
    document.head.appendChild(s);
  });
}
async function devContent() {
  try {
    const parts = await Promise.all(CONTENT_FILES.map(f => fetch('private/js/' + f, { cache: 'no-cache' }).then(r => r.ok ? r.text() : Promise.reject(r.status))));
    return parts.join('\n;\n');
  } catch (e) { return null; }
}
function contentBanner(show) {
  let b = document.getElementById('cl-content-err');
  if (!show) { if (b) b.remove(); return; }
  if (!b) { b = document.createElement('div'); b.id = 'cl-content-err'; b.className = 'fb bad cl-content-err'; b.setAttribute('role', 'alert'); document.body.appendChild(b); }
  b.innerHTML = `${escH(t('No se pudieron cargar las lecciones. Comprueba tu conexión o que la API está encendida.'))} <button type="button" class="btn ghost">${escH(t('Reintentar'))}</button>`;
  b.querySelector('button').addEventListener('click', () => loadContent());
}
function loadContent() {
  if (contentLoaded) return Promise.resolve(true);
  if (contentLoading) return contentLoading;
  contentLoading = (async () => {
    let code = null;
    const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    if (token) {
      try {
        const res = await fetch(API() + '/content', { headers: { Authorization: 'Bearer ' + token, Accept: 'application/javascript' }, cache: 'no-cache' });
        if (res.status === 401) { expired(); return false; }
        if (res.ok) code = await res.text();
      } catch (e) {}
    }
    if (!code && local) code = await devContent();
    if (!code) { contentBanner(true); return false; }
    try { await runCode(code); } catch (e) { contentBanner(true); return false; }
    contentLoaded = true; contentBanner(false);
    document.dispatchEvent(new CustomEvent('cl-content'));
    return true;
  })().finally(() => { contentLoading = null; });
  return contentLoading;
}

/* ---------------- UI ---------------- */
let dlg = null;
let view = null; // lo que muestra el diálogo, para repintarlo al cambiar de idioma
function ensureDialog() {
  if (dlg) return dlg;
  dlg = document.createElement('dialog'); dlg.className = 'acct'; dlg.setAttribute('aria-labelledby', 'acct-h');
  document.body.appendChild(dlg);
  dlg.addEventListener('click', e => { if (e.target === dlg && token) dlg.close(); });
  return dlg;
}
// El login vive en su propia página (login.html). Desde la app, "Entrar" lleva allí.
const LOCAL = window.CLUtil.isLocal();
const safeNext = h => (/^#[a-z]{2,20}$/.test(h || '') ? h : '');
function goLogin(reason) {
  const q = new URLSearchParams();
  const next = safeNext(location.hash); if (next) q.set('next', next);
  if (reason) q.set('r', reason);
  location.replace('login.html' + (q.toString() ? '?' + q : ''));
}
function open(mode, notice) {
  if (token && user) return openAccount(ensureDialog());
  goLogin(notice ? 'expired' : '');
}

/* ---------------- Página de login ---------------- */
let loginEl = null, loginMode = 'login';
function renderLogin(el, mode) {
  loginEl = el; loginMode = mode || 'login';
  const isReg = loginMode === 'register';
  const params = new URLSearchParams(location.search);
  const notice = params.get('r') === 'expired' ? t('Tu sesión ha caducado. Vuelve a entrar para seguir sincronizando.')
    : params.get('verified') === '1' ? t('Correo confirmado. Ya puedes usar los agentes con IA y los laboratorios.')
    : params.get('verified') === '0' ? t('El enlace de confirmación no es válido o ha caducado. Entra y pide otro desde Tu cuenta.')
    : params.get('r') === 'reset' ? t('Contraseña cambiada. Ya puedes entrar con la nueva.')
    : params.get('r') === 'deleted' ? t('Tu cuenta y tu progreso se han borrado.') : '';
  el.innerHTML = `
    <h1 id="acct-h">${isReg ? t('Crear cuenta') : t('Entrar')}</h1>
    <p class="muted">${t('Para usar Cyber Lab, entra con tu cuenta o crea una. Tu progreso se guarda en la nube y puedes hablar con los agentes con IA.')}</p>
    ${notice ? `<div class="fb hint">${escH(notice)}</div>` : ''}
    <form class="acct-form" id="acct-form" novalidate>
      ${isReg ? `<label>${t('Nombre')}<input type="text" id="acct-name" autocomplete="name" required maxlength="80"></label>` : ''}
      <label>${t('Correo')}<input type="email" id="acct-email" autocomplete="email" required></label>
      <label>${t('Contraseña')}<input type="password" id="acct-pass" autocomplete="${isReg ? 'new-password' : 'current-password'}" required></label>
      ${isReg ? `<label>${t('Repite la contraseña')}<input type="password" id="acct-pass2" autocomplete="new-password" required></label><p class="muted small">${t('Mínimo 10 caracteres, con letras y números.')}</p>
      <label>${t('Código de invitación')} <span class="muted small">${t('(si te dieron uno)')}</span><input type="text" id="acct-invite" autocomplete="off" autocapitalize="characters" maxlength="40"></label>` : ''}
      <div id="acct-err" aria-live="polite"></div>
      <div class="row"><button class="btn" type="submit" id="acct-go">${isReg ? t('Crear cuenta') : t('Entrar')}</button>
      <button class="btn ghost" type="button" data-switch>${isReg ? t('Ya tengo cuenta') : t('Crear una cuenta')}</button></div>
      ${isReg ? '' : `<p class="small"><button class="btn ghost" type="button" data-forgot>${t('¿Olvidaste tu contraseña?')}</button></p>`}
    </form>`;
  el.querySelector('[data-switch]').addEventListener('click', () => { renderLogin(el, isReg ? 'login' : 'register'); });
  const fg = el.querySelector('[data-forgot]'); if (fg) fg.addEventListener('click', () => renderForgot(el));
  el.querySelector('#acct-form').addEventListener('submit', async e => {
    e.preventDefault();
    const err = el.querySelector('#acct-err'), go = el.querySelector('#acct-go');
    const body = { email: el.querySelector('#acct-email').value.trim(), password: el.querySelector('#acct-pass').value, device: navigator.platform || 'navegador' };
    if (isReg) {
      body.name = el.querySelector('#acct-name').value.trim(); body.password_confirmation = el.querySelector('#acct-pass2').value;
      const inv = el.querySelector('#acct-invite').value.trim(); if (inv) body.invite = inv;
    }
    go.disabled = true; err.innerHTML = '';
    try {
      const r = await call('POST', isReg ? '/register' : '/login', body);
      token = r.token; user = r.user; set(K.token, token); set(K.user, JSON.stringify(user));
      meta.version = 0; saveMeta();
      try { sessionStorage.setItem('cl-fresh-login', '1'); } catch (x) {}
      location.replace('index.html' + safeNext(params.get('next')));
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
  setTimeout(() => { const f = el.querySelector(isReg ? '#acct-name' : '#acct-email'); if (f) f.focus(); }, 0);
}
function initLoginPage(el) {
  // Con sesión ya iniciada no hace falta el login: directo a la app.
  // Enlace del correo "Nueva contraseña": login.html#reset=CÓDIGO&email=… (el código va tras "#": no viaja al servidor de la web).
  const hp = new URLSearchParams(location.hash.slice(1));
  if (hp.get('reset')) {
    const rt = hp.get('reset'), em = hp.get('email') || '';
    history.replaceState(null, '', location.pathname + location.search);   // quita el código de la barra
    loginEl = el; loginMode = 'reset';
    return renderReset(el, rt, em);
  }
  if (token) { location.replace('index.html' + safeNext(new URLSearchParams(location.search).get('next'))); return; }
  renderLogin(el, 'login');
  if (global.I18N) global.I18N.onChange(kind => {
    if (kind !== 'lang' || !loginEl || loginMode === 'forgot' || loginMode === 'reset') return;
    const keep = {}; loginEl.querySelectorAll('input').forEach(i => { if (i.id) keep[i.id] = i.value; });
    const errHtml = (loginEl.querySelector('#acct-err') || {}).innerHTML || '';
    renderLogin(loginEl, loginMode);
    Object.keys(keep).forEach(id => { const i = loginEl.querySelector('#' + id); if (i) i.value = keep[id]; });
    const e2 = loginEl.querySelector('#acct-err'); if (e2) e2.innerHTML = errHtml;
  });
}

const closeDlg = () => { if (dlg && dlg.open) dlg.close(); };
async function afterLogin() {
  loadContent();
  setStatus('saving');
  let r;
  try { r = await call('GET', '/progress'); } catch (e) { setStatus(e.offline ? 'offline' : 'error'); closeDlg(); return; }
  const local = CL().prog;
  if (!r.data || r.version === 0) { meta.version = 0; saveMeta(); closeDlg(); await push(false); return; }
  if (isEmpty(local)) { apply(r.data, r.version); setStatus('ok'); closeDlg(); return; }
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
    <p class="muted small">${t('Al cerrar sesión, el progreso sigue en este navegador y en tu cuenta.')}</p>
    ${user.must_verify ? `<div class="fb hint"><p>${t('Confirma tu correo para usar los agentes con IA y los laboratorios. Te enviamos un enlace al crear la cuenta.')}</p>
      <div class="row"><button class="btn ghost" type="button" id="acct-verify">${t('Enviarme otro enlace')}</button></div><p class="small" id="acct-verify-msg" aria-live="polite"></p></div>` : ''}
    <div class="row"><button class="btn ghost" type="button" id="acct-pw">${t('Cambiar la contraseña')}</button></div>
    <div class="acct-danger"><button class="btn ghost danger" type="button" id="acct-reset">${t('Reiniciar todo mi progreso')}</button>
      <button class="btn ghost danger" type="button" id="acct-del">${t('Borrar mi cuenta')}</button></div>`;
  d.querySelector('[data-close]').addEventListener('click', () => d.close());
  d.querySelector('#acct-reset').addEventListener('click', () => openReset(d));
  d.querySelector('#acct-pw').addEventListener('click', () => openPassword(d));
  d.querySelector('#acct-del').addEventListener('click', () => openDelete(d));
  const vb = d.querySelector('#acct-verify');
  if (vb) vb.addEventListener('click', async () => {
    const m = d.querySelector('#acct-verify-msg'); vb.disabled = true;
    try { const r = await call('POST', '/email/resend'); m.textContent = tr(r.message); }
    catch (x) { vb.disabled = false; if (x.status === 401) return expired(); m.textContent = x.status === 429 ? t('Demasiados intentos. Espera un rato y vuelve a probar.') : tr((x.body && x.body.message) || x.message); }
  });
  d.querySelector('#acct-sync').addEventListener('click', async () => { await (meta.dirty ? push(false) : pull()); openAccount(d); });
  d.querySelector('#acct-out').addEventListener('click', async () => {
    try { await call('POST', '/logout'); } catch (e) {}
    token = null; user = null; set(K.token, null); set(K.user, null); meta.version = 0; saveMeta(); setStatus('out');
    location.replace(LOCAL ? location.pathname : 'login.html');
  });
  if (!d.open) d.showModal();
}

// Reiniciar el progreso: pide la contraseña, la API vacía la copia de la nube y este navegador borra la suya.
const PROGRESS_KEYS = ['cyberlab-v1', 'cyberlab-netlab-v1', 'cyberlab-netlab', 'cyberlab-ios-v1'];
function openReset(d) {
  view = { kind: 'reset' };
  d.innerHTML = `
    <div class="acct-head"><h2 id="acct-h">${t('Reiniciar todo el progreso')}</h2><button type="button" class="btn ghost" data-close>${t('Cancelar')}</button></div>
    <div class="fb bad"><p><b>${t('Esto no se puede deshacer.')}</b> ${t('Se borran las lecciones, los exámenes, los niveles de Práctica, los ejercicios de Redes, la configuración guardada de los switches y routers, el repaso, las certificaciones y el historial, en este navegador y en tu cuenta. Tus otros dispositivos también empezarán de cero al sincronizar.')}</p></div>
    <p class="muted small">${t('Si quieres guardar una copia antes, descárgala desde Resultados.')}</p>
    <form id="rs-f" class="acct-form">
      <label>${t('Escribe tu contraseña para confirmar')}<input id="rs-pw" type="password" autocomplete="current-password" required maxlength="72"></label>
      <p class="acct-err" id="rs-err" role="alert"></p>
      <div class="row"><button class="btn danger" type="submit" id="rs-go">${t('Borrar todo mi progreso')}</button><button class="btn ghost" type="button" id="rs-back">${t('Volver')}</button></div>
    </form>`;
  d.querySelector('[data-close]').addEventListener('click', () => openAccount(d));
  d.querySelector('#rs-back').addEventListener('click', () => openAccount(d));
  const f = d.querySelector('#rs-f'), pw = d.querySelector('#rs-pw'), err = d.querySelector('#rs-err'), go = d.querySelector('#rs-go');
  pw.focus();
  f.addEventListener('submit', async e => {
    e.preventDefault(); if (!pw.value) return;
    go.disabled = true; err.textContent = '';
    try {
      clearTimeout(timer); timer = null;
      const r = await call('POST', '/progress/reset', { password: pw.value });
      pw.value = '';
      PROGRESS_KEYS.forEach(k => set(k, null));
      meta.version = r.version; meta.dirty = false; meta.last = r.updated_at; saveMeta();
      applying = true; try { CL().replace(null); } finally { applying = false; }
      try { sessionStorage.setItem('cl-reset-done', '1'); } catch (x) {}
      location.replace(location.pathname + '#ruta'); location.reload();
    } catch (x) {
      go.disabled = false; pw.select();
      if (x.offline) err.textContent = t('No puedo conectar con el servidor ahora mismo. Comprueba que tu API está encendida.');
      else if (x.status === 401) return expired();
      else if (x.status === 429) err.textContent = t('Demasiados intentos. Espera un minuto y vuelve a probar.');
      else err.textContent = tr((x.body && x.body.errors && x.body.errors.password && x.body.errors.password[0]) || (x.body && x.body.message) || t('No se ha podido reiniciar. Inténtalo otra vez.'));
    }
  });
  if (!d.open) d.showModal();
}

// Datos de la cuenta al día (por ejemplo, si ya confirmó el correo desde otro dispositivo).
async function refreshUser() {
  try { const r = await call('GET', '/me'); if (r && r.user) { user = r.user; set(K.user, JSON.stringify(user)); paintButton(); } }
  catch (e) { if (e.status === 401) expired(); }
}

// Mensaje de error de un formulario: primero el del campo, luego el general.
function formError(x, field) {
  if (x.offline) return t('No puedo conectar con el servidor ahora mismo. Comprueba que tu API está encendida.');
  if (x.status === 429) return t('Demasiados intentos. Espera un minuto y vuelve a probar.');
  const errs = x.body && x.body.errors;
  if (errs) return (field && errs[field] ? errs[field] : Object.values(errs).flat()).map(tr).join(' ');
  return tr((x.body && x.body.message) || x.message);
}

/* ---------- Recuperar la contraseña (página de login) ---------- */
function renderForgot(el) {
  loginEl = el; loginMode = 'forgot';
  el.innerHTML = `
    <h1 id="acct-h">${t('Recuperar la contraseña')}</h1>
    <p class="muted">${t('Escribe el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva.')}</p>
    <form class="acct-form" id="fg-form" novalidate>
      <label>${t('Correo')}<input type="email" id="fg-email" autocomplete="email" required></label>
      <div id="fg-msg" aria-live="polite"></div>
      <div class="row"><button class="btn" type="submit" id="fg-go">${t('Enviar el enlace')}</button>
      <button class="btn ghost" type="button" data-back>${t('Volver a Entrar')}</button></div>
    </form>`;
  el.querySelector('[data-back]').addEventListener('click', () => renderLogin(el, 'login'));
  el.querySelector('#fg-form').addEventListener('submit', async e => {
    e.preventDefault();
    const go = el.querySelector('#fg-go'), m = el.querySelector('#fg-msg');
    go.disabled = true; m.innerHTML = '';
    try {
      const r = await call('POST', '/forgot-password', { email: el.querySelector('#fg-email').value.trim() });
      m.innerHTML = `<div class="fb ok">${escH(tr(r.message))}</div>`;
    } catch (x) { go.disabled = false; m.innerHTML = `<div class="fb bad">${escH(formError(x, 'email'))}</div>`; }
  });
  setTimeout(() => { const f = el.querySelector('#fg-email'); if (f) f.focus(); }, 0);
}

function renderReset(el, resetToken, email) {
  el.innerHTML = `
    <h1 id="acct-h">${t('Crear una contraseña nueva')}</h1>
    <p class="muted">${escH(email)}</p>
    <form class="acct-form" id="np-form" novalidate>
      <label>${t('Contraseña nueva')}<input type="password" id="np-pass" autocomplete="new-password" required maxlength="72"></label>
      <label>${t('Repite la contraseña')}<input type="password" id="np-pass2" autocomplete="new-password" required maxlength="72"></label>
      <p class="muted small">${t('Mínimo 10 caracteres, con letras y números.')}</p>
      <div id="np-msg" aria-live="polite"></div>
      <div class="row"><button class="btn" type="submit" id="np-go">${t('Guardar la contraseña')}</button>
      <button class="btn ghost" type="button" data-back>${t('Volver a Entrar')}</button></div>
    </form>`;
  el.querySelector('[data-back]').addEventListener('click', () => renderLogin(el, 'login'));
  el.querySelector('#np-form').addEventListener('submit', async e => {
    e.preventDefault();
    const go = el.querySelector('#np-go'), m = el.querySelector('#np-msg');
    go.disabled = true; m.innerHTML = '';
    try {
      await call('POST', '/reset-password', { token: resetToken, email, password: el.querySelector('#np-pass').value, password_confirmation: el.querySelector('#np-pass2').value });
      // Las sesiones anteriores ya no valen: limpia la de este navegador y a Entrar.
      token = null; user = null; set(K.token, null); set(K.user, null);
      location.replace('login.html?r=reset');
    } catch (x) { go.disabled = false; m.innerHTML = `<div class="fb bad">${escH(formError(x, 'password'))}</div>`; }
  });
  setTimeout(() => { const f = el.querySelector('#np-pass'); if (f) f.focus(); }, 0);
}

/* ---------- Cambiar la contraseña (Tu cuenta) ---------- */
function openPassword(d) {
  view = { kind: 'password' };
  d.innerHTML = `
    <div class="acct-head"><h2 id="acct-h">${t('Cambiar la contraseña')}</h2><button type="button" class="btn ghost" data-close>${t('Cancelar')}</button></div>
    <form id="pw-f" class="acct-form">
      <label>${t('Contraseña actual')}<input id="pw-cur" type="password" autocomplete="current-password" required maxlength="72"></label>
      <label>${t('Contraseña nueva')}<input id="pw-new" type="password" autocomplete="new-password" required maxlength="72"></label>
      <label>${t('Repite la contraseña')}<input id="pw-new2" type="password" autocomplete="new-password" required maxlength="72"></label>
      <p class="muted small">${t('Mínimo 10 caracteres, con letras y números. Se cerrará la sesión en tus otros dispositivos.')}</p>
      <p class="acct-err" id="pw-err" role="alert"></p>
      <div class="row"><button class="btn" type="submit" id="pw-go">${t('Guardar la contraseña')}</button><button class="btn ghost" type="button" data-back>${t('Volver')}</button></div>
    </form>`;
  d.querySelector('[data-close]').addEventListener('click', () => openAccount(d));
  d.querySelector('[data-back]').addEventListener('click', () => openAccount(d));
  const f = d.querySelector('#pw-f'), err = d.querySelector('#pw-err'), go = d.querySelector('#pw-go');
  d.querySelector('#pw-cur').focus();
  f.addEventListener('submit', async e => {
    e.preventDefault(); go.disabled = true; err.textContent = '';
    try {
      await call('PUT', '/password', { current_password: d.querySelector('#pw-cur').value, password: d.querySelector('#pw-new').value, password_confirmation: d.querySelector('#pw-new2').value });
      d.innerHTML = `<div class="acct-head"><h2 id="acct-h">${t('Contraseña cambiada')}</h2></div>
        <div class="fb ok">${t('Listo. Las demás sesiones se han cerrado; aquí sigues dentro.')}</div>
        <div class="row"><button class="btn" type="button" data-back>${t('Volver')}</button></div>`;
      d.querySelector('[data-back]').addEventListener('click', () => openAccount(d));
    } catch (x) {
      go.disabled = false;
      if (x.status === 401) return expired();
      err.textContent = formError(x);
    }
  });
  if (!d.open) d.showModal();
}

/* ---------- Borrar la cuenta (Tu cuenta) ---------- */
function openDelete(d) {
  view = { kind: 'delete' };
  d.innerHTML = `
    <div class="acct-head"><h2 id="acct-h">${t('Borrar mi cuenta')}</h2><button type="button" class="btn ghost" data-close>${t('Cancelar')}</button></div>
    <div class="fb bad"><p><b>${t('Esto no se puede deshacer.')}</b> ${t('Se borran tu cuenta, tu progreso en la nube y tus laboratorios. El progreso de este navegador también se borra.')}</p></div>
    <p class="muted small">${t('Si quieres guardar una copia antes, descárgala desde Resultados.')}</p>
    <form id="dl-f" class="acct-form">
      <label>${t('Escribe tu contraseña para confirmar')}<input id="dl-pw" type="password" autocomplete="current-password" required maxlength="72"></label>
      <p class="acct-err" id="dl-err" role="alert"></p>
      <div class="row"><button class="btn danger" type="submit" id="dl-go">${t('Borrar mi cuenta para siempre')}</button><button class="btn ghost" type="button" data-back>${t('Volver')}</button></div>
    </form>`;
  d.querySelector('[data-close]').addEventListener('click', () => openAccount(d));
  d.querySelector('[data-back]').addEventListener('click', () => openAccount(d));
  const pw = d.querySelector('#dl-pw'), err = d.querySelector('#dl-err'), go = d.querySelector('#dl-go');
  pw.focus();
  d.querySelector('#dl-f').addEventListener('submit', async e => {
    e.preventDefault(); if (!pw.value) return;
    go.disabled = true; err.textContent = '';
    try {
      clearTimeout(timer); timer = null;
      await call('DELETE', '/account', { password: pw.value });
      pw.value = '';
      PROGRESS_KEYS.forEach(k => set(k, null));
      token = null; user = null; set(K.token, null); set(K.user, null); set(K.meta, null);
      location.replace('login.html?r=deleted');
    } catch (x) {
      go.disabled = false; pw.select();
      if (x.status === 401) return expired();
      err.textContent = formError(x, 'password');
    }
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
}
if (global.I18N) global.I18N.onChange(kind => { if (kind === 'lang') relang(); });

function init() {
  const b = document.getElementById('acct-btn');
  if (b) b.addEventListener('click', () => open('login'));
  paintButton();
  if (token) {
    let fresh = false; try { fresh = sessionStorage.getItem('cl-fresh-login') === '1'; sessionStorage.removeItem('cl-fresh-login'); } catch (e) {}
    let wasReset = false; try { wasReset = sessionStorage.getItem('cl-reset-done') === '1'; sessionStorage.removeItem('cl-reset-done'); } catch (e) {}
    if (wasReset) {
      const b = document.createElement('div'); b.className = 'fb ok cl-content-err'; b.setAttribute('role', 'status');
      b.textContent = t('Progreso reiniciado. Empiezas de cero.'); document.body.appendChild(b); setTimeout(() => b.remove(), 6000);
    }
    if (fresh) afterLogin(); else { pull(); loadContent(); }   // recién entrado: decide qué progreso conservar
    refreshUser();
  }
  // En tu Mac (localhost) se puede probar sin cuenta: el contenido sale de private/js.
  else if (LOCAL) loadContent();
  // En la web publicada, sin sesión no hay app: a la página de login.
  else goLogin();
  global.addEventListener('online', () => { if (token) (meta.dirty ? push(false) : pull()); });
  setInterval(() => { if (token && (status === 'offline' || status === 'error') ) (meta.dirty ? push(false) : pull()); }, 60000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && token && !meta.dirty) pull(); });
}

global.Sync = { init, initLoginPage, changed, open, tr, loadContent, get contentLoaded() { return contentLoaded; }, ask: body => call('POST', '/ask', body),
  // Laboratorios aislados (Mi lab): la API habla con el Runner de Docker; el navegador nunca.
  labs: { list: () => call('GET', '/labs'), create: scenario => call('POST', '/labs', { scenario }), get: id => call('GET', '/labs/' + encodeURIComponent(id)), stop: id => call('DELETE', '/labs/' + encodeURIComponent(id)) },
  get loggedIn() { return !!token; }, get status() { return status; } };
})(window);
