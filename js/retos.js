/* Cyber Lab · Motor de retos de Mi lab (Guiado → Práctica → Dominio)
   Solo el motor: los retos los escribes tú en private/js/lessons/mis-retos.js (llegan con tu sesión).
   - Guiado: enunciado con pasos y pistas sin límite (se cuentan). Sin ninguna pista, salta directo a Dominio.
   - Práctica: enunciado breve, como mucho 1 pista. Si el reto tiene variantes, se usa otra.
   - Dominio: enunciado breve, sin pistas. Al dominarlo se abre el siguiente reto. */
(function (global) {
'use strict';

const t = (s, v) => (global.I18N ? global.I18N.t(s, v) : String(s));
const esc = window.CLUtil.esc;
const fmt = s => esc(s).split('\n\n').map(p => '<p>' + p.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>') + '</p>').join('');
const KEY = 'cyberlab-retos-v1';
const TIERS = ['g', 'p', 'd'], TNAME = { g: 'Guiado', p: 'Práctica', d: 'Dominio' }, MAXH = { g: Infinity, p: 1, d: 0 };
const APPS = { 'juice-shop': 'OWASP Juice Shop', dvwa: 'DVWA', otro: 'Otro' };
const today = () => new Date().toISOString().slice(0, 10);

let root = null, curId = null, msg = null;
const list = () => (Array.isArray(global.CL_RETOS) ? global.CL_RETOS : []).filter(r => r && r.id && r.title);
const prog = () => { const p = global.CL && global.CL.prog; if (!p) return {}; if (!p.retos) p.retos = {}; return p.retos; };
const pr = id => prog()[id] || {};
const mark = (id, k) => { const p = prog(); p[id] = Object.assign({}, p[id], { [k]: today() }); };
const save = () => { try { global.CL.save(); } catch (e) {} };
function readAll() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
function writeAll(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
const mastered = id => !!pr(id).d;
function isOpen(id) { const L = list(), i = L.findIndex(r => r.id === id); return i <= 0 || mastered(L[i - 1].id) || !!(pr(id).g || pr(id).p); }
function tierOpen(id, k) { const x = pr(id); return k === 'g' || (k === 'p' && !!(x.g || x.p || x.d)) || (k === 'd' && !!(x.p || x.d)); }
const bestTier = id => { const x = pr(id); return x.p || x.d ? 'd' : x.g ? 'p' : 'g'; };

// Intento en curso de cada reto: nivel, ayudas usadas, pistas vistas, variante y resultado.
function attempt(r, tier, fresh) {
  const all = readAll(); all[r.id] = all[r.id] || {};
  let a = all[r.id][tier];
  if (!a || fresh) {
    const vs = Array.isArray(r.variantes) ? r.variantes : [];
    const prev = a ? a.v : -1;
    let v = -1;
    if (tier !== 'g' && vs.length) { do { v = Math.floor(Math.random() * vs.length); } while (vs.length > 1 && v === prev); }
    a = all[r.id][tier] = { helps: 0, shown: [], v, res: null };
  }
  all[r.id].tier = tier; all.last = r.id; writeAll(all);
  return a;
}
function putAttempt(r, tier, a) { const all = readAll(); all[r.id] = all[r.id] || {}; all[r.id][tier] = a; writeAll(all); }
const variant = (r, a) => (a.v >= 0 && r.variantes && r.variantes[a.v]) ? Object.assign({}, r, r.variantes[a.v]) : r;

async function sha256(s) {
  if (!global.crypto || !global.crypto.subtle) return '';
  const h = await global.crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function correct(rv, answer) {
  const R = rv.respuesta || {}, a = String(answer).trim(), norm = s => R.mayusculas ? String(s).trim() : String(s).trim().toLowerCase();
  if (Array.isArray(R.accept) && R.accept.some(x => x instanceof RegExp ? x.test(a) : norm(x) === norm(a))) return true;
  if (R.sha256) { const h = await sha256(R.mayusculas ? a : a.toLowerCase()); return [].concat(R.sha256).includes(h); }
  return false;
}

function render(el) {
  root = el || root; if (!root) return;
  const L = list();
  if (!L.length) {
    root.innerHTML = `<h2>${esc(t('Mis retos'))}</h2><p class="muted">${esc(t('Todavía no tienes retos. Escríbelos en private/js/lessons/mis-retos.js (mira CONTENIDO.md) con lo que practiques en plataformas legales.'))}</p>`;
    return;
  }
  const last = readAll().last;
  if (!curId || !L.some(r => r.id === curId)) curId = L.some(r => r.id === last) && isOpen(last) ? last : (L.find(r => isOpen(r.id) && !mastered(r.id)) || L[0]).id;
  paint();
}

function paint() {
  const L = list(), r = L.find(x => x.id === curId); if (!r || !root) return;
  const all = readAll(), want = (all[r.id] || {}).tier || bestTier(r.id), tier = tierOpen(r.id, want) ? want : 'g';
  const a = attempt(r, tier), rv = variant(r, a), x = pr(r.id), nDone = L.filter(z => mastered(z.id)).length;
  const hints = rv.pistas || [];
  const brief = tier === 'g' ? (rv.guiado || rv.reto) : (rv.reto || rv.guiado);
  const opt = z => `${!isOpen(z.id) ? '🔒' : mastered(z.id) ? '★' : (pr(z.id).g || pr(z.id).p) ? '◐' : '·'} ${t(z.title)}`;
  const counter = tier === 'g' ? (a.helps ? t('Pistas usadas: {n} · al terminar irás a Práctica', { n: a.helps }) : t('Sin pistas: si lo resuelves así, pasas directo a Dominio')) : tier === 'p' ? t('Pistas usadas: {n} de 1', { n: a.helps }) : t('En Dominio no hay pistas.');
  root.innerHTML = `<h2>${esc(t('Mis retos'))} <span class="muted small">${esc(t('Dominados: {n}/{t}', { n: nDone, t: L.length }))}</span></h2>
    <label class="rt-pick"><span class="sr-only">${esc(t('Reto'))}</span><select id="rt-sel">${L.map(z => `<option value="${esc(z.id)}"${z.id === r.id ? ' selected' : ''}${isOpen(z.id) ? '' : ' disabled'}>${esc(opt(z))}</option>`).join('')}</select></label>
    <div class="nl-tabs nl-tiers" role="tablist" aria-label="${esc(t('Nivel'))}">${TIERS.map(k => `<button type="button" role="tab" data-rt-tier="${k}" aria-selected="${tier === k}" class="${x[k] ? 'done' : ''}"${tierOpen(r.id, k) ? '' : ' disabled'}><span aria-hidden="true">${x[k] ? '✓' : tierOpen(r.id, k) ? '' : '🔒'}</span> ${esc(t(TNAME[k]))}</button>`).join('')}</div>
    <p class="muted small">${esc(t(APPS[r.app] || r.app || ''))}${r.app && APPS[r.app] && r.app !== 'otro' ? ' · ' + esc(t('Ábrelo arriba, en el laboratorio aislado o con docker compose.')) : ''}</p>
    <div class="rt-text">${fmt(t(brief || ''))}</div>
    <p class="nl-helps${tier === 'g' && !a.helps ? ' good' : ''}${tier === 'p' && a.helps > 1 ? ' over' : ''}">${esc(counter)}</p>
    <div class="rt-hints">${a.shown.map(i => hints[i] != null ? `<div class="fb hint"><b>${esc(t('Pista:'))}</b> ${fmt(t(hints[i]))}</div>` : '').join('')}</div>
    ${a.res ? result(r, rv, tier, a) : `<form class="row rt-ans" id="rt-f"><input id="rt-in" autocomplete="off" spellcheck="false" placeholder="${esc(t('Tu respuesta o flag'))}" aria-label="${esc(t('Tu respuesta o flag'))}"><button class="btn" type="submit">${esc(t('Comprobar'))}</button>${tier !== 'd' && hints.length ? `<button class="btn ghost" type="button" id="rt-hint"${a.shown.length >= hints.length ? ' disabled' : ''}>${esc(t('Pedir una pista'))}</button>` : ''}</form>`}
    ${msg ? `<p class="fb bad" role="alert">${esc(msg)}</p>` : ''}`;
  msg = null;
  root.querySelector('#rt-sel').addEventListener('change', e => { curId = e.target.value; paint(); });
  const goTier = (to, discard) => { const all2 = readAll(); all2[r.id] = all2[r.id] || {}; if (discard) delete all2[r.id][tier]; all2[r.id].tier = to; writeAll(all2); paint(); };
  root.querySelectorAll('[data-rt-tier]').forEach(b => b.addEventListener('click', () => {
    const to = b.dataset.rtTier;
    if (b.disabled || to === tier) return;
    // Bajar de nivel con un intento de Práctica/Dominio a medias (para ver el enunciado guiado o las pistas)
    // lo descarta: al volver tendrás otra variante.
    if (TIERS.indexOf(to) < TIERS.indexOf(tier) && tier !== 'g' && !a.res) {
      let box = root.querySelector('#rt-leave');
      if (!box) { box = document.createElement('div'); box.id = 'rt-leave'; box.className = 'fb hint'; box.setAttribute('role', 'alert'); root.querySelector('.nl-tiers').after(box); }
      box.innerHTML = `<p>${esc(t('Si vuelves a {to} para ver el enunciado guiado o las pistas, este intento de {from} se descarta y al volver tendrás otra variante.', { to: t(TNAME[to]), from: t(TNAME[tier]) }))}</p>
        <div class="row"><button type="button" class="btn" data-leave="go">${esc(t('Descartar e ir a {to}', { to: t(TNAME[to]) }))}</button><button type="button" class="btn ghost" data-leave="stay">${esc(t('Seguir con {from}', { from: t(TNAME[tier]) }))}</button></div>`;
      box.querySelector('[data-leave="stay"]').addEventListener('click', () => box.remove());
      box.querySelector('[data-leave="go"]').addEventListener('click', () => goTier(to, true));
      box.querySelector('[data-leave="stay"]').focus();
      return;
    }
    goTier(to, false);
  }));
  const hb = root.querySelector('#rt-hint');
  if (hb) hb.addEventListener('click', () => { const next = hints.findIndex((h, i) => !a.shown.includes(i)); if (next < 0) return; a.shown.push(next); a.helps++; putAttempt(r, tier, a); paint(); });
  const f = root.querySelector('#rt-f');
  if (f) f.addEventListener('submit', async e => {
    e.preventDefault(); const v = root.querySelector('#rt-in').value; if (!v.trim()) return;
    if (!(await correct(rv, v))) { msg = t('No es eso. Revisa lo que encontraste y vuelve a probar.'); paint(); return; }
    const pass = a.helps <= MAXH[tier];
    a.res = { pass, helps: a.helps, skip: tier === 'g' && a.helps === 0 };
    if (pass) {
      mark(r.id, tier); if (a.res.skip && !pr(r.id).p) mark(r.id, 'p');
      try { global.CL.addLog({ type: 'lab', title: t('Reto de Mi lab: {x} ({n})', { x: t(r.title), n: t(TNAME[tier]) }) }); } catch (er) {}
      save();
    }
    putAttempt(r, tier, a); paint();
  });
  root.querySelectorAll('[data-rt-go]').forEach(b => b.addEventListener('click', () => {
    const go = b.dataset.rtGo, all2 = readAll(); all2[r.id] = all2[r.id] || {};
    if (go === 'again') { attempt(r, tier, true); paint(); return; }
    if (go === 'next') { const i = list().findIndex(z => z.id === r.id); curId = list()[i + 1].id; paint(); return; }
    all2[r.id].tier = go; writeAll(all2); attempt(r, go, true); paint();
  }));
}

function result(r, rv, tier, a) {
  const L = list(), nx = L[L.findIndex(z => z.id === r.id) + 1], btn = (go, l, ghost) => `<button type="button" class="btn${ghost ? ' ghost' : ''}" data-rt-go="${go}">${esc(l)}</button>`;
  const why = rv.explicacion ? `<div class="rt-why">${fmt(t(rv.explicacion))}</div>` : '';
  if (!a.res.pass) return `<div class="fb bad"><p><b>${esc(t('Correcto, pero con {n} pistas.', { n: a.res.helps }))}</b> ${esc(t('Para superar la Práctica puedes usar como máximo 1. Vuelve a intentarlo.'))}</p>${why}<div class="row">${btn('again', t('Repetir'))}</div></div>`;
  if (tier === 'g' && a.res.skip) return `<div class="fb ok"><p><b>${esc(t('Resuelto sin ninguna pista.'))}</b> ${esc(t('Te saltas la Práctica: pasa directo a Dominio.'))}</p>${why}<div class="row">${btn('d', t('Ir a Dominio'))}</div></div>`;
  if (tier === 'g') return `<div class="fb ok"><p><b>${esc(t('Guiado superado.'))}</b> ${esc(t('Ahora hazlo con el enunciado breve y como mucho 1 pista.'))}</p>${why}<div class="row">${btn('p', t('Ir a Práctica'))}</div></div>`;
  if (tier === 'p') return `<div class="fb ok"><p><b>${esc(t('Práctica superada.'))}</b> ${esc(t('Último paso: Dominio, sin ninguna pista.'))}</p>${why}<div class="row">${btn('d', t('Ir a Dominio'))}</div></div>`;
  return `<div class="fb ok"><p><b>${esc(t('¡Dominado!'))}</b>${nx ? ' ' + esc(t('Se abre el siguiente reto.')) : ''}</p>${why}<div class="row">${nx ? btn('next', t('Siguiente reto')) : ''}${btn('again', t('Repetir'), true)}</div></div>`;
}

global.addEventListener && global.addEventListener('cl-content', () => { if (root && root.isConnected) render(root); });
if (global.I18N && global.I18N.onChange) global.I18N.onChange(kind => { if (kind === 'lang' && root && root.isConnected) paint(); });
global.Retos = { render, _correct: correct, _sha256: sha256 };
})(window);
