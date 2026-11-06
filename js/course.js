/* Cyber Lab · Curso interactivo
   Lecciones guiadas por agentes con guion propio. Cada paso es una tarea:
   - cmd:    ejecutar algo en la terminal (se comprueba con check)
   - answer: escribir una respuesta
   - choice: elegir una opción
   - read:   leer y continuar
   Preparado para conectar IA real más adelante: ver AGENT_AI abajo. */
(function (global) {
'use strict';

/* ------------------------------------------------------------------ */
/* Agentes                                                             */
/* ------------------------------------------------------------------ */
const AGENTS = {
  nova:  { name: 'Nova',  role: 'Instructora',            ini: 'N', cls: 'ag-nova' },
  marco: { name: 'Marco', role: 'Administrador de redes', ini: 'M', cls: 'ag-marco' },
  lia:   { name: 'Lía',   role: 'Analista SOC',           ini: 'L', cls: 'ag-lia' },
};
// IA: el botón "Pregúntale" llama a tu API (cyber-api.huergalabs.dev/api/ask), que es quien
// guarda la clave de Claude. Nunca pongas una API key en el navegador.
const ASK_MAX = 6; // mensajes previos que se envían como memoria de la conversación

/* ------------------------------------------------------------------ */
/* Ayudantes para comprobar comandos                                   */
/* ------------------------------------------------------------------ */
const has = (name, test) => e => e.cmds.some(c => c.name === name && (!test || test(c.args.join(' '), c)));
const line = re => e => re.test(e.line);
const ok = fn => (e, sim, mem) => e.ok !== false && fn(e, sim, mem);

/* ------------------------------------------------------------------ */
/* Contenido: Fase 1                                                   */
/* ------------------------------------------------------------------ */
const F1 = [
{
  id: 'f1-terminal', title: 'Tu primera terminal', agent: 'nova', topics: [], mins: 10,
  steps: [
    { say: 'Hola, soy **Nova** y voy a ser tu instructora. Junto a esta conversación tienes una **terminal**: es la herramienta principal de cualquier profesional de seguridad. Este laboratorio es seguro, nada de lo que escribas sale de tu navegador.\n\nEmpieza escribiendo `pwd` y pulsa Enter.',
      task: { type: 'cmd', check: has('pwd') }, hint: ['Escribe exactamente pwd en la terminal y pulsa Enter.'],
      done: '`pwd` significa *print working directory*: te dice en qué carpeta estás. Estás en **/home/alumno**, tu carpeta personal.' },
    { say: 'Ahora mira qué hay en esta carpeta con `ls`.',
      task: { type: 'cmd', check: has('ls') }, hint: ['Escribe ls y pulsa Enter.'],
      done: 'Lo que termina en **/** son carpetas. Lo demás son archivos.' },
    { say: 'Hay un archivo llamado **mision.txt**. Léelo con `cat mision.txt`.',
      task: { type: 'cmd', check: ok(has('cat', a => a.includes('mision.txt'))) }, hint: ['Escribe cat, un espacio y el nombre del archivo: cat mision.txt', 'Truco: escribe cat mi y pulsa Tab para autocompletar.'],
      done: 'Perfecto. `cat` muestra el contenido de un archivo de texto.' },
    { say: 'Dentro del archivo hay una **bandera** (en los retos de seguridad se llaman *flags*). ¿Cuál es?',
      task: { type: 'answer', accept: ['FLAG{primer_paso}'] }, hint: ['Está en la última línea del archivo y empieza por FLAG{', 'Es FLAG{primer_paso}'],
      done: '¡Tu primera flag! En plataformas como TryHackMe o Hack The Box demuestras que resolviste un reto entregando flags así.' },
    { say: 'En Linux, los archivos cuyo nombre empieza por un punto están **ocultos**: `ls` no los enseña. Usa `ls -a` para verlos todos.',
      task: { type: 'cmd', check: has('ls', a => /-\w*a/.test(a)) }, hint: ['Escribe ls -a (con un espacio antes del guion).'],
      done: 'Ahora aparecen **.bash_history** y **.pista_oculta**.' },
    { say: 'Lee el archivo oculto **.pista_oculta** y dime la flag que contiene.',
      task: { type: 'answer', accept: ['FLAG{archivos_ocultos}'] }, hint: ['Usa cat .pista_oculta (con el punto delante).', 'La flag es FLAG{archivos_ocultos}'],
      done: 'Bien. Fíjate que **.bash_history** guarda los comandos que alguien escribió: un atacante siempre lo mira.' },
    { say: 'Último paso: entra en la carpeta **scripts** con `cd scripts` y vuelve a tu carpeta con `cd ..`',
      task: { type: 'cmd', check: (e, sim, mem) => { if (e.cwd === '/home/alumno/scripts') mem.inScripts = true; return mem.inScripts && e.cwd === '/home/alumno' && has('cd')(e); } },
      hint: ['Primero cd scripts, luego cd .. (dos puntos significan "la carpeta de arriba").'],
      done: 'Fíjate en cómo cambia el texto antes del **$**: te dice en qué carpeta estás.' },
    { say: 'Pregunta rápida: ¿por qué crees que un atacante que entra en un servidor esconde sus herramientas en archivos que empiezan por punto?',
      task: { type: 'choice', options: [
        { t: 'Porque así se ejecutan más rápido', why: 'No, el punto no cambia nada en la velocidad. Solo afecta a si se muestran o no.' },
        { t: 'Porque un ls normal no los muestra y pasan desapercibidos', ok: true, why: 'Exacto. Por eso cuando investigas un equipo siempre usas ls -la.' },
        { t: 'Porque Linux los protege con contraseña', why: 'No. Un archivo oculto no tiene ninguna protección extra, solo no aparece en un ls normal.' },
      ] } },
  ],
  outro: 'Has completado tu primera lección. Ya sabes moverte por la terminal: `pwd`, `ls`, `ls -a`, `cat` y `cd`. En la siguiente, **Marco** te enseña la red de LabCorp.',
},
{
  id: 'f1-ip', title: 'IP privada, pública y NAT', agent: 'marco', topics: ['ip-nat'], mins: 10,
  steps: [
    { say: 'Hola, soy **Marco**, administro la red de LabCorp. Lo primero que hago en cualquier equipo es mirar su IP. Escribe `ip a`.',
      task: { type: 'cmd', check: e => has('ip', a => /^a(ddr)?\b/.test(a))(e) || has('ifconfig')(e) }, hint: ['Escribe ip a (también vale ifconfig, como en tu Mac).'],
      done: 'Ignora **lo**, es el loopback (el equipo hablándose a sí mismo). La interfaz real es **eth0**.' },
    { say: '¿Cuál es la IP de este equipo en **eth0**? (solo la IP, sin la barra)',
      task: { type: 'answer', accept: ['10.10.10.100'] }, hint: ['Busca la línea que empieza por inet debajo de eth0.', 'Es 10.10.10.100'],
      done: 'Correcto. Empieza por **10.**, así que es una IP **privada**: solo existe dentro de la red de LabCorp.' },
    { say: '¿Y qué prefijo (la máscara en formato /N) tiene?',
      task: { type: 'answer', accept: ['/24', '24', '255.255.255.0'] }, hint: ['Es el número que va después de la barra en 10.10.10.100/…'],
      done: '**/24** = 255.255.255.0. La red de LabCorp va de 10.10.10.1 a 10.10.10.254.' },
    { say: 'Ahora mira cómo te ve internet. Escribe `curl ifconfig.me`, que te devuelve tu IP pública.',
      task: { type: 'cmd', check: has('curl', a => a.includes('ifconfig.me')) }, hint: ['Escribe curl ifconfig.me'] },
    { say: '¿Cuál es la IP pública de LabCorp?',
      task: { type: 'answer', accept: ['203.0.113.77'] }, hint: ['Es la línea que acaba de devolver curl.', 'Es 203.0.113.77'],
      done: 'Exacto, igual que hiciste en tu Mac en la lección 1 de redes.' },
    { say: '¿Por qué la IP de **eth0** y la pública son distintas?',
      task: { type: 'choice', options: [
        { t: 'Porque el router hace NAT: todos los equipos de la red salen a internet con una sola IP pública', ok: true, why: 'Eso es. Las IPs privadas no se enrutan en internet, así que el router las traduce.' },
        { t: 'Porque una es IPv4 y la otra IPv6', why: 'No. Las dos son IPv4. La diferencia es privada (dentro) frente a pública (fuera).' },
        { t: 'Porque curl usa una VPN', why: 'No hay ninguna VPN aquí. Es el NAT del router.' },
      ] } },
    { say: 'Pregunta de seguridad: un atacante en internet, ¿puede conectarse directamente a **10.10.10.100**?',
      task: { type: 'choice', options: [
        { t: 'Sí, cualquier IP es accesible desde internet', why: 'No. Las IPs privadas (10.x, 192.168.x, 172.16–31.x) no se enrutan en internet.' },
        { t: 'No directamente, salvo que el router reenvíe un puerto (port forwarding) o el atacante ya esté dentro de la red', ok: true, why: 'Correcto. Por eso abrir puertos en el router es una decisión de seguridad, y por eso un equipo infectado dentro de la red es tan peligroso.' },
      ] } },
  ],
  outro: 'Ya distingues IP privada, IP pública y NAT. Marca esto como dominado en tu hoja de ruta: se ha marcado solo.',
},
{
  id: 'f1-binario', title: 'Binario y máscaras en la práctica', agent: 'nova', topics: [], mins: 8,
  steps: [
    { say: 'Las máscaras son binario puro. En la pestaña **Práctica** tienes niveles para entrenarlo. Aquí vamos a usar una herramienta real: `ipcalc`. Escribe `ipcalc 10.10.10.100/24`.',
      task: { type: 'cmd', check: has('ipcalc') }, hint: ['Escribe ipcalc 10.10.10.100/24'],
      done: 'A la derecha ves cada dirección en **binario**. El espacio separa la parte de **red** (izquierda) de la de **equipo** (derecha).' },
    { say: '¿Cuántos **unos** tiene la máscara 255.255.255.192? (puedes usar la calculadora flotante para comprobarlo)',
      task: { type: 'answer', accept: ['26', '/26'] }, hint: ['255 son 8 unos. 192 = 128 + 64, son 2 unos.', '8 + 8 + 8 + 2 = 26'],
      done: '**26** unos = **/26**.' },
    { say: 'Compruébalo: `ipcalc 10.10.10.100/26`. ¿Qué máscara en decimal te da en la línea Netmask?',
      task: { type: 'answer', accept: ['255.255.255.192'] }, hint: ['Ejecuta el comando y mira la línea Netmask:'],
      done: 'Coincide. Leer `/26` y pensar "255.255.255.192" tiene que acabar siendo automático.' },
    { say: '¿Es **255.255.0.255** una máscara válida?',
      task: { type: 'choice', options: [
        { t: 'Sí, todos los números están entre 0 y 255', why: 'No basta con eso. En binario, los unos de una máscara tienen que ir todos seguidos desde la izquierda.' },
        { t: 'No, porque en binario los unos no van seguidos', ok: true, why: 'Correcto: 11111111.11111111.00000000.11111111 tiene un hueco de ceros en medio.' },
      ] } },
  ],
  outro: 'Si aún te cuesta, entrena los niveles 1 a 6 de la pestaña **Práctica**: los temas "Binario" y "Máscaras" se marcan solos al completarlos.',
},
{
  id: 'f1-subnetting', title: 'Subnetting: dividir una red', agent: 'marco', topics: ['subnetting'], mins: 15,
  steps: [
    { say: 'LabCorp va a separar la red en trozos más pequeños: servidores, empleados, cámaras… Eso es **subnetting**.\n\nEl truco rápido: **tamaño de bloque = 256 − último octeto de la máscara que no es 255**. Para un /26 (255.255.255.192): 256 − 192 = **64**. Las subredes empiezan en 0, 64, 128, 192.',
      task: { type: 'read' } },
    { say: 'Un equipo tiene la IP **10.10.10.77/26**. ¿Cuál es su **dirección de red**?',
      task: { type: 'answer', accept: ['10.10.10.64', '10.10.10.64/26'] }, hint: ['Los bloques de /26 empiezan en 0, 64, 128 y 192. ¿En cuál cae el 77?', '77 está entre 64 y 127, así que la red es 10.10.10.64'],
      done: 'Bien. 77 cae en el bloque que empieza en 64.' },
    { say: '¿Y su **broadcast**?',
      task: { type: 'answer', accept: ['10.10.10.127'] }, hint: ['El broadcast es la última dirección del bloque: el inicio del siguiente bloque menos 1.', '128 − 1 = 127, así que 10.10.10.127'],
      done: 'Correcto.' },
    { say: '¿Cuántos **equipos usables** caben en un /26?',
      task: { type: 'answer', accept: ['62'] }, hint: ['Hay 32 − 26 = 6 bits de equipo. 2⁶ = 64 direcciones.', 'Se restan 2 (red y broadcast): 64 − 2 = 62'],
      done: '**62**. La fórmula: 2^(bits de equipo) − 2.' },
    { say: 'Compruébalo con la herramienta: `ipcalc 10.10.10.77/26`',
      task: { type: 'cmd', check: has('ipcalc', a => a.includes('/26')) }, hint: ['Escribe ipcalc 10.10.10.77/26'],
      done: 'Network, Broadcast y Hosts/Net coinciden con lo que calculaste. En un examen no tendrás ipcalc, así que el cálculo mental es lo importante.' },
    { say: 'Marco necesita una subred para **50 cámaras de seguridad**. ¿Cuál es el prefijo más pequeño que sirve? (escríbelo como /N)',
      task: { type: 'answer', accept: ['/26', '26'] }, hint: ['/27 da 30 equipos (no llega). Prueba con un bit más de equipo.', '/26 da 62 equipos, suficiente para 50.'],
      done: '**/26**. Desperdicia pocas direcciones y deja crecer un poco.' },
    { say: '¿Por qué separar las cámaras en su propia subred mejora la seguridad?',
      task: { type: 'choice', options: [
        { t: 'Porque las cámaras van más rápido', why: 'La velocidad no es el motivo principal.' },
        { t: 'Porque si hackean una cámara barata, el atacante no llega directamente a los servidores: tiene que pasar por un router con firewall', ok: true, why: 'Exacto. Esto se llama segmentación y frena el movimiento lateral.' },
        { t: 'Porque así las cámaras no necesitan contraseña', why: 'Al contrario: siguen necesitando contraseñas fuertes. La segmentación es una capa más, no sustituye a las demás.' },
      ] } },
  ],
  outro: 'Ya sabes calcular red, broadcast y equipos de una subred, y por qué segmentar es una defensa.',
},
{
  id: 'f1-dns', title: 'DNS: la agenda de internet', agent: 'lia', topics: ['dns'], mins: 12,
  steps: [
    { say: 'Hola, soy **Lía**, analista del SOC (el equipo que vigila los ataques). El DNS es lo primero que reviso en una investigación. Pregunta por la web de la empresa: `nslookup www.labcorp.local`',
      task: { type: 'cmd', check: has('nslookup') }, hint: ['Escribe nslookup www.labcorp.local'] },
    { say: '¿Qué IP tiene **www.labcorp.local**?',
      task: { type: 'answer', accept: ['10.10.10.10'] }, hint: ['Mira la línea Address que va debajo de Name.', 'Es 10.10.10.10'],
      done: 'Bien. Fíjate en **Server: 10.10.10.1**: ese es el servidor DNS al que preguntaste, el router.' },
    { say: 'Ahora usa la herramienta profesional, `dig`. Busca qué servidor recibe el correo de la empresa: `dig labcorp.local MX`',
      task: { type: 'cmd', check: has('dig', a => /mx/i.test(a)) }, hint: ['Escribe dig labcorp.local MX'] },
    { say: '¿Qué servidor gestiona el correo (registro MX)?',
      task: { type: 'answer', accept: ['mail.labcorp.local', 'mail.labcorp.local.', 'mail'] }, hint: ['Está en ANSWER SECTION, después del 10.', 'Es mail.labcorp.local'],
      done: 'Correcto. Un atacante que quiere hacer phishing o atacar el correo empieza justo por aquí.' },
    { say: 'Algunos nombres son **alias** (registros CNAME). Prueba `dig +short intranet.labcorp.local`. ¿A qué nombre apunta **intranet**?',
      task: { type: 'answer', accept: ['www.labcorp.local', 'www.labcorp.local.', 'www'] }, hint: ['Ejecuta el comando: la primera línea es el alias, la segunda la IP final.', 'Apunta a www.labcorp.local'],
      done: 'Exacto: intranet → www → 10.10.10.10.' },
    { say: 'Mira cómo sabe este equipo a quién preguntar: `cat /etc/resolv.conf`. ¿Qué IP tiene el servidor DNS (nameserver)?',
      task: { type: 'answer', accept: ['10.10.10.1'] }, hint: ['Ejecuta cat /etc/resolv.conf y busca la línea nameserver.'],
      done: 'Correcto, el router hace de DNS.' },
    { say: 'Último: ¿qué podría hacer un atacante que consigue cambiar el servidor DNS de un equipo?',
      task: { type: 'choice', options: [
        { t: 'Nada importante, el DNS solo traduce nombres', why: 'Justo por eso es grave: si controla la traducción, controla a dónde vas.' },
        { t: 'Mandarte a una web falsa idéntica a la real cuando escribes un nombre conocido (DNS spoofing)', ok: true, why: 'Exacto. Por eso HTTPS y los certificados son tan importantes: delatan la web falsa.' },
        { t: 'Apagar tu ordenador', why: 'No. Con el DNS controla a dónde te conectas, no el equipo en sí.' },
      ] } },
  ],
  outro: 'Ya sabes consultar el DNS con `nslookup` y `dig`, y entiendes los registros A, MX y CNAME.',
},
{
  id: 'f1-puertos', title: 'Puertos y servicios', agent: 'lia', topics: ['puertos'], mins: 10,
  steps: [
    { say: 'Cada servicio escucha en un **puerto**. Antes de mirar los de otros, mira los de tu propio equipo: `ss -tuln`',
      task: { type: 'cmd', check: has('ss', a => a.includes('l')) }, hint: ['Escribe ss -tuln (t=TCP, u=UDP, l=en escucha, n=números).'],
      done: 'Cada línea LISTEN es una "puerta" abierta en tu equipo.' },
    { say: 'Un puerto de **base de datos** está escuchando en **0.0.0.0** (todas las interfaces). ¿Cuál es?',
      task: { type: 'answer', accept: ['3306'] }, hint: ['MySQL usa el puerto 3306. Búscalo en la columna Local Address.'],
      done: '**3306**, MySQL. Y en 0.0.0.0, es decir, aceptando conexiones de toda la red.' },
    { say: 'Fíjate en el **8000** (tu servidor de Laravel con php artisan serve): está en **127.0.0.1**. ¿Qué diferencia hay?',
      task: { type: 'choice', options: [
        { t: '127.0.0.1 solo acepta conexiones del propio equipo; 0.0.0.0 acepta conexiones desde cualquier equipo de la red', ok: true, why: 'Exacto. Por eso una base de datos debería escuchar en 127.0.0.1 (bind-address = 127.0.0.1 en MySQL).' },
        { t: 'No hay diferencia, son dos formas de escribir lo mismo', why: 'Hay mucha diferencia: 127.0.0.1 es solo local, 0.0.0.0 es todas las interfaces.' },
      ] } },
    { say: 'Repaso de puertos que verás siempre. ¿Qué servicio usa normalmente el puerto **3389**?',
      task: { type: 'choice', options: [
        { t: 'SSH', why: 'SSH usa el 22.' }, { t: 'RDP (escritorio remoto de Windows)', ok: true, why: 'Correcto. Es un objetivo clásico de ataques de ransomware.' },
        { t: 'HTTPS', why: 'HTTPS usa el 443.' }, { t: 'DNS', why: 'DNS usa el 53.' },
      ] } },
    { say: '¿Y el **22**?',
      task: { type: 'choice', options: [
        { t: 'SSH (acceso remoto a servidores)', ok: true, why: 'Correcto. Lo verás muchísimo, y es muy atacado por fuerza bruta.' },
        { t: 'Telnet', why: 'Telnet usa el 23, y no cifra nada.' }, { t: 'SMTP (correo)', why: 'SMTP usa el 25.' },
      ] } },
  ],
  outro: 'Ya sabes ver los puertos de tu equipo con `ss -tuln` y por qué importa 127.0.0.1 frente a 0.0.0.0. Apunta en tus notas: "MySQL en 0.0.0.0 = revisar".',
},
{
  id: 'f1-tcp', title: 'TCP, el saludo de 3 pasos y Nmap', agent: 'lia', topics: ['tcp'], mins: 15,
  steps: [
    { say: 'Tengo una **captura de tráfico** guardada en tu carpeta. Léela con `tcpdump -r captura.pcap`',
      task: { type: 'cmd', check: ok(has('tcpdump', a => a.includes('-r'))) }, hint: ['Escribe tcpdump -r captura.pcap'],
      done: 'Cada línea es un paquete. Mira los **Flags**: [S] es SYN, [S.] es SYN-ACK, [.] es ACK, [R.] es RST.' },
    { say: 'Las tres primeras líneas son el **saludo de 3 pasos** hacia la web (puerto 80). ¿Qué flags lleva el **segundo** paquete, la respuesta del servidor?',
      task: { type: 'answer', accept: ['SYN-ACK', 'SYN ACK', 'SYNACK', '[S.]', 'S.', 'syn-ack'] }, hint: ['El segundo paquete tiene Flags [S.]', '[S.] significa SYN-ACK'],
      done: 'Correcto: SYN → **SYN-ACK** → ACK.' },
    { say: 'Las dos últimas líneas son un intento al puerto **8080** de 10.10.10.20. El servidor respondió **[R.]**. ¿Qué significa?',
      task: { type: 'choice', options: [
        { t: 'Que el puerto está abierto', why: 'Si estuviera abierto respondería SYN-ACK.' },
        { t: 'Que el puerto está cerrado: el equipo existe pero no hay nada escuchando (RST)', ok: true, why: 'Exacto. RST = "aquí no hay nadie".' },
        { t: 'Que un firewall lo bloqueó', why: 'Un firewall normalmente no responde nada (silencio). Responder RST es lo que hace un puerto cerrado.' },
      ] } },
    { say: 'Ahora escanea el servidor de base de datos con **Nmap**: `nmap 10.10.10.20`',
      task: { type: 'cmd', check: ok(has('nmap', a => a.includes('10.10.10.20') || a.includes('db'))) }, hint: ['Escribe nmap 10.10.10.20'],
      done: 'Sin opciones y sin ser root, Nmap hace un **escaneo de conexión completa** (completa el saludo).' },
    { say: 'Prueba el escaneo **SYN**, más rápido y discreto: `nmap -sS 10.10.10.20`. ¿Qué pasa?',
      task: { type: 'cmd', check: has('nmap', a => a.includes('-sS')) }, hint: ['Escribe nmap -sS 10.10.10.20'],
      done: 'Te lo rechaza: el SYN scan fabrica paquetes a mano y eso requiere ser **root**.' },
    { say: 'Repítelo con permisos de administrador y pidiendo las versiones: `sudo nmap -sS -sV 10.10.10.20`',
      task: { type: 'cmd', check: ok(e => e.cmds.some(c => c.name === 'nmap' && c.sudo && c.args.includes('-sS'))) }, hint: ['Escribe sudo nmap -sS -sV 10.10.10.20'] },
    { say: '¿Qué versión de **MySQL** tiene el servidor?',
      task: { type: 'answer', accept: ['5.7.29', 'mysql 5.7.29'] }, hint: ['Mira la columna VERSION de la línea 3306/tcp.', 'Es MySQL 5.7.29'],
      done: 'Una versión vieja y expuesta en la red. Con este dato, un atacante buscaría vulnerabilidades conocidas para la 5.7.29.' },
    { say: 'Ahora el servidor web, que tiene firewall: `sudo nmap -sS -p 22,80 10.10.10.10`. ¿En qué estado aparece el puerto **22**?',
      task: { type: 'answer', accept: ['filtered', 'filtrado'] }, hint: ['Ejecuta el comando y mira la columna STATE de 22/tcp.'],
      done: '**filtered**: el firewall descartó el paquete en silencio. El atacante no sabe si hay algo detrás.' },
    { say: 'Recuerda la regla de oro antes de seguir:',
      task: { type: 'choice', options: [
        { t: 'Puedo escanear cualquier IP de internet si es solo para aprender', why: 'No. Escanear sin permiso puede ser ilegal aunque la intención sea buena.' },
        { t: 'Solo escaneo equipos míos, laboratorios o con autorización por escrito', ok: true, why: 'Eso es. En un pentest real, el alcance autorizado se firma antes de empezar.' },
      ] } },
  ],
  outro: 'Has leído tráfico real con `tcpdump` y usado Nmap como un profesional. Los estados **open / closed / filtered** ya no tienen secretos.',
},
{
  id: 'f1-ping', title: 'Ping, TTL y descubrir equipos', agent: 'marco', topics: [], mins: 10,
  steps: [
    { say: 'Haz ping al servidor de archivos: `ping -c 4 10.10.10.30`',
      task: { type: 'cmd', check: ok(has('ping', a => a.includes('10.10.10.30') || a.includes('files'))) }, hint: ['Escribe ping -c 4 10.10.10.30'] },
    { say: '¿Qué **TTL** devuelve?',
      task: { type: 'answer', accept: ['128', 'ttl=128'] }, hint: ['Busca ttl= en cada línea de respuesta.'],
      done: '**128**.' },
    { say: 'Sabiendo que Linux suele empezar con TTL 64 y Windows con 128, ¿qué sistema tendrá ese servidor?',
      task: { type: 'choice', options: [
        { t: 'Linux', why: 'Linux suele responder con 64 (o un poco menos si hay routers en medio).' },
        { t: 'Windows', ok: true, why: 'Muy probablemente. Lo confirmaremos en la lección de Windows: tiene los puertos 445 y 3389 abiertos.' },
        { t: 'No se puede saber nada', why: 'No es una prueba definitiva, pero el TTL es una pista muy buena.' },
      ] } },
    { say: 'Ahora descubre **todos los equipos encendidos** de la red: `nmap -sn 10.10.10.0/24` (-sn = solo descubrir, sin escanear puertos)',
      task: { type: 'cmd', check: ok(has('nmap', a => a.includes('-sn') && a.includes('/24'))) }, hint: ['Escribe nmap -sn 10.10.10.0/24'] },
    { say: '¿Cuántos equipos están encendidos (hosts up)?',
      task: { type: 'answer', accept: ['7'] }, hint: ['Mira la última línea: (N hosts up).'],
      done: '**7**, incluido tu propio equipo. Ese es el mapa de la red de LabCorp.' },
    { say: 'Por último, el camino hacia fuera: `traceroute huergalabs.dev`. ¿Cuál es la IP del **primer salto**?',
      task: { type: 'answer', accept: ['10.10.10.1'] }, hint: ['Ejecuta traceroute huergalabs.dev y mira la línea 1.'],
      done: 'El router, igual que en tu casa. Los `* * *` son routers que no responden, como viste en tu Mac.' },
  ],
  outro: 'Ya sabes descubrir equipos, adivinar el sistema con el TTL y seguir el camino de tus paquetes.',
},
{
  id: 'f1-permisos', title: 'Linux: usuarios y permisos', agent: 'nova', topics: [], mins: 12,
  steps: [
    { say: '¿Con qué usuario estás conectado? Escribe `id`',
      task: { type: 'cmd', check: e => has('id')(e) || has('whoami')(e) }, hint: ['Escribe id'],
      done: 'Eres **alumno** y perteneces al grupo **sudo**: puedes ejecutar comandos como administrador.' },
    { say: 'Mira los permisos de tus archivos con `ls -l`',
      task: { type: 'cmd', check: has('ls', a => /-\w*l/.test(a)) }, hint: ['Escribe ls -l'],
      done: 'La primera columna son los permisos: **rwx** para el dueño, el grupo y el resto. r = leer, w = escribir, x = ejecutar.' },
    { say: '¿Qué permisos tiene **secreto.txt**? Escríbelos como aparecen, por ejemplo -rw-r--r--',
      task: { type: 'answer', accept: ['-rw-rw-rw-', 'rw-rw-rw-', '666'] }, hint: ['Busca la línea de secreto.txt en la salida de ls -l.'],
      done: '**rw-rw-rw-**, que en números es **666**: cualquier usuario del sistema puede leerlo y modificarlo.' },
    { say: 'Y dentro hay una contraseña. Arréglalo para que **solo tú** puedas leer y escribir: `chmod 600 secreto.txt`',
      task: { type: 'cmd', check: (e, sim) => { const n = sim.node('/home/alumno/secreto.txt'); return !!n && n.perm === '600'; } },
      hint: ['Escribe chmod 600 secreto.txt', '6 = leer (4) + escribir (2) para el dueño; 0 para el grupo; 0 para el resto.'],
      done: 'Compruébalo con `ls -l`: ahora es **-rw-------**.' },
    { say: 'En números, ¿qué permisos son **rwxr-xr-x**? (típico de scripts y carpetas)',
      task: { type: 'answer', accept: ['755'] }, hint: ['r=4, w=2, x=1. Suma cada grupo de tres.', 'rwx = 7, r-x = 5, r-x = 5 → 755'],
      done: '**755**: el dueño hace de todo; los demás pueden leer y ejecutar.' },
    { say: 'Intenta leer las contraseñas del sistema: `cat /etc/shadow`',
      task: { type: 'cmd', check: has('cat', a => a.includes('/etc/shadow')) }, hint: ['Escribe cat /etc/shadow'],
      done: '**Permission denied**. Bien: solo root puede leerlo.' },
    { say: 'Con `sudo cat /etc/shadow` sí podrías. ¿Por qué es peligroso que un atacante consiga una cuenta con permisos de sudo?',
      task: { type: 'choice', options: [
        { t: 'Porque sudo hace el equipo más lento', why: 'No tiene nada que ver con la velocidad.' },
        { t: 'Porque con sudo puede hacer cualquier cosa como root: leer contraseñas, instalar malware, borrar logs', ok: true, why: 'Exacto. Por eso se aplica el **mínimo privilegio**: cada usuario solo con los permisos que necesita.' },
      ] } },
  ],
  outro: 'Ya entiendes usuarios, grupos y permisos, y arreglaste tu primer fallo de seguridad real.',
},
{
  id: 'f1-logs', title: 'Investigación: procesos y logs', agent: 'lia', topics: ['linux'], mins: 18,
  steps: [
    { say: 'Alerta en el SOC: **este equipo va muy lento**. Lo primero, mira qué procesos se están ejecutando: `ps aux`',
      task: { type: 'cmd', check: has('ps') }, hint: ['Escribe ps aux'] },
    { say: 'Hay un proceso usando casi el **100 % de la CPU**. ¿Cómo se llama el programa?',
      task: { type: 'answer', accept: [/xmrig/i] }, hint: ['Mira la columna %CPU: uno tiene 98.7.', 'Es /tmp/.cache/xmrig'],
      done: '**xmrig** es un minero de criptomonedas. Alguien está usando tu equipo para minar. Y fíjate dónde se esconde: en una carpeta oculta dentro de /tmp.' },
    { say: 'Detenlo. Su PID es el número de la segunda columna: `kill 4242`',
      task: { type: 'cmd', check: (e, sim) => !sim.procs.some(p => p.pid === 4242) }, hint: ['Escribe kill 4242', 'Si no funciona, comprueba el PID con ps aux.'],
      done: 'Proceso detenido. Pero matar el proceso no basta: hay que saber **cómo entró**.' },
    { say: 'Los accesos SSH se registran en **/var/log/auth.log**. Mira el final del archivo: `tail -n 5 /var/log/auth.log`',
      task: { type: 'cmd', check: ok(e => /auth\.log/.test(e.line) && e.cmds.some(c => ['tail', 'cat', 'grep', 'head', 'less'].includes(c.name))) }, hint: ['Escribe tail -n 5 /var/log/auth.log'] },
    { say: 'Cuenta cuántos **intentos fallidos** de contraseña hay. Encadena dos comandos con una tubería: `grep "Failed password" /var/log/auth.log | wc -l`',
      task: { type: 'answer', accept: ['42'] }, hint: ['grep filtra las líneas con ese texto y wc -l las cuenta.', 'Son 42'],
      done: '**42** intentos fallidos. Eso es un ataque de **fuerza bruta**.' },
    { say: '¿Desde qué IP vienen la mayoría de los intentos? Prueba: `grep "Failed password" /var/log/auth.log | awk \'{print $11}\' | sort | uniq -c | sort -rn`',
      task: { type: 'answer', accept: ['198.51.100.66'] }, hint: ['awk saca la columna 11 (la IP), sort las ordena, uniq -c las cuenta y sort -rn pone la más repetida arriba.', 'Es 198.51.100.66'],
      done: '**198.51.100.66**, con 38 intentos. ¿Viste la línea "pi"? En esas líneas el texto "invalid user" mueve la IP de columna. En la lección de Python lo resolvemos.' },
    { say: 'La pregunta clave: ¿consiguió entrar? Busca los accesos aceptados: `grep Accepted /var/log/auth.log`',
      task: { type: 'cmd', check: ok(has('grep', a => /accepted/i.test(a))) }, hint: ['Escribe grep Accepted /var/log/auth.log'] },
    { say: '¿El atacante consiguió entrar?',
      task: { type: 'choice', options: [
        { t: 'No, todos sus intentos fallaron', why: 'Mira la segunda línea: "Accepted password for root from 198.51.100.66".' },
        { t: 'Sí, entró como root después de los intentos fallidos', ok: true, why: 'Exacto. Y la última línea del log muestra que descargó un script (x.sh): así instaló el minero.' },
      ] } },
    { say: 'Eres la analista de guardia. ¿Qué haces **primero**?',
      task: { type: 'choice', options: [
        { t: 'Borrar el log para que no se vea el ataque', why: 'Nunca. Los logs son la evidencia de la investigación.' },
        { t: 'Aislar el equipo de la red, cambiar la contraseña de root, bloquear la IP y desactivar el acceso SSH con contraseña', ok: true, why: 'Eso es contención. Después vendría investigar qué más hizo y restaurar el equipo desde una copia limpia.' },
        { t: 'Esperar a ver si vuelve a pasar', why: 'El atacante ya tiene acceso root: cada minuto cuenta.' },
      ] } },
  ],
  outro: 'Acabas de hacer tu primera **investigación de incidente**: detectaste un minero, lo detuviste, encontraste la fuerza bruta en los logs y confirmaste el acceso. Esto es exactamente lo que hace un analista SOC.',
},
{
  id: 'f1-windows', title: 'Windows y Active Directory', agent: 'nova', topics: ['windows-ad'], mins: 12,
  steps: [
    { say: 'Casi todas las empresas usan **Windows** con **Active Directory (AD)**: un directorio central con todos los usuarios, equipos y permisos. Por eso es el objetivo número uno en ataques a empresas.\n\nEscanea el servidor de archivos de LabCorp: `nmap 10.10.10.30`',
      task: { type: 'cmd', check: ok(has('nmap', a => a.includes('10.10.10.30') || a.includes('files'))) }, hint: ['Escribe nmap 10.10.10.30'] },
    { say: 'El puerto **445** (microsoft-ds) es **SMB**: carpetas compartidas de Windows. ¿Qué otro puerto típico de Windows ves abierto, el del escritorio remoto?',
      task: { type: 'answer', accept: ['3389'] }, hint: ['Es ms-wbt-server.', 'Es el 3389 (RDP)'],
      done: '**3389**, RDP. SMB y RDP expuestos son la puerta de entrada de muchos ataques de ransomware, como WannaCry, que usó una vulnerabilidad de SMB.' },
    { say: 'En Active Directory, ¿qué es un **controlador de dominio**?',
      task: { type: 'choice', options: [
        { t: 'El servidor que guarda la base de datos de AD y autentica a todos los usuarios y equipos', ok: true, why: 'Exacto. Si un atacante lo controla, controla toda la empresa.' },
        { t: 'Un router que reparte IPs', why: 'Eso es un servidor DHCP.' },
        { t: 'El antivirus de Windows', why: 'No. Defender es el antivirus; el controlador de dominio es el corazón de AD.' },
      ] } },
    { say: 'En AD los permisos se dan a **grupos**, no usuario por usuario. ¿Qué grupo es el más peligroso si un atacante consigue entrar en él?',
      task: { type: 'choice', options: [
        { t: 'Domain Users', why: 'Ahí están todos los usuarios normales. Es el punto de partida, no la meta.' },
        { t: 'Domain Admins', ok: true, why: 'Exacto. Domain Admins es el objetivo final de casi todos los ataques a empresas.' },
        { t: 'Guests', why: 'Guests (invitados) tiene muy pocos permisos.' },
      ] } },
    { say: 'Un empleado de LabCorp abre un correo de phishing y su PC queda infectado. ¿Por qué no debería usar una cuenta de administrador para su trabajo diario?',
      task: { type: 'choice', options: [
        { t: 'Porque el malware se ejecuta con los permisos del usuario: si es administrador, el malware también lo es', ok: true, why: 'Exacto. Mínimo privilegio otra vez: cuentas normales para el día a día y cuentas de administrador solo cuando hace falta.' },
        { t: 'Porque las cuentas de administrador no pueden leer correo', why: 'Sí pueden, y ese es justo el problema.' },
      ] } },
  ],
  outro: 'Ya sabes qué es Active Directory, por qué se ataca tanto y qué puertos delatan a un servidor Windows. Lo practicaremos a fondo en fases posteriores.',
},
{
  id: 'f1-python', title: 'Python para automatizar', agent: 'lia', topics: ['python'], mins: 12,
  steps: [
    { say: 'En la investigación, awk se lió con las líneas "invalid user". Los analistas automatizan estas tareas con **Python**. Mira el script que preparé: `cat scripts/contar_ips.py`',
      task: { type: 'cmd', check: ok(has('cat', a => a.includes('contar_ips'))) }, hint: ['Escribe cat scripts/contar_ips.py'] },
    { say: 'La línea con **re.compile** es una **expresión regular**: un patrón de búsqueda. La parte `(?:invalid user )?` es opcional. ¿Para qué sirve?',
      task: { type: 'choice', options: [
        { t: 'Para que también capture la IP en las líneas que dicen "invalid user", donde la IP está en otra columna', ok: true, why: 'Exacto. Por eso Python es más fiable que contar columnas con awk.' },
        { t: 'Para ignorar los usuarios inválidos', why: 'Al contrario: hace que esas líneas también cuenten, sacando bien la IP.' },
      ] } },
    { say: 'Ejecútalo: `python3 scripts/contar_ips.py`',
      task: { type: 'cmd', check: ok(has('python3', a => a.includes('contar_ips'))) }, hint: ['Escribe python3 scripts/contar_ips.py'] },
    { say: 'Ahora sí aparece bien la segunda IP. ¿Cuál es y cuántos intentos hizo? Escribe solo la IP.',
      task: { type: 'answer', accept: ['203.0.113.9'] }, hint: ['Es la segunda línea de la salida.'],
      done: '**203.0.113.9**, con 4 intentos con el usuario "pi" (el usuario por defecto de las Raspberry Pi: los bots lo prueban siempre).' },
    { say: '¿Por qué merece la pena aprender Python para seguridad, si ya sabes usar grep y awk?',
      task: { type: 'choice', options: [
        { t: 'Porque con un script repites el análisis en segundos sobre miles de logs, sin errores, y puedes combinarlo con otras herramientas', ok: true, why: 'Exacto. Y tú ya programas: aquí tienes ventaja sobre la mayoría de la gente que empieza.' },
        { t: 'Porque grep y awk están prohibidos en las empresas', why: 'No, se usan todos los días. Python es para lo que se repite o es más complejo.' },
      ] } },
  ],
  outro: 'Cierras la Fase 1 de contenido. Te queda el **examen de la fase** para demostrar que lo dominas.',
},
{
  id: 'f1-examen', title: 'Examen de la Fase 1', agent: 'nova', topics: [], mins: 15, exam: true, pass: 80,
  steps: [
    { say: 'Examen final de la Fase 1: **12 preguntas** elegidas al azar de todos los temas, y los cálculos de subredes cambian de números en cada intento. Necesitas un **80 %** para aprobar. No hay pistas y cada pregunta tiene un solo intento. Al final verás tu resultado por tema.', task: { type: 'read', label: 'Empezar el examen' } },
  ],
  outro: '',
},
];


/* ------------------------------------------------------------------ */
/* Banco del examen de la Fase 1                                       */
/* ------------------------------------------------------------------ */
const TOPICS = {
  terminal: ['Terminal', 'f1-terminal'], ip: ['IP y NAT', 'f1-ip'], bin: ['Binario y máscaras', 'f1-binario'],
  sub: ['Subnetting', 'f1-subnetting'], dns: ['DNS', 'f1-dns'], ports: ['Puertos', 'f1-puertos'], tcp: ['TCP y Nmap', 'f1-tcp'],
  ping: ['Ping y descubrimiento', 'f1-ping'], perm: ['Permisos Linux', 'f1-permisos'], logs: ['Logs y procesos', 'f1-logs'],
  win: ['Windows y AD', 'f1-windows'], py: ['Python', 'f1-python'],
};
// [tema, pregunta, [correcta, distractor, distractor, ...], explicación]  (la primera opción es la correcta; se mezclan al mostrar)
const BANK_F1 = [
  ['terminal', '¿Qué comando muestra también los archivos ocultos?', ['ls -a', 'ls -h', 'cat -a', 'pwd -a'], 'La opción -a (all) incluye los archivos que empiezan por punto.'],
  ['terminal', '¿Qué hace "cd .."?', ['Sube a la carpeta padre', 'Vuelve a tu carpeta personal', 'Borra la carpeta actual', 'Muestra la carpeta actual'], '".." es siempre la carpeta de arriba.'],
  ['terminal', '¿Por qué un investigador revisa ~/.bash_history?', ['Guarda los comandos que alguien escribió', 'Contiene las contraseñas del sistema', 'Es el log del servidor web', 'Lista los usuarios conectados'], 'Un atacante descuidado deja ahí el rastro de lo que hizo.'],
  ['ip', '¿Qué IP es privada?', ['172.20.1.5', '8.8.8.8', '185.199.108.153', '172.32.0.1'], 'El rango privado 172 va de 172.16 a 172.31.'],
  ['ip', '¿Qué IP es privada?', ['10.200.3.7', '11.0.0.1', '100.64.0.1', '192.169.1.1'], 'Todo 10.x.x.x es privado. 192.169 no es 192.168.'],
  ['ip', '¿Qué hace el NAT del router?', ['Traduce las IPs privadas de la red a una IP pública', 'Cifra el tráfico', 'Asigna nombres a las IPs', 'Bloquea los puertos abiertos'], 'Por eso todos los equipos de tu casa salen a internet con la misma IP.'],
  ['ip', '¿Qué comando te da tu IP pública?', ['curl ifconfig.me', 'ip a', 'hostname', 'ip route'], 'ip a muestra la privada; la pública solo la ve un servidor de fuera.'],
  ['dns', '¿Qué registro DNS indica el servidor de correo de un dominio?', ['MX', 'A', 'CNAME', 'TXT'], 'MX = mail exchanger.'],
  ['dns', '¿Qué registro DNS es un alias de otro nombre?', ['CNAME', 'MX', 'NS', 'A'], 'CNAME apunta a otro nombre, que a su vez tiene su registro A.'],
  ['dns', '¿Qué archivo indica a Linux qué servidor DNS usar?', ['/etc/resolv.conf', '/etc/hosts.allow', '/etc/passwd', '/var/log/dns.log'], 'La línea nameserver de /etc/resolv.conf.'],
  ['dns', '¿Qué puede hacer un atacante que controla tu servidor DNS?', ['Mandarte a webs falsas idénticas a las reales', 'Leer los archivos de tu disco', 'Apagar tu router', 'Cambiar tu IP privada'], 'Es DNS spoofing. HTTPS y los certificados ayudan a detectarlo.'],
  ['ports', '¿Qué comando muestra los puertos que escucha tu propio equipo en Linux?', ['ss -tuln', 'nmap -sn localhost', 'ping -c 4', 'dig localhost'], 'ss -tuln: TCP, UDP, en escucha, en números.'],
  ['ports', '¿Qué servicio usa normalmente el puerto 3389?', ['RDP (escritorio remoto)', 'SSH', 'MySQL', 'HTTPS'], 'RDP expuesto es un objetivo típico de ransomware.'],
  ['ports', '¿Qué servicio usa normalmente el puerto 53?', ['DNS', 'SMTP', 'HTTP', 'SMB'], 'DNS usa el 53, sobre todo por UDP.'],
  ['ports', 'MySQL escucha en 0.0.0.0:3306 en un servidor de internet. ¿Cuál es la mejor corrección?', ['bind-address = 127.0.0.1 y firewall bloqueando el 3306', 'Cambiar el puerto a 3307', 'Usar una contraseña más larga y dejarlo así', 'Apagarlo por las noches'], 'Reducir la superficie de ataque. Cambiar el puerto solo lo esconde un poco.'],
  ['tcp', 'Envías un SYN y no recibes ninguna respuesta. Nmap marcará el puerto como…', ['filtered', 'open', 'closed', 'unknown'], 'El silencio suele ser un firewall que descarta el paquete.'],
  ['tcp', 'Envías un SYN y recibes RST. El puerto está…', ['closed', 'open', 'filtered', 'redirigido'], 'RST = "aquí no hay nadie": el equipo existe pero no hay servicio.'],
  ['tcp', '¿Por qué "nmap -sS" necesita sudo?', ['Porque fabrica los paquetes a mano (raw sockets)', 'Porque escanea más puertos', 'Porque es ilegal sin permisos', 'Porque usa UDP'], 'Crear paquetes sin completar el saludo requiere privilegios de root.'],
  ['tcp', '¿Cuál es el orden del saludo TCP?', ['SYN → SYN-ACK → ACK', 'ACK → SYN → FIN', 'SYN → ACK → RST', 'HELLO → OK → DATA'], 'En tcpdump se ve como [S], [S.], [.].'],
  ['tcp', '¿Qué opción de Nmap detecta la versión de cada servicio?', ['-sV', '-sn', '-p-', '-v'], '-sV = service version.'],
  ['ping', 'Un ping devuelve ttl=128. ¿Qué sistema es más probable?', ['Windows', 'Linux', 'macOS', 'Android'], 'Windows suele empezar con TTL 128; Linux y macOS con 64.'],
  ['ping', '¿Qué hace "nmap -sn 10.10.10.0/24"?', ['Descubre qué equipos están encendidos, sin escanear puertos', 'Escanea todos los puertos de la red', 'Detecta versiones', 'Apaga los equipos'], '-sn = solo descubrimiento.'],
  ['ping', 'En un traceroute, ¿qué significa "* * *"?', ['Ese router no respondió a las sondas', 'Se cortó la conexión', 'El destino no existe', 'Hay un error de DNS'], 'Muchos routers descartan los paquetes de traceroute por seguridad.'],
  ['perm', '¿Qué permisos tiene un archivo con chmod 640?', ['rw-r-----', 'rwxr--r--', 'rw-rw-rw-', 'r--r-----'], '6 = rw-, 4 = r--, 0 = ---.'],
  ['perm', '¿Qué número equivale a rwxr-xr-x?', ['755', '644', '777', '711'], 'rwx = 7, r-x = 5, r-x = 5.'],
  ['perm', '¿Qué guarda /etc/shadow?', ['Los hashes de las contraseñas', 'Los usuarios y sus carpetas', 'Los logs de acceso', 'Los permisos de sudo'], 'Solo root puede leerlo.'],
  ['perm', '¿Qué es el principio de mínimo privilegio?', ['Dar a cada usuario solo los permisos que necesita', 'Usar siempre root para no tener errores', 'Tener una sola cuenta compartida', 'Quitar todas las contraseñas'], 'Limita el daño si una cuenta queda comprometida.'],
  ['logs', '¿Qué comando cuenta cuántas líneas de un log contienen "Failed"?', ['grep "Failed" auth.log | wc -l', 'cat auth.log | sort', 'ls -l auth.log', 'tail auth.log'], 'grep filtra y wc -l cuenta.'],
  ['logs', '¿Por qué se pone sort antes de uniq -c?', ['uniq solo junta líneas iguales que estén seguidas', 'sort borra las líneas vacías', 'uniq no funciona sin sort', 'Para ordenar el resultado final'], 'Sin ordenar, la misma IP aparecería varias veces separada.'],
  ['logs', 'Confirmas que un atacante entró como root. ¿Qué haces primero?', ['Aislar el equipo de la red (contención)', 'Borrar los logs', 'Esperar a ver si vuelve', 'Reiniciar el equipo y seguir trabajando'], 'Contener primero; después credenciales, investigación y restauración.'],
  ['logs', 'Un proceso usa el 99 % de la CPU. ¿Cómo lo encuentras?', ['ps aux', 'ss -tuln', 'id', 'dig'], 'ps aux muestra %CPU y %MEM de cada proceso.'],
  ['win', 'En Active Directory, ¿qué grupo es el objetivo final típico de un atacante?', ['Domain Admins', 'Domain Users', 'Guests', 'Print Operators'], 'Domain Admins controla todo el dominio.'],
  ['win', '¿Qué servicio de Windows usa el puerto 445?', ['SMB (carpetas compartidas)', 'RDP', 'DNS', 'LDAP'], 'WannaCry se propagó por una vulnerabilidad de SMB.'],
  ['win', '¿Qué es un controlador de dominio?', ['El servidor que guarda AD y autentica a usuarios y equipos', 'Un router de la empresa', 'El antivirus de Windows', 'Una cuenta de administrador local'], 'Si lo controla un atacante, controla toda la empresa.'],
  ['py', '¿Por qué automatizar un análisis de logs con Python?', ['Se repite en segundos, sin errores, sobre miles de líneas', 'Porque grep no funciona en servidores', 'Porque Python cifra los logs', 'Para que el log ocupe menos'], 'grep y awk siguen siendo útiles; Python es para lo repetitivo o complejo.'],
  ['py', '¿Qué es una expresión regular?', ['Un patrón para buscar texto', 'Un tipo de base de datos', 'Un comando de red', 'Un formato de log'], 'Permite sacar IPs, usuarios o fechas aunque cambien de posición.'],
];

/* Preguntas generadas: números distintos en cada intento */
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const ipS = n => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
const mk = c => c === 0 ? 0 : (0xFFFFFFFF << (32 - c)) >>> 0;
function rndIP(c) {
  const k = rnd(0, 2); const base = k === 0 ? [192, 168, rnd(0, 255)] : k === 1 ? [10, rnd(0, 255), rnd(0, 255)] : [172, rnd(16, 31), rnd(0, 255)];
  return ((base[0] << 24) | (base[1] << 16) | (base[2] << 8) | rnd(1, 254)) >>> 0;
}
const uniq = (arr, n) => { const out = []; for (const x of arr) if (!out.includes(x)) out.push(x); return out.slice(0, n); };
const GEN = {
  net() {
    const c = rnd(25, 30), ip = rndIP(c), net = (ip & mk(c)) >>> 0, bc = (net | (~mk(c) >>> 0)) >>> 0, size = 2 ** (32 - c);
    const d = uniq([ipS(net), ipS(bc), ipS((ip & 0xFFFFFF00) >>> 0), ipS((net + size) >>> 0), ipS(Math.max(0, net - size) >>> 0), ipS((net + 1) >>> 0)], 4);
    return ['sub', `¿Cuál es la dirección de red de ${ipS(ip)}/${c}?`, d, `Bloque de ${size}: ${ip & 255} cae en el bloque que empieza en ${net & 255}. Red ${ipS(net)}, broadcast ${ipS(bc)}.`];
  },
  bc() {
    const c = rnd(25, 30), ip = rndIP(c), net = (ip & mk(c)) >>> 0, bc = (net | (~mk(c) >>> 0)) >>> 0, size = 2 ** (32 - c);
    const d = uniq([ipS(bc), ipS(net), ipS((bc - 1) >>> 0), ipS((ip | 255) >>> 0), ipS((bc + size) >>> 0)], 4);
    return ['sub', `¿Cuál es el broadcast de ${ipS(ip)}/${c}?`, d, `Bloque de ${size}: la red empieza en ${net & 255}, así que el broadcast es la última dirección: ${bc & 255}.`];
  },
  hosts() {
    const c = rnd(20, 30), h = 2 ** (32 - c) - 2;
    const d = uniq([h, h + 2, h + 1, 2 ** (31 - c) - 2, 2 ** (33 - c) - 2].filter(x => x > 0).map(String), 4);
    return ['sub', `¿Cuántos equipos usables tiene una red /${c}?`, d, `2^${32 - c} = ${h + 2} direcciones − 2 (red y broadcast) = ${h}.`];
  },
  min() {
    const N = rnd(5, 1500); let c = 30; while (2 ** (32 - c) - 2 < N) c--;
    const d = uniq(['/' + c, '/' + (c + 1), '/' + (c - 1), '/' + (c - 2), '/' + (c + 2)].filter(x => +x.slice(1) <= 30 && +x.slice(1) >= 16), 4);
    return ['sub', `Necesitas una subred para ${N} equipos. ¿Cuál es el prefijo más pequeño que sirve?`, d, `/${c + 1} da ${2 ** (31 - c) - 2} equipos (no llega); /${c} da ${2 ** (32 - c) - 2}.`];
  },
  mask() {
    const c = rnd(17, 30), m = ipS(mk(c));
    const d = uniq([m, ipS(mk(c + 1 > 30 ? c - 2 : c + 1)), ipS(mk(c - 1)), ipS(mk(c - 8 > 8 ? c - 8 : c + 2))], 4);
    return ['bin', `¿Qué máscara decimal corresponde a /${c}?`, d, `/${c} = ${c} unos seguidos: ${m}.`];
  },
  cidr() {
    const c = rnd(17, 30), m = ipS(mk(c));
    const d = uniq(['/' + c, '/' + (c + 1), '/' + (c - 1), '/' + (c >= 24 ? c - 8 : c + 8)].filter(x => +x.slice(1) <= 32), 4);
    return ['bin', `¿Qué prefijo CIDR tiene la máscara ${m}?`, d, `Cuenta los unos de cada octeto: ${m.split('.').map(o => (+o).toString(2).replace(/0/g, '').length).join(' + ')} = ${c}.`];
  },
};
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function buildExam(total) {
  const gen = shuffle(['net', 'bc', 'hosts', 'min']).slice(0, 3).concat(shuffle(['mask', 'cidr']).slice(0, 1)).map(k => GEN[k]());
  // Estáticas: una por tema primero (en orden aleatorio) y luego relleno, sin repetir pregunta
  const byTopic = {}; shuffle(BANK_F1).forEach(q => (byTopic[q[0]] = byTopic[q[0]] || []).push(q));
  const picked = [], topics = shuffle(Object.keys(byTopic).filter(t => t !== 'sub' && t !== 'bin'));
  for (const t of topics) if (picked.length < total - gen.length) picked.push(byTopic[t].shift());
  const rest = shuffle(Object.values(byTopic).flat());
  while (picked.length < total - gen.length && rest.length) picked.push(rest.shift());
  return shuffle(gen.concat(picked)).map(([topic, q, opts, why]) => {
    const order = shuffle(opts.map((t, i) => ({ t, ok: i === 0 })));
    return { q, options: order.map(o => o.t), a: order.findIndex(o => o.ok), why, topic };
  });
}

const COURSE = [
  { id: 'f1', name: 'Fase 1 · Fundamentos', lessons: F1 },
  { id: 'f2', name: 'Fase 2 · Seguridad base', soon: true },
  { id: 'f3', name: 'Fase 3 · Especialidad', soon: true },
  { id: 'f4', name: 'Fase 4 · Experiencia real', soon: true },
  { id: 'f5', name: 'Fase 5 · Experto', soon: true },
];
const LESSONS = COURSE.flatMap(p => p.lessons || []);
const byId = id => LESSONS.find(l => l.id === id);

/* ------------------------------------------------------------------ */
/* Estado                                                              */
/* ------------------------------------------------------------------ */
const CL = () => global.CL;
function st() { const p = CL().prog; if (!p.course) p.course = { cur: LESSONS[0].id, l: {} }; if (!p.course.l) p.course.l = {}; return p.course; }
function ls(id) { const s = st(); if (!s.l[id]) s.l[id] = { step: 0 }; return s.l[id]; }
const isDone = id => !!(st().l[id] && st().l[id].done);
const unlocked = i => i === 0 || isDone(LESSONS[i - 1].id);
const save = () => CL().save();

const escH = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function fmt(s) {
  return escH(s).split('\n\n').map(p => '<p>' + p
    .replace(/`([^`]+)`/g, (m, c) => `<code class="cmd" data-cmd="${c}" title="Toca para copiarlo a la terminal">${c}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*([^*]+)\*/g, '<i>$1</i>').replace(/\n/g, '<br>') + '</p>').join('');
}
const norm = s => String(s).trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.]$/, '');

/* ------------------------------------------------------------------ */
/* Vista                                                               */
/* ------------------------------------------------------------------ */
let built = false, term = null, cur = null, mem = {}, exam = null, hintIdx = 0, askHist = [], lastCmds = [];
let root = null;

function build(container) {
  root = container;
  container.innerHTML = `
  <div class="course">
    <nav class="clist" aria-label="Lecciones"></nav>
    <section class="cmain card">
      <header class="chead"></header>
      <div class="chat" aria-live="polite"></div>
      <div class="ctask"></div>
      <div class="cask"></div>
    </section>
    <section class="cterm">
      <div id="course-term"></div>
      <div class="row ctools"><button class="btn ghost" type="button" id="term-reset">Reiniciar laboratorio</button><button class="btn ghost" type="button" id="term-help">Ver comandos</button></div>
    </section>
  </div>`;
  term = global.CyberTerminal.mount(container.querySelector('#course-term'), { id: 'course-term-in' });
  term.onCommand(onCommand);
  container.querySelector('#term-reset').addEventListener('click', () => { term.reset(); term.note('Laboratorio reiniciado: archivos, permisos y procesos vuelven a su estado inicial.'); });
  container.querySelector('#term-help').addEventListener('click', () => term.exec('help'));
  container.addEventListener('click', e => { const c = e.target.closest('code.cmd'); if (c) term.insert(c.dataset.cmd); });
  built = true;
}

function render(container) {
  if (!built) build(container);
  const s = st(); if (!byId(s.cur)) s.cur = LESSONS[0].id;
  paintList();
  if (cur !== s.cur) openLesson(s.cur); else paintTask();
}

function paintList() {
  const nav = root.querySelector('.clist'); let n = 0;
  nav.innerHTML = COURSE.map(ph => {
    if (ph.soon) return `<div class="cph soon"><span>${escH(ph.name)}</span><span class="tag">Próximamente</span></div>`;
    const done = ph.lessons.filter(l => isDone(l.id)).length;
    return `<div class="cph"><span>${escH(ph.name)}</span><span class="muted">${done}/${ph.lessons.length}</span></div>` + ph.lessons.map(l => {
      const i = LESSONS.indexOf(l), open = unlocked(i), d = isDone(l.id); n++;
      return `<button type="button" class="cl${d ? ' done' : ''}" data-l="${l.id}" ${st().cur === l.id ? 'aria-current="step"' : ''} ${open ? '' : 'disabled'}>
        <span class="num">${d ? '✓' : (l.exam ? '★' : n)}</span><span><span class="t">${escH(l.title)}</span><br><span class="s">${open ? escH(AGENTS[l.agent].name) + ' · ' + l.mins + ' min' : 'Bloqueada'}</span></span></button>`;
    }).join('');
  }).join('');
  nav.querySelectorAll('.cl[data-l]').forEach(b => b.addEventListener('click', () => { st().cur = b.dataset.l; save(); paintList(); openLesson(b.dataset.l); }));
}

function bubble(agentKey, html, cls) {
  const chat = root.querySelector('.chat');
  const a = AGENTS[agentKey];
  const d = document.createElement('div');
  if (agentKey === 'me') { d.className = 'msg me'; d.innerHTML = `<div class="bub">${html}</div>`; }
  else { d.className = 'msg ' + (cls || ''); d.innerHTML = `<div class="av ${a.cls}" aria-hidden="true">${a.ini}</div><div class="bub"><div class="who">${a.name} <span>${a.role}</span></div>${html}</div>`; }
  chat.appendChild(d); chat.scrollTop = chat.scrollHeight;
}

function openLesson(id) {
  const L = byId(id); cur = id; mem = {}; hintIdx = 0; exam = null; askHist = [];
  const s = ls(id);
  root.querySelector('.chat').innerHTML = '';
  const a = AGENTS[L.agent];
  root.querySelector('.chead').innerHTML = `<div class="av big ${a.cls}" aria-hidden="true">${a.ini}</div><div class="ct"><div class="eyebrow">${escH(a.name)} · ${escH(a.role)}</div><h2>${escH(L.title)}</h2></div><div class="cprog" id="cprog"></div>`;
  if (L.exam) { s.step = 0; exam = { right: 0, res: [], steps: [L.steps[0]].concat(buildExam(12)) }; }
  // reconstruir conversación de pasos ya hechos
  const upto = s.done && !L.exam ? L.steps.length : s.step;
  for (let i = 0; i < upto && !L.exam; i++) { const S = L.steps[i]; bubble(L.agent, fmt(S.say)); if (S.done) bubble(L.agent, fmt(S.done), 'ok'); }
  if (s.done && !L.exam) { bubble(L.agent, fmt(L.outro)); }
  else showStep();
  paintTask(); paintAsk();
}

const stepsOf = L => (L.exam && exam && exam.steps) ? exam.steps : L.steps;
function curStep() { const L = byId(cur), s = ls(cur); return stepsOf(L)[s.step]; }

function showStep() {
  const L = byId(cur), S = curStep(); if (!S) return;
  hintIdx = 0; mem = {};
  if (L.exam && S.q) { bubble(L.agent, `<p class="eyebrow">Pregunta ${ls(cur).step} de ${stepsOf(L).length - 1} · ${escH(TOPICS[S.topic][0])}</p><p><b>${escH(S.q)}</b></p>`); }
  else bubble(L.agent, fmt(S.say));
}

function paintTask() {
  const L = byId(cur), s = ls(cur), S = curStep(), box = root.querySelector('.ctask');
  const total = L.exam ? stepsOf(L).length - 1 : L.steps.length;
  const prog = root.querySelector('#cprog');
  if (prog) prog.innerHTML = s.done && !L.exam ? '<span class="pill aprobado">Completada</span>' : (L.exam && s.step === 0 ? `<span class="muted">${total} preguntas · ${L.pass} % para aprobar</span>` : `<span class="muted">${L.exam ? 'Pregunta ' + s.step : 'Paso ' + Math.min(s.step + 1, total)} de ${total}</span>`);
  if (s.done && !L.exam) {
    const i = LESSONS.indexOf(L), next = LESSONS[i + 1];
    box.innerHTML = `<div class="row">${next ? `<button class="btn" type="button" id="go-next">Siguiente: ${escH(next.title)} →</button>` : ''}<button class="btn ghost" type="button" id="redo">Repetir lección</button></div>`;
    if (next) box.querySelector('#go-next').addEventListener('click', () => { st().cur = next.id; save(); paintList(); openLesson(next.id); });
    box.querySelector('#redo').addEventListener('click', () => { s.step = 0; delete s.done; save(); openLesson(cur); paintList(); });
    return;
  }
  if (!S) return;
  const T = S.task || (S.q ? { type: 'exam' } : { type: 'read' });
  const hintBtn = S.hint && S.hint.length ? `<button class="btn ghost" type="button" id="hint">Pedir una pista a ${AGENTS[L.agent].name}</button>` : '';
  if (T.type === 'read') {
    box.innerHTML = `<div class="row"><button class="btn" type="button" id="cont">${escH(T.label || 'Entendido, continuar')}</button></div>`;
    box.querySelector('#cont').addEventListener('click', () => { if (L.exam) { advance(); } else complete(null); });
    box.querySelector('#cont').focus({ preventScroll: true });
  } else if (T.type === 'cmd') {
    box.innerHTML = `<div class="tbox"><span class="tlabel">Tarea</span><span>Escríbelo en la terminal. Avanzarás en cuanto lo ejecutes.</span></div><div class="row">${hintBtn}<button class="btn ghost" type="button" id="focus-term">Ir a la terminal</button></div>`;
    box.querySelector('#focus-term').addEventListener('click', () => { term.focus(); document.querySelector('.cterm').scrollIntoView({ block: 'nearest' }); });
  } else if (T.type === 'answer') {
    box.innerHTML = `<form class="row" id="ans-f"><input type="text" id="ans-in" autocomplete="off" spellcheck="false" placeholder="Tu respuesta" aria-label="Tu respuesta"><button class="btn" type="submit">Responder</button>${hintBtn}</form>`;
    box.querySelector('#ans-f').addEventListener('submit', e => {
      e.preventDefault(); const v = box.querySelector('#ans-in').value; if (!v.trim()) return;
      bubble('me', escH(v));
      const good = T.accept.some(a => a instanceof RegExp ? a.test(v) : norm(a) === norm(v));
      if (good) complete(null); else { bubble(L.agent, '<p>' + (T.wrong ? escH(T.wrong) : 'No es eso. Revisa la salida de la terminal' + (S.hint ? ' o pídeme una pista.' : '.')) + '</p>', 'bad'); box.querySelector('#ans-in').select(); }
    });
  } else if (T.type === 'choice' || T.type === 'exam') {
    const opts = T.type === 'exam' ? S.options.map((t, i) => ({ t, ok: i === S.a })) : T.options;
    box.innerHTML = `<div class="opts">${opts.map((o, i) => `<button type="button" class="opt" data-i="${i}">${escH(o.t)}</button>`).join('')}</div>`;
    box.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
      const o = opts[+b.dataset.i]; bubble('me', escH(o.t));
      if (T.type === 'exam') {
        if (o.ok) exam.right++;
        exam.res.push({ topic: S.topic, ok: !!o.ok });
        bubble(L.agent, `<p><b>${o.ok ? 'Correcto.' : 'No.'}</b> ${escH(S.why)}</p>`, o.ok ? 'ok' : 'bad');
        advance();
      } else if (o.ok) { complete(o.why); }
      else { b.disabled = true; b.classList.add('wrong'); bubble(L.agent, '<p>' + escH(o.why) + '</p>', 'bad'); }
    }));
  }
  const h = box.querySelector('#hint');
  if (h) h.addEventListener('click', () => {
    const hs = S.hint; bubble(L.agent, '<p><b>Pista:</b> ' + escH(hs[Math.min(hintIdx, hs.length - 1)]) + '</p>', 'hint');
    hintIdx++; if (hintIdx >= hs.length) h.disabled = true;
  });
  const inp = box.querySelector('#ans-in'); if (inp && document.activeElement && root.contains(document.activeElement) && !document.activeElement.closest('.cterm')) inp.focus({ preventScroll: true });
}

function complete(extra) {
  const L = byId(cur), s = ls(cur), S = curStep();
  if (extra) bubble(L.agent, '<p>' + escH(extra) + '</p>', 'ok');
  if (S.done) bubble(L.agent, fmt(S.done), 'ok');
  s.step++; save();
  if (s.step >= stepsOf(L).length) finish(); else { showStep(); paintTask(); }
}

function advance() {
  const L = byId(cur), s = ls(cur);
  s.step++;
  if (s.step >= stepsOf(L).length) return finishExam();
  showStep(); paintTask();
}

function finishExam() {
  const L = byId(cur), s = ls(cur), total = stepsOf(L).length - 1, pct = Math.round(exam.right / total * 100);
  const passed = pct >= L.pass;
  bubble(L.agent, `<p><b>Resultado: ${exam.right} de ${total} (${pct} %).</b></p><p>${passed ? '¡Aprobado! Has completado la Fase 1 del curso. Ya tienes la base para preparar el **Cisco CCST Networking**.'.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>') : 'No llegas al ' + L.pass + ' %. Repasa las lecciones de las preguntas que fallaste y vuelve a intentarlo.'}</p>`, passed ? 'ok' : 'bad');
  CL().addLog({ type: 'practica', title: `Examen Fase 1 del curso: ${pct} %${passed ? ' (aprobado)' : ''}`, score: `${exam.right}/${total}` });
  // Resultado por tema
  const per = {}; exam.res.forEach(r => { const p = per[r.topic] = per[r.topic] || { ok: 0, n: 0 }; p.n++; if (r.ok) p.ok++; });
  const weak = Object.keys(per).filter(t => per[t].ok < per[t].n);
  bubble(L.agent, `<p><b>Por tema:</b></p><table class="ref examtbl">${Object.keys(per).sort((a, b) => (per[a].ok / per[a].n) - (per[b].ok / per[b].n)).map(t => `<tr><td>${escH(TOPICS[t][0])}</td><td>${per[t].ok}/${per[t].n}</td><td>${per[t].ok < per[t].n ? `<a href="#curso" data-goto="${TOPICS[t][1]}">Repasar lección</a>` : '✓'}</td></tr>`).join('')}</table>` +
    (weak.length ? `<p>He puesto para hoy en tu <a href="#repaso">Repaso</a> las tarjetas de: ${weak.map(t => escH(TOPICS[t][0])).join(', ')}.</p>` : ''), 'hint');
  if (weak.length && global.Review) global.Review.boost(weak.map(t => TOPICS[t][1]));
  root.querySelectorAll('[data-goto]').forEach(a => a.addEventListener('click', () => { st().cur = a.dataset.goto; save(); paintList(); openLesson(a.dataset.goto); }));
  if (passed && !s.done) s.done = new Date().toISOString().slice(0, 10);
  s.best = Math.max(s.best || 0, pct); s.step = 0; save(); paintList(); CL().paintOverall();
  const box = root.querySelector('.ctask');
  box.innerHTML = `<div class="row"><button class="btn${passed ? ' ghost' : ''}" type="button" id="retry">Repetir examen</button>${passed ? '<a class="btn" href="#certs">Ver certificaciones →</a>' : ''}</div>`;
  box.querySelector('#retry').addEventListener('click', () => openLesson(cur));
  const prog = root.querySelector('#cprog'); if (prog) prog.innerHTML = `<span class="pill ${passed ? 'aprobado' : 'programado'}">Mejor nota: ${s.best} %</span>`;
}

function finish() {
  const L = byId(cur), s = ls(cur);
  s.done = new Date().toISOString().slice(0, 10);
  const p = CL().prog;
  (L.topics || []).forEach(t => { if (!p.topics[t]) p.topics[t] = s.done; });
  CL().addLog({ type: 'curso', title: 'Lección completada: ' + L.title });
  save(); CL().paintOverall();
  bubble(L.agent, fmt(L.outro));
  paintList(); paintTask();
}

function onCommand(entry, sim) {
  lastCmds.push(('$ ' + entry.line + '\n' + (entry.out || '')).slice(-1500)); lastCmds = lastCmds.slice(-3);
  if (!cur) return; const L = byId(cur), s = ls(cur); if (s.done && !L.exam) return;
  const S = curStep(); if (!S || !S.task || S.task.type !== 'cmd') return;
  let good = false; try { good = !!S.task.check(entry, sim, mem); } catch (e) { good = false; }
  if (good) complete(null);
}


/* ------------------------------------------------------------------ */
/* Pregúntale al agente (IA)                                           */
/* ------------------------------------------------------------------ */
function paintAsk() {
  const L = byId(cur), box = root.querySelector('.cask'), a = AGENTS[L.agent];
  if (L.exam) { box.innerHTML = ''; return; }
  box.innerHTML = `<button type="button" class="btn ghost askbtn" id="ask-open"><span class="aitag">IA</span> Pregúntale a ${a.name}</button>
    <form class="askf" id="ask-f" hidden>
      <label for="ask-in" class="muted small">Tu duda sobre esta lección. ${a.name} ve en qué paso estás y lo último de tu terminal.</label>
      <textarea id="ask-in" rows="2" maxlength="1000" placeholder="Ej.: ¿por qué uniq necesita sort antes?"></textarea>
      <div class="row"><button class="btn" type="submit" id="ask-go">Enviar</button><button class="btn ghost" type="button" id="ask-x">Cerrar</button><span class="muted small" id="ask-left"></span></div>
    </form>`;
  const f = box.querySelector('#ask-f'), open = box.querySelector('#ask-open'), inp = box.querySelector('#ask-in');
  open.addEventListener('click', () => { f.hidden = false; open.hidden = true; inp.focus(); });
  box.querySelector('#ask-x').addEventListener('click', () => { f.hidden = true; open.hidden = false; });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); f.requestSubmit(); } });
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const q = inp.value.trim(); if (!q) return;
    if (!global.Sync || !global.Sync.loggedIn) {
      bubble(L.agent, `<p>Para hablar conmigo con IA, entra con tu cuenta (botón <b>Entrar</b>, arriba a la derecha).</p>`, 'hint');
      if (global.Sync) global.Sync.open('login'); return;
    }
    const go = box.querySelector('#ask-go'); go.disabled = true; inp.value = '';
    bubble('me', escH(q));
    bubble(L.agent, '<p class="typing" aria-label="Escribiendo"><i></i><i></i><i></i></p>', 'ai pending');
    const S = curStep();
    const step = ls(cur).done ? 'Lección completada' : (S && S.say ? S.say.replace(/\*\*/g, '') : '');
    try {
      const r = await global.Sync.ask({ agent: L.agent, question: q, context: { lesson: L.title, step: step.slice(0, 1500), terminal: lastCmds.join('\n').slice(-3800) }, history: askHist.slice(-ASK_MAX) });
      setPending('<span class="aitag">IA</span>' + fmt(r.answer || '(sin respuesta)'), 'ai');
      askHist.push({ role: 'user', content: q }, { role: 'assistant', content: r.answer || '' });
      box.querySelector('#ask-left').textContent = r.remaining !== undefined ? `Te quedan ${r.remaining} preguntas hoy` : '';
    } catch (err) {
      const msg = err.offline ? 'No puedo conectar con el servidor ahora mismo. Comprueba que tu API está encendida.' : (err.body && err.body.message) || 'No he podido responder. Inténtalo otra vez.';
      setPending('<p>' + escH(msg) + '</p>', 'bad');
    }
    go.disabled = false; inp.focus({ preventScroll: true });
  });
}
function setPending(html, cls) {
  const m = root.querySelector('.chat .msg.pending'); if (!m) return;
  m.className = 'msg ' + cls; const b = m.querySelector('.bub'); const who = b.querySelector('.who').outerHTML; b.innerHTML = who + html;
  const chat = root.querySelector('.chat'); chat.scrollTop = chat.scrollHeight;
}

/* ------------------------------------------------------------------ */
/* Terminal libre                                                      */
/* ------------------------------------------------------------------ */
let freeBuilt = false, freeTerm = null, pendingCmd = null;
function renderFree(container) {
  if (freeBuilt) { if (pendingCmd && freeTerm) { freeTerm.insert(pendingCmd); pendingCmd = null; } return; }
  freeBuilt = true;
  const H = global.CyberTerminal.HOSTS;
  container.innerHTML = `
  <div class="freelab">
    <section class="cterm"><div id="free-term"></div><div class="row ctools"><button class="btn ghost" type="button" id="free-reset">Reiniciar laboratorio</button><button class="btn ghost" type="button" id="free-help">Ver comandos</button></div></section>
    <aside class="card freeside">
      <h2>Laboratorio libre</h2>
      <p class="muted">Practica lo que quieras sin guion. Es la misma red de LabCorp que en el curso, pero en una terminal aparte.</p>
      <h3>Mapa de la red 10.10.10.0/24</h3>
      <div class="tablewrap"><table class="ref netmap"><tr><th>IP</th><th>Nombre</th></tr>${Object.entries(H).map(([ip, h]) => `<tr><td>${ip}</td><td>${escH(h.name.replace('.labcorp.local', ''))}${ip === '10.10.10.100' ? ' (tú)' : ''}</td></tr>`).join('')}</table></div>
      <h3>Retos libres</h3>
      <ul class="checks plain">
        <li>Encuentra la flag que solo puede leer root.</li>
        <li>Descubre qué versión de nginx usa la web.</li>
        <li>Encuentra un comentario olvidado en el HTML de la intranet.</li>
        <li>¿Qué servidores DNS usa huergalabs.dev? (pista: registro NS)</li>
        <li>Crea un archivo con la lista de usuarios del sistema usando cut y &gt;.</li>
      </ul>
    </aside>
  </div>`;
  const t = global.CyberTerminal.mount(container.querySelector('#free-term'), { id: 'free-term-in', banner: 'LabCorp · Laboratorio libre\nEscribe help para ver los comandos.' });
  freeTerm = t;
  if (pendingCmd) { t.insert(pendingCmd); pendingCmd = null; }
  container.querySelector('#free-reset').addEventListener('click', () => t.reset());
  container.querySelector('#free-help').addEventListener('click', () => t.exec('help'));
}

global.Course = {
  render, renderFree, COURSE, LESSONS, _exam: { GEN, buildExam },
  lessonForTopic(topic) { const l = LESSONS.find(x => (x.topics || []).includes(topic)); return l ? l.id : null; },
  open(id) { if (byId(id)) { st().cur = id; save(); cur = null; } },
  tryInTerminal(cmd) { pendingCmd = cmd; if (location.hash === '#terminal') { if (freeTerm) { freeTerm.insert(cmd); pendingCmd = null; } } else location.hash = '#terminal'; },
  progress() { return { done: LESSONS.filter(l => isDone(l.id)).length, total: LESSONS.length }; },
};
})(window);
