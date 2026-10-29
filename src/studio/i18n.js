// English for the studio. The studio is written in Spanish; in English, what it draws is translated on the way to the
// screen: whole phrases by the table below, phrases that carry a name or a number by the patterns after it. Dates, times,
// keys and the suggested part names are made in the right language at the source (see app.js). Lyrics, titles and
// anything else people typed are never touched.

export const LANG = (() => {
  try { const v = localStorage.getItem('noti-lang'); if (v === 'es' || v === 'en') return v; } catch {}
  return /^es\b/i.test(typeof navigator === 'undefined' ? 'es' : navigator.language || '') ? 'es' : 'en';
})();
export function setLang(v) { try { localStorage.setItem('noti-lang', v); } catch {} }

const WORDS = {
  // sign-in
  'Mail': 'Email', 'Contraseña': 'Password', 'Entrar': 'Sign in', 'Crear cuenta': 'Create account', 'Mandarme el link': 'Email me a link',
  'Un momento…': 'One moment…', 'Ya tengo cuenta': 'I already have an account', 'Entrar con contraseña': 'Sign in with a password',
  'Entrar con un link por mail': 'Sign in with an email link', 'Seguir con Google': 'Continue with Google', 'o': 'or', 'Volver': 'Back',
  'Si sos alumno o alumna, abrí el link que te pasaron.': 'If you’re a student, open the link you were sent.',
  'vos@ejemplo.com': 'you@example.com', 'Al menos 6 caracteres': 'At least 6 characters', 'Contraseña nueva': 'New password',
  'Para entrar con tu mail sin esperar un link.': 'To sign in with your email without waiting for a link.',
  'Mail o contraseña incorrectos. Si siempre entraste con un link, entrá así y creá tu contraseña desde tu perfil.': 'Wrong email or password. If you’ve always signed in with a link, do that once and create your password from your profile.',
  'Ese mail ya tiene cuenta. Entrá con tu contraseña o con un link.': 'That email already has an account. Sign in with your password or with a link.',
  'Falta confirmar el mail: abrí el que te mandamos.': 'Your email isn’t confirmed yet: open the one we sent you.',
  'La contraseña tiene que tener al menos 6 caracteres.': 'The password needs at least 6 characters.',
  'Por ahora los mails de Noti no llegan a todos. Creá tu cuenta con una contraseña.': 'Noti’s emails don’t reach everyone yet. Create your account with a password.',
  'Demasiados intentos seguidos. Esperá un minuto y probá de nuevo.': 'Too many tries in a row. Wait a minute and try again.',
  'Google todavía no está listo. Entrá con tu mail.': 'Google isn’t ready yet. Sign in with your email.',
  'No pudimos entrar. Revisá el mail y probá de nuevo.': 'We couldn’t sign you in. Check the email and try again.',
  'Listo. Ya podés entrar con tu mail y esta contraseña.': 'Done. You can now sign in with your email and this password.',
  '¿Cómo te llamás?': 'What’s your name?', 'Así te ven en los proyectos que compartís.': 'This is how people see you in shared projects.', 'Tu nombre': 'Your name',
  // shell, sidebar, board
  'Inicio': 'Home', 'Calendario': 'Calendar', 'Papelera': 'Trash', 'Buscar': 'Search', 'Compartidos': 'Shared', 'Míos': 'Mine', 'Todos': 'All',
  'Proyectos': 'Projects', 'Carpetas': 'Folders', 'Lista': 'List', 'Hojas': 'Sheets', 'Nuevo proyecto': 'New project', '+ Nuevo proyecto': '+ New project',
  'Proyecto nuevo': 'New project', 'Nueva canción': 'New song', 'Próximo': 'Next', 'Recientes': 'Recent', 'Opciones': 'Options',
  'Barra lateral': 'Sidebar', 'Mostrar la barra': 'Show the sidebar', 'Mostrar la barra lateral': 'Show the sidebar', 'Esconder la barra': 'Hide the sidebar',
  'Fijar la barra': 'Pin the sidebar', 'Sin nombre': 'Untitled', 'Sin título': 'Untitled', 'Canción sin título': 'Untitled song', 'Sin canciones': 'No songs',
  'Sin canciones todavía.': 'No songs yet.', 'Todavía no hay canciones.': 'No songs yet.', 'Todavía no hay nada acá.': 'Nothing here yet.', 'Nada todavía': 'Nothing yet',
  'Si te pasaron un link, abrilo y aparece en Compartidos.': 'If someone sent you a link, open it and it shows up under Shared.',
  'Arrastrar para ordenar': 'Drag to reorder', 'Ensayar todo': 'Rehearse all', 'Renombrar': 'Rename', 'Duplicar': 'Duplicate', 'Borrar proyecto': 'Delete project',
  'Borrar': 'Delete', 'Borrar canción': 'Delete song', 'Mover a': 'Move to', 'Mover a…': 'Move to…', 'Tu perfil': 'Your profile', 'Nombre': 'Name',
  'Apariencia': 'Appearance', 'Auto': 'Auto', 'Claro': 'Light', 'Oscuro': 'Dark', 'Idioma': 'Language', 'La semana empieza': 'Week starts on', 'el lunes': 'Monday',
  'el domingo': 'Sunday', 'Atajos de teclado': 'Keyboard shortcuts', 'Cerrar sesión': 'Sign out', 'Listo': 'Done', 'Cancelar': 'Cancel', 'Guardar': 'Save',
  'Cerrar': 'Close', 'Ctrl K': 'Ctrl K',
  // project
  'Canciones': 'Songs', 'Eventos': 'Events', 'Personas': 'People', 'Canción': 'Song', 'Tono': 'Key', 'Tempo': 'Tempo', 'Etiquetas': 'Tags', 'Estado': 'Status',
  'Sin publicar': 'Unpublished', 'Publicada': 'Published', 'Publicar': 'Publish', 'Publicado': 'Published', 'Compartir': 'Share', 'Ensayar': 'Rehearse',
  'Deshacer': 'Undo', 'Escuchar': 'Listen', 'Parar': 'Stop', 'Notas de la canción': 'Song notes', 'Notas del proyecto': 'Project notes',
  '+ Canción': '+ Song', '+ Evento': '+ Event', '+ Invitar': '+ Invite', '+ Crear un grupo': '+ Create a group', '+ Compases': '+ Bars',
  'Nada próximo.': 'Nothing coming up.', 'Ver en el calendario': 'See in the calendar', 'Ir al calendario': 'Go to the calendar', 'Grupos': 'Groups',
  'Para que edite': 'To edit with you', 'Mandale este link. Entra con su mail y el proyecto le aparece.': 'Send them this link. They sign in with their email and the project shows up.',
  'Con acceso': 'With access', 'Con el link': 'With the link', 'Cualquiera con el link puede ver': 'Anyone with the link can view',
  'Apagado: solo lo ven quienes tienen acceso': 'Off: only people with access can see it', 'Sin cuenta. Ve lo publicado, no los borradores': 'No account. They see what’s published, not drafts',
  'Ver como lo ven con el link': 'See it as the link shows it', 'Así lo ven con el link': 'This is what the link shows', 'Volver a editar': 'Back to editing',
  'Link copiado': 'Link copied', 'Copiar': 'Copy', 'Copiar link': 'Copy link', 'dueño': 'owner', 'dueña': 'owner', 'organiza': 'organizer', 'edita': 'editor',
  'Hacer un link nuevo': 'Make a new link', 'Listo. El link anterior ya no sirve.': 'Done. The old link no longer works.', 'Quitar': 'Remove',
  'Que organice': 'Make organizer', 'Solo edita': 'Editor only', 'No se pudo. Probá de nuevo.': 'That didn’t work. Try again.',
  'Para sumar a alguien, pedíselo a quien organiza el proyecto.': 'To add someone, ask whoever organizes the project.',
  'Para empezar un proyecto, primero sumate a uno con el link que te pasen.': 'To start a project, first join one with the link you were sent.',
  'Noti es por invitación. Abrí el link que te pasó quien organiza el proyecto y te aparece acá.': 'Noti is by invitation. Open the link the project’s organizer sent you and it shows up here.',
  'La ven con el link': 'Visible with the link', 'La ven quienes tienen el link': 'Visible to people with the link', 'Solo la ven quienes editan': 'Only editors see it',
  'Queda como nota tuya y de quienes editan': 'Stays a note for you and the other editors', 'Opciones del proyecto': 'Project options',
  'Opciones de la canción': 'Song options', 'Principal': 'Main', 'Yo': 'Me', 'Quién sos': 'Who you are', '¿Quién sos?': 'Who are you?',
  'Solo mis partes': 'Only my parts', 'No estás en esta': 'You’re not in this one', 'No estás en estas:': 'You’re not in these:', 'estás': 'you’re in',
  'Ver toda la canción': 'See the whole song', 'Ver todo': 'See all', 'Mostrar acordes': 'Show chords', 'Ocultar acordes': 'Hide chords',
  'Anterior': 'Previous', '‹ Anterior': '‹ Previous', 'Siguiente': 'Next', 'Siguiente ›': 'Next ›', 'Abrí el link que te pasaron.': 'Open the link you were sent.',
  'Agregar a mi calendario': 'Add to my calendar', 'Primero restaurá su proyecto': 'Restore its project first',
  // song editor
  'Acorde': 'Chord', 'Etiqueta': 'Tag', 'Comentar': 'Comment', 'Editar': 'Edit', 'Cortar': 'Cut', 'Pegar debajo': 'Paste below', 'Copiado': 'Copied', 'Cortado': 'Cut',
  'Editar texto': 'Edit text', 'Subir': 'Move up', 'Bajar': 'Move down', 'Empezar una parte acá': 'Start a part here', 'Unir con la de arriba': 'Join with the one above',
  'Color': 'Colour', 'Repetir ×2': 'Repeat ×2', 'Cantar una vez': 'Sing once', 'Plegar': 'Fold', 'Desplegar': 'Unfold', 'Borrar sección': 'Delete part',
  'Sección': 'Part', 'Usar': 'Use', 'Ponerle este nombre': 'Use this name', 'Insertar': 'Insert', 'Insertar debajo': 'Insert below',
  'Mover o abrir el menú': 'Move or open the menu', 'Escribí o pegá, o / para insertar': 'Type or paste, or / to insert', 'Escribí, o / para insertar': 'Type, or / to insert',
  'Letra y acordes': 'Lyrics and chords', 'Letra, acordes o las dos cosas': 'Lyrics, chords or both', 'Pegar una canción': 'Paste a song', 'Texto': 'Text',
  'Compases': 'Bars', 'Compás': 'Bar', 'Una grilla para acordes': 'A grid for chords', 'Un título que agrupa lo que sigue': 'A heading for what follows',
  'Nota': 'Note', 'Una nota al margen, con tu nombre': 'A margin note, with your name', 'Comentario': 'Comment', 'Responder': 'Reply', 'Resolver': 'Resolve',
  'Comentario resuelto': 'Comment resolved', 'Letra, una indicación, lo que sea': 'Lyrics, a cue, anything', 'Algo para recordar': 'Something to remember',
  'Otro acorde': 'Other chord', 'Escribí un acorde': 'Type a chord', '% Igual al anterior': '% Same as last bar', 'En un compás: la línea se repite 3 veces': 'In a bar: the line repeats 3 times', 'Menos veces': 'Fewer times', 'Más veces': 'More times', 'Escribí uno o varios: C G Am, o C . . G': 'Type one or more: C G Am, or C . . G', 'En un compás: varios acordes; cada punto ocupa un tiempo': 'In a bar: several chords; each dot holds a beat', 'En un tiempo va un acorde': 'One chord per beat', 'Con un acorde abierto: escribirlo (am7, f#, bb/d) y Enter': 'With a chord open: type it (am7, f#, bb/d) and Enter', 'Acordes: siguiente o anterior palabra o compás': 'Chords: next or previous word or bar', 'Acordes: los del tono, en orden': 'Chords: the ones in the key, in order', 'Sin acorde': 'No chord', 'Dos por compás': 'Two per bar', 'Quitar compás': 'Remove bar', 'Agregar compás': 'Add bar',
  'Resaltar': 'Highlight', 'Subrayar': 'Underline', 'Buscar o crear etiqueta': 'Find or create a tag', 'Quitar etiqueta': 'Remove tag', 'Cambiar color': 'Change colour',
  'Escribí un nombre para crear la primera.': 'Type a name to create the first one.', 'Ninguna': 'None', 'Selección': 'Selection', 'Herramientas': 'Tools',
  'Escribir': 'Write', 'Canta': 'Sings', 'Borrado. Deshacer está arriba.': 'Deleted. Undo is at the top.', 'No reconozco ese acorde': 'I don’t know that chord',
  'Pegala acá: las partes se separan solas': 'Paste it here: the parts split on their own', 'Todavía no hay acordes para escuchar.': 'No chords to listen to yet.',
  'No hay canciones para ensayar': 'No songs to rehearse', 'Salir del ensayo': 'Leave rehearsal', 'Correr': 'Scroll', 'Pausa': 'Pause', 'Más lento': 'Slower',
  'Más rápido': 'Faster', 'Normal': 'Normal', 'Lento': 'Slow', 'Tocá abajo para avanzar, arriba para volver': 'Tap the bottom to go on, the top to go back',
  'Buscar canciones, letra, etiquetas, eventos': 'Search songs, lyrics, tags, events', 'Nada con ese nombre': 'Nothing by that name',
  'Tono y tempo': 'Key and tempo', 'Compás de la canción': 'Time signature',
  // shortcuts sheet
  'Insertar algo en una línea vacía': 'Insert something on an empty line', 'Línea nueva; en una línea vacía, sección nueva': 'New line; on an empty line, a new part',
  'Al principio de una parte: unirla con la de arriba': 'At the start of a part: join it with the one above',
  'Cortar, copiar y pegar lo seleccionado, con acordes y etiquetas': 'Cut, copy and paste the selection, with chords and tags',
  'Cerrar o soltar la selección': 'Close, or let go of the selection', 'Ensayo: correr o pausar': 'Rehearsal: scroll or pause',
  'Ensayo: canción anterior o siguiente': 'Rehearsal: previous or next song', 'Espacio': 'Space', '⌘Z ⇧⌘Z': '⌘Z ⇧⌘Z', 'Deshacer y rehacer': 'Undo and redo',
  // events and calendar
  'Evento': 'Event', 'Ensayo': 'Rehearsal', 'Clase': 'Class', 'Cuándo': 'When', 'Dónde': 'Where', 'Día': 'Day', 'Hora': 'Time', 'Todo el día': 'All day',
  'todo el día': 'all day', 'Agregar lugar': 'Add a place', 'Proyecto': 'Project', 'Sin proyecto': 'No project', 'Eventos sin proyecto': 'Events without a project',
  'Borrar evento': 'Delete event', 'Destacar': 'Feature', 'Un evento destacado cuenta los días que faltan': 'A featured event counts down the days',
  'No se repite': 'Doesn’t repeat', 'Cada semana': 'Every week', 'Cada 2 semanas': 'Every 2 weeks', 'Cada mes': 'Every month', 'Ya no se repite': 'No longer repeats',
  'Mes anterior': 'Previous month', 'Mes siguiente': 'Next month', 'Hoy': 'Today', 'hoy': 'today', 'mañana': 'tomorrow', 'ayer': 'yesterday', 'faltan': 'to go',
  'Nada este día.': 'Nothing this day.', 'No hay fechas próximas': 'No upcoming dates', 'Ensayar estas canciones': 'Rehearse these songs',
  'Aparece con el evento en su vista': 'Shows with the event in their view', 'Conectar con tu calendario': 'Connect to your calendar',
  'Tus eventos aparecen en Google Calendar, Apple u Outlook y se actualizan solos.': 'Your events show up in Google Calendar, Apple or Outlook and update on their own.',
  'Para anotar fechas primero': 'To note dates first', 'Sin fecha': 'No date', 'Sin aviso': 'No reminder',
  '1 hora antes': '1 hour before', '1 día antes': '1 day before', '2 días antes': '2 days before', '1 semana antes': '1 week before',
  // trash, saving
  'Lo que borrás queda acá 30 días.': 'What you delete stays here for 30 days.', 'Vacía.': 'Empty.', 'Vacío': 'Empty', 'Borrar del todo': 'Delete for good',
  'Sí, borrar para siempre': 'Yes, delete forever', 'Borrado para siempre': 'Deleted forever', 'un proyecto borrado': 'a deleted project',
  'Sin conexión. Lo que cambies se guarda cuando vuelva.': 'Offline. Your changes save when the connection is back.',
  'Alguien más cambió esto mientras editabas, y lo tuyo de ese momento no se guardó.': 'Someone else changed this while you were editing, and your change from that moment wasn’t saved.',
  'Recargar': 'Reload', 'Restaurar': 'Restore', 'Repetir': 'Repeat', 'Título': 'Title', 'Pausar': 'Pause', 'No pude leer ese audio': 'I couldn’t read that audio',
};

const RULES = [
  [/(\d+) canciones\b/g, '$1 songs'], [/\b1 canción\b/g, '1 song'], [/(\d+) etiquetas\b/g, '$1 tags'], [/\b1 etiqueta\b/g, '1 tag'],
  [/^(\d+) palabras$/, '$1 words'], [/^1 palabra$/, '1 word'], [/^(\d+) hoy$/, '$1 today'],
  [/ · todo el día/g, ' · all day'], [/ todo el día\b/g, ' all day'],
  [/^en (\d+) días$/, 'in $1 days'], [/^en (\d+) semanas$/, 'in $1 weeks'], [/^hace (\d+) días$/, '$1 days ago'],
  [/^Hoy es (.+)$/, 'Today is $1'], [/^Nuevo evento el (.+)$/, 'New event on $1'], [/^Pasados \((\d+)\)$/, 'Past ($1)'],
  [/^Abrir (.+)$/, 'Open $1'], [/^Cerrar (.+)$/, 'Close $1'], [/^Opciones de (.+)$/, 'Options for $1'], [/^Plegar (.+)$/, 'Fold $1'], [/^Desplegar (.+)$/, 'Unfold $1'],
  [/^Cambiar el color de (.+)$/, 'Change the colour of $1'], [/^Color de (.+)$/, 'Colour of $1'], [/^Color (\S+)$/, 'Colour $1'], [/^Compás (\d+)$/, 'Bar $1'],
  [/^(.+) \(vos\)$/, '$1 (you)'], [/^días para (.+)$/, 'days until $1'], [/^Faltan (\d+) días para (.+)$/, '$1 days until $2'],
  [/^Borraste “(.+)”\. Queda en la Papelera\.$/, 'Deleted “$1”. It’s in the Trash.'], [/^Borraste “(.+)”$/, 'Deleted “$1”'],
  [/^Borraste (.+)\. Deshacer está arriba\.$/, 'Deleted $1. Undo is at the top.'], [/^“(.+)” ahora está en (.+)$/, '“$1” is now in $2'],
  [/^“(.+)” volvió a (.+)$/, '“$1” is back in $2'], [/^“(.+)” volvió al calendario$/, '“$1” is back in the calendar'], [/^“(.+)” volvió$/, '“$1” is back'],
  [/^(.+): 7 más en el calendario$/, '$1: 7 more in the calendar'], [/^Nada con “(.+)”$/, 'Nothing with “$1”'], [/^Crear (.+)$/, 'Create $1'], [/^Sacaste a (.+) del proyecto$/, 'Removed $1 from the project'],
  [/^Te mandamos un link a (.+)\. Abrilo en este mismo aparato\.$/, 'We sent a link to $1. Open it on this same device.'],
  [/^Te mandamos un mail a (.+) para confirmar la cuenta\. Es solo esta vez\.$/, 'We sent an email to $1 to confirm the account. Only this once.'],
  [/^de (.+) · hoy$/, 'from $1 · today'], [/^de un proyecto borrado · hoy$/, 'from a deleted project · today'],
  [/^Hola, (.+)$/, 'Hi, $1'], [/^Hola,$/, 'Hi,'], [/^Hoy, (.+)$/, 'Today, $1'],
  [/^(\d+) renglones tuyos$/, '$1 lines are yours'], [/^1 renglón tuyo$/, '1 line is yours'],
];

export function tr(text) {
  const t = text.trim(); if (!t) return null;
  let out = t;
  for (const [re, to] of RULES) if (re.global) out = out.replace(re, to); // pieces inside a longer line
  if (Object.hasOwn(WORDS, out)) out = WORDS[out];
  else for (const [re, to] of RULES) if (!re.global && re.test(out)) { out = out.replace(re, to); break; }
  return out === t ? null : text.replace(t, out);
}

// people's own words: lyrics, titles, names, notes, part names, anything being typed
const SKIP = '.tx, .w, .ml, .rl2, .ctx, .ppr, .chs, .sn:not(.sugg), .sn.sugg > span, [data-title], [data-pname], .folder:not(.add) .fname, .ot, .stile:not(.add) .st2 b, .rn[data-proj] > span, .rn[data-opensong] > span, :not(.add) > .pn, .chip:not(.draft):not(.ok), .cmt p, .cbody, .evp input, [contenteditable], textarea, input, select option[data-user], script, style, svg, .logo, .eyebox, .sr .sl, .sr b';
const ATTRS = ['placeholder', 'aria-label', 'title', 'data-ph'];
// placeholders the studio puts in for a missing name are its own words, wherever they show
const ALWAYS = new Set(['Sin título', 'Sin nombre', 'Canción sin título']);
function textNode(n) { if (n.parentElement?.closest(SKIP) && !ALWAYS.has(n.nodeValue.trim())) return; const v = tr(n.nodeValue); if (v != null && v !== n.nodeValue) n.nodeValue = v; }
function element(el) {
  for (const a of ATTRS) { const v = el.getAttribute?.(a); if (v) { const t = tr(v); if (t != null && t !== v) el.setAttribute(a, t); } }
}
export function translateTree(root) {
  if (LANG !== 'en' || !root) return;
  if (root.nodeType === 3) return textNode(root);
  if (root.nodeType !== 1) return;
  element(root); root.querySelectorAll('*').forEach(element);
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; while ((n = tw.nextNode())) textNode(n);
}
// translate whatever gets drawn, including the bits the studio updates in place
export function watchTranslate(root) {
  if (LANG !== 'en') return;
  document.documentElement.lang = 'en';
  translateTree(root);
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') textNode(m.target);
      else if (m.type === 'attributes') element(m.target);
      else m.addedNodes.forEach(translateTree);
    }
  }).observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
