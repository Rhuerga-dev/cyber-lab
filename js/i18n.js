/* Cyber Lab · Idioma y tema
   - t('texto en español', {vars}) devuelve la traducción del idioma activo (o el español si falta).
     Las traducciones viven en js/lang/*.js como un diccionario { 'español': 'english' }.
   - Tema: 'auto' (sigue al sistema), 'light' o 'dark'. Se aplica con data-theme en <html>. */
(function (global) {
'use strict';
const KL = 'cyberlab-lang', KT = 'cyberlab-theme';
const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

const DICT = global.I18N_DICT = global.I18N_DICT || { en: {} };
// Español por defecto: solo cambia si el alumno elige otro idioma
let lang = get(KL) || 'es';
let theme = get(KT) || 'auto';
const listeners = [];
const missing = new Set();

function t(s, vars) {
  if (s == null) return '';
  s = String(s);
  let out = s;
  if (lang !== 'es') {
    const d = DICT[lang] || {};
    if (Object.prototype.hasOwnProperty.call(d, s)) out = d[s];
    else if (s.trim() && /[a-záéíóúñ¿¡]/i.test(s)) missing.add(s);
  }
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  return out;
}

function applyStatic(root) {
  (root || document).querySelectorAll('[data-i18n]').forEach(el => {
    if (!el.dataset.i18nSrc) el.dataset.i18nSrc = el.dataset.i18n || el.textContent.trim();
    el.textContent = t(el.dataset.i18nSrc);
  });
  (root || document).querySelectorAll('[data-i18n-attr]').forEach(el => {
    el.dataset.i18nAttr.split(',').forEach(a => {
      const key = 'i18nSrc' + a.replace(/(^|-)(\w)/g, (m, p, c) => c.toUpperCase());
      if (!el.dataset[key]) el.dataset[key] = el.getAttribute(a) || '';
      el.setAttribute(a, t(el.dataset[key]));
    });
  });
  document.documentElement.lang = lang;
}

function applyTheme() {
  const r = document.documentElement;
  if (theme === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', theme);
}

function paintControls() {
  document.querySelectorAll('[data-setlang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.setlang === lang)));
  document.querySelectorAll('[data-settheme]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.settheme === theme)));
}

function setLang(l, silent) {
  if (!DICT[l] && l !== 'es') return;
  if (l === lang) { paintControls(); return; }
  lang = l; set(KL, l); applyStatic(); paintControls();
  if (!silent) listeners.forEach(fn => { try { fn('lang', l); } catch (e) { console.error(e); } });
}
function setTheme(v, silent) {
  if (!['auto', 'light', 'dark'].includes(v)) return;
  theme = v; set(KT, v); applyTheme(); paintControls();
  if (!silent) listeners.forEach(fn => { try { fn('theme', v); } catch (e) { console.error(e); } });
}

function bindControls() {
  document.querySelectorAll('[data-setlang]').forEach(b => b.addEventListener('click', () => setLang(b.dataset.setlang)));
  document.querySelectorAll('[data-settheme]').forEach(b => b.addEventListener('click', () => setTheme(b.dataset.settheme)));
  paintControls();
}

applyTheme();

global.I18N = {
  t, setLang, setTheme, applyStatic, bindControls,
  get lang() { return lang; }, get theme() { return theme; },
  onChange(fn) { listeners.push(fn); },
  missing() { return [...missing]; },
  // Fecha corta según idioma
  date(d, opts) { return new Date(d).toLocaleDateString(lang === 'es' ? 'es' : 'en-US', opts); },
  dateTime(d) { return new Date(d).toLocaleString(lang === 'es' ? 'es' : 'en-US'); },
};
global.t = t;
})(window);
