// Prueba: dos exámenes seguidos de la misma fase no repiten pregunta fija (y cada uno tiene 12 distintas).
// Uso: node tools/test-exams.js  (lee private/js/course.js)
const src = require('fs').readFileSync(require('path').join(__dirname, '../private/js/course.js'), 'utf8');
const block = (start, open) => { const i = src.indexOf(start); let d = 0, j = src.indexOf(open, i), cl = open === '[' ? ']' : '}'; for (let k = j; k < src.length; k++) { if (src[k] === open) d++; else if (src[k] === cl) { d--; if (!d) return src.slice(i, k + 1); } } };
const store = {}; global.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } };
const lines = src.split('\n'), from = lines.findIndex(l => l.startsWith('const rnd = ')), to = lines.findIndex(l => l.startsWith('const shuffle = '));
let code = lines.slice(from, to + 1).join('\n') + '\n';
for (const b of ['BANK_F1', 'BANK_F2', 'BANK_F3', 'BANK_CISCO']) code += block('const ' + b + ' = [', '[') + ';\n';
code += block('const EXAMS = {', '{') + ';\n';
const es = lines.findIndex(l => l.startsWith("const EXAM_SEEN")); code += lines.slice(es, es + 3).join('\n') + '\n' + block('function buildExam', '{') + '\n';
code += 'module.exports = { buildExam, EXAMS };';
const m = { exports: {} }; new Function('module', 'require', code)(m, require);
let bad = 0;
for (const ph of ['f1', 'f2', 'f3', 'cisco']) {
  let prev = null; const res = [];
  for (let i = 0; i < 5; i++) {
    const ex = m.exports.buildExam(12, ph), qs = ex.map(q => q.q);
    if (ex.length !== 12 || new Set(qs).size !== 12) { bad++; console.log('✗', ph, 'examen sin 12 preguntas distintas'); }
    if (ex.some(q => q.a < 0 || !q.options[q.a])) { bad++; console.log('✗', ph, 'respuesta correcta perdida'); }
    const rep = prev ? qs.filter(q => prev.includes(q)).length : 0; res.push(rep); prev = qs;
  }
  const ok = res.every(r => r === 0);
  if (!ok) bad++;
  console.log((ok ? '✓ ' : '✗ ') + ph + ': 5 exámenes seguidos · preguntas repetidas con el anterior: ' + res.slice(1).join(', '));
}
process.exit(bad ? 1 : 0);
