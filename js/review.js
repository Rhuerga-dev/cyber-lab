/* Cyber Lab · Repaso con repetición espaciada
   Tarjetas que se desbloquean al completar lecciones del curso. Algoritmo inspirado en SM-2 (Anki):
   cada tarjeta tiene un intervalo en días y una "facilidad". Lo que fallas vuelve pronto;
   lo que dominas, cada vez más tarde. El estado vive en CL.prog.review, así que se sincroniza con tu cuenta. */
(function (global) {
'use strict';

const NEW_PER_DAY = 10;
// [id, lección, pregunta, respuesta (comando o dato), explicación]
const CARDS = [
  ['t-pwd', 'f1-terminal', '¿En qué carpeta estoy?', 'pwd', 'print working directory: muestra la ruta completa de la carpeta actual.'],
  ['t-lsla', 'f1-terminal', 'Ver todos los archivos, incluidos los ocultos, con permisos y dueño.', 'ls -la', '-l = formato largo (permisos, dueño, tamaño), -a = incluye los que empiezan por punto.'],
  ['t-cat', 'f1-terminal', 'Mostrar el contenido de mision.txt.', 'cat mision.txt', 'cat imprime el archivo entero. Para archivos largos, mejor head o tail.'],
  ['t-cdup', 'f1-terminal', 'Subir a la carpeta de arriba.', 'cd ..', '".." es siempre la carpeta padre. "cd" solo, o "cd ~", te lleva a tu carpeta personal.'],
  ['t-hidden', 'f1-terminal', '¿Qué tiene de especial un archivo llamado .pista?', 'Está oculto: empieza por punto', 'ls normal no lo muestra. Los atacantes esconden herramientas así; por eso se investiga con ls -la.'],
  ['ip-a', 'f1-ip', 'Ver la IP de tu equipo en Linux.', 'ip a', 'Busca la línea inet de la interfaz real (eth0). En tu Mac: ifconfig.'],
  ['ip-pub', 'f1-ip', 'Ver tu IP pública desde la terminal.', 'curl ifconfig.me', 'Un servidor externo te dice con qué IP le llegas: la pública, después del NAT.'],
  ['ip-priv', 'f1-ip', '¿Cuáles son los 3 rangos de IP privadas?', '10.x.x.x · 172.16–31.x.x · 192.168.x.x', 'No se enrutan en internet. Cualquiera puede usarlos dentro de su red.'],
  ['ip-nat', 'f1-ip', '¿Qué hace el NAT del router?', 'Traduce las IPs privadas a una sola IP pública', 'Por eso todos los equipos de tu casa salen a internet con la misma IP.'],
  ['b-192', 'f1-binario', '192 en binario (8 bits).', '11000000', '128 + 64 = 192.'],
  ['b-26', 'f1-binario', '¿Qué máscara decimal es /26?', '255.255.255.192', '24 unos (255.255.255) + 2 unos más (128 + 64 = 192).'],
  ['b-224', 'f1-binario', '255.255.255.224 en notación CIDR.', '/27', '224 = 128 + 64 + 32: 3 unos. 24 + 3 = 27.'],
  ['b-calc', 'f1-binario', 'Calcular red, broadcast y rango de 10.10.10.77/26 con una herramienta.', 'ipcalc 10.10.10.77/26', 'Muestra cada dirección en binario. En un examen no la tendrás: sirve para comprobar.'],
  ['s-block', 'f1-subnetting', 'Truco del tamaño de bloque para una máscara.', '256 − octeto de la máscara', 'Para /26 (192): 256 − 192 = 64. Las subredes empiezan en 0, 64, 128, 192.'],
  ['s-hosts', 'f1-subnetting', 'Fórmula de equipos usables en una subred.', '2^(bits de equipo) − 2', 'Se restan la dirección de red y el broadcast. /26 → 2⁶ − 2 = 62.'],
  ['s-net', 'f1-subnetting', 'Dirección de red de 192.168.1.200/26.', '192.168.1.192', 'Bloques de 64: 0, 64, 128, 192. El 200 cae en el que empieza en 192.'],
  ['s-why', 'f1-subnetting', '¿Por qué segmentar la red en subredes?', 'Frenar el movimiento lateral', 'Si comprometen una cámara, el atacante tiene que pasar por un router con firewall para llegar a los servidores.'],
  ['d-ns', 'f1-dns', 'Preguntar al DNS la IP de www.labcorp.local (forma sencilla).', 'nslookup www.labcorp.local', 'Te dice qué servidor DNS respondió y la dirección.'],
  ['d-mx', 'f1-dns', '¿Qué servidor recibe el correo de labcorp.local?', 'dig labcorp.local MX', 'MX = mail exchanger. dig permite pedir cualquier tipo de registro.'],
  ['d-short', 'f1-dns', 'Consulta DNS que devuelva solo la respuesta, sin cabeceras.', 'dig +short nombre', 'Ideal para scripts y para ver rápido a qué apunta un nombre.'],
  ['d-cname', 'f1-dns', '¿Qué es un registro CNAME?', 'Un alias que apunta a otro nombre', 'intranet → www → 10.10.10.10. Tu cyber.huergalabs.dev es un CNAME a GitHub.'],
  ['d-resolv', 'f1-dns', '¿Dónde mira Linux qué servidor DNS usar?', 'cat /etc/resolv.conf', 'La línea nameserver. Un atacante que la cambia puede mandarte a webs falsas.'],
  ['p-ss', 'f1-puertos', '¿Qué puertos escucha TU propio equipo?', 'ss -tuln', 'TCP, UDP, en escucha, números. En tu Mac: lsof -iTCP -sTCP:LISTEN -nP'],
  ['p-22', 'f1-puertos', 'Puerto 22.', 'SSH', 'Acceso remoto a servidores. Objetivo típico de fuerza bruta.'],
  ['p-443', 'f1-puertos', 'Puerto 443.', 'HTTPS', 'Web cifrada con TLS. El 80 es HTTP sin cifrar.'],
  ['p-3306', 'f1-puertos', 'Puerto 3306.', 'MySQL', 'Nunca debería estar expuesto a internet: bind-address = 127.0.0.1.'],
  ['p-3389', 'f1-puertos', 'Puerto 3389.', 'RDP (escritorio remoto de Windows)', 'Muy atacado por grupos de ransomware.'],
  ['p-bind', 'f1-puertos', 'Diferencia entre escuchar en 127.0.0.1 y en 0.0.0.0.', '127.0.0.1 = solo local · 0.0.0.0 = toda la red', 'Un servicio interno (base de datos, servidor de desarrollo) debe escuchar en 127.0.0.1.'],
  ['tc-hs', 'f1-tcp', 'Los 3 pasos del saludo TCP.', 'SYN → SYN-ACK → ACK', 'En tcpdump: [S], [S.], [.]'],
  ['tc-rst', 'f1-tcp', 'Envías SYN y te responden RST. Estado del puerto:', 'closed', 'El equipo existe, pero no hay nada escuchando.'],
  ['tc-filt', 'f1-tcp', 'Envías SYN y no responde nadie. Estado del puerto:', 'filtered', 'Un firewall descarta el paquete en silencio.'],
  ['tc-syn', 'f1-tcp', 'Escaneo SYN con detección de versiones a 10.10.10.20.', 'sudo nmap -sS -sV 10.10.10.20', '-sS necesita root porque fabrica los paquetes a mano. -sV pregunta la versión de cada servicio.'],
  ['tc-pcap', 'f1-tcp', 'Leer una captura de tráfico guardada.', 'tcpdump -r captura.pcap', 'Leer no necesita sudo; capturar en vivo sí.'],
  ['pi-ttl', 'f1-ping', 'Un ping devuelve ttl=128. Sistema más probable:', 'Windows', 'Linux y macOS suelen empezar en 64; Windows en 128.'],
  ['pi-sn', 'f1-ping', 'Descubrir qué equipos están encendidos en 10.10.10.0/24.', 'nmap -sn 10.10.10.0/24', 'Solo descubre equipos, sin escanear puertos. Mira "(N hosts up)" al final.'],
  ['pi-trace', 'f1-ping', 'Ver los routers por los que pasan tus paquetes.', 'traceroute destino', 'El salto 1 es tu router. Los * * * son routers que no responden.'],
  ['pi-c', 'f1-ping', 'Hacer ping solo 4 veces en Linux o Mac.', 'ping -c 4 destino', 'Sin -c, en Linux y Mac no para hasta que pulsas Ctrl+C.'],
  ['pe-id', 'f1-permisos', 'Ver tu usuario y a qué grupos perteneces.', 'id', 'Si estás en el grupo sudo, puedes actuar como administrador.'],
  ['pe-600', 'f1-permisos', 'Que solo el dueño pueda leer y escribir secreto.txt.', 'chmod 600 secreto.txt', '6 = r(4) + w(2) para el dueño; 0 para el grupo y para el resto.'],
  ['pe-755', 'f1-permisos', 'rwxr-xr-x en números.', '755', 'rwx = 7, r-x = 5, r-x = 5.'],
  ['pe-shadow', 'f1-permisos', '¿Qué guarda /etc/shadow?', 'Los hashes de las contraseñas', 'Solo root puede leerlo. Si lo lee un atacante, intentará romper los hashes.'],
  ['pe-least', 'f1-permisos', 'Principio de dar a cada usuario solo los permisos que necesita.', 'Mínimo privilegio', 'Se aplica a usuarios, tokens de API, servicios… y a las cuentas de base de datos de tus apps.'],
  ['l-ps', 'f1-logs', 'Ver todos los procesos con su uso de CPU y memoria.', 'ps aux', 'Busca nombres raros o un %CPU disparado.'],
  ['l-kill', 'f1-logs', 'Detener el proceso con PID 4242.', 'kill 4242', 'Si no obedece: kill -9 4242 (lo fuerza).'],
  ['l-tail', 'f1-logs', 'Ver las últimas 20 líneas del log de accesos SSH.', 'tail -n 20 /var/log/auth.log', 'Con tail -f lo sigues en vivo. Úsalo con storage/logs/laravel.log en tus apps.'],
  ['l-count', 'f1-logs', 'Contar los intentos fallidos de contraseña en auth.log.', 'grep "Failed password" /var/log/auth.log | wc -l', 'grep filtra, wc -l cuenta. La tubería | pasa la salida de uno al otro.'],
  ['l-top', 'f1-logs', 'Ranking de las IPs que más aparecen en una lista.', 'sort | uniq -c | sort -rn', 'uniq solo junta líneas seguidas: por eso primero sort.'],
  ['l-acc', 'f1-logs', '¿Cómo compruebas si el atacante llegó a entrar por SSH?', 'grep Accepted /var/log/auth.log', 'Las líneas "Accepted" son accesos que tuvieron éxito.'],
  ['l-ir', 'f1-logs', 'Primer paso al confirmar que un atacante tiene acceso root.', 'Contener: aislar el equipo de la red', 'Después: cambiar credenciales, bloquear la IP, investigar y restaurar. Nunca borrar los logs.'],
  ['w-445', 'f1-windows', 'Puerto 445.', 'SMB (carpetas compartidas de Windows)', 'WannaCry se propagó por una vulnerabilidad de SMB.'],
  ['w-da', 'f1-windows', 'Grupo de Active Directory que es el objetivo final de casi todos los ataques.', 'Domain Admins', 'Quien está en él controla todo el dominio.'],
  ['w-dc', 'f1-windows', '¿Qué es un controlador de dominio?', 'El servidor que guarda AD y autentica a todos', 'Si cae en manos de un atacante, cae toda la empresa.'],
  ['py-run', 'f1-python', 'Ejecutar el script contar_ips.py.', 'python3 scripts/contar_ips.py', 'Automatizar un análisis lo hace repetible en segundos y sin errores.'],
  ['py-re', 'f1-python', '¿Qué es una expresión regular?', 'Un patrón de búsqueda de texto', 'Con ella sacas IPs, usuarios o fechas de un log aunque cambien de columna.'],
];
const BY = Object.fromEntries(CARDS.map(c => [c[0], c]));

const CL = () => global.CL;
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const addDays = (ds, n) => { const [y, m, d] = ds.split('-').map(Number); const t = new Date(y, m - 1, d + n); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); };
const escH = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function st() {
  const p = CL().prog; if (!p.review) p.review = { c: {}, all: false, days: [], newDay: '', newCount: 0 };
  const r = p.review; r.c = r.c || {}; r.days = r.days || []; return r;
}
const lessonDone = id => { const c = CL().prog.course; return !!(c && c.l && c.l[id] && c.l[id].done); };
const unlocked = () => CARDS.filter(c => st().all || lessonDone(c[1]));
function queue() {
  const r = st(), t = today();
  if (r.newDay !== t) { r.newDay = t; r.newCount = 0; }
  const due = unlocked().filter(c => r.c[c[0]] && r.c[c[0]].due <= t).sort((a, b) => r.c[a[0]].due.localeCompare(r.c[b[0]].due));
  const fresh = unlocked().filter(c => !r.c[c[0]]).slice(0, Math.max(0, NEW_PER_DAY - r.newCount));
  return { due, fresh };
}
function counts() { const q = queue(); return { due: q.due.length, fresh: q.fresh.length, total: q.due.length + q.fresh.length }; }

// Calcula el siguiente estado sin guardarlo (para mostrar "1 día", "4 días"… en los botones)
function next(s, g) {
  s = Object.assign({ ivl: 0, ease: 2.5, reps: 0, lapses: 0 }, s || {});
  let ivl;
  if (g === 0) { ivl = 0; s.lapses++; s.ease = Math.max(1.3, s.ease - 0.2); }
  else if (g === 1) { ivl = Math.max(1, Math.round((s.ivl || 1) * 1.2)); s.ease = Math.max(1.3, s.ease - 0.15); }
  else if (g === 2) { ivl = s.ivl ? Math.round(s.ivl * s.ease) : 1; }
  else { ivl = s.ivl ? Math.round(s.ivl * s.ease * 1.3) : 4; s.ease += 0.15; }
  if (g > 0 && s.ivl && ivl <= s.ivl) ivl = s.ivl + 1;
  s.ivl = ivl; s.reps++; s.due = addDays(today(), ivl);
  return s;
}
const ivlLabel = n => n === 0 ? 'hoy' : n === 1 ? '1 día' : n < 30 ? n + ' días' : Math.round(n / 30) + ' mes' + (Math.round(n / 30) > 1 ? 'es' : '');

/* ---------------- Vista ---------------- */
let root = null, session = null, shown = false;

function stats() {
  const r = st(), u = unlocked(), seen = u.filter(c => r.c[c[0]]);
  const mastered = seen.filter(c => r.c[c[0]].ivl >= 21).length;
  return { unlocked: u.length, total: CARDS.length, seen: seen.length, mastered, streak: streak() };
}
function streak() {
  const days = new Set(st().days); let n = 0, d = today();
  if (!days.has(d)) d = addDays(d, -1);
  while (days.has(d)) { n++; d = addDays(d, -1); }
  return n;
}

function render(container) {
  root = container;
  const c = counts();
  if (!session || session.done) session = { list: queue().due.concat(queue().fresh).map(x => x[0]), i: 0, n: 0, again: [], done: false };
  const s = stats();
  root.innerHTML = `
    <div class="tiles">
      <div class="tile"><span class="k">Para hoy</span><span class="v">${c.total}</span></div>
      <div class="tile"><span class="k">Dominadas (21+ días)</span><span class="v">${s.mastered}<span class="muted" style="font-size:20px">/${s.unlocked}</span></span></div>
      <div class="tile"><span class="k">Desbloqueadas</span><span class="v">${s.unlocked}<span class="muted" style="font-size:20px">/${s.total}</span></span></div>
      <div class="tile"><span class="k">Racha de días</span><span class="v">${s.streak}</span></div>
    </div>
    <section class="card rv" id="rv-card"></section>
    <section class="card"><h3>Cómo funciona</h3>
      <p class="muted" style="max-width:68ch">Lee la pregunta, <b>piensa la respuesta antes de darle la vuelta</b> y sé honesto al calificarte. Lo que fallas vuelve pronto; lo que dominas, cada vez más tarde. Cada lección del curso que completas desbloquea sus tarjetas. Atajos: <kbd>Espacio</kbd> mostrar respuesta, <kbd>1</kbd>–<kbd>4</kbd> calificar.</p>
      <label class="rv-all"><input type="checkbox" id="rv-all" ${st().all ? 'checked' : ''}> Incluir tarjetas de lecciones que aún no he hecho</label>
    </section>`;
  root.querySelector('#rv-all').addEventListener('change', e => { st().all = e.target.checked; CL().save(); session = null; render(root); global.Review.badge(); });
  paintCard();
}

function paintCard() {
  const box = root.querySelector('#rv-card');
  const id = session.list[session.i];
  if (!id) {
    const any = unlocked().length;
    const nextDue = Object.values(st().c).map(x => x.due).filter(d => d > today()).sort()[0];
    box.innerHTML = any
      ? `<div class="rv-empty"><h2>Hecho por hoy</h2><p class="muted">${nextDue ? 'Las siguientes tarjetas te esperan el ' + new Date(nextDue + 'T12:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }) + '.' : 'No hay más tarjetas pendientes.'} Sigue con el curso para desbloquear más.</p><div class="row"><a class="btn" href="#curso">Ir al curso</a></div></div>`
      : `<div class="rv-empty"><h2>Aún no tienes tarjetas</h2><p class="muted">Se desbloquean al completar lecciones del curso. También puedes marcar abajo "Incluir tarjetas de lecciones que aún no he hecho".</p><div class="row"><a class="btn" href="#curso">Empezar el curso</a></div></div>`;
    session.done = true; global.Review.badge(); return;
  }
  const c = BY[id], s = st().c[id];
  const isCmd = /^[a-z0-9]/.test(c[3]) && !/\s(→|=|·)\s/.test(c[3]) && /^(pwd|ls|cat|cd|ip|curl|ipcalc|nslookup|dig|ss|sudo|tcpdump|nmap|traceroute|ping|id|chmod|ps|kill|tail|grep|sort|python3)\b/.test(c[3]);
  const lesson = global.Course && global.Course.LESSONS.find(l => l.id === c[1]);
  shown = false;
  box.innerHTML = `
    <div class="rv-top"><span class="eyebrow">${escH(lesson ? lesson.title : '')}</span><span class="muted">${session.i + 1} de ${session.list.length}${s ? '' : ' · <span class="pill estudiando">Nueva</span>'}</span></div>
    <div class="rv-q">${escH(c[2])}</div>
    <div class="rv-a" id="rv-a" hidden>
      <div class="rv-ans ${isCmd ? 'cmd' : ''}">${escH(c[3])}</div>
      <p class="muted">${escH(c[4])}</p>
      ${isCmd ? `<div class="row"><button class="btn ghost" type="button" id="rv-try">Probar en la terminal →</button></div>` : ''}
    </div>
    <div class="row" id="rv-show-row"><button class="btn" type="button" id="rv-show">Mostrar respuesta <kbd>Espacio</kbd></button></div>
    <div class="rv-grades" id="rv-grades" hidden>
      ${['Otra vez', 'Difícil', 'Bien', 'Fácil'].map((t, g) => `<button type="button" class="rvg g${g}" data-g="${g}"><b>${t}</b><span>${g === 0 ? 'en esta sesión' : ivlLabel(next(s, g).ivl)}</span><kbd>${g + 1}</kbd></button>`).join('')}
    </div>`;
  box.querySelector('#rv-show').addEventListener('click', reveal);
  box.querySelectorAll('.rvg').forEach(b => b.addEventListener('click', () => grade(+b.dataset.g)));
  const tr = box.querySelector('#rv-try'); if (tr) tr.addEventListener('click', () => global.Course && global.Course.tryInTerminal(c[3]));
  box.querySelector('#rv-show').focus({ preventScroll: true });
}
// Una sola entrada por día en Resultados, que va sumando las tarjetas repasadas
function logOne() {
  const r = st(), t = today();
  if (!r.days.includes(t)) { r.days.push(t); r.days = r.days.slice(-400); }
  const log = CL().prog.log, ex = log.find(e => e.kind === 'repaso' && e.date === t);
  const total = (ex ? ex.cards : 0) + 1, title = `Repaso: ${total} tarjeta${total === 1 ? '' : 's'}`;
  if (ex) { ex.cards = total; ex.title = title; }
  else CL().addLog({ type: 'estudio', kind: 'repaso', cards: total, title, note: 'Repetición espaciada de comandos y conceptos' });
}
function reveal() {
  if (shown || !root) return; shown = true;
  root.querySelector('#rv-a').hidden = false; root.querySelector('#rv-show-row').hidden = true; root.querySelector('#rv-grades').hidden = false;
  const g = root.querySelector('.rvg.g2'); if (g) g.focus({ preventScroll: true });
}
function grade(g) {
  if (!shown) return;
  const id = session.list[session.i], r = st(), isNew = !r.c[id];
  r.c[id] = next(r.c[id], g);
  if (isNew) r.newCount++;
  if (g === 0) session.list.push(id); // vuelve al final de esta sesión
  session.i++; session.n++;
  logOne();
  CL().save(); paintCard(); global.Review.badge();
}

document.addEventListener('keydown', e => {
  if (!root || root.hidden || root.closest('[hidden]')) return;
  if (e.target.closest('input, textarea, select, .term')) return;
  if (e.key === ' ' && !shown && root.querySelector('#rv-show')) { e.preventDefault(); reveal(); }
  else if (shown && /^[1-4]$/.test(e.key)) { e.preventDefault(); grade(+e.key - 1); }
});

global.Review = {
  render, CARDS, counts,
  // Tras un examen: las tarjetas de los temas fallados vuelven hoy al repaso
  boost(lessonIds) {
    const r = st(), t = today();
    CARDS.filter(c => lessonIds.includes(c[1])).forEach(c => { if (r.c[c[0]]) { r.c[c[0]].due = t; r.c[c[0]].ivl = Math.min(r.c[c[0]].ivl, 1); } });
    session = null; CL().save(); this.badge();
  },
  badge() { const b = document.getElementById('rv-badge'); if (!b || !CL()) return; const n = counts().total; b.textContent = n; b.hidden = !n; },
};
})(window);
