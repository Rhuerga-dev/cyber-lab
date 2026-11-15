// Prueba de CLUtil.fresh (Práctica: el siguiente ejercicio nunca repite uno de los últimos 8).
// Uso: node tools/test-fresh.js  → sale con error si falla.
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = { window: { location: { hostname: 'x' } } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/util.js'), 'utf8'), ctx);
const { fresh } = ctx.window.CLUtil;
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pools = {
  'leer4 (15 números)': () => rnd(1, 15),
  'saludo TCP (12 preguntas)': () => ({ q: 'p' + rnd(0, 11), big: '', answer: 'a' }),
  'máscaras (23 prefijos)': () => rnd(8, 30),
};
let bad = 0;
for (const [name, gen] of Object.entries(pools)) {
  const recent = [], seen = [];
  for (let i = 0; i < 2000; i++) {
    const x = fresh(gen, recent), k = typeof x === 'object' ? x.q : String(x);
    if (seen.slice(-8).includes(k)) { bad++; console.error('✗ ' + name + ': se repitió ' + k + ' en la vuelta ' + i); break; }
    seen.push(k);
  }
  if (!bad) console.log('✓ ' + name + ': 2000 ejercicios, ninguno repite los 8 anteriores');
}
// Si hay menos posibles que la ventana, no se cuelga: acepta uno repetido.
const tiny = [], two = () => rnd(1, 2); for (let i = 0; i < 50; i++) fresh(two, tiny);
console.log('✓ generador con solo 2 posibles: no se cuelga');
process.exit(bad ? 1 : 0);
