#!/usr/bin/env node
/* Calcula el sha256 de la respuesta de un reto, para ponerlo en respuesta: { sha256: '…' }
   y que la respuesta no quede a la vista en el código.
   Uso:  node tools/hash-respuesta.js "la respuesta"            (sin distinguir mayúsculas)
         node tools/hash-respuesta.js --mayusculas "Respuesta"  (si en el reto pones mayusculas: true) */
const crypto = require('crypto');
const args = process.argv.slice(2), exact = args[0] === '--mayusculas';
const text = (exact ? args.slice(1) : args).join(' ').trim();
if (!text) { console.log('Uso: node tools/hash-respuesta.js "la respuesta"'); process.exit(1); }
console.log(crypto.createHash('sha256').update(exact ? text : text.toLowerCase()).digest('hex'));
