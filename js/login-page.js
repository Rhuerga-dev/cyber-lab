/* Cyber Lab · Página de login. */
I18N.applyStatic(); I18N.bindControls();
if (window.Sync && Sync.initLoginPage) Sync.initLoginPage(document.getElementById('login-root'));
else document.getElementById('login-root').innerHTML = '<p>No se pudo cargar el formulario. Recarga la página (Cmd + Shift + R).</p>';
