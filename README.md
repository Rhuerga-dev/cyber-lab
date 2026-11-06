# Cyber Lab

Curso interactivo de ciberseguridad desde cero, con hoja de ruta, certificaciones y registro de resultados.
Publicado en https://cyber.huergalabs.dev

## Secciones
- **Hoja de ruta**: 5 fases con temas y certificaciones recomendadas.
- **Curso**: lecciones guiadas por agentes (Nova, Marco y Lía) con tareas en una terminal simulada.
- **Terminal**: laboratorio libre con la red ficticia de LabCorp (10.10.10.0/24).
- **Práctica**: niveles de binario y máscaras, más la calculadora de bits.
- **Certificaciones**: estado, fecha y nota de cada certificación.
- **Resultados**: historial, horas y copia de seguridad.

## Archivos
- `index.html`: la app (hoja de ruta, práctica, certificaciones, resultados).
- `js/terminal.js`: terminal simulada y red virtual. Nada sale del navegador.
- `js/course.js`: motor del curso y contenido de las lecciones.

El progreso se guarda en el navegador (localStorage). Se puede exportar e importar desde Resultados.

## Despliegue
Sitio estático en GitHub Pages con el dominio `cyber.huergalabs.dev` (archivo `CNAME`).
