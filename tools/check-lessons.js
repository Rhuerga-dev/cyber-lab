#!/usr/bin/env node
/* Comprueba tus lecciones (private/js/lessons/*.js) sin abrir el navegador.
   Uso, desde la carpeta del proyecto:  node tools/check-lessons.js
   Errores (✗) = la lección no funcionará bien. Avisos (!) = funciona pero mejorable. */
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..');
const tt = (s, v) => String(s).replace(/\{(\w+)\}/g, (m, k) => v && k in v ? v[k] : m);
const logs = [];
const cons = { log() {}, info() {}, warn: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push(a.map(String).join(' ')) };
const ctx = { console: cons, Math, Date, JSON, TextEncoder, TextDecoder, btoa, atob, setTimeout, t: tt, requestAnimationFrame: () => 0 };
ctx.window = ctx;
ctx.I18N = { t: tt, onChange() {} };
ctx.document = { addEventListener() {}, querySelector() { return null }, querySelectorAll() { return [] }, body: { classList: { add() {}, remove() {} } }, documentElement: {} };
ctx.localStorage = { getItem() { return null }, setItem() {} };
ctx.CL = { prog: { course: { cur: 'f1-terminal', l: {} }, topics: {} } };
vm.createContext(ctx);

const extra = fs.readdirSync(path.join(ROOT, 'private/js/lessons')).filter(f => f.endsWith('.js')).map(f => 'private/js/lessons/' + f);
const files = ['private/js/lang/en-course.js', 'private/js/lang/en-review.js', 'private/js/lang/en-terminal.js', 'js/lang/en-ui.js', 'private/js/terminal.js', ...extra, 'private/js/course.js', 'private/js/review.js'];
for (const f of files) {
  try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }); }
  catch (e) { console.log('✗ ' + f + ': ' + e.message); process.exit(1); }
}

let err = 0, warn = 0;
const E = (w, m) => { err++; console.log('  ✗ ' + w + ': ' + m); };
const W = (w, m) => { warn++; console.log('  ! ' + w + ': ' + m); };
logs.forEach(l => E('carga', l));

const C = ctx.Course, EN = ctx.I18N_DICT.en;
const all = C.LESSONS;
const mine = [];
(ctx.CL_EXTRA || []).forEach(fn => { try { const x = typeof fn === 'function' ? fn({ has: () => () => false, line: () => () => false, ok: () => true }) : fn; (x.lessons || []).forEach(l => mine.push(l.id)); } catch (e) {} });
console.log('Lecciones propias: ' + (mine.length ? mine.join(', ') : '(ninguna todavía)'));

const ids = new Map();
all.forEach(l => ids.set(l.id, (ids.get(l.id) || 0) + 1));
const AGENTS = ['nova', 'marco', 'lia'];
const isCommand = s => /^[a-z][\w.-]*(\s+(-{1,2}[\w=-]+|[\w.\/:@=-]+|"[^"]*"|'[^']*'|\|))*$/.test(s.trim()) && !/[áéíóúñ¿¡]/i.test(s) && /\s-\w|[\/|]|\d\.\d/.test(s);
const needEN = s => typeof s === 'string' && !(s in EN) && /\s/.test(s.trim()) && /[a-záéíóúñ]{3}/i.test(s) && !isCommand(s);
const missEN = [];

for (const L of all.filter(l => mine.includes(l.id))) {
  console.log('\n' + L.id + ' · ' + L.title);
  const w = L.id;
  if (ids.get(L.id) > 1) E(w, 'id repetido');
  const ph = (C.LESSONS.indexOf(L) >= 0) && L.id.split('-')[0];
  if (!/^(f[123]|cisco)-[a-z0-9-]+$/.test(L.id)) W(w, 'el id debería ser tipo f3-algo (minúsculas y guiones)');
  if (!AGENTS.includes(L.agent)) E(w, 'agent debe ser ' + AGENTS.join(' / '));
  if (!Array.isArray(L.topics)) E(w, 'topics debe ser una lista');
  if (!Array.isArray(L.steps) || !L.steps.length) { E(w, 'sin pasos'); continue; }
  if (!L.outro) W(w, 'sin outro');
  [L.title, L.outro].forEach(s => needEN(s) && missEN.push(s));
  L.steps.forEach((S, i) => {
    const at = w + ' paso ' + (i + 1);
    if (!S.say) E(at, 'falta say');
    const t = S.task && S.task.type;
    if (!['read', 'cmd', 'answer', 'choice'].includes(t)) return E(at, 'task.type debe ser read / cmd / answer / choice');
    [S.say, S.done, ...(S.hint || [])].forEach(s => needEN(s) && missEN.push(s));
    if (t === 'cmd') {
      if (typeof S.task.check !== 'function') return E(at, 'cmd necesita check: has(...) o line(...)');
      if (!S.hint) W(at, 'sin hint: el alumno no tiene pista si se atasca');
      if (!S.try) W(at, 'añade try: "comando" para que este comprobador lo pruebe');
      else {
        const sim = new ctx.CyberTerminal.Sim();
        const r = sim.run(S.try);
        let passed = false;
        try { passed = !!S.task.check(r.entry, sim, {}); } catch (e) { E(at, 'el check falla: ' + e.message); }
        if (!passed) E(at, 'el comando de try no pasa el check. Salida del simulador: ' + JSON.stringify(String(r.out).slice(0, 120)));
        if (/command not found|no encontrado/i.test(r.out)) W(at, 'el simulador no conoce el comando (mira CONTENIDO.md → comandos nuevos)');
      }
    }
    if (t === 'answer' && !(Array.isArray(S.task.accept) && S.task.accept.length)) E(at, 'answer necesita accept: [respuestas]');
    if (t === 'choice') {
      const o = S.task.options || [];
      if (o.length < 2) E(at, 'choice necesita al menos 2 opciones');
      const n = o.filter(x => x.ok).length;
      if (n !== 1) E(at, 'choice debe tener exactamente 1 opción con ok: true (tiene ' + n + ')');
      o.forEach((x, k) => { if (!x.t) E(at, 'opción ' + (k + 1) + ' sin texto t'); if (!x.why) W(at, 'opción ' + (k + 1) + ' sin why'); [x.t, x.why].forEach(s => needEN(s) && missEN.push(s)); });
    }
  });
}

// banco del examen y tarjetas
const bankAll = { f1: C._exam.BANK_F1, f2: C._exam.BANK_F2 };
(ctx.CL_EXTRA || []).forEach((fn, n) => {
  let x; try { x = typeof fn === 'function' ? fn({ has: () => () => false, line: () => () => false, ok: () => true }) : fn; } catch (e) { return; }
  (x.bank || []).forEach((q, i) => {
    const at = 'bank #' + (i + 1);
    if (!Array.isArray(q) || q.length !== 4) return E(at, 'formato: [tema, pregunta, [correcta, incorrectas...], explicación]');
    if (!C._exam.TOPICS[q[0]]) E(at, 'tema "' + q[0] + '" no existe. Usa uno de: ' + Object.keys(C._exam.TOPICS).join(' ') + ' (o créalo en topics)');
    if (!Array.isArray(q[2]) || q[2].length < 2) E(at, 'necesita al menos 2 opciones');
    if (new Set(q[2]).size !== q[2].length) E(at, 'opciones repetidas');
    [q[1], q[3], ...(q[2] || [])].forEach(s => needEN(s) && missEN.push(s));
  });
  (x.cards || []).forEach((c, i) => {
    const at = 'card ' + (c && c[0] || '#' + (i + 1));
    if (!Array.isArray(c) || c.length !== 5) return E(at, 'formato: [id, lección, pregunta, respuesta, explicación]');
    if (!all.some(l => l.id === c[1])) E(at, 'la lección "' + c[1] + '" no existe');
    [c[2], c[4]].forEach(s => needEN(s) && missEN.push(s));
  });
});

// retos de Mi lab (private/js/lessons/mis-retos.js)
const retos = Array.isArray(ctx.CL_RETOS) ? ctx.CL_RETOS : [];
console.log('\nRetos de Mi lab: ' + (retos.length ? retos.map(r => r && r.id).join(', ') : '(ninguno todavía)'));
const rids = new Set();
retos.forEach((r, i) => {
  const at = 'reto ' + (r && r.id || '#' + (i + 1));
  if (!r || typeof r !== 'object') return E(at, 'cada reto es un objeto { id, title, ... }');
  if (!/^r-[a-z0-9-]+$/.test(r.id || '')) E(at, 'id debe ser tipo r-algo (minúsculas y guiones)');
  if (rids.has(r.id)) E(at, 'id repetido'); rids.add(r.id);
  if (!r.title) E(at, 'falta title');
  if (!['juice-shop', 'dvwa', 'otro'].includes(r.app)) W(at, "app debería ser 'juice-shop', 'dvwa' u 'otro'");
  if (!r.guiado) E(at, 'falta guiado (enunciado con pasos)');
  if (!r.reto) W(at, 'sin reto breve: Práctica y Dominio mostrarán el guiado entero');
  if (!Array.isArray(r.pistas) || !r.pistas.length) W(at, 'sin pistas');
  const checkAns = (R, w) => {
    if (!R || typeof R !== 'object') return E(w, 'falta respuesta: { accept: [...] } o { sha256: "..." }');
    const okA = Array.isArray(R.accept) && R.accept.length, okH = R.sha256 && [].concat(R.sha256).every(h => /^[0-9a-f]{64}$/.test(h));
    if (!okA && !okH) E(w, 'respuesta necesita accept: [...] o sha256 (64 caracteres hex; usa node tools/hash-respuesta.js)');
  };
  checkAns(r.respuesta, at);
  (r.variantes || []).forEach((v, k) => { if (!v.reto) E(at + ' variante ' + (k + 1), 'falta reto'); checkAns(v.respuesta, at + ' variante ' + (k + 1)); });
  [r.title, r.guiado, r.reto, r.explicacion, ...(r.pistas || [])].forEach(s => needEN(s) && missEN.push(s));
});

for (const ph of ['f1', 'f2']) {
  try { const ex = C._exam.buildExam(12, ph); if (!ex.every(q => q.options[q.a] !== undefined)) E('examen ' + ph, 'pregunta sin respuesta correcta'); }
  catch (e) { E('examen ' + ph, e.message); }
}

const uniq = [...new Set(missEN)];
if (uniq.length) {
  warn++;
  console.log('\n! ' + uniq.length + ' textos sin traducción al inglés (se verán en español). Pega esto al final de tu archivo y traduce:');
  console.log('Object.assign(window.I18N_DICT.en, {\n' + uniq.map(s => '  ' + JSON.stringify(s) + ": '',").join('\n') + '\n});');
}
console.log('\n' + (err ? '✗ ' + err + ' errores' : '✓ Sin errores') + (warn ? ', ' + warn + ' avisos' : ''));
process.exit(err ? 1 : 0);
