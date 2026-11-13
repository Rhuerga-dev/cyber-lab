#!/usr/bin/env node
/* Cyber Lab · Pone el ?v= de los <script>/<link> de index.html y login.html a partir del
   CONTENIDO de los archivos JS (una huella corta). Así el navegador solo recarga cuando el JS
   cambia de verdad, y no hay que acordarse de subir el número a mano.
   Uso:  node tools/bump-cache.js        (lo corre solo el hook de git en cada commit)
   Sale con código 0 siempre; imprime la versión nueva si cambió algo. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..');

// Archivos que, si cambian, deben invalidar la caché del navegador.
function jsFiles(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) out.push(...jsFiles(full));
    else if (name.endsWith('.js')) out.push(full);
  }
  return out;
}

const inputs = [...jsFiles(path.join(ROOT, 'js'))];
const envjs = path.join(ROOT, 'env.js');
if (fs.existsSync(envjs)) inputs.push(envjs);
inputs.sort();

const h = crypto.createHash('sha1');
for (const f of inputs) h.update(fs.readFileSync(f));
const version = h.digest('hex').slice(0, 10);

let changed = false;
for (const html of ['index.html', 'login.html']) {
  const p = path.join(ROOT, html);
  if (!fs.existsSync(p)) continue;
  const before = fs.readFileSync(p, 'utf8');
  const after = before.replace(/\?v=[0-9a-z-]+/g, '?v=' + version);
  if (after !== before) { fs.writeFileSync(p, after); changed = true; }
}

console.log(changed ? 'Cache-busting: ?v=' + version : 'Cache-busting: ya al día (?v=' + version + ')');
