/* Cyber Lab · App principal (Hoja de ruta, Práctica, Certificaciones, Resultados…). Antes iba dentro de index.html. */
(function(){
const T=(s,v)=>I18N.t(s,v);
const NEED=5;
const W4=[8,4,2,1], W8=[128,64,32,16,8,4,2,1];
const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const bin=(v,n)=>v.toString(2).padStart(n,'0');
const $=s=>document.querySelector(s);

const MASK_VALUES=[[255,8],[254,7],[252,6],[248,5],[240,4],[224,3],[192,2],[128,1],[0,0]];
const IP_VALUES=[0,1,10,128,168,172,192,224,240,248,252,254,255,100,64,32,16,85,200,127];

function weightTable(ws){return '<div class="tablewrap"><table class="ref"><tr>'+ws.map(w=>'<th>'+w+'</th>').join('')+'</tr></table></div>'}


/* Generadores de los niveles 7–9 */
const pick=a=>a[Math.floor(Math.random()*a.length)];
const shuf=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
function genSubnet(){
  const c=rnd(24,30),k=rnd(0,2),o1=k===0?192:k===1?10:172,o2=k===0?168:k===1?rnd(0,255):rnd(16,31),o3=rnd(0,255),o4=rnd(1,254);
  const size=2**(32-c),idx=Math.floor(o4/size),start=idx*size,end=start+size-1,pre=o1+'.'+o2+'.'+o3+'.',net=pre+start,bc=pre+end,hosts=size-2,ip=pre+o4+'/'+c;
  const dec=(o4/size).toFixed(2).replace(/\.?0+$/,''),decs=I18N.lang==='es'?dec.replace('.',','):dec;
  // Mismos pasos que la explicación: manzana → dividir → red → broadcast
  const p1=T('<b>1.</b> /{c} → manzanas de <b>{size}</b> casas.',{c,size});
  const p2=c===24?T('<b>2.</b> Con /24 hay una sola manzana (0–255), así que la red es <b>.0</b>.'):T('<b>2.</b> {o4} ÷ {size} = {dec} → me quedo con <b>{idx}</b> → {idx} × {size} = <b>{start}</b> → red <b>.{start}</b>.',{o4,size,dec:decs,idx,start});
  const p3=T('<b>3.</b> Broadcast = red + manzana − 1 = {start} + {size} − 1 = <b>{end}</b>.',{start,size,end});
  const steps=p1+'<br>'+p2+'<br>'+p3;
  const kind=pick(['net','net','bc','hosts']);
  if(kind==='net')return{q:T('¿Cuál es la dirección de red?'),big:ip,answer:net,pre,ph:'0',why:steps+'<br>'+T('Respuesta')+': <b>'+net+'</b>',hint:T('/{c} son manzanas de {size}. Divide {o4} entre {size}, quédate con la parte entera y multiplícala por {size}.',{c,size,o4})};
  if(kind==='bc')return{q:T('¿Cuál es el broadcast?'),big:ip,answer:bc,pre,ph:'255',why:steps+'<br>'+T('Respuesta')+': <b>'+bc+'</b>',hint:T('Primero saca la red ({o4} ÷ {size}, parte entera × {size}). Luego: red + {size} − 1. No olvides el − 1.',{o4,size})};
  return{q:T('¿Cuántos equipos usables hay en esta red?'),big:'/'+c,answer:String(hosts),ph:T('ej. 62'),why:T('<b>1.</b> /{c} → manzanas de <b>{size}</b> casas.',{c,size})+'<br>'+T('<b>2.</b> Quita la primera (red) y la última (broadcast): {size} − 2 = <b>{hosts}</b>.',{size,hosts}),hint:T('Mira cuántas casas tiene la manzana en un /{c} y réstale 2.',{c})};
}
const PORTS=[[21,'FTP'],[22,'SSH'],[23,'Telnet'],[25,'SMTP'],[53,'DNS'],[80,'HTTP'],[110,'POP3'],[143,'IMAP'],[443,'HTTPS'],[445,'SMB'],[3306,'MySQL'],[3389,'RDP'],[5432,'PostgreSQL'],[8080,'HTTP alternativo']];
const PORT_NOTE={21:'Transfiere archivos sin cifrar.',22:'Acceso remoto cifrado. Muy atacado por fuerza bruta.',23:'Acceso remoto SIN cifrar: todo viaja en texto plano.',25:'Envío de correo entre servidores.',53:'Traduce nombres a IPs.',80:'Web sin cifrar.',110:'Descarga de correo (antiguo).',143:'Lectura de correo.',443:'Web cifrada con TLS.',445:'Carpetas compartidas de Windows. WannaCry se propagó por aquí.',3306:'Base de datos. Nunca expuesta a internet.',3389:'Escritorio remoto de Windows. Objetivo clásico de ransomware.',5432:'Base de datos. Nunca expuesta a internet.',8080:'Servidores web de desarrollo o proxies.'};
const PUBLIC_OK=[80,443];
function genPort(){
  const tr=x=>x==='HTTP alternativo'?T(x):x; // el único nombre de servicio con texto en español
  const [p,sv0]=pick(PORTS),sv=tr(sv0),kind=pick(['p2s','p2s','s2p','expose']);
  if(kind==='p2s'){const opts=shuf([sv].concat(shuf(PORTS.filter(x=>x[1]!==sv0).map(x=>tr(x[1]))).slice(0,3)));
    return{q:T('¿Qué servicio usa normalmente este puerto?'),big:String(p),opts,answer:sv,why:'<b>'+p+' = '+sv+'</b>. '+T(PORT_NOTE[p]),hint:T('Mira la tabla de la explicación de arriba.')}}
  if(kind==='s2p'){const opts=shuf([String(p)].concat(shuf(PORTS.filter(x=>x[0]!==p).map(x=>String(x[0]))).slice(0,3)));
    return{q:T('¿Qué puerto usa normalmente este servicio?'),big:sv,opts,answer:String(p),why:'<b>'+sv+' = '+p+'</b>. '+T(PORT_NOTE[p]),hint:T('Mira la tabla de la explicación de arriba.')}}
  const pp=pick([[80,'HTTP'],[443,'HTTPS'],[3306,'MySQL'],[3389,'RDP'],[445,'SMB'],[23,'Telnet'],[5432,'PostgreSQL'],[22,'SSH']]),ok=PUBLIC_OK.includes(pp[0]);
  const O=[T('Sí, es normal'),T('No, nunca'),T('Solo con medidas extra')];
  const ans=pp[0]===22?O[2]:ok?O[0]:O[1];
  return{q:T('Un servidor de internet tiene este puerto abierto al mundo. ¿Es normal?'),big:pp[0]+' · '+pp[1],opts:O,answer:ans,
    why:pp[0]===22?T('SSH se expone a menudo, pero <b>solo con medidas extra</b>: claves en vez de contraseñas, sin login de root y limitando intentos (fail2ban).'):ok?T('Sí: es la web, está pensada para el público.'):T('<b>No.</b> {note} Debe quedar detrás de un firewall o accesible solo por VPN o túnel.',{note:T(PORT_NOTE[pp[0]])}),hint:T('¿Es un servicio pensado para que lo use cualquier persona de internet?')};
}
const TCP_Q=[
    ['Nmap envía SYN al puerto 443 y recibe SYN-ACK. Estado:',['open','closed','filtered'],'open','SYN-ACK = "aquí hay un servicio escuchando, adelante".'],
    ['Nmap envía SYN al puerto 8080 y recibe RST. Estado:',['open','closed','filtered'],'closed','RST = "el equipo existe, pero aquí no hay nadie".'],
    ['Nmap envía SYN al puerto 22 y no recibe nada, ni siquiera tras reintentar. Estado:',['open','closed','filtered'],'filtered','El silencio es un firewall descartando el paquete.'],
    ['Nmap envía SYN y recibe un ICMP "destination unreachable (admin prohibited)". Estado:',['open','closed','filtered'],'filtered','Un router o firewall rechaza el paquete explícitamente: filtrado.'],
    ['En tcpdump ves Flags [S.]. ¿Qué paquete es?',['SYN','SYN-ACK','ACK','RST'],'SYN-ACK','[S.] = SYN + ACK (el punto es ACK).'],
    ['En tcpdump ves Flags [R.]. ¿Qué paquete es?',['RST','SYN','ACK','FIN'],'RST','R = reset: la conexión se rechaza o se corta.'],
    ['En tcpdump ves Flags [S]. ¿Qué paquete es?',['SYN','SYN-ACK','RST','FIN'],'SYN','Solo S: el primer paso, "quiero conectarme".'],
    ['¿Cuál es el saludo TCP completo?',['SYN → SYN-ACK → ACK','SYN → ACK → RST','ACK → SYN → FIN','SYN → RST → ACK'],'SYN → SYN-ACK → ACK','Así se abre cualquier conexión TCP.'],
    ['En un escaneo SYN (-sS), ¿qué envía Nmap después de recibir SYN-ACK?',['RST','ACK','SYN','Nada'],'RST','Corta antes de completar la conexión: más rápido y deja menos rastro en los logs del servicio.'],
    ['¿Qué estado es MEJOR para el defensor?',['filtered','closed','open'],'filtered','Con filtered el atacante ni siquiera sabe si el equipo existe.'],
    ['¿Por qué "nmap -sS" necesita sudo?',['Fabrica los paquetes a mano','Escanea más rápido','Usa UDP','Lo exige la ley'],'Fabrica los paquetes a mano','Crear paquetes sin completar el saludo requiere privilegios de root.'],
    ['DNS normalmente funciona sobre…',['UDP','TCP','ICMP'],'UDP','DNS usa UDP 53 (rápido, sin saludo). TCP solo para respuestas grandes.'],
];
function genTcp(){
  const S=TCP_Q;
  const tok=x=>/^[A-Z][A-Z\- →]*$|^(open|closed|filtered)$/.test(x)?x:T(x);
  const [q,o,a,w]=pick(S);
  return{q:T(q),big:'',opts:shuf(o.map(tok)),answer:tok(a),why:T(w),hint:T('Repasa la tabla de la explicación de arriba.')};
}

const LEVELS=[
 {id:'leer4',title:'Leer binario',sub:'4 bits',mode:'read',bits:4,
  teach:`<p>En binario solo hay dos dígitos: <b>0</b> (apagado) y <b>1</b> (encendido). Piensa en una fila de interruptores de luz.</p>
  <p>Cada interruptor tiene un valor fijo. Con 4 interruptores, los valores son estos (cada uno es el doble del de su derecha):</p>${weightTable(W4)}
  <p>Para leer un número binario, <b>suma los valores de los interruptores encendidos</b>.</p>
  <div class="ex">0110 → encendidos el 4 y el 2 → 4 + 2 = 6</div>
  <div class="ex">1001 → encendidos el 8 y el 1 → 8 + 1 = 9</div>`,
  gen:()=>rnd(1,15)},
 {id:'escribir4',title:'Escribir binario',sub:'4 bits',mode:'write',bits:4,
  teach:`<p>Ahora al revés: te doy un número y tú enciendes los interruptores.</p>
  <p>El truco: <b>empieza por el interruptor más grande que quepa</b>, réstalo, y repite con lo que sobra.</p>
  <div class="ex">Quiero 11:<br>¿Cabe el 8? Sí → enciendo 8. Me quedan 3.<br>¿Cabe el 4 en 3? No.<br>¿Cabe el 2? Sí → enciendo 2. Me queda 1.<br>¿Cabe el 1? Sí → enciendo 1. Me queda 0.<br>Resultado: 1011</div>`,
  gen:()=>rnd(1,15)},
 {id:'leer8',title:'Leer binario',sub:'8 bits (un octeto)',mode:'read',bits:8,
  teach:`<p>Una dirección IP está hecha de bloques de <b>8 bits</b>, llamados <b>octetos</b>. Es lo mismo de antes, pero con 4 interruptores más a la izquierda:</p>${weightTable(W8)}
  <p>Fíjate que siguen doblando: 16, 32, 64, 128. El máximo es encenderlos todos: 128+64+32+16+8+4+2+1 = <b>255</b>. Por eso en una IP ningún número pasa de 255.</p>
  <div class="ex">11000000 → 128 + 64 = 192</div>`,
  gen:()=>rnd(1,255)},
 {id:'escribir8',title:'Escribir binario',sub:'8 bits (un octeto)',mode:'write',bits:8,
  teach:`<p>El mismo truco de antes, ahora con 8 interruptores: el más grande que quepa, restar, repetir.</p>
  <div class="ex">Quiero 168:<br>128 cabe → me quedan 40<br>64 no cabe en 40<br>32 cabe → me quedan 8<br>16 no cabe en 8<br>8 cabe → me quedan 0<br>Resultado: 10101000</div>`,
  gen:()=>rnd(1,255)},
 {id:'ip',title:'Números de una IP',sub:'Los valores que más verás',mode:'write',bits:8,
  teach:`<p>En redes hay números que salen una y otra vez. Si los reconoces de memoria, todo lo demás será mucho más fácil.</p>
  <div class="ex">255 = 11111111 (todo encendido)<br>0 = 00000000 (todo apagado)<br>192 = 11000000 · 168 = 10101000<br>10 = 00001010 · 172 = 10101100</div>
  <p>Por ejemplo, tu IP <code>192.168.1.85</code> empieza por 192 y 168.</p>`,
  gen:()=>IP_VALUES[rnd(0,IP_VALUES.length-1)]},
 {id:'mascara',title:'Máscaras',sub:'Contar los unos',mode:'mask',bits:8,
  teach:`<p>Una <b>máscara</b> (como <code>255.255.255.0</code>) es una IP especial: en binario siempre tiene <b>todos los 1 seguidos al principio</b> y luego todos los 0.</p>
  <p>El número de unos es el <b>prefijo</b>, que se escribe con barra: <code>/24</code>.</p>
  <div class="ex">255.255.255.0<br>= 11111111.11111111.11111111.00000000<br>= 8 + 8 + 8 + 0 unos = /24</div>
  <p>Solo existen estos valores posibles en un octeto de máscara:</p>
  <div class="tablewrap"><table class="ref"><tr><th>Octeto</th>${MASK_VALUES.map(m=>'<td>'+m[0]+'</td>').join('')}</tr><tr><th>Unos</th>${MASK_VALUES.map(m=>'<td>'+m[1]+'</td>').join('')}</tr></table></div>`,
  gen:()=>rnd(8,30)},
 {id:'subredes',title:'Subredes',sub:'Red, broadcast y equipos',mode:'ask',
  teach:`<p><b>1. Solo cambia el último número.</b> En redes de /24 a /30, los tres primeros números de la IP (por ejemplo <code>10.0.5.</code>) se copian tal cual. Todo el cálculo se hace con el último, que va de 0 a 255.</p>
  <p><b>2. Imagina una calle con 256 casas</b>, numeradas del 0 al 255. El prefijo dice en cuántas <b>manzanas</b> (bloques) se divide la calle. Cada vez que el prefijo sube 1, las manzanas se parten por la mitad:</p>
  <div class="tablewrap"><table class="ref"><tr><th>Prefijo</th><td>/24</td><td>/25</td><td>/26</td><td>/27</td><td>/28</td><td>/29</td><td>/30</td></tr><tr><th>Casas por manzana</th><td>256</td><td>128</td><td>64</td><td>32</td><td>16</td><td>8</td><td>4</td></tr><tr><th>Equipos usables</th><td>254</td><td>126</td><td>62</td><td>30</td><td>14</td><td>6</td><td>2</td></tr></table></div>
  <p>Solo tienes que memorizar la fila del medio: <b>256, 128, 64, 32, 16, 8, 4</b>, siempre la mitad.</p>
  <p><b>3. Cada manzana tiene tres partes:</b></p>
  <ul class="parts"><li><span class="sw3 net"></span><b>Primera casa = dirección de red.</b> Es el nombre de la manzana. No se da a ningún equipo.</li>
  <li><span class="sw3 host"></span><b>Casas de en medio = equipos.</b> Por eso los usables son el bloque − 2.</li>
  <li><span class="sw3 bc"></span><b>Última casa = broadcast.</b> El megáfono para hablar a todos a la vez. Tampoco se da a ningún equipo.</li></ul>
  <p><b>4. Pruébalo aquí.</b> Elige un prefijo y un número de casa y mira en qué manzana cae:</p>
  <div class="street" id="street">
    <div class="row"><label>Prefijo <select id="st-c">${[24,25,26,27,28,29,30].map(c=>'<option'+(c===26?' selected':'')+'>'+c+'</option>').join('')}</select></label>
    <label>Último número de la IP <input type="number" id="st-n" min="0" max="255" value="77" style="width:90px"></label></div>
    <div class="stbar" id="st-bar" aria-hidden="true"></div>
    <div class="stout" id="st-out" aria-live="polite"></div>
  </div>
  <p><b>5. El método, siempre igual</b> (ejemplo con <code>10.0.5.77/26</code>):</p>
  <ol class="steps5"><li>¿Tamaño de manzana? /26 → <b>64</b>.</li>
  <li>¿Dónde empiezan las manzanas? Desde 0, sumando 64: <b>0, 64, 128, 192</b>.</li>
  <li>¿En cuál vive el 77? Es mayor que 64 y menor que 128 → manzana <b>64–127</b>.</li>
  <li>Red = primera casa: <b>10.0.5.64</b>. Broadcast = última: <b>10.0.5.127</b>. Equipos: 64 − 2 = <b>62</b> (de .65 a .126).</li></ol>
  <p><b>Truco para números grandes:</b> divide entre el tamaño de manzana y quédate con la parte entera. 200 ÷ 32 = 6,25 → 6 × 32 = <b>192</b>, que es la red. Broadcast = red + bloque − 1 = 192 + 32 − 1 = <b>223</b>.</p>`,
  gen:genSubnet},
 {id:'puertos',title:'Puertos',sub:'Qué hay detrás de cada puerta',mode:'ask',
  teach:`<p>Estos son los puertos que verás en cualquier escaneo. Apréndelos en las dos direcciones: número → servicio y servicio → número.</p>
  <div class="portgrid">${PORTS.map(x=>'<div><b>'+x[0]+'</b><span>'+x[1]+'</span></div>').join('')}</div>
  <p>Regla de oro: a internet solo se exponen los servicios pensados para el público (web: 80 y 443). Bases de datos, escritorio remoto, carpetas compartidas o Telnet nunca deberían estar abiertos al mundo.</p>`,
  gen:genPort},
 {id:'saludo',title:'Saludo TCP',sub:'Cómo escanea Nmap',mode:'ask',
  teach:`<p>Nmap envía un <b>SYN</b> a cada puerto y mira qué le responden:</p>
  <div class="tablewrap"><table class="ref"><tr><th>Respuesta</th><td>SYN-ACK</td><td>RST</td><td>Nada</td><td>ICMP inalcanzable</td></tr><tr><th>Estado</th><td>open</td><td>closed</td><td>filtered</td><td>filtered</td></tr></table></div>
  <p>En <code>tcpdump</code> los flags se ven así: <code>[S]</code> SYN, <code>[S.]</code> SYN-ACK, <code>[.]</code> ACK, <code>[R]</code> o <code>[R.]</code> RST, <code>[P.]</code> datos.</p>
  <div class="ex">Saludo completo: SYN → SYN-ACK → ACK<br>Escaneo SYN (-sS): SYN → SYN-ACK → RST (no completa la conexión)</div>`,
  gen:genTcp},
];
const SOON=[];

/* progreso */
let prog={done:[],streak:{},cur:0,topics:{},certs:{},log:[]};
try{const s=JSON.parse(localStorage.getItem('cyberlab-v1')||'null');if(s&&Array.isArray(s.done))prog=Object.assign(prog,s)}catch(e){}
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let logSeq=Date.now();
function addLog(e){prog.log.push(Object.assign({id:String(logSeq++),date:today()},e))}
function save(){try{localStorage.setItem('cyberlab-v1',JSON.stringify(prog))}catch(e){}if(window.Sync)Sync.changed()}
const unlocked=i=>i===0||prog.done.includes(LEVELS[i-1].id);

function paintPath(){
  $('#path').innerHTML=LEVELS.map((L,i)=>{const done=prog.done.includes(L.id),open=unlocked(i);
    return `<button type="button" class="lvl${done?' done':''}" data-i="${i}" ${i===prog.cur?'aria-current="step"':''} ${open?'':'disabled'}><span class="num">${done?'✓':i+1}</span><span><span class="t">${T(L.title)}</span><br><span class="s">${open?T(L.sub):T('Bloqueado')}</span></span></button>`}).join('')+
   SOON.map((S,j)=>`<button type="button" class="lvl soon" disabled><span class="num">${LEVELS.length+j+1}</span><span><span class="t">${T(S.title)}</span><br><span class="s">${T('Próximamente')}</span></span></button>`).join('');
  document.querySelectorAll('#path .lvl[data-i]').forEach(b=>b.addEventListener('click',()=>{prog.cur=+b.dataset.i;save();render();window.scrollTo({top:0,behavior:'smooth'})}));
  paintOverall();
}

let state={};

function initStreet(){const box=$('#street');if(!box)return;
  const draw=()=>{const c=+$('#st-c').value;let n=parseInt($('#st-n').value,10);if(isNaN(n)||n<0)n=0;if(n>255)n=255;
    const size=2**(32-c),start=n-(n%size),end=start+size-1,count=256/size;
    let html='';for(let i=0;i<count;i++){const st=i*size,mine=st===start;
      html+=`<div class="stblk${mine?' mine':''}" style="flex:1" title="${st}–${st+size-1}">${mine||size>=32?`<span>${st}</span>`:''}</div>`}
    $('#st-bar').innerHTML=html;
    $('#st-out').innerHTML=`<div>${T(count>1?'/{c} → manzanas de <b>{size}</b> casas ({count} manzanas). El <b>{n}</b> vive en la manzana <b>{start}–{end}</b>.':'/{c} → manzanas de <b>{size}</b> casas (1 manzana). El <b>{n}</b> vive en la manzana <b>{start}–{end}</b>.',{c,size,count,n,start,end})}</div>
      <div class="stparts"><span><i class="sw3 net"></i>${T('Red')}: <b>.${start}</b></span><span><i class="sw3 host"></i>${T('Equipos: <b>.{a} a .{b}</b> ({n})',{a:start+1,b:end-1,n:size-2})}</span><span><i class="sw3 bc"></i>Broadcast: <b>.${end}</b></span></div>`};
  $('#st-c').addEventListener('change',draw);$('#st-n').addEventListener('input',draw);draw()}
function render(){paintPath();const L=LEVELS[prog.cur];
  $('#main').innerHTML=`<section class="card"><div class="eyebrow">${T('Nivel {n}',{n:prog.cur+1})} · ${T(L.sub)}</div><h2>${T(L.title)}</h2>
    <details class="teach" ${prog.done.includes(L.id)?'':'open'}><summary>${T('Explicación')}</summary><div class="teach">${T(L.teach)}</div></details></section>
    <section class="card" id="practice"></section>`;
  initStreet();
  newQ();
}

function streakHTML(noBtn){const L=LEVELS[prog.cur],s=prog.streak[L.id]||0,done=prog.done.includes(L.id),hasNext=!noBtn&&prog.cur+1<LEVELS.length;
  if(done)return `<div class="streak"><div class="dots">${Array.from({length:NEED},()=>'<span class="dot on"></span>').join('')}</div><span><b>${T('Nivel completado ✓')}</b> · ${T('estás repasando')}</span>${hasNext?`<button class="btn" type="button" data-gonext>${T('Ir al nivel {n} →',{n:prog.cur+2})}</button>`:''}</div>`;
  return `<div class="streak"><div class="dots">${Array.from({length:NEED},(_,i)=>`<span class="dot${i<s?' on':''}"></span>`).join('')}</div><span>${T('{s} de {n} seguidos',{s:Math.min(s,NEED),n:NEED})}</span></div>`}
function goNext(){if(prog.cur+1<LEVELS.length){prog.cur++;save();render();window.scrollTo({top:0,behavior:'smooth'})}}
document.addEventListener('click',e=>{if(e.target.closest('[data-gonext]'))goNext()});

function newQ(){const L=LEVELS[prog.cur];const target=L.gen();state={target,on:0,answered:false,hinted:false};
  const n=L.bits, ws=n===4?W4:W8;const P=$('#practice');
  if(L.mode==='read'){
    const b=bin(target,n);
    P.innerHTML=`${streakHTML()}<p class="q">${T('¿Qué número es este?')}<br><span class="big">${b}</span></p>
      <div class="board b${n}">${[...b].map((c,i)=>`<div class="sw${c==='1'?' on':''}"><span class="w">${ws[i]}</span><span class="v">${c}</span></div>`).join('')}</div>
      <div class="row"><input type="text" id="ans" inputmode="numeric" autocomplete="off" aria-label="${T('Tu respuesta')}"><button class="btn" id="chk" type="button">${T('Comprobar')}</button><button class="btn ghost" id="hint" type="button">${T('Pista')}</button></div><div id="fb"></div>`;
  } else if(L.mode==='write'){
    P.innerHTML=`${streakHTML()}<p class="q">${T('Enciende los interruptores para formar')}<br><span class="big">${target}</span></p>
      <div class="board b${n}" id="board">${ws.map((w,i)=>`<button type="button" class="sw" data-w="${w}" aria-pressed="false" aria-label="${T('Interruptor de valor {w}',{w})}"><span class="w">${w}</span><span class="v">0</span></button>`).join('')}</div>
      <div class="live" id="live">${T('Ningún interruptor encendido → 0')}</div>
      <div class="row"><button class="btn" id="chk" type="button">${T('Comprobar')}</button><button class="btn ghost" id="hint" type="button">${T('Pista')}</button></div><div id="fb"></div>`;
    P.querySelectorAll('#board .sw').forEach(b=>b.addEventListener('click',()=>{if(state.answered)return;state.on^=+b.dataset.w;paintBoard()}));
  } else if(L.mode==='ask'){
    P.innerHTML=`${streakHTML()}<p class="q">${target.q}${target.big?'<br><span class="big">'+esc(target.big)+'</span>':''}</p>`+
      (target.opts?`<div class="qopts">${target.opts.map((o,i)=>`<button type="button" class="qopt" data-i="${i}">${esc(o)}</button>`).join('')}</div><div class="row"><button class="btn ghost" id="hint" type="button">${T('Pista')}</button><button id="chk" hidden></button></div><div id="fb"></div>`
      :`<div class="row">${target.pre?`<label class="ippre" for="ans">${esc(target.pre)}</label>`:''}<input type="text" id="ans" autocomplete="off" spellcheck="false" ${target.pre?'inputmode="numeric" class="lastoct"':''} placeholder="${esc(target.ph||'')}" aria-label="${target.pre?T('Último número de la IP'):T('Tu respuesta')}" style="width:${target.pre?'90px':'min(260px,100%)'}"><button class="btn" id="chk" type="button">${T('Comprobar')}</button><button class="btn ghost" id="hint" type="button">${T('Pista')}</button></div><div id="fb"></div>`);
    P.querySelectorAll('.qopt').forEach(b=>b.addEventListener('click',()=>{if(state.answered)return;state.choice=target.opts[+b.dataset.i];P.querySelectorAll('.qopt').forEach(x=>{x.disabled=true;if(x.textContent===target.answer)x.classList.add('right');else if(x===b)x.classList.add('wrong')});check()}));
  } else {
    const c=target;const m=c===0?0:(0xFFFFFFFF<<(32-c))>>>0;const o=[m>>>24,(m>>>16)&255,(m>>>8)&255,m&255];state.mask=o;
    P.innerHTML=`${streakHTML()}<p class="q">${T('¿Qué prefijo (cuántos unos) tiene esta máscara?')}<br><span class="big">${o.join('.')}</span></p>
      <div class="row"><span style="font-family:var(--f-mono);font-size:20px">/</span><input type="text" id="ans" inputmode="numeric" autocomplete="off" aria-label="${T('Número de unos')}"><button class="btn" id="chk" type="button">${T('Comprobar')}</button><button class="btn ghost" id="hint" type="button">${T('Pista')}</button></div><div id="fb"></div>`;
  }
  $('#chk').addEventListener('click',check);$('#hint').addEventListener('click',hint);
  const a=$('#ans');if(a){a.focus({preventScroll:true});a.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(!state.answered)check();else{const t=$('#nxtlvl')||$('#nxt');if(t)t.click()}}})}
}
function paintBoard(){const ws=LEVELS[prog.cur].bits===4?W4:W8;
  document.querySelectorAll('#board .sw').forEach(b=>{const on=!!(state.on&+b.dataset.w);b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);b.querySelector('.v').textContent=on?1:0});
  const parts=ws.filter(w=>state.on&w);$('#live').textContent=parts.length?parts.join(' + ')+' = '+state.on:T('Ningún interruptor encendido → 0')}

function hint(){const L=LEVELS[prog.cur],t=state.target,ws=L.bits===4?W4:W8;let h='';state.hinted=true;
  if(L.mode==='read'){const parts=ws.filter(w=>t&w);h=T('Los interruptores encendidos valen: <b>{p}</b>. Ahora súmalos.',{p:parts.join(' + ')})}
  else if(L.mode==='write'){const rem=t-state.on;
    if(state.on>t)h=T('Te pasaste: llevas {on} y necesitas {t}. Apaga algún interruptor.',{on:state.on,t});
    else if(rem===0)h=T('¡Ya lo tienes! Pulsa Comprobar.');
    else{const big=ws.find(w=>w<=rem&&!(state.on&w));h=big?T('Te faltan <b>{rem}</b>. El interruptor más grande que cabe en {rem} es el <b>{big}</b>.',{rem,big}):T('Revisa: hay algún interruptor encendido que sobra.')}}
  else if(L.mode==='ask'){h=t.hint}
  else{h=T('Cuenta los unos de cada octeto con la tabla de arriba: {l}. Ahora súmalos.',{l:state.mask.map(v=>v+' → '+(MASK_VALUES.find(m=>m[0]===v)||[0,'?'])[1]).join(' · ')})}
  $('#fb').innerHTML='<div class="fb hint">'+h+'</div>'}

function check(){if(state.answered)return;const L=LEVELS[prog.cur],t=state.target,ws=L.bits===4?W4:W8;let ok,expl;
  if(L.mode==='read'){const v=parseInt(($('#ans').value||'').trim(),10);if(isNaN(v)){$('#fb').innerHTML='<div class="fb hint">'+T('Escribe un número primero.')+'</div>';return}
    ok=v===t;expl=bin(t,L.bits)+' → '+ws.filter(w=>t&w).join(' + ')+' = <b>'+t+'</b>'}
  else if(L.mode==='write'){ok=state.on===t;expl=t+' = '+ws.filter(w=>t&w).join(' + ')+' → <b>'+bin(t,L.bits)+'</b>'}
  else if(L.mode==='ask'){
    let v;if(t.opts)v=state.choice;else{v=($('#ans').value||'').trim();if(!v){$('#fb').innerHTML='<div class="fb hint">'+T('Escribe tu respuesta primero.')+'</div>';return}
      if(t.pre&&!/^\d+\.\d+\.\d+\.\d+$/.test(v))v=t.pre+v.replace(/^\./,'')}
    const n=x=>String(x).toLowerCase().replace(/\s+/g,'').replace(/^\//,'');ok=n(v)===n(t.answer);expl=t.why}
  else{const v=parseInt(($('#ans').value||'').replace('/','').trim(),10);if(isNaN(v)){$('#fb').innerHTML='<div class="fb hint">'+T('Escribe un número primero.')+'</div>';return}
    ok=v===t;expl=state.mask.map(x=>x+' = '+bin(x,8)).join('<br>')+'<br>'+T('Unos')+': '+state.mask.map(x=>(MASK_VALUES.find(m=>m[0]===x)||[0,0])[1]).join(' + ')+' = <b>/'+t+'</b>'}
  state.answered=true;const id=L.id;let s=prog.streak[id]||0;s=ok?s+1:0;prog.streak[id]=s;
  let justDone=false;if(ok&&s>=NEED&&!prog.done.includes(id)){prog.done.push(id);justDone=true;addLog({type:'lab',title:T('Nivel {n} completado: {title} ({sub})',{n:prog.cur+1,title:T(L.title),sub:T(L.sub)}),note:T('{n} aciertos seguidos en el laboratorio',{n:NEED})})}
  save();
  $('.streak').outerHTML=streakHTML(justDone);
  const fb=$('#fb');
  if(justDone){const next=prog.cur+1<LEVELS.length;
    fb.innerHTML=`<div class="fb ok win"><b>${T('¡Nivel {n} completado!',{n:prog.cur+1})}</b><span>${expl}</span>${next?'<button class="btn" id="nxtlvl" type="button">'+T('Ir al nivel {n}',{n:prog.cur+2})+'</button>':'<span>'+T('Has completado todos los niveles de Práctica. Sigue con el <a href="#curso">Curso</a> y mantén lo aprendido en <a href="#repaso">Repaso</a>.')+'</span>'}<button class="btn ghost" id="nxt" type="button">${T('Seguir practicando aquí')}</button></div>`;
    paintPath();
    const nl=$('#nxtlvl');
    document.querySelectorAll('#chk,#hint').forEach(b=>b.disabled=true);
    $('#nxt').addEventListener('click',newQ);
    if(nl){nl.addEventListener('click',goNext);nl.focus({preventScroll:true})}else $('#nxt').focus({preventScroll:true});
    return;
  } else {
    fb.innerHTML=`<div class="fb ${ok?'ok':'bad'}">${ok?T('¡Correcto!')+' ':T('No es correcto. La racha vuelve a 0, no pasa nada.')+' '}<br>${expl}</div><div class="row" style="margin-top:10px"><button class="btn" id="nxt" type="button">${T('Siguiente')}</button></div>`;
  }
  document.querySelectorAll('#chk,#hint').forEach(b=>b.disabled=true);
  $('#nxt').addEventListener('click',newQ);$('#nxt').focus({preventScroll:true});
}

/* calculadora de bits */
const C={mode:1,v:[0,0,0,0]};
const ones=n=>{let c=0;while(n){c+=n&1;n>>=1}return c};
function buildCalc(){const n=C.mode;
  $('#calc-octs').innerHTML=Array.from({length:n},(_,o)=>`<div class="coct">
    <div class="chead"><span class="eyebrow">${n>1?T('Octeto {n}',{n:o+1}):T('Octeto')}</span>
    <label class="cin">${T('Decimal')} <input type="text" inputmode="numeric" autocomplete="off" id="calc-in-${o}" data-o="${o}" value="${C.v[o]}"></label></div>
    <div class="board b8 cb">${W8.map(w=>`<button type="button" class="sw" data-o="${o}" data-w="${w}" aria-pressed="false" aria-label="${T('Octeto {o}, interruptor {w}',{o:o+1,w})}"><span class="w">${w}</span><span class="v">0</span></button>`).join('')}</div>
    <div class="cread" id="calc-r-${o}"></div></div>`).join('');
  document.querySelectorAll('#calc-octs .sw').forEach(b=>b.addEventListener('click',()=>{C.v[+b.dataset.o]^=+b.dataset.w;paintCalc()}));
  document.querySelectorAll('#calc-octs input').forEach(i=>i.addEventListener('input',()=>{const o=+i.dataset.o,t=i.value.trim(),v=parseInt(t,10);
    if(t===''){C.v[o]=0;paintCalc(i)}else if(/^\d+$/.test(t)&&v<=255){C.v[o]=v;paintCalc(i)}}));
  document.querySelectorAll('.segb').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.m===n)));
  paintCalc();
}
function paintCalc(src){const n=C.mode;let total=0;
  for(let o=0;o<n;o++){const v=C.v[o],k=ones(v);total+=k;
    document.querySelectorAll(`#calc-octs .sw[data-o="${o}"]`).forEach(b=>{const on=!!(v&+b.dataset.w);b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));b.querySelector('.v').textContent=on?1:0});
    const inp=$('#calc-in-'+o);if(inp!==src)inp.value=v;
    const parts=W8.filter(w=>v&w);
    $('#calc-r-'+o).innerHTML=`<span><b>${k}</b> ${k===1?T('uno'):T('unos')}</span><span>${bin(v,8)} → ${parts.length?parts.join(' + ')+' = ':''}<b>${v}</b></span>`;
  }
  let h=`<div class="ctot"><span class="k">${T('Unos encendidos')}</span><span class="bigc">${total}</span></div>`;
  if(n===1){h+=`<div class="ctot"><span class="k">${T('Valor del octeto')}</span><span class="bigc">${C.v[0]}</span></div>`}
  else{const all=C.v.map(x=>bin(x,8)).join(''),valid=/^1*0*$/.test(all);
    h+=`<div class="ctot"><span class="k">${T('En decimal')}</span><span class="v">${C.v.join('.')}</span></div>
      <div class="ctot"><span class="k">${T('¿Es una máscara?')}</span><span class="v ${valid?'okc':'badc'}">${valid?T('Sí → /{n}',{n:total}):T('No: los unos no van seguidos desde la izquierda')}</span></div>`}
  $('#calc-sum').innerHTML=h;
}
document.querySelectorAll('.segb').forEach(b=>b.addEventListener('click',()=>{C.mode=+b.dataset.m;buildCalc()}));
$('#calc-clear').addEventListener('click',()=>{C.v=[0,0,0,0];paintCalc()});
buildCalc();
function setCalc(open){$('#calc').hidden=!open;$('#calc-fab').setAttribute('aria-expanded',String(open));$('#calc-fab').textContent=open?T('Ocultar calculadora'):T('Calculadora');
  document.body.classList.toggle('calc-open',open);try{localStorage.setItem('cyberlab-calc',open?'1':'0')}catch(e){}}
$('#calc-fab').addEventListener('click',()=>setCalc($('#calc').hidden));
$('#calc-close').addEventListener('click',()=>{setCalc(false);$('#calc-fab').focus()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#calc').hidden){setCalc(false);$('#calc-fab').focus()}});
try{if(localStorage.getItem('cyberlab-calc')==='1'&&window.innerWidth>=1100)setCalc(true)}catch(e){}

/* ================= HOJA DE RUTA ================= */
const STATUS={pendiente:'Pendiente',estudiando:'Estudiando',programado:'Examen programado',aprobado:'Aprobado'};
const CERTS=[
 {id:'ccst-net',name:'Cisco CCST Networking',org:'Cisco',code:'100-150',lvl:'Inicial',rec:1,url:'https://www.cisco.com/site/us/en/learn/training-certifications/certifications/index.html',desc:'Primer certificado de redes de Cisco. Cubre justo lo que estás aprendiendo: IP, subredes, puertos y cómo se conecta una red.'},
 {id:'ccst-cyber',name:'Cisco CCST Cybersecurity',org:'Cisco',code:'100-160',lvl:'Inicial',rec:1,url:'https://www.cisco.com/site/us/en/learn/training-certifications/certifications/index.html',desc:'Conceptos básicos de seguridad: amenazas, defensa, control de acceso y respuesta a incidentes.'},
 {id:'isc2-cc',name:'ISC2 Certified in Cybersecurity (CC)',org:'ISC2',code:'CC',lvl:'Inicial',url:'https://www.isc2.org/certifications/cc',desc:'Fundamentos de seguridad de la misma organización que el CISSP. Opcional si ya haces los CCST.'},
 {id:'ccna',name:'Cisco CCNA',org:'Cisco',code:'200-301',lvl:'Asociado',rec:1,url:'https://www.cisco.com/site/us/en/learn/training-certifications/certifications/index.html',desc:'La certificación de redes más reconocida del mundo. Subnetting, routing, switching y seguridad de red.'},
 {id:'netplus',name:'CompTIA Network+',org:'CompTIA',code:'N10-009',lvl:'Asociado',url:'https://www.comptia.org/certifications/network',desc:'Alternativa a CCNA, sin centrarse en equipos Cisco. Con hacer una de las dos basta.'},
 {id:'secplus',name:'CompTIA Security+',org:'CompTIA',code:'SY0-701',lvl:'Asociado',rec:1,url:'https://www.comptia.org/certifications/security',desc:'La más pedida en ofertas de empleo de entrada en seguridad en EE. UU.'},
 {id:'ccna-cyber',name:'Cisco CCNA Cybersecurity',org:'Cisco',code:'200-201',lvl:'Asociado',rec:1,url:'https://www.cisco.com/site/us/en/learn/training-certifications/certifications/index.html',desc:'Antes CyberOps Associate. Enfocada en SOC: monitorizar, detectar y responder a ataques.'},
 {id:'cysa',name:'CompTIA CySA+',org:'CompTIA',code:'CS0-003',lvl:'Intermedio',url:'https://www.comptia.org/certifications/cybersecurity-analyst',desc:'Analista de seguridad (Blue Team): análisis de logs, SIEM y gestión de vulnerabilidades.'},
 {id:'ejpt',name:'INE eJPT',org:'INE',code:'eJPT',lvl:'Intermedio',url:'https://security.ine.com/certifications/ejpt-certification/',desc:'Primer certificado práctico de pentesting: atacas máquinas reales en un laboratorio.'},
 {id:'pentest',name:'CompTIA PenTest+',org:'CompTIA',code:'PT0-003',lvl:'Intermedio',url:'https://www.comptia.org/certifications/pentest',desc:'Pentesting con más teoría y metodología. Útil si te inclinas por la rama ofensiva.'},
 {id:'ccnp-cyber',name:'Cisco CCNP Cybersecurity',org:'Cisco',code:'350-201 + concentración',lvl:'Profesional',rec:1,url:'https://www.cisco.com/site/us/en/learn/training-certifications/certifications/index.html',desc:'Nivel profesional de Cisco en ciberseguridad: un examen troncal más uno de especialidad.'},
 {id:'oscp',name:'OffSec OSCP',org:'OffSec',code:'PEN-200',lvl:'Profesional',url:'https://www.offsec.com/courses/pen-200/',desc:'La referencia en pentesting: examen práctico de 24 horas atacando máquinas.'},
 {id:'securityx',name:'CompTIA SecurityX',org:'CompTIA',code:'CAS-005',lvl:'Experto',url:'https://www.comptia.org/certifications/securityx',desc:'Antes CASP+. Arquitectura e ingeniería de seguridad a nivel avanzado.'},
 {id:'cissp',name:'ISC2 CISSP',org:'ISC2',code:'CISSP',lvl:'Experto',rec:1,top:1,url:'https://www.isc2.org/certifications/cissp',desc:'La certificación de seguridad más valorada para puestos senior. Exige unos 5 años de experiencia laboral en seguridad.'},
 {id:'ccie-sec',name:'Cisco CCIE Security',org:'Cisco',code:'CCIE',lvl:'Experto',top:1,url:'https://www.cisco.com/site/us/en/learn/training-certifications/certifications/index.html',desc:'La cima de Cisco: examen escrito más un laboratorio práctico de 8 horas.'},
];
const CERT=Object.fromEntries(CERTS.map(c=>[c.id,c]));
const PHASES=[
 {id:'f1',name:'Fundamentos',time:'2–4 meses',goal:'Entender cómo viaja la información y cómo funcionan los sistemas.',topics:[
   {id:'binario',t:'Binario y octetos',lab:['leer4','escribir4','leer8','escribir8','ip']},
   {id:'mascaras',t:'Máscaras y notación CIDR',lab:['mascara']},
   {id:'ip-nat',t:'IP pública, IP privada y NAT'},
   {id:'dns',t:'DNS (nslookup, dig)'},
   {id:'puertos',t:'Puertos y servicios comunes',lab:['puertos']},
   {id:'tcp',t:'TCP, UDP y el saludo de 3 pasos',lab:['saludo']},
   {id:'subnetting',t:'Subnetting: dividir redes',lab:['subredes']},
   {id:'linux',t:'Linux: terminal, permisos, procesos, logs'},
   {id:'windows-ad',t:'Windows y Active Directory'},
   {id:'python',t:'Python para automatizar tareas'}],
  links:[
   {g:'Redes Cisco (CCNA)',items:[
    ['Módulo extra Redes Cisco (en el Curso)','#curso'],
    ['Laboratorio de redes: 6 ejercicios visuales','#redes'],
    ['Cisco Packet Tracer (gratis, en Networking Academy)','https://www.netacad.com/cisco-packet-tracer'],
    ['Demo del dashboard de Cisco Meraki','https://www.cisco.com/c/en/us/solutions/small-business/meraki-demo.html'],
    ['Cisco DevNet Sandbox (laboratorios gratis)','https://developer.cisco.com/site/sandbox/']]}],
  certs:['ccst-net','ccst-cyber','isc2-cc']},
 {id:'f2',name:'Seguridad base',time:'3–4 meses',goal:'Conceptos de seguridad, herramientas y tu propio laboratorio.',topics:[
   {id:'cia',t:'Tríada CIA y gestión de riesgos'},
   {id:'cripto',t:'Criptografía básica: hash, cifrado, claves públicas'},
   {id:'owasp',t:'OWASP Top 10 (inyección SQL, XSS…)'},
   {id:'tools',t:'Nmap, Wireshark y Burp Suite'},
   {id:'homelab',t:'Laboratorio en casa: Kali + máquinas vulnerables'},
   {id:'vulns',t:'Gestión de vulnerabilidades y parches'}],
  links:[
   {g:'PortSwigger Web Security Academy (gratis, labs Apprentice)',items:[
    ['SQL injection','https://portswigger.net/web-security/sql-injection'],
    ['Cross-site scripting (XSS)','https://portswigger.net/web-security/cross-site-scripting'],
    ['Control de acceso','https://portswigger.net/web-security/access-control'],
    ['Autenticación y enumeración de usuarios','https://portswigger.net/web-security/authentication']]},
   {g:'TryHackMe',items:[
    ['Pre Security (ruta de introducción)','https://tryhackme.com/path/outline/presecurity'],
    ['OWASP Top 10 - 2021','https://tryhackme.com/room/owasptop102021'],
    ['Burp Suite: The Basics','https://tryhackme.com/room/burpsuitebasics'],
    ['Wireshark: The Basics','https://tryhackme.com/room/wiresharkthebasics'],
    ['Nmap: The Basics (búscala en TryHackMe)','https://tryhackme.com/hacktivities?tab=search&query=nmap']]},
   {g:'Laboratorio en casa',items:[
    ['UTM: máquinas virtuales en el Mac','https://mac.getutm.app'],
    ['Kali Linux (elige ARM64 si tu Mac tiene chip Apple)','https://www.kali.org/get-kali/'],
    ['Mi lab: Juice Shop y DVWA con Docker en tu Mac','#milab']]}],
  certs:['ccna','netplus','secplus']},
 {id:'f3',name:'Especialidad',time:'6–12 meses',goal:'Elegir una rama y practicar en serio.',topics:[
   {id:'rama',t:'Elegir rama: AppSec, Pentesting, Blue Team o Cloud'},
   {id:'portswigger',t:'PortSwigger Web Security Academy'},
   {id:'thm',t:'Rutas de TryHackMe / Hack The Box'},
   {id:'siem',t:'SIEM y análisis de logs (Splunk, Elastic)'},
   {id:'auditar',t:'Auditar tus propios proyectos'}],
  links:[
   {g:'Para elegir rama',items:[
    ['PortSwigger: todos los temas (AppSec / pentesting web)','https://portswigger.net/web-security'],
    ['TryHackMe SOC Level 1 (Blue Team)','https://tryhackme.com/path/outline/soclevel1']]}],
  certs:['ccna-cyber','cysa','ejpt','pentest']},
 {id:'f4',name:'Experiencia real',time:'Continuo',goal:'Demostrar lo que sabes con trabajo real.',topics:[
   {id:'writeups',t:'Portafolio de writeups en GitHub'},
   {id:'bugbounty',t:'Primer reporte en bug bounty (HackerOne, Bugcrowd)'},
   {id:'freelance',t:'Primer cliente de seguridad como freelance'},
   {id:'comunidad',t:'Comunidad: BSides Florida, Discord, LinkedIn'}],
  certs:[]},
 {id:'f5',name:'Experto',time:'3–5+ años',goal:'Profundidad, liderazgo y las certificaciones más altas.',topics:[
   {id:'exploit',t:'Exploit development / red teaming avanzado'},
   {id:'arquitectura',t:'Arquitectura de seguridad'},
   {id:'mentoria',t:'Enseñar o mentorizar a otros'}],
  certs:['ccnp-cyber','oscp','securityx','cissp','ccie-sec']},
];
const ALL_TOPICS=PHASES.flatMap(p=>p.topics);
const certState=id=>Object.assign({status:'pendiente',date:'',score:'',cred:'',notes:''},prog.certs[id]||{});
const topicDone=t=>!!prog.topics[t.id]||(t.lab?t.lab.every(l=>prog.done.includes(l)):false);
function phaseProgress(p){const items=p.topics.map(topicDone);const cs=p.certs.filter(c=>CERT[c].rec);const certDone=cs.map(c=>certState(c).status==='aprobado');
  const all=items.concat(certDone);return {done:all.filter(Boolean).length,total:all.length}}
function paintOverall(){const cOk=CERTS.filter(c=>certState(c.id).status==='aprobado').length;
  $('#overall').innerHTML=T('Temas')+' <b>'+ALL_TOPICS.filter(topicDone).length+'/'+ALL_TOPICS.length+'</b> · '+T('Certificaciones')+' <b>'+cOk+'</b>'}

function renderRuta(){
  const curPhase=PHASES.findIndex(p=>{const g=phaseProgress(p);return g.done<g.total});
  const ph=PHASES[curPhase<0?PHASES.length-1:curPhase];
  const nextTopic=ph.topics.find(t=>!topicDone(t));
  const nextCert=CERTS.find(c=>c.rec&&certState(c.id).status!=='aprobado');
  $('#v-ruta').innerHTML=`
   <section class="card"><div class="eyebrow">${T('Tu siguiente paso')}</div>
    <div class="next">
     <div><div class="k">${T('Fase actual')}</div><div class="v">${curPhase<0?T('Ruta completada'):(PHASES.indexOf(ph)+1)+'. '+esc(T(ph.name))}</div></div>
     <div><div class="k">${T('Tema')}</div><div class="v">${nextTopic?esc(T(nextTopic.t)):T('Todos los temas de esta fase listos')}</div></div>
     <div><div class="k">${T('Próxima certificación')}</div><div class="v">${nextCert?esc(nextCert.name):T('Todas las recomendadas aprobadas')}</div></div>
    </div>${window.Course?(()=>{const g=Course.progress();return `<div class="row"><a class="btn" href="#curso">${g.done?T('Continuar el curso'):T('Empezar el curso')} →</a><span class="muted">${T('{d} de {n} lecciones de la Fase {p} completadas',{d:g.done,n:g.total,p:g.phase})}</span></div>`})():''}</section>
   <div class="phases">${PHASES.map((p,i)=>{const g=phaseProgress(p),pct=g.total?Math.round(g.done/g.total*100):0;const complete=g.done===g.total;
    return `<div class="phase${complete?' complete':''}${i===curPhase?' active':''}"><div class="pn">${complete?'✓':i+1}</div>
     <section class="card"><div class="phead"><h2>${esc(T(p.name))}</h2><span class="muted">${T(p.time)} · ${pct}%</span></div>
      <p class="muted">${esc(T(p.goal))}</p><div class="bar" aria-hidden="true"><span style="width:${pct}%"></span></div>
      <div class="cols"><div><h3>${T('Temas')}</h3><ul class="checks">${p.topics.map(t=>{const d=topicDone(t);
        const lid=window.Course&&Course.lessonForTopic(t.id);
        const lab=(t.lab?` <a href="#practica" data-lab="${t.lab.find(l=>!prog.done.includes(l))||t.lab[0]}">${T('Practicar →')}</a>`:'')+(lid?` <a href="#curso" data-lesson="${lid}">${T('Lección →')}</a>`:'');
        return `<li class="${d?'done':''}"><input type="checkbox" id="tp-${t.id}" data-t="${t.id}" ${d?'checked':''} ${t.lab&&t.lab.every(l=>prog.done.includes(l))?'disabled title="'+T('Completado en el laboratorio')+'"':''}><label for="tp-${t.id}">${esc(T(t.t))}${lab}</label></li>`}).join('')}</ul></div>
      ${p.certs.length?`<div><h3>${T('Certificaciones')}</h3><div class="minicerts">${p.certs.map(id=>{const c=CERT[id],s=certState(id);
        return `<a class="mc" href="#certs" data-focus="${id}"><span>${esc(c.name)}${c.rec?' <span class="tag rec">'+T('Recomendada')+'</span>':''}${c.top?' <span class="tag top">'+T('Cumbre')+'</span>':''}</span><span class="pill ${s.status}">${T(STATUS[s.status])}</span></a>`}).join('')}</div></div>`:''}
      </div>${p.links?`<details class="xlinks"${i===curPhase?' open':''}><summary>${T('Práctica externa')}</summary><p class="muted">${T('Plataformas legales para practicar. Al terminar algo, anótalo en Resultados.')}</p><div class="cols">${p.links.map(g=>`<div><h3>${esc(T(g.g))}</h3><ul class="xl">${g.items.map(([n,u])=>`<li>${u.startsWith('#')?`<a href="${esc(u)}">${esc(T(n))} →</a>`:`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(T(n))} ↗</a>`}</li>`).join('')}</ul></div>`).join('')}</div></details>`:''}</section></div>`}).join('')}</div>`;
  document.querySelectorAll('#v-ruta input[data-t]').forEach(i=>i.addEventListener('change',()=>{const t=ALL_TOPICS.find(x=>x.id===i.dataset.t);
    if(i.checked){prog.topics[t.id]=today();addLog({type:'tema',title:T('Tema completado: {t}',{t:T(t.t)})})}else delete prog.topics[t.id];save();renderRuta();paintOverall()}));
  document.querySelectorAll('#v-ruta a[data-lesson]').forEach(a=>a.addEventListener('click',()=>Course.open(a.dataset.lesson)));
  document.querySelectorAll('#v-ruta a[data-lab]').forEach(a=>a.addEventListener('click',()=>{prog.cur=Math.max(0,LEVELS.findIndex(L=>L.id===a.dataset.lab));save();render()}));
  document.querySelectorAll('#v-ruta a[data-focus]').forEach(a=>a.addEventListener('click',()=>{focusCert=a.dataset.focus}));
}

let focusCert=null;
function renderCerts(){
  const groups=['Inicial','Asociado','Intermedio','Profesional','Experto'];
  $('#v-certs').innerHTML=`<section class="card"><h2>${T('Certificaciones')}</h2>
    <p class="muted" style="max-width:65ch">${T('No necesitas todas. Las marcadas como <span class="tag rec">Recomendada</span> forman la ruta sugerida, centrada en Cisco, desde la primera hasta la <span class="tag top">Cumbre</span>. Guarda aquí el estado, la fecha del examen y tu nota. Los precios y versiones cambian: confírmalos siempre en la web oficial antes de pagar.')}</p></section>
   ${groups.map(g=>{const cs=CERTS.filter(c=>c.lvl===g);return `<div class="lvlhead">${T(g)}</div><div class="certgrid">${cs.map(c=>{const s=certState(c.id);
    return `<section class="card cert is-${s.status}" id="cert-${c.id}">
     <div class="ctop"><div><div class="corg">${esc(c.org)} · ${esc(c.code)}</div><h3>${esc(c.name)}</h3></div><span class="pill ${s.status}">${T(STATUS[s.status])}</span></div>
     ${c.rec||c.top?`<div class="ctags">${c.rec?'<span class="tag rec">'+T('Recomendada')+'</span>':''}${c.top?'<span class="tag top">'+T('Cumbre')+'</span>':''}</div>`:''}
     <p class="muted">${esc(T(c.desc))}</p>
     <div class="form" data-c="${c.id}">
      <label>${T('Estado')}<select data-f="status">${Object.entries(STATUS).map(([k,v])=>`<option value="${k}" ${s.status===k?'selected':''}>${T(v)}</option>`).join('')}</select></label>
      <label>${T('Fecha del examen')}<input type="date" data-f="date" value="${esc(s.date)}"></label>
      <label>${T('Nota obtenida')}<input type="text" data-f="score" value="${esc(s.score)}" placeholder="${T('ej. 812/1000')}"></label>
      <label>${T('ID de credencial')}<input type="text" data-f="cred" value="${esc(s.cred)}" placeholder="${T('opcional')}"></label>
      <label class="full">${T('Notas')}<textarea data-f="notes" placeholder="${T('Recursos, fechas, qué te costó…')}">${esc(s.notes)}</textarea></label>
     </div>
     <a class="clink" href="${c.url}" target="_blank" rel="noopener">${T('Página oficial ↗')}</a></section>`}).join('')}</div>`}).join('')}`;
  document.querySelectorAll('#v-certs .form').forEach(f=>{const id=f.dataset.c;
    f.querySelectorAll('[data-f]').forEach(el=>el.addEventListener('change',()=>{const before=certState(id).status;const s=certState(id);s[el.dataset.f]=el.value;prog.certs[id]=s;
      if(el.dataset.f==='status'&&before!==el.value){const c=CERT[id];
        if(el.value==='aprobado'){if(!s.date){s.date=today();f.querySelector('[data-f=date]').value=s.date}addLog({type:'oficial',title:T('¡Certificación aprobada: {c}!',{c:c.name}),cert:id,score:s.score,date:s.date})}
        else if(el.value==='programado')addLog({type:'otro',title:T('Examen programado: {c}',{c:c.name}),cert:id});
        else if(el.value==='estudiando')addLog({type:'estudio',title:T('Empiezo a estudiar: {c}',{c:c.name}),cert:id});
        const card=$('#cert-'+id);card.className='card cert is-'+el.value;const p=card.querySelector('.pill');p.className='pill '+el.value;p.textContent=T(STATUS[el.value])}
      save();paintOverall()}))});
  if(focusCert){const el=$('#cert-'+focusCert);focusCert=null;if(el)setTimeout(()=>el.scrollIntoView({block:'center'}),0)}
}

const TYPES={estudio:'Sesión de estudio',practica:'Examen de práctica',lab:'Laboratorio',curso:'Lección del curso',oficial:'Examen oficial',tema:'Tema completado',otro:'Otro'};
function renderResultados(){
  const hours=prog.log.reduce((a,e)=>a+(parseFloat(e.hours)||0),0);
  const cOk=CERTS.filter(c=>certState(c.id).status==='aprobado').length;
  const list=prog.log.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(+b.id)-(+a.id));
  $('#v-resultados').innerHTML=`
   <div class="tiles">
    <div class="tile"><span class="k">${T('Certificaciones aprobadas')}</span><span class="v">${cOk}</span></div>
    <div class="tile"><span class="k">${T('Temas completados')}</span><span class="v">${ALL_TOPICS.filter(topicDone).length}<span class="muted" style="font-size:20px">/${ALL_TOPICS.length}</span></span></div>
    <div class="tile"><span class="k">${T('Niveles del laboratorio')}</span><span class="v">${prog.done.length}<span class="muted" style="font-size:20px">/${LEVELS.length}</span></span></div>
    <div class="tile"><span class="k">${T('Horas registradas')}</span><span class="v">${Math.round(hours*10)/10}</span></div>
   </div>
   <section class="card"><h2>${T('Añadir un resultado')}</h2>
    <form class="lf" id="logf">
     <label>${T('Fecha')}<input type="date" id="lg-date" value="${today()}" required></label>
     <label>${T('Tipo')}<select id="lg-type">${['estudio','practica','lab','oficial','otro'].map(k=>`<option value="${k}">${T(TYPES[k])}</option>`).join('')}</select></label>
     <label>${T('Certificación relacionada')}<select id="lg-cert"><option value="">${T('Ninguna')}</option>${CERTS.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
     <label>${T('Horas')}<input type="number" id="lg-hours" min="0" step="0.25" placeholder="${T('ej. 1.5')}"></label>
     <label>${T('Nota o resultado')}<input type="text" id="lg-score" placeholder="${T('ej. 78% o máquina resuelta')}"></label>
     <label class="full">${T('Qué hiciste')}<input type="text" id="lg-title" required placeholder="${esc(T("ej. Sala 'Nmap' de TryHackMe, examen de práctica Security+ #2"))}"></label>
     <label class="full">${T('Notas')}<textarea id="lg-note" placeholder="${T('Qué aprendiste, qué falló, qué repasar')}"></textarea></label>
     <div class="row full"><button class="btn" type="submit">${T('Guardar resultado')}</button></div>
    </form></section>
   <section class="card"><h2>${T('Historial')}</h2>
    ${list.length?`<ul class="log">${list.map(e=>`<li><span class="d">${esc(e.date)}</span><div><div class="t">${esc(e.title)}</div>
      <div class="n">${esc(T(TYPES[e.type]||''))}${e.cert&&CERT[e.cert]?' · '+esc(CERT[e.cert].name):''}${e.hours?' · '+esc(e.hours)+' h':''}${e.score?' · '+esc(e.score):''}</div>${e.note?`<div class="n">${esc(e.note)}</div>`:''}</div>
      <button type="button" data-del="${esc(e.id)}" aria-label="${T('Borrar esta entrada')}">${T('Borrar')}</button></li>`).join('')}</ul>`
     :'<p class="empty">'+T('Todavía no hay nada. Cada nivel del laboratorio, tema marcado o certificación aprobada aparecerá aquí, y puedes añadir tus sesiones de estudio y exámenes de práctica con el formulario.')+'</p>'}
   </section>
   <section class="card"><h2>${T('Copia de seguridad')}</h2>
    <p class="muted" style="max-width:65ch">${T('Todo se guarda en este navegador. Descarga una copia para no perder tu progreso, y usa Importar para recuperarlo en otro equipo o navegador.')}</p>
    <div class="row"><button class="btn" type="button" id="bk-out">${T('Descargar copia')}</button><label class="btn ghost" style="display:inline-block;cursor:pointer">${T('Importar copia')}<input type="file" id="bk-in" accept="application/json,.json" hidden></label></div>
    <div id="bk-msg"></div></section>`;
  $('#logf').addEventListener('submit',e=>{e.preventDefault();const title=$('#lg-title').value.trim();if(!title)return;
    addLog({date:$('#lg-date').value||today(),type:$('#lg-type').value,cert:$('#lg-cert').value,hours:$('#lg-hours').value,score:$('#lg-score').value.trim(),title,note:$('#lg-note').value.trim()});save();renderResultados()});
  document.querySelectorAll('#v-resultados [data-del]').forEach(b=>b.addEventListener('click',()=>{prog.log=prog.log.filter(x=>x.id!==b.dataset.del);save();renderResultados()}));
  $('#bk-out').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(Object.assign({app:'cyber-lab',exported:new Date().toISOString()},prog),null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='cyber-lab-'+today()+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    $('#bk-msg').innerHTML='<div class="fb ok">'+T('Copia descargada.')+'</div>'});
  $('#bk-in').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!d||!Array.isArray(d.done))throw 0;
      delete d.app;delete d.exported;prog=Object.assign({done:[],streak:{},cur:0,topics:{},certs:{},log:[]},d);save();render();renderResultados();$('#bk-msg').innerHTML='<div class="fb ok">'+T('Copia importada. Tu progreso está restaurado.')+'</div>'}
    catch(err){$('#bk-msg').innerHTML='<div class="fb bad">'+T('Ese archivo no es una copia de Cyber Lab. Elige el archivo .json que descargaste con "Descargar copia".')+'</div>'}};r.readAsText(f)});
}

/* Mi lab: apps vulnerables a propósito en Docker, solo en localhost */
const LAB_APPS=[
 {id:'juice',name:'OWASP Juice Shop',url:'http://localhost:3000',login:'Sin usuario: regístrate dentro de la tienda.',
  what:'Tienda web moderna con más de 100 retos (inyección, XSS, control de acceso, lógica de negocio…).',
  tip:'Primer reto: encontrar el "Score Board" oculto. Desde ahí ves todos los retos y cuáles llevas.'},
 {id:'dvwa',name:'DVWA',url:'http://localhost:4280',login:'admin / password',
  what:'App PHP clásica con un módulo por vulnerabilidad y cuatro niveles de dificultad.',
  tip:'La primera vez pulsa "Create / Reset Database". Empieza con el nivel de seguridad en Low y súbelo cuando lo domines.'}];
const LAB_CMDS={
 up:'cd ~/cyber-lab/lab && docker compose up -d',
 ps:'cd ~/cyber-lab/lab && docker compose ps',
 stop:'cd ~/cyber-lab/lab && docker compose stop',
 down:'cd ~/cyber-lab/lab && docker compose down -v'};
function labCmd(k){return `<div class="lab-cmd"><pre>${esc(LAB_CMDS[k])}</pre><button class="btn ghost" type="button" data-copy="${k}">${T('Copiar')}</button></div>`}
function renderMiLab(){
  $('#v-milab').innerHTML=`
  <section class="card"><h2>${T('Mi laboratorio')}</h2>
   <p>${T('Dos aplicaciones hechas <b>vulnerables a propósito</b> para practicar en tu Mac, sin riesgo para nadie. Funcionan con Docker y solo escuchan en <code>localhost</code>: nadie de tu red ni de internet puede entrar.')}</p>
   <p class="muted">${T('El navegador no puede instalar nada en tu ordenador, por eso los pasos se hacen en la Terminal del Mac. Solo la primera vez tarda (descarga ~1 GB).')}</p></section>
  <section class="card" id="ml-isolated"></section>
  <section class="card" id="ml-retos"></section>
  <p class="eyebrow ml-or">${T('Otra opción: encenderlo tú con docker compose')}</p>
  <section class="card"><h2>${T('1. Instala Docker Desktop (una vez)')}</h2>
   <p>${T('Descárgalo, ábrelo y espera a que diga que está en marcha.')} <a href="https://www.docker.com/products/docker-desktop/" target="_blank" rel="noopener noreferrer">Docker Desktop ↗</a></p>
   <p class="muted">${T('En Ajustes → Resources puedes limitar la memoria (con 4 GB basta) para que el Mac no se ponga lento.')}</p></section>
  <section class="card"><h2>${T('2. Enciende el laboratorio')}</h2>
   <p>${T('Pega esto en la Terminal del Mac:')}</p>${labCmd('up')}
   <p class="muted">${T('Para ver si está todo en marcha:')}</p>${labCmd('ps')}</section>
  <section class="card"><h2>${T('3. Practica')}</h2>
   <div class="lab-apps">${LAB_APPS.map(a=>`<div class="lab-app"><h3>${esc(a.name)} <span class="pill pendiente" id="st-${a.id}">${T('Sin comprobar')}</span></h3>
     <p>${esc(T(a.what))}</p><p><b>${T('Acceso:')}</b> ${esc(T(a.login))}</p><p class="muted">${esc(T(a.tip))}</p>
     <div class="row"><a class="btn" href="${a.url}" target="_blank" rel="noopener noreferrer">${T('Abrir')} ${esc(a.url.replace('http://',''))} ↗</a></div></div>`).join('')}</div>
   <div class="row"><button class="btn ghost" type="button" id="lab-check">${T('Comprobar si están encendidas')}</button><span class="muted" id="lab-msg"></span></div>
   <ul class="lab-steps">
    <li>${T('Combínalas con la teoría: lo que veas en PortSwigger, pruébalo aquí.')}</li>
    <li>${T('Cuando resuelvas algo, anótalo en <a href="#resultados">Resultados</a> (tipo Laboratorio) y, si quieres, escribe una lección propia (mira CONTENIDO.md).')}</li>
    <li>${T('Después de atacar, piensa cómo lo arreglarías en tu propio código Laravel. Esa es la parte que más vale.')}</li></ul></section>
  <section class="card"><h2>${T('4. Apágalo al terminar')}</h2>
   <p>${T('Así no gasta memoria ni batería:')}</p>${labCmd('stop')}
   <p class="muted">${T('Para borrarlo todo y empezar de cero (también la base de datos de DVWA):')}</p>${labCmd('down')}</section>
  <section class="card"><h2>${T('Reglas del laboratorio')}</h2>
   <ul class="lab-steps">
    <li>${T('Ataca solo estas apps, tu home lab o plataformas que lo permitan. Nunca webs o equipos de otros sin permiso por escrito.')}</li>
    <li>${T('No cambies <code>127.0.0.1</code> por <code>0.0.0.0</code> en <code>lab/docker-compose.yml</code> ni lo subas a un servidor: son apps rotas a propósito.')}</li>
    <li>${T('Apágalo cuando no lo uses.')}</li></ul></section>`;
  document.querySelectorAll('#v-milab [data-copy]').forEach(b=>b.addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(LAB_CMDS[b.dataset.copy]);b.textContent=T('Copiado ✓')}catch(e){b.textContent=T('Selecciónalo y copia')}
    setTimeout(()=>{b.textContent=T('Copiar')},1800)}));
  if(window.Labs)Labs.render($('#ml-isolated'));else $('#ml-isolated').hidden=true;
  if(window.Retos)Retos.render($('#ml-retos'));else $('#ml-retos').hidden=true;
  $('#lab-check').addEventListener('click',async()=>{
    $('#lab-msg').textContent=T('Comprobando…');let on=0;
    await Promise.all(LAB_APPS.map(async a=>{const el=$('#st-'+a.id);
      const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),2500);
      try{await fetch(a.url,{mode:'no-cors',cache:'no-store',signal:ctl.signal});on++;el.className='pill aprobado';el.textContent=T('Encendida')}
      catch(e){el.className='pill pendiente';el.textContent=T('No responde')}finally{clearTimeout(tm)}}));
    $('#lab-msg').textContent=on===LAB_APPS.length?T('Todo listo. ¡A practicar!'):T('Si acabas de encenderlo, espera un minuto. Si el navegador pide permiso para acceder a la red local, acéptalo; si lo bloquea, ábrelas con los botones.')});
}

/* navegación */
const VIEWS=['ruta','curso','repaso','terminal','practica','certs','resultados','milab','redes'];
window.CL={get prog(){return prog},save,addLog,paintOverall,
  _i18nData:()=>({LEVELS,PHASES,CERTS,STATUS,TYPES,PORT_NOTE,PORTS,TCP_Q}),
  replace(d){prog=Object.assign({done:[],streak:{},cur:0,topics:{},certs:{},log:[]},d||{});try{localStorage.setItem('cyberlab-v1',JSON.stringify(prog))}catch(e){}applyPrefs();render();route()}};
// Idioma y tema: se guardan también en el progreso para que viajen con tu cuenta
function applyPrefs(){const p=prog.prefs||{};if(p.lang&&p.lang!==I18N.lang)I18N.setLang(p.lang,true);if(p.theme&&p.theme!==I18N.theme)I18N.setTheme(p.theme,true);I18N.applyStatic()}
I18N.onChange((kind,v)=>{prog.prefs=Object.assign({},prog.prefs,{[kind]:v});save();
  if(kind==='lang'){render();route();$('#calc-fab').textContent=$('#calc').hidden?T('Calculadora'):T('Ocultar calculadora');buildCalc()}});
function route(){const h=(location.hash||'').slice(1),v=VIEWS.includes(h)?h:'ruta';document.body.dataset.view=v;
  VIEWS.forEach(x=>{$('#v-'+x).hidden=x!==v});
  document.querySelectorAll('.tabs a').forEach(a=>a.dataset.v===v?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'));
  if(v==='ruta')renderRuta();else if(v==='milab')renderMiLab();else if(v==='redes'&&window.NetLab)NetLab.render($('#v-redes'));else if(v==='certs')renderCerts();else if(v==='resultados')renderResultados();
  else if(v==='curso'&&window.Course)Course.render($('#v-curso'));else if(v==='terminal'&&window.Course)Course.renderFree($('#v-terminal'));
  else if(v==='repaso'&&window.Review)Review.render($('#v-repaso'));
  if(window.Review)Review.badge();
  paintOverall();window.scrollTo(0,0)}
window.addEventListener('hashchange',route);

applyPrefs();I18N.bindControls();
$('#calc-fab').textContent=$('#calc').hidden?T('Calculadora'):T('Ocultar calculadora');
render();
route();
document.addEventListener('cl-content',()=>{route()});
if(window.Sync)Sync.init();
})();
