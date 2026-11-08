# Escribir lecciones propias en Cyber Lab

Escribes en **`js/lessons/mis-lecciones.js`** y el motor hace el resto. No hace falta tocar `course.js`.
Tus lecciones aparecen al final de su fase, antes del examen. También añaden preguntas al examen y tarjetas al Repaso.

## Flujo de trabajo

```
cd ~/cyber-lab
node tools/check-lessons.js
python3 -m http.server 8090
```

1. Edita `js/lessons/mis-lecciones.js`. Copia el ejemplo comentado que trae y cámbialo.
2. Comprueba con `node tools/check-lessons.js`. Tiene que decir **✓ Sin errores**.
3. Prueba en el navegador con `python3 -m http.server 8090` y abre http://localhost:8090. Ctrl+C para pararlo.
4. Haz `git add -A`, `git commit -m "Lección: ..."` y `git push`.

¿Quieres más archivos? Crea `js/lessons/otra.js` con el mismo formato y añade su `<script>` en `index.html`, junto al de `mis-lecciones.js`.

## Formato de una lección

```js
{
  id: 'f2-burp',            // único. Empieza por la fase (f1- / f2-)
  title: 'Burp Suite básico',
  agent: 'marco',           // nova (instructora) · marco (redes) · lia (analista SOC)
  topics: ['tools'],        // temas de la Ruta que se marcan al terminar
  mins: 15,
  steps: [ ...pasos... ],
  outro: 'Mensaje final.',
}
```

## Los 4 tipos de paso

| Tipo | Para qué | Campos |
|---|---|---|
| `read` | Explicar algo; el alumno pulsa Continuar | `say` |
| `cmd` | Ejecutar un comando en la terminal | `check`, `try`, `hint`, `done` |
| `answer` | Escribir una respuesta corta | `accept: ['443', 'https']` (sin distinguir mayúsculas) |
| `choice` | Elegir una opción | `options: [{ t, ok: true, why }, { t, why }]`. Exactamente una lleva `ok: true` |

`hint` es una lista de pistas que se muestran de una en una. `done` es el mensaje que sale al acertar.
En `say` puedes usar `**negrita**` y `` `código` ``.

### Comprobar comandos (`check`)

- `has('cat')`: ejecutó `cat` con lo que sea.
- `has('cat', a => a.includes('notas.txt'))`: `cat` con `notas.txt` en los argumentos.
- `has('grep', a => /-i/.test(a))`: `grep` con la opción `-i`.
- `line(/\|\s*wc/)`: la línea completa encaja con la expresión (útil para tuberías).
- `ok(has('nmap'))`: además, el comando no dio error.

Para lecciones de **Cisco** (módulo extra, `phase: 'cisco'`) hay más ayudantes:

- `ios(/^sh\w*\s+vl/i)`: el alumno escribió ese comando dentro de IOS. Con un segundo argumento exige el modo en que queda, por ejemplo `ios(/^en/i, 'priv')`. Los modos son `user`, `priv`, `config`, `vlan`, `if`, `range`, `subif` y `linux` (salió de la consola).
- `net(sw => sw.vlans[30] === 'INVITADOS')`: comprueba el **estado** del switch y del router con `net((sw, r) => ...)`. Así vale cualquier forma de configurarlo.
- `reach('PC-Ventas1', '192.168.20.11')`: verdadero si ese PC llega a esa IP con la configuración actual.
- `all(a, b)`: se tienen que cumplir las dos condiciones.

En el simulador: `consola sw1` / `consola r1` para entrar en los equipos y `pcping <PC> <IP>` para probar desde los PCs.

Pon siempre **`try: 'el comando correcto'`**. El comprobador lo ejecuta en el simulador y avisa si tu `check` no lo acepta.

## Banco del examen y tarjetas

```js
bank: [
  ['web', '¿Qué cabecera evita que tu web se cargue en un iframe ajeno?',
   ['X-Frame-Options', 'Content-Type', 'Accept-Language'],   // la PRIMERA es la correcta (se barajan solas)
   'Protege contra clickjacking.'],
],
cards: [
  ['mi-burp-1', 'f2-burp', 'Pregunta de la tarjeta', 'respuesta', 'explicación'],
],
```

Temas existentes: Fase 2 `cia` `cripto` `vulns` `web` `tools` `lab` · Fase 3 `rama` `siem` `auditar` `informe` · Cisco `ios` `vlan` `trunk` `rout` `acl` `hard`.
Si necesitas otro, decláralo en `topics: { recon: ['Reconocimiento', 'f2-mi-leccion'] }`.

## Inglés

Sin traducción, el texto sale en español. El comprobador imprime un bloque `Object.assign(window.I18N_DICT.en, {...})` con los textos que faltan.
Pégalo al final de tu archivo y rellena las traducciones. La clave es el texto en español **exacto**.

## Archivos y comandos del simulador (opcional, en `js/terminal.js`)

- **Archivo nuevo en el home del alumno.** Busca `descargas: D('alumno', '755', {` y añade antes una línea como:
  `"mi_archivo.txt": F('alumno', '644', t("contenido"), 'alumno', 'Nov  7 09:00'),`
- **Comando nuevo.** Añade una función en `const CMDS = {` (fíjate en `pwd` o `wc`, que son cortos) y una línea en `EXPLICA`.
  Añádelo también al texto de `help`.
- **Herramientas grandes** (Burp, Metasploit, sqlmap…). No las simules: la lección explica y pregunta, y la práctica se hace en las plataformas de abajo.
- Si tocas `terminal.js`, pasa `node --check js/terminal.js` y luego el comprobador.

## Reglas de contenido

- Todo ataque se practica **solo** en el laboratorio, en tu home lab o en plataformas que lo permiten. Que cada lección lo diga.
- Cada técnica ofensiva va con su defensa: cómo se detecta y cómo se corrige.
- No pongas datos reales: IPs públicas de terceros, contraseñas ni claves. El simulador usa `10.10.10.x`.

---

# Lo que te toca (Fase 2 → Fase 3)

Ya tienes las lecciones teóricas de la Fase 2 (CIA, cripto, vulnerabilidades, web, herramientas y laboratorio) y el examen.
La práctica ofensiva real la haces fuera, en sitios legales hechos para eso. Luego escribes aquí lo que aprendiste.

## 1. Práctica guiada (gratis o casi)

**PortSwigger Web Security Academy.** Haz los labs de nivel *Apprentice* de:
- [ ] SQL injection (los 2 primeros)
- [ ] Cross-site scripting: reflected y stored
- [ ] Access control: los de "unprotected admin functionality"
- [ ] Authentication: los de "username enumeration"

**TryHackMe**, salas:
- [ ] Pre Security (si no la hiciste)
- [ ] OWASP Top 10 - 2021
- [ ] Nmap
- [ ] Wireshark: The Basics
- [ ] Burp Suite: The Basics

## 2. Home lab (lección f2-homelab)

- [ ] UTM en el Mac con una VM Kali (ARM64) y una VM víctima en red **solo-host**.
- [ ] Haz un snapshot antes de cada práctica.

## 3. Lecciones que puedes escribir tú

Después de cada lab o sala, escribe una lección con lo que aprendiste:

- [ ] `f2-burp`: qué es un proxy, interceptar una petición a tu propia app y cómo leer cabeceras. Usa `choice` y `answer`.
- [ ] `f2-sqli-defensa`: por qué ocurre y cómo se corrige (consultas preparadas, como hace Laravel con Eloquent). Pregunta qué línea es vulnerable entre dos fragmentos de código.
- [ ] `f2-xss-defensa`: el escape de salida (`{{ }}` frente a `{!! !!}` en Blade) y la CSP. Puedes enlazarlo con las cabeceras que pusimos en tus apps.
- [ ] `f2-wireshark`: el simulador ya tiene `captura.pcap` y `tcpdump`. Haz una lección que lea esa captura (mira la de la Fase 1 como modelo).
- [ ] Añade 2–3 preguntas al `bank` por cada lección, para que el examen crezca.

## 4. Fase 3 · Especialidad (ya está en el curso)

- [ ] Haz las lecciones de la Fase 3: ramas, investigar un incidente en los logs, SIEM, auditar tu app y método e informes. Luego, su examen.
- [ ] Prueba las dos caras para decidir tu rama: **Mi lab** + PortSwigger (AppSec / pentesting web) y la intro de **SOC Level 1** en TryHackMe (Blue Team).
- [ ] Audita de verdad uno de tus proyectos con la lista de `f3-auditar`: `composer audit`, `npm audit`, `.gitignore`, `APP_DEBUG`, `curl -I` y gitleaks.
- [ ] Escribe un informe con `reporte_modelo.txt` (está en la terminal del curso) por cada lab que resuelvas. Al cabo de unos meses tendrás un portafolio.
- [ ] Cuando tengas clara tu rama, pide a Claude el motor de la Fase 4. Igual que en las anteriores, el contenido práctico ofensivo lo escribes tú, desde lo que hagas en las plataformas.

Temas de examen de la Fase 3 para tu `bank`: `rama` `siem` `auditar` `informe`.
