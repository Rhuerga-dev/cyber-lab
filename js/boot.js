/* Cyber Lab · Arranque (antes de pintar la página): tema e idioma guardados y, en la app, ir al login si no hay sesión.
   Va en un archivo aparte (no dentro del HTML) para que la CSP no tenga que permitir scripts en línea. */
try{var th=localStorage.getItem("cyberlab-theme");if(th==="light"||th==="dark")document.documentElement.setAttribute("data-theme",th);var lg=localStorage.getItem("cyberlab-lang");if(lg)document.documentElement.lang=lg}catch(e){}
if(document.documentElement.hasAttribute('data-app')){try{if(!localStorage.getItem("cyberlab-token")&&!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)){var nx=/^#[a-z]{2,20}$/.test(location.hash)?"?next="+encodeURIComponent(location.hash):"";location.replace("login.html"+nx)}}catch(e){}}
