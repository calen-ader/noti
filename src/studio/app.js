// Noti's studio: the whole app as one plain module, ported from the v7 prototype. mount() draws into the
// page's stage and gets from the page who is signed in, the data, and how to save it (see Studio.tsx).
import { mountNotiHero } from '@/lib/logo/noti-hero';

export function mount(stage, boot) {
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// ids are random: two people (or two devices) make blocks at the same time
const uid = (p = 'r') => p + Math.random().toString(36).slice(2, 10);
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), b => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const cv = (k) => `var(--c-${k})`;
const ICON = {
  play: '<svg class="ic" viewBox="0 0 16 16"><path d="M4 2.5v11l9.5-5.5z"/></svg>',
  pause: '<svg class="ic" viewBox="0 0 16 16"><path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z"/></svg>',
  stop: '<svg class="ic" viewBox="0 0 16 16"><path d="M3.5 3.5h9v9h-9z"/></svg>',
};

/* ---------------- chords ---------------- */
const SH = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FL = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const IDX = { C:0,'B#':0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,Fb:4,F:5,'E#':5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11,Cb:11 };
const ES = { C:'do', D:'re', E:'mi', F:'fa', G:'sol', A:'la', B:'si' };
const md = (n) => ((n % 12) + 12) % 12;
function parseKey(k) { const m = k.match(/^([A-G][#b]?)(m?)$/); return { root: IDX[m[1]], minor: !!m[2], name: m[1] }; }
function useFlats(key) { const { root, minor } = parseKey(key); return [5, 10, 3, 8, 1].includes(minor ? md(root + 3) : root); }
const spell = (i, key) => (useFlats(key) ? FL : SH)[md(i)];
function splitChord(c) { const m = c.match(/^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/); return m && m[1] in IDX ? { r: m[1], q: m[2], b: m[3] } : null; }
function transChord(c, n, key) { const p = splitChord(c); if (!p) return c; return spell(IDX[p.r] + n, key) + p.q + (p.b ? '/' + spell(IDX[p.b] + n, key) : ''); }
function transKey(key, n) {
  const { root, minor } = parseKey(key); const r = md(root + n);
  return minor ? ['C','C#','D','Eb','E','F','F#','G','G#','A','Bb','B'][r] + 'm' : ['C','Db','D','Eb','E','F','F#','G','Ab','A','Bb','B'][r];
}
function keyName(key) { const { minor, name } = parseKey(key); return ES[name[0]] + (name[1] === '#' ? '♯' : name[1] === 'b' ? '♭' : '') + (minor ? ' menor' : ' mayor'); }
function palette(key) {
  const { root, minor } = parseKey(key);
  const deg = minor
    ? [[0,'m','i'],[2,'dim','ii°'],[3,'','III'],[5,'m','iv'],[7,'m','v'],[7,'7','V7'],[8,'','VI'],[10,'','VII']]
    : [[0,'','I'],[2,'m','ii'],[4,'m','iii'],[5,'','IV'],[7,'','V'],[7,'7','V7'],[9,'m','vi'],[11,'dim','vii°']];
  return deg.map(([s, q, rn]) => ({ c: spell(root + s, key) + q, rn }));
}
function chordNotes(c) {
  const p = splitChord(c); if (!p) return [];
  const r = 48 + IDX[p.r]; const q = p.q;
  let iv = /dim|°/.test(q) ? [0, 3, 6] : /sus4/.test(q) ? [0, 5, 7] : /sus2/.test(q) ? [0, 2, 7] : /^m(?!aj)/.test(q) ? [0, 3, 7] : /aug|\+/.test(q) ? [0, 4, 8] : [0, 4, 7];
  if (/maj7/.test(q)) iv = [...iv, 11]; else if (/7/.test(q)) iv = [...iv, 10];
  const bass = p.b ? 36 + IDX[p.b] : r - 12;
  return [bass, ...iv.map(x => r + x)];
}

/* ---------------- audio ---------------- */
let AC = null; const ac = () => (AC ??= new (window.AudioContext || window.webkitAudioContext)());
const mf = (m) => 440 * 2 ** ((m - 69) / 12);
const PLAY = { song: false, timer: 0, nodes: [], clip: null, stopFn: null, prog: null, raf: 0 };
function voice(freq, t, dur, { type = 'triangle', vol = 0.05, lp = 0, vib = 0 } = {}) {
  const a = ac(); const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.value = freq;
  let out = o;
  if (lp) { const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); out = f; }
  if (vib) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = 5.2; lg.gain.value = vib; l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + dur + 0.05); PLAY.nodes.push(l); }
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  out.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.05); PLAY.nodes.push(o);
  if (PLAY.nodes.length > 80) PLAY.nodes.splice(0, 40);
}
function strum(c, t, dur) { chordNotes(c).forEach((m, i) => voice(mf(m), t + i * 0.018, Math.min(dur, 2.4), { vol: i ? 0.045 : 0.07, type: i ? 'triangle' : 'sine' })); }
function tick(t, accent) { voice(accent ? 1600 : 1100, t, 0.04, { type: 'sine', vol: accent ? 0.05 : 0.025 }); }
function hum(mel, rate, t0) {
  const spb = 60 / 100 / rate; let t = t0;
  for (const [m, d] of mel) { if (m) voice(mf(m), t, d * spb, { type: 'sawtooth', vol: 0.05, lp: 1300, vib: 3 }); t += d * spb; }
  return t - t0;
}
const melDur = (mel) => mel.reduce((a, [, d]) => a + d, 0) * 0.6;

/* ---------------- builders + data ---------------- */
let ME = boot.me?.name || 'Yo';
// every project has its own cast: the people of a show and the groups they sing in (Todxs is a group too)
const crew = (p) => p?.cast ?? { people: [], groups: [] };
function nameOf(id) {
  for (const p of [proj(S.sPid), proj(), ...PROJECTS]) { const g = p?.cast?.groups.find(x => x.id === id); if (g) return g.label; }
  return id;
}
const groupsOf = (p, who) => crew(p).groups.filter(g => g.members.includes(who)).map(g => g.id);

function L(text, chords = {}) { return { id: uid(), kind: 'lyric', words: text ? text.split(' ') : [''], chords: { ...chords } }; }
function parseBars(str) {
  if (!str.includes('|')) return str.trim().split(/\s+/).filter(Boolean).map(c => c === '%' ? ['%'] : [c]);
  return str.split('|').map(s => s.trim()).filter(Boolean).map(s => s === '%' ? ['%'] : s === '-' || s === '·' ? [] : s.split(/\s+/));
}
function B(str) { return { id: uid(), kind: 'bars', bars: parseBars(str) }; }
const barsText = (bars) => '| ' + bars.map(b => b.length ? b.join(' ') : '-').join(' | ') + ' |';
function Sec(name, rows, o = {}) { return { id: uid('s'), name, rows, rep: o.rep || 1, ts: o.ts || null }; }
function Song(title, key, bpm, ts, secs) { return { id: uid('g'), title, key, bpm, ts, secs, keyAuto: false, main: {}, ov: {}, notes: {}, clips: [], changed: new Set() }; }
const titleOf = (s) => s.title || 'Canción sin título';
const PROJECTS = [], EVENTS = [];
function snapshot(p) {
  const changed = new Set(); p.songs.forEach(s => s.changed.forEach(id => changed.add(id)));
  p.published = { version: p.version, note: p.note, changed, songs: structuredClone(p.songs).map(({ desc, ...x }) => x) };
}

/* ---------------- dates ---------------- */
// one calendar for everything; an event may belong to a project (its colour, its songs, its people) or to nobody
const MES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const MESL = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIA = ['dom','lun','mar','mié','jue','vie','sáb'];
const DIAL = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const D = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const iso = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
const addDays = (s, n) => { const dt = D(s); dt.setDate(dt.getDate() + n); return iso(dt); };
const addMonths = (s, n) => { const dt = D(s); dt.setMonth(dt.getMonth() + n); return iso(dt); };
const daysFrom = (s) => Math.round((D(s) - D(TODAY)) / 864e5);
const dayShort = (s) => { const dt = D(s); return `${DIA[dt.getDay()]} ${dt.getDate()} ${MES[dt.getMonth()]}`; };
const dayLong = (s) => { const dt = D(s); return `${DIAL[dt.getDay()]} ${dt.getDate()} de ${MESL[dt.getMonth()]}`; };
const hora = (t) => !t ? '' : t.endsWith(':00') ? `${+t.slice(0, 2)} h` : `${+t.slice(0, 2)}.${t.slice(3)} h`;
const rel = (s) => { const n = daysFrom(s); return n === 0 ? 'hoy' : n === 1 ? 'mañana' : n === -1 ? 'ayer' : n < 0 ? `hace ${-n} días` : n < 14 ? `en ${n} días` : `en ${Math.round(n / 7)} semanas`; };
const TODAY = iso(new Date());
function Ev(pid, date, time, o = {}) { return { id: uid('e'), pid: pid || '', date, time, title: o.title || '', place: o.place || '', songs: o.songs || [], who: o.who || [], note: o.note || '', noteAll: o.noteAll ?? true, series: o.series || null, repeat: o.repeat || '', star: !!o.star, remind: o.remind ?? 'dia', tell: o.tell ?? true }; }
const evTitle = (e) => e.title || 'Sin título';
const ids = (...ss) => ss.map(x => x.id);
// events with no project show under this stand-in, so every row and chip can still read a name and a colour
const NOPROJ = { id: '', name: 'Sin proyecto', pc: 'var(--dim)', pf: 'var(--p)', songs: [], people: false, shared: false, owner: ME, tags: [], editors: [] };
const pOf = (e) => PROJECTS.find(p => p.id === e.pid) ?? NOPROJ;
const evs = (p) => EVENTS.filter(e => e.pid === p.id);
const byWhen = (a, b) => (a.e.date + (a.e.time || '00')).localeCompare(b.e.date + (b.e.time || '00'));
const allEvents = () => EVENTS.filter(e => !e.pid || PROJECTS.some(p => p.id === e.pid)).map(e => ({ e, p: pOf(e) })).sort(byWhen);
const upcoming = (p) => (p ? evs(p).map(e => ({ e, p })).sort(byWhen) : allEvents()).filter(x => x.e.date >= TODAY);
const nextEv = (p) => upcoming(p)[0] ?? null;
const nextStar = (p) => upcoming(p).find(x => x.e.star) ?? null;
function findEv(id) { const e = EVENTS.find(x => x.id === id); return e ? { e, p: pOf(e) } : null; }
const songById = (p, id) => p?.songs.find(x => x.id === id);
const songAny = (id) => { for (const p of PROJECTS) { const s = p.songs.find(x => x.id === id); if (s) return { p, s }; } return null; };
const REMIND = [['no', 'Sin aviso'], ['hora', '1 hora antes'], ['dia', '1 día antes'], ['2dias', '2 días antes'], ['semana', '1 semana antes']];
const REPEAT = [['', 'No se repite'], ['semana', 'Cada semana'], ['2semanas', 'Cada 2 semanas'], ['mes', 'Cada mes']];
const remindName = (k) => REMIND.find(x => x[0] === k)?.[1] ?? '';
// tags: the project's cast (people and groups) plus whatever anyone typed in
const tagsOf = (p) => [...crew(p).groups.map(g => g.id), ...crew(p).people, ...(p?.tags ?? [])];
// the example projects for /demo: invented songs, so the studio can be tried without an account
function demoData() {
  const PEOPLE = ['Abril','Bruno','Camila','Dante','Elena','Facundo','Guada','Iván','Juli','Lara','Mateo','Nina'];
  const GROUPS = [
    { id: 'todxs', label: 'Todxs', members: PEOPLE },
    { id: 'mic1', label: 'mic 1', members: ['Abril','Bruno','Camila'] },
    { id: 'mic2', label: 'mic 2', members: ['Dante','Elena','Facundo'] },
    { id: 'mic3', label: 'mic 3', members: ['Guada','Iván','Juli'] },
    { id: 'mic4', label: 'mic 4', members: ['Lara','Mateo','Nina'] },
    { id: 'graves', label: 'voces graves', members: ['Bruno','Dante','Iván','Mateo'] },
  ];
function Clip(at, who, kind, vis, label, mel) { return { id: uid('c'), at, who, kind, vis, label, mel, dur: melDur(mel), rate: 1, loop: false }; }
function P(song, row, who, from = 0, to = row.words.length - 1) { const m = (song.main[row.id] ??= {}); for (let i = from; i <= to; i++) m[i] = who; }
function O(song, row, who, role, from = 0, to = row.words.length - 1) { const m = (song.ov[row.id] ??= {}); for (let i = from; i <= to; i++) m[i] = { who, role }; }

const HUM_ECO = [[67,.5],[69,.5],[71,1],[71,.5],[69,.5],[67,1.5],[0,.5],[74,.5],[72,.5],[71,1],[69,2]];
const HUM_IDEA = [[62,.5],[65,.5],[69,1],[67,.5],[65,.5],[67,1],[0,.5],[65,.5],[64,.5],[62,1.5],[0,.5],[69,.5],[70,1],[69,.5],[67,.5],[65,2]];
const HUM_RIFF = [[57,.25],[57,.25],[60,.5],[62,.25],[64,.75],[62,.5],[60,.5],[57,1],[0,.5],[57,.25],[57,.25],[60,.5],[62,.25],[64,.75],[67,.5],[64,.5],[62,1.5]];
const HUM_RASG = [[52,.5],[59,.25],[64,.25],[59,.5],[0,.25],[52,.25],[59,.5],[64,.5],[57,.5],[60,.25],[64,.25],[60,.5],[0,.25],[57,.25],[60,.5],[64,.5]];

// Muestra 2026 (Euge's project, Guille adds chords, Calén edits)
const f0 = [B('G | D | Em | C')];
const f1 = [L('Se apagan las luces del barrio', { 0: 'G', 4: 'D' }), L('y alguien canta desde un balcón', { 0: 'Em', 5: 'C' }), L('la calle se llena de pasos', { 0: 'G', 4: 'D' }), L('que siguen el mismo compás', { 0: 'C', 4: 'D' })];
const f2 = [L('Faroles de papel, faroles de papel', { 0: 'G', 3: 'D' }), L('que vuelan cuando nadie los ve', { 0: 'Em', 4: 'C' }), L('faroles de papel (que vuelan otra vez)', { 0: 'G', 3: 'D' }), L('nos llevan a donde no sé', { 0: 'C', 3: 'D', 5: 'G' })];
const f3 = [L('Mi abuela guardaba canciones'), L('adentro de un frasco de miel'), L('las abro de noche, despacio'), L('y suenan igual que ayer')];
const faroles = Song('Faroles de papel', 'G', 96, '4/4', [Sec('Intro', f0), Sec('Estrofa 1', f1), Sec('Estribillo', f2, { rep: 2 }), Sec('Estrofa 2', f3)]);
P(faroles, f1[0], 'Abril'); P(faroles, f1[1], 'Bruno'); P(faroles, f1[2], 'mic2'); P(faroles, f1[3], 'mic2');
f2.forEach(r => P(faroles, r, 'todxs')); O(faroles, f2[2], 'Nina', 'eco', 3, 6); O(faroles, f2[0], 'graves', 'armonía'); O(faroles, f2[1], 'graves', 'armonía');
P(faroles, f3[0], 'Abril', 0, 1); P(faroles, f3[0], 'Bruno', 3, 3); P(faroles, f3[1], 'Nina'); P(faroles, f3[2], 'Camila'); P(faroles, f3[3], 'mic4');
faroles.notes[f2[0].id] = 'respirar antes de "faroles", entra todo el grupo';
faroles.replies = { [f2[0].id]: [{ who: 'Guille', text: 'Les marco el pulso con la guitarra un compás antes.' }] };
faroles.clips.push(Clip(f2[2].id, 'Euge', 'corrección', 'alumnos', 'Nina: así entra el eco, más suave', HUM_ECO));

const l1 = [L('Every window on Main Street is open tonight'), L("somebody's humming a song that we know"), L('hold on, hold on, hold on to the light'), L('the night is long and the river is slow')];
const l2 = [L('Sing it loud, sing it low'), L('let the whole town know'), L('sing it loud (sing it loud), sing it low (sing it low)'), L('all the way home')];
const lanterns = Song('Paper Lanterns Over Main Street', 'D', 104, '4/4', [Sec('Verse', l1), Sec('Chorus', l2)]);
P(lanterns, l1[0], 'Lara'); P(lanterns, l1[1], 'Mateo'); P(lanterns, l1[2], 'todxs'); P(lanterns, l1[3], 'todxs'); l2.forEach(r => P(lanterns, r, 'todxs'));
O(lanterns, l2[2], 'Nina', 'eco', 2, 3); O(lanterns, l2[2], 'Nina', 'eco', 7, 8);

const u1 = [L('Luna de enero sobre la terraza'), L('la ropa tendida baila sin parar'), L('nadie se acuerda de la última casa'), L('donde aprendimos a desafinar')];
const u2 = [L('Luna, lunita, no te vayas todavía'), L('que falta el verso que nunca escribí')];
const luna = Song('Luna de enero', 'Am', 88, '4/4', [Sec('Estrofa', u1), Sec('Estribillo', u2)]);
P(luna, u1[0], 'Guada'); P(luna, u1[1], 'Iván'); P(luna, u1[2], 'Juli'); P(luna, u1[3], 'mic3'); P(luna, u2[0], 'todxs'); P(luna, u2[1], 'Nina');

const d0 = [B('Em | C | G | D')];
const d1 = [L('Por Calle Defensa camina un tambor', { 0: 'Em', 3: 'C' }), L('los adoquines le marcan el paso', { 0: 'G', 4: 'D' }), L('y un bandoneón que perdió su color', { 0: 'Em', 5: 'C' }), L('le presta el aire a quien pase', { 0: 'B7', 6: 'Em' })];
const d2b = B('Am | D | G | Em');
const d2 = [d2b, L('Uno, dos, tres, la vuelta del barrio', { 0: 'Am', 4: 'D' }), L('cuatro, cinco, seis, se suma el cantor', { 0: 'G', 4: 'Em' })];
const d3 = [B('C | D | Em | Em')];
const defensa = Song('Calle Defensa', 'Em', 92, '4/4', [Sec('Intro', d0), Sec('Estrofa', d1), Sec('Puente', d2, { ts: '3/4' }), Sec('Final', d3)]);
P(defensa, d1[0], 'Dante'); P(defensa, d1[1], 'Elena'); P(defensa, d1[2], 'Facundo'); P(defensa, d1[3], 'mic2'); P(defensa, d2[1], 'graves'); P(defensa, d2[2], 'todxs');
defensa.notes[d2b.id] = 'silencio, solo teclas Leo'; defensa.noteBy = { [d2b.id]: 'Guille' };

const b1 = [L('Faroles de papel, faroles de papel', { 0: 'G', 3: 'D' }), L('que vuelan cuando nadie los ve', { 0: 'Em', 4: 'C' }), L('faroles de papel (que vuelan otra vez)', { 0: 'G', 3: 'D' }), L('nos llevan a donde no sé', { 0: 'C', 3: 'D', 5: 'G' })];
const bis = Song('Bis: Faroles (todxs)', 'G', 96, '4/4', [Sec('Estribillo', b1)]); b1.forEach(r => P(bis, r, 'todxs'));

// Mis canciones (Calén's own sketches)
const c1 = [L('El agua golpea la chapa del patio', { 0: 'Dm', 4: 'Bb' }), L('y el perro no sabe si es tarde o temprano', { 0: 'F', 7: 'C' }), L('yo cuento las gotas como si fueran', { 0: 'Dm', 5: 'Bb' }), L('las cosas que nunca te dije', { 0: 'C' })];
const c2 = [L('Lluvia en el patio', { 0: 'Bb', 3: 'F' }), L('lluvia que no para', { 0: 'C', 3: 'Dm' }), L('…mmm, lluvia que se queda', { 0: 'Bb', 4: 'C' })];
const c2s = Sec('Estribillo', c2, { rep: 2 });
const boceto = Song('Lluvia en el patio (boceto)', 'Dm', 84, '4/4', [Sec('Intro', [B('Dm | Bb | F | C')]), Sec('Estrofa', c1), c2s]);
boceto.notes[c1[3].id] = 'cambiar "nunca te dije", muy obvio';
O(boceto, c1[3], 'revisar', '', 3, 5);
boceto.clips.push(Clip(c2s.id, ME, 'idea', 'solo', 'melodía del estribillo, más o menos', HUM_IDEA));
const r1 = B('A | A | D | A');
const riff = Song('Riff de la siesta', 'A', 110, '4/4', [Sec('Riff', [r1, B('E | D | A | E')], { rep: 2 }), Sec('Puente', [B('F#m | D | A | E')])]);
riff.clips.push(Clip(r1.id, ME, 'idea', 'solo', 'el riff va así', HUM_RIFF));

// Taller de guitarra (Guille's project, shared with Calén)
const blues = Song('Blues en La', 'A', 100, '4/4', [Sec('12 compases', [B('A7 | D7 | A7 | A7'), B('D7 | D7 | A7 | A7'), B('E7 | D7 | A7 | E7')], { rep: 3 })]);
blues.notes[blues.secs[0].rows[2].id] = 'turnaround: E7 en el último compás antes de repetir';
const z0 = B('C | Am | B7 | Em');
const zamba = Song('Zamba de práctica', 'Em', 70, '3/4', [Sec('Introducción', [B('Em | Am | D | G'), z0]), Sec('Primera', [L('Ya se fue la tarde por el cerro', { 0: 'Em', 5: 'Am' }), L('y la zamba vuelve a comenzar', { 0: 'D', 3: 'G' })])]);
zamba.clips.push(Clip(z0.id, 'Guille', 'referencia', 'alumnos', 'rasguido de zamba, lento', HUM_RASG));
zamba.secs[1].rows.forEach(r => P(zamba, r, 'rasguido'));
const projects = [
  { id: 'p1', name: 'Muestra 2026', when: 'sábado 12 de diciembre, 20 h\nteatro del viejo mercado\ncitación 18.30', owner: 'Euge', pc: 'var(--ink)', pf: 'var(--p)',
    editors: [['Euge', 'dueña'], ['Guille', 'edita'], [ME, 'edita']], people: true, shared: true, songs: [faroles, lanterns, luna, defensa, bis], tags: [], next: { t: 20261212, day: '12', mon: 'dic', short: 'sáb 12 dic', line: 'sábado 20 h · teatro del viejo mercado' }, version: 3, note: 'Nuevo orden: Calle Defensa pasa antes del bis.' },
  { id: 'p2', name: 'Mis canciones', when: 'bocetos y demos', owner: ME, pc: 'var(--c-o)', pf: '#111', editors: [[ME, 'dueño']], people: false, shared: false, songs: [boceto, riff], tags: ['idea', 'revisar'], version: 1, note: '' },
  { id: 'p3', name: 'Taller de guitarra', when: 'jueves 18 h\ncon Guille', owner: 'Guille', pc: 'var(--c-c)', pf: '#111', editors: [['Guille', 'dueño'], [ME, 'edita']], people: false, shared: true, songs: [blues, zamba], tags: ['rasguido', 'punteo'], next: { t: 20261105, day: '5', mon: 'nov', short: 'jue 5 nov', line: 'jueves 18 h · todas las semanas' }, version: 2, note: 'Agregué el rasguido de la zamba.' },
];
const SALA = 'sala 2 del centro cultural', TEATRO = 'teatro del viejo mercado';
const EVENTS = [
  Ev('p1', '2026-10-24', '15:00', { title: 'Ensayo', place: SALA, songs: ids(faroles, luna) }),
  Ev('p1', '2026-10-31', '15:00', { title: 'Ensayo', place: SALA, songs: ids(faroles, lanterns), who: ['todxs'], note: 'Traigan la letra impresa, es la última vez con papel.' }),
  Ev('p1', '2026-11-07', '15:00', { title: 'Ensayo', place: SALA, songs: ids(luna, defensa), who: ['mic1', 'mic2'] }),
  Ev('p1', '2026-11-14', '15:00', { title: 'Ensayo', place: SALA, songs: ids(faroles, bis), who: ['todxs'] }),
  Ev('p1', '2026-11-21', '14:00', { title: 'Ensayo con banda', place: 'sala grande', songs: ids(faroles, lanterns, luna, defensa, bis), who: ['todxs'], note: 'Viene la banda completa: puntuales.' }),
  Ev('p1', '2026-12-05', '16:00', { title: 'Ensayo general', place: TEATRO, songs: ids(faroles, lanterns, luna, defensa, bis), who: ['todxs'] }),
  Ev('p1', '2026-12-12', '20:00', { title: 'Muestra 2026', place: TEATRO, songs: ids(faroles, lanterns, luna, defensa, bis), who: ['todxs'], note: 'Citación 18.30. Ropa negra.', star: true, remind: 'semana' }),
  Ev('p2', '2026-11-15', '11:00', { title: 'Grabar demo', place: 'estudio de Tomi', songs: ids(boceto) }),
  ...Array.from({ length: 9 }, (_, k) => Ev('p3', addDays('2026-10-22', k * 7), '18:00', { title: 'Clase', place: 'casa de Guille', songs: [k % 2 ? zamba.id : blues.id], series: 'g1', repeat: 'semana' })),
  Ev('', '2026-10-29', '', { title: 'Comprar cuerdas', remind: 'no' }),
  Ev('', '2026-11-03', '10:30', { title: 'Café con Guille', place: 'bar La Poesía', remind: 'hora' }),
  Ev('', '2026-11-19', '17:00', { title: 'Audición, coro municipal', place: 'centro cultural San Martín', note: 'Llevar la partitura.', songs: ids(luna) }),
];
faroles.changed = new Set([f1[3].id, f2[2].id]); defensa.changed = new Set([d2[1].id]);
  projects[0].cast = { people: PEOPLE, groups: GROUPS }; projects.forEach(snapshot);
  return { projects, events: EVENTS };
}

/* ---------------- colours ---------------- */
const HUES = ['y','g','p','c','o','v','r','l'];
const PALETTE = ['g','p','c','o','v','r','l'];
// every hue in three tones (light, as is, deep): 24 colours. New tags take the plain tones first, then the deep ones, then the light ones
const AUTO = [...PALETTE, ...HUES.map(h => h + '2'), ...HUES.map(h => h + '1')];
const SWATCHES = ['1', '', '2'].flatMap(t => HUES.map(h => h + t));
const projOfSong = (song) => PROJECTS.find(p => p.songs.includes(song) || p.published?.songs.includes(song)) ?? PROJECTS.find(p => p.songs.some(x => x.id === song.id));
// a colour nobody in the project has yet; once all are taken, at least one that isn't on the lines around
function pickColor(map, song, rowId) {
  const used = new Set(Object.values(map)), near = new Set();
  if (song && rowId) { const rs = rowsOf(song), k = rs.findIndex(r => r.id === rowId); for (const r of rs.slice(Math.max(0, k - 2), k + 3)) whoOfRow(song, r).forEach(w => map[w] && near.add(map[w])); }
  return AUTO.find(c => !used.has(c)) ?? AUTO.find(c => !near.has(c)) ?? AUTO[Object.keys(map).length % AUTO.length];
}
function colorsFor(song) {
  // one colour per tag for the whole project, so a tag reads the same on every song; colours stick once given
  const p = projOfSong(song), map = p ? (p.colors ??= { todxs: 'y' }) : (song.colors ??= { todxs: 'y' });
  for (const r of rowsOf(song)) for (const who of whoOfRow(song, r)) if (!(who in map)) map[who] = pickColor(map, song, r.id);
  return map;
}
const tagColor = (p, id) => { if (!p?.id) return 'y'; const map = (p.colors ??= { todxs: 'y' }); return map[id] ??= pickColor(map); };
function secColor(name) {
  const n = name.toLowerCase();
  const known = [['intro','c'],['estrofa','g'],['verse','g'],['primera','g'],['estribillo','p'],['chorus','p'],['puente','o'],['riff','v'],['final','v'],['12','o']];
  for (const [k, c] of known) if (n.startsWith(k)) return c;
  let h = 0; for (const ch of n.replace(/\d/g, '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return PALETTE[h % PALETTE.length];
}
function waveBars(seed, n) { let h = 7; for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return Array.from({ length: n }, () => { h = (h * 1103515245 + 12345) >>> 0; return 22 + (h % 78); }); }

/* ---------------- paste parsing ---------------- */
const CH = /^[A-G][#b]?(m|maj|min|dim|aug|sus|add|°|ø|\d|\+|-)*(\/[A-G][#b]?)?$/;
const isChordLine = (l) => { const t = l.trim().split(/\s+/); return t.length > 0 && t[0] !== '' && t.every(x => CH.test(x) || x === '%'); };
function chordOver(cl, ll) {
  const starts = []; const re = /\S+/g; let m; while ((m = re.exec(ll))) starts.push(m.index);
  const words = ll.trim().split(/\s+/); const chords = {};
  const rc = /\S+/g; while ((m = rc.exec(cl))) { let wi = 0; for (let j = 0; j < starts.length; j++) if (starts[j] <= m.index + 1) wi = j; while (chords[wi] && wi < words.length - 1) wi++; chords[wi] = m[0]; }
  return L(words.join(' '), chords);
}
function parsePaste(text) {
  const blocks = text.replace(/\r/g, '').split(/\n\s*\n/).map(b => b.split('\n').filter(l => l.trim()));
  const secs = []; const notes = [];
  for (const b of blocks) {
    if (!b.length) continue;
    let name = 'Sección', lines = b, rep = 1, ts = null;
    const first = b[0].trim();
    if (b.length > 1 && !first.includes('|') && !isChordLine(first) && first.length < 30) {
      rep = +((first.match(/x(\d+)/) || [])[1] || 1); ts = (first.match(/\[(\d+\/\d+)\]/) || [])[1] || null;
      name = first.replace(/^#\s*/, '').replace(/x\d+/, '').replace(/\[.*?\]/, '').replace(/:$/, '').trim() || 'Sección'; lines = b.slice(1);
    }
    const rows = [];
    for (let k = 0; k < lines.length; k++) {
      const l = lines[k];
      if (l.trim().startsWith('>')) { if (rows.length) notes.push([rows[rows.length - 1].id, l.trim().slice(1).trim()]); continue; }
      if (l.includes('|')) { rows.push(B(l)); continue; }
      if (isChordLine(l)) { const nx = lines[k + 1]; if (nx && !nx.includes('|') && !isChordLine(nx)) { rows.push(chordOver(l, nx)); k++; } else rows.push(B(l)); continue; }
      rows.push(L(l.trim()));
    }
    secs.push(Sec(name, rows.length ? rows : [L('')], { rep, ts }));
  }
  return { secs, notes };
}

function lcs(a, b) {
  const n = a.length, m = b.length; const dp = Array.from({ length: n + 1 }, () => new Int16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const pairs = []; let i = 0, j = 0;
  while (i < n && j < m) { if (a[i] === b[j]) { pairs.push([i, j]); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
  return pairs;
}
/* key detection: pick the key whose chords explain the song best */
function guessKey(list) {
  let best = 'C', bs = -1;
  for (let r = 0; r < 12; r++) for (const minor of [false, true]) {
    const k = transKey(minor ? 'Am' : 'C', minor ? r - 9 : r);
    const pal = new Set(palette(k).map(x => { const p = splitChord(x.c); return IDX[p.r] + (/^m(?!aj)/.test(p.q) ? 'm' : /dim/.test(p.q) ? 'd' : ''); }));
    const tonic = IDX[parseKey(k).name];
    let sc = 0;
    list.forEach((c, i) => { const p = splitChord(c); if (!p) return; const q = /^m(?!aj)/.test(p.q) ? 'm' : /dim/.test(p.q) ? 'd' : ''; if (pal.has(IDX[p.r] + q)) sc += 1; if (IDX[p.r] === tonic && (q === 'm') === minor) sc += (i === 0 ? 1.5 : 0) + (i === list.length - 1 ? 1 : 0) + 0.3; });
    if (sc > bs) { bs = sc; best = k; }
  }
  return best;
}
function songChords(song) { const out = []; for (const r of rowsOf(song)) { if (r.kind === 'bars') r.bars.forEach(b => b.forEach(c => c !== '%' && out.push(c))); else Object.keys(r.chords).map(Number).sort((a, b) => a - b).forEach(i => out.push(r.chords[i])); } return out; }
function autoKey(song) { if (!song.keyAuto) return; const list = songChords(song); if (list.length >= 2) song.key = guessKey(list); }
/* playback */
function events(song) {
  const ev = [];
  for (const sec of song.secs) {
    const beats = beatsOf(song, sec);
    for (let k = 0; k < sec.rep; k++) {
      let prev = null;
      for (const r of sec.rows) {
        if (r.kind === 'bars') r.bars.forEach((b, i) => {
          const chords = b[0] === '%' ? prev : b.length ? b : null; if (b.length && b[0] !== '%') prev = b;
          const list = chords?.length ? chords : [null];
          list.forEach(c => ev.push({ el: `e-${r.id}-b${i}`, c, beats: beats / list.length }));
        });
        else Object.keys(r.chords).map(Number).sort((a, b) => a - b).forEach(i => { ev.push({ el: `e-${r.id}-${i}`, c: r.chords[i], beats }); prev = [r.chords[i]]; });
      }
    }
  }
  return ev;
}
const clearNow = () => document.querySelectorAll('.now').forEach(x => x.classList.remove('now'));
function stopSound() { PLAY.nodes.forEach(n => { try { n.stop(); } catch {} }); PLAY.nodes = []; }
function playSong() {
  stopClip(false); const song = cur(); const ev = events(song);
  if (!ev.length) return toast('Todavía no hay acordes para escuchar.');
  ac().resume(); PLAY.song = true; let i = 0; render();
  const step = () => {
    if (!PLAY.song) return; if (i >= ev.length) return stopSong();
    const e = ev[i++]; const spb = 60 / song.bpm; const t = ac().currentTime + 0.03;
    if (e.c) strum(e.c, t, e.beats * spb);
    for (let b = 0; b < Math.round(e.beats); b++) tick(t + b * spb, b === 0);
    clearNow(); const el = document.getElementById(e.el);
    if (el) { el.classList.add('now'); el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    PLAY.timer = setTimeout(step, e.beats * spb * 1000);
  };
  step();
}
function stopSong(rerender = true) { if (!PLAY.song) return; PLAY.song = false; clearTimeout(PLAY.timer); stopSound(); clearNow(); if (rerender) render(); }
function allClips() { return PROJECTS.flatMap(p => [...p.songs, ...p.published.songs].flatMap(s => s.clips)); }
function playClip(c) {
  stopSong(false); stopClip(false); ac().resume();
  PLAY.clip = c.id;
  const go = () => {
    if (c.url) {
      const a = new Audio(c.url); a.playbackRate = c.rate; a.play().catch(() => {});
      PLAY.stopFn = () => a.pause(); PLAY.prog = () => a.duration ? a.currentTime / a.duration : 0;
      a.onended = () => c.loop ? go() : stopClip();
    } else {
      const t0 = ac().currentTime + 0.05; const d = hum(c.mel, c.rate, t0);
      PLAY.prog = () => (ac().currentTime - t0) / d;
      const tm = setTimeout(() => c.loop && PLAY.clip === c.id ? go() : stopClip(), d * 1000 + 80);
      PLAY.stopFn = () => { clearTimeout(tm); stopSound(); };
    }
  };
  go(); render();
  const loop = () => {
    if (PLAY.clip !== c.id) return;
    const p = Math.max(0, Math.min(1, PLAY.prog?.() ?? 0));
    document.querySelectorAll(`[data-wave="${c.id}"]`).forEach(w => { const bars = w.children; const k = Math.round(p * bars.length); for (let j = 0; j < bars.length; j++) bars[j].classList.toggle('on', j < k); });
    PLAY.raf = requestAnimationFrame(loop);
  };
  loop();
}
function stopClip(rerender = true) { if (!PLAY.clip) return; PLAY.stopFn?.(); PLAY.clip = null; PLAY.prog = null; cancelAnimationFrame(PLAY.raf); if (rerender) render(); }

/* ---------------- state ---------------- */
// the sidebar is remembered per kind of device: a tablet and a computer want different things
function devOf() { return matchMedia('(pointer: coarse)').matches ? 'ipad' : 'compu'; }
const S = {
  dev: boot.mode === 'student' ? 'alumno' : devOf(), screen: boot.mode === 'signin' ? 'signin' : 'board', sent: false, sending: false, signErr: '', mail: '', filter: 'todos',
  pid: null, ptab: 'canciones', si: 0, preview: false, conflict: false,
  editing: null, sel: [], selAnchor: null, pop: null, recent: [], role: 'canta', split: false, custom: [],
  composer: null, rec: null, cvis: 'alumnos', recLabel: 'Audio', tool: null, brush: undefined, menu: null, trash: null, sView: 'home', sAll: false,
  hist: [], modal: null, toast: null, side: 'flota', collapsed: false, peek: false, peekAnim: false, tbar: 'notion', pview: 'lista', lastRow: null, open: new Set(), fold: new Set(), slash: null,
  sPid: null, sSong: 0, me: null, sheet: null, newsOpen: true, sChords: true,
  navlook: 'bloques', myName: ME, avatar: 'o', remindDef: 'dia', remMail: true, weekStart: 1, stuRemind: false, recolorOpen: null,
  fview: 'carpetas', sview: 'hojas', ev: null, calMonth: TODAY.slice(0, 7), calSel: null, calHide: new Set(), search: null, recentS: [], bin: [], binAsk: null, reh: null, replyAt: null, flash: null,
};
const proj = (id = S.pid) => PROJECTS.find(p => p.id === id);
const secCol = (sec) => sec.color || secColor(sec.name || 'estrofa');
const narrow = () => (document.getElementById('app')?.clientWidth ?? 999) <= 560;
const cur = () => proj().songs[S.si];
const draftCount = (p) => p.shared ? p.songs.reduce((a, s) => a + s.changed.size, 0) + (p.orderDirty ? 1 : 0) : 0;
const rowsOf = (song) => song.secs.flatMap(s => s.rows);
const findRow = (song, id) => { for (const sec of song.secs) { const i = sec.rows.findIndex(r => r.id === id); if (i >= 0) return { sec, i, row: sec.rows[i] }; } return null; };
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const hasChords = (s) => songChords(s).length > 0;
const isEmptyRow = (r) => r.kind === 'lyric' && !r.words.join('').trim();
// every tag in the list gets its own colour up front, so the square you see is the colour you get
function seedTagColors(song, ids) { const map = colorsFor(song); for (const id of ids) if (!(id in map)) map[id] = pickColor(map, song, S.sel[0]?.row); }
function colorPreview(song, who) { const map = colorsFor(song); return map[who] ?? pickColor(map, song, S.sel[0]?.row); }

/* ---------------- render pieces ---------------- */
function lineWho(song, r, colors) {
  const out = []; const seen = new Set();
  for (const w of Object.values(song.main[r.id] ?? {})) if (!seen.has(w)) { seen.add(w); out.push(`<b style="--h:${cv(colors[w])}">${esc(nameOf(w))}</b>`); }
  const ovs = new Map(); for (const o of Object.values(song.ov[r.id] ?? {})) ovs.set(o.who + o.role, o);
  for (const o of ovs.values()) out.push(`<b class="ov" style="--h:${cv(colors[o.who])}">${o.role ? o.role + ' ' : ''}${esc(nameOf(o.who))}</b>`);
  return out.join('');
}
function wordsV(song, r, colors, opt = {}) {
  if (isEmptyRow(r)) return '';
  const sel = new Set(S.sel.filter(x => x.row === r.id).map(x => x.i));
  const m = song.main[r.id] ?? {}, ov = song.ov[r.id] ?? {};
  return r.words.map((w, i) => {
    const who = m[i], o = ov[i]; const cls = ['w']; let st = '';
    if (who) { cls.push('on'); st += `--h:${cv(colors[who])};`; }
    if (o) { cls.push('ov'); st += `--h2:${cv(colors[o.who])};`; }
    if (!opt.student && sel.has(i)) cls.push('sel');
    if (opt.mine && !(who && opt.mine(who)) && !(o && opt.mine(o.who))) cls.push('nm');
    const c = opt.noChords ? null : r.chords[i];
    return `<span class="${cls.join(' ')}" data-row="${r.id}" data-i="${i}" id="${opt.pre ?? 'e'}-${r.id}-${i}"${c ? ` data-c="${esc(c)}"` : ''}${st ? ` style="${st}"` : ''}>${esc(w)}${i < r.words.length - 1 ? ' ' : ''}</span>`;
  }).join('');
}
function clipV(c) {
  if (c.file) return `<a class="clip file" href="${c.url}" target="_blank" rel="noopener">${c.img ? `<img src="${c.url}" alt="">` : `<span class="ft">${esc(c.ext)}</span>`}<span class="ci">${esc(c.label)}<small>${esc(c.who)}${c.vis === 'solo' ? ' · privado' : ''}</small></span></a>`;
  const on = PLAY.clip === c.id;
  return `<div class="clip${on ? ' on' : ''}"><button class="pl" data-clip="${c.id}" aria-label="${on ? 'Pausar' : 'Escuchar'}">${on ? ICON.pause : ICON.play}</button>
    <span class="wave" data-wave="${c.id}">${waveBars(c.id + c.label, 22).map(h => `<i style="height:${h}%"></i>`).join('')}</span>
    <span class="ci">${esc(c.label)}<small>${esc(c.who)} · ${fmt(c.dur)}${c.vis === 'solo' ? ' · privado' : ''}</small></span>
    ${on ? `<button class="b sm" data-rate="${c.id}">${c.rate < 1 ? 'Lento' : 'Normal'}</button><button class="b sm${c.loop ? ' on' : ''}" data-loop="${c.id}">Repetir</button>` : ''}</div>`;
}
function commentsV(song, at, student = false) {
  // a comment is signed, like a comment in a doc, so a class can tell Euge's from Guille's
  const who = song.noteBy?.[at] ?? (student ? proj(S.sPid) : proj())?.owner ?? ME;
  // replies under it, like a doc's thread; resolving puts it away (with Deshacer) instead of deleting by hand
  const reps = (song.replies?.[at] ?? []).map(r => `<div class="rep"><b>${esc(r.who)}</b><span>${esc(r.text)}</span></div>`).join('');
  const acts = student ? '' : S.replyAt === at ? `<form class="rform" data-rform><input id="rnote" placeholder="Responder" autocomplete="off"><button class="b solid" type="submit">Enviar</button><button class="b" type="button" data-reply="" aria-label="Cancelar">×</button></form>`
    : `<span class="nact"><button data-reply="${at}">Responder</button><button data-resolve="${at}">Resolver</button></span>`;
  const note = song.notes[at] && !(S.composer?.at === at && S.composer.mode !== 'att') ? `<div class="note"><b>${esc(who)}</b><span>${esc(song.notes[at])}</span>${reps}${acts}</div>` : '';
  const clips = song.clips.filter(c => c.at === at && (!student || c.vis === 'alumnos')).map(clipV).join('');
  return note || clips ? `<div class="cmts">${note}${clips}</div>` : '';
}
function composerV(at) {
  if (S.rec && S.rec.at === at) return `<div class="composer rec"><i class="recdot"></i><span id="rect">0:00</span><span class="live" id="live">${'<i></i>'.repeat(18)}</span>${S.rec.real ? '' : '<span class="quiet">simulado</span>'}<button class="b solid" data-recstop>Listo</button></div>`;
  if (S.composer?.at !== at) return '';
  const vis = proj().shared ? `<label class="chk"><input type="checkbox" id="cvis" ${S.cvis === 'alumnos' ? 'checked' : ''}>La ven con el link</label>` : '';
  if (S.composer.mode === 'att') return `<div class="composer att"><button class="b" type="button" data-recstart><i class="rdot"></i>Grabar audio</button><label class="b">Subir archivo<input type="file" accept="audio/*,image/*,application/pdf" id="upl" hidden></label>
    ${vis}<span class="sp"></span><button class="b" type="button" data-cclose aria-label="Cerrar">×</button></div>`;
  return `<form class="composer" data-cform><input id="cnote" placeholder="Comentario" value="${esc(cur().notes[at] ?? '')}" autocomplete="off">
    ${vis}<button class="b solid" type="submit">Guardar</button><button class="b" type="button" data-cclose aria-label="Cerrar">×</button></form>`;
}
// Notion's block gutter: + inserts below, the handle drags or opens the block menu. Shown on hover, or on the block you're on.
const gutV = (kind, id, show) => `<span class="gut${show ? ' show' : ''}"><button class="gb" data-plus="${kind}:${id}" aria-label="Insertar debajo">+</button><button class="gb hd" data-handle="${kind}:${id}" aria-label="Mover o abrir el menú">⠿</button></span>`;
const rowShown = (id) => S.editing?.id === id || S.sel.some(x => x.row === id) || S.menu?.id === id || S.pop?.row === id;
const beatsOf = (song, sec) => +(sec.ts ?? song.ts).split('/')[0];
function barsV(song, sec, r, student = false) {
  const beats = beatsOf(song, sec); const tag = student ? 'div' : 'button';
  const cells = r.bars.map((b, i) => {
    const sim = b[0] === '%', empty = !b.length;
    const tgt = S.pop?.type === 'chord' && S.pop.row === r.id && S.pop.bar === i;
    return `<${tag} class="bar${sim ? ' sim' : ''}${empty ? ' empty' : ''}${tgt ? ' tgt' : ''}"${student ? '' : ` data-bar="${r.id}:${i}" id="e-${r.id}-b${i}" aria-label="Compás ${i + 1}"`}><span class="chs">${sim ? '%' : empty ? '' : b.map(c => `<span>${esc(c)}</span>`).join('')}</span><i class="bt">${'<b></b>'.repeat(beats)}</i></${tag}>`;
  }).join('');
  return `<div class="br" data-row="${r.id}">${student ? '' : gutV('row', r.id, rowShown(r.id))}<div class="bars">${cells}${student ? '' : `<button class="bar plus" data-addbar="${r.id}" aria-label="Agregar compás">+</button>`}</div>${commentsV(song, r.id, student)}${student ? '' : composerV(r.id)}</div>`;
}
function lineV(song, r, colors, only) {
  const ed = S.editing?.kind === 'row' && S.editing.id === r.id;
  const inner = ed ? esc(r.words.join(' ').trim()) : wordsV(song, r, colors);
  return `<div class="ln" data-row="${r.id}">${gutV('row', r.id, rowShown(r.id))}<div class="tx${ed ? ' editing' : ''}"${ed ? ' contenteditable="plaintext-only" spellcheck="true"' : ''}${only ? ' data-ph="Escribí o pegá, o / para insertar"' : ed ? ' data-ph="Escribí, o / para insertar"' : ''}>${inner}</div><div class="who">${lineWho(song, r, colors)}</div>${commentsV(song, r.id)}${composerV(r.id)}</div>`;
}
function secV(song, sec, colors, only) {
  const ed = S.editing?.kind === 'sec' && S.editing.id === sec.id;
  const showName = ed || song.secs.length > 1 || sec.name;
  const label = sec.name + (sec.rep > 1 ? ` x${sec.rep}` : '') + (sec.ts ? ` ${sec.ts}` : '');
  const reps = `${sec.rep > 1 ? `<span class="rep">×${sec.rep}</span>` : ''}${sec.ts ? `<span class="rep">${sec.ts}</span>` : ''}`;
  const name = ed ? `<div class="sn editing" data-secname="${sec.id}" contenteditable="plaintext-only" spellcheck="false" data-ph="${esc(sec.sugg || 'Sección')}">${esc(label)}</div>`
    : sec.name ? `<div class="sn" data-secname="${sec.id}">${esc(sec.name)}${reps}</div>`
    : showName ? `<div class="sn sugg" data-secname="${sec.id}"><span>${esc(sec.sugg || 'Sección')}</span>${sec.sugg ? `<button class="okg" data-oksugg="${sec.id}" title="Ponerle este nombre">Usar</button>` : ''}${reps}</div>` : '';
  const folded = S.fold.has(sec.id) && !ed;
  const head = name ? `<div class="shd">${gutV('sec', sec.id, S.menu?.id === sec.id || ed)}<button class="fold" data-fold="${sec.id}" aria-label="${folded ? 'Desplegar' : 'Plegar'} ${esc(sec.name || 'parte')}">${folded ? '▸' : '▾'}</button>${name}</div>` : '';
  const n = sec.rows.filter(r => r.kind === 'bars' || !isEmptyRow(r)).length;
  return `<section class="sec${folded ? ' isfolded' : ''}" data-sec="${sec.id}" style="--h:${cv(secCol(sec))}">${head}${folded ? `<button class="folded" data-fold="${sec.id}">${n} ${n === 1 ? 'renglón' : 'renglones'} plegados</button>` : `${commentsV(song, sec.id)}${composerV(sec.id)}
    ${sec.rows.map(r => r.kind === 'bars' ? barsV(song, sec, r) : lineV(song, r, colors, only)).join('')}`}</section>`;
}

/* ---------------- views ---------------- */
// stage: the element the page gave us
let lastView = '';
const KEEP = ['#sw', '.mainc > .scroll', '.rail', '.st .scroll', '.evp .eb', '.tlist']; // the last two are overlays, put back once they exist
function render() {
  const view = [S.dev, S.screen, S.pid, S.si, S.sView, S.sSong].join(':'), keep = KEEP.map(q => document.querySelector(q)?.scrollTop ?? 0);
  if (S.dev === 'alumno') stage.innerHTML = `<div class="app alumno" id="app">${S.preview ? '<div class="pvbar"><span>Así lo ven con el link</span><button class="b" data-unpreview>Volver a editar</button></div>' : ''}${alumno()}</div>`;
  else stage.innerHTML = `<div class="app" id="app">${S.screen !== 'signin' ? `<div class="shell side-${effSide()}${S.peek ? ' peek' : ''}${S.peekAnim ? ' anim' : ''}">${railV()}<div class="mainc">${appView()}</div>${effSide() === 'asoma' && !S.peek ? '<div class="edge" data-edge aria-hidden="true"></div>' : ''}</div>` : appView()}</div>`;
  S.peekAnim = false;
  const back = (from, to) => KEEP.slice(from, to).forEach((q, k) => { const el = document.querySelector(q); if (el && keep[from + k] && (view === lastView || q === '.rail')) el.scrollTop = keep[from + k]; });
  back(0, 4); after(); back(4, 6);
  lastView = view;
  if (S.screen !== 'signin') queueSave();
}
const appView = () => S.screen === 'signin' ? signin() : S.screen === 'board' ? board() : S.screen === 'cal' ? calendar() : S.screen === 'bin' ? binV() : S.screen === 'project' ? project() : editor();
// solid glyphs drawn for Noti (no line icons): a folder for home, a bin, a lens, and the sidebar itself for the toggle
const GL = {
  search: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill-rule="evenodd" d="M7 1.4a5.6 5.6 0 0 1 4.5 8.9l3.3 3.3-1.5 1.5-3.3-3.3A5.6 5.6 0 1 1 7 1.4zm0 2.2a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z"/></svg>',
  home: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 3.6c0-.8.6-1.4 1.4-1.4h3.4l1.5 1.7h5.3c.8 0 1.4.6 1.4 1.4v1.2H1.5zM1.5 7.8h13v5c0 .8-.6 1.4-1.4 1.4H2.9c-.8 0-1.4-.6-1.4-1.4z"/></svg>',
  bin: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.6 1.5h4.8l.6 1.6h3v1.9H2V3.1h3zM3.1 6.2h9.8l-.9 8.3H4z"/></svg>',
  side: '<svg viewBox="0 0 18 16" aria-hidden="true"><path fill-rule="evenodd" d="M3 1.5h12c.8 0 1.5.7 1.5 1.5v10c0 .8-.7 1.5-1.5 1.5H3c-.8 0-1.5-.7-1.5-1.5V3c0-.8.7-1.5 1.5-1.5zm4.2 2v9h7.3v-9z"/></svg>',
};
const gl = (k) => `<span class="gl">${GL[k]}</span>`;
// the calendar's glyph is a little page with today's date on it
const calGlyph = () => `<i class="calg" aria-hidden="true"><b>${D(TODAY).getDate()}</b></i>`;
function railV() {
  // the sidebar, after Notion's: the key places first, then every project as a tree that opens to its songs, then the trash and you
  const row = (p) => {
    const open = S.open.has(p.id), here = S.pid === p.id && S.screen === 'project';
    const songs = open ? (p.songs.length ? p.songs.map((s, i) => `<div class="ri song${S.screen === 'song' && S.pid === p.id && S.si === i ? ' on' : ''}"><button class="rn" data-opensong="${p.id}:${i}"><span>${esc(titleOf(s))}</span>${p.shared && s.changed.size ? '<i class="dot"></i>' : ''}</button></div>`).join('')
      : '<div class="ri song empty">Sin canciones</div>') : '';
    return `<div class="ri${here ? ' on' : ''}${S.menu?.pid === p.id ? ' menuon' : ''}" style="--pc:${p.pc}"><button class="tw" data-tog="${p.id}" aria-label="${open ? 'Cerrar' : 'Abrir'} ${esc(p.name)}">${open ? '▾' : '▸'}</button><button class="rn" data-proj="${p.id}"><i class="sq"></i><span>${esc(p.name || 'Sin nombre')}</span>${draftCount(p) ? '<i class="dot"></i>' : ''}</button><span class="ra"><button data-pmenu2="${p.id}" aria-label="Opciones">···</button><button data-newsong2="${p.id}" aria-label="Nueva canción">+</button></span></div>${songs}`;
  };
  const shared = PROJECTS.filter(p => p.shared || p.owner !== ME), mine = PROJECTS.filter(p => !shared.includes(p));
  const pinned = S.peek && !narrow(), tt = pinned ? 'Fijar la barra' : 'Esconder la barra';
  const tog = `<button class="stog" data-${pinned ? 'pin' : 'collapse'} aria-label="${tt}" title="${tt}">${GL.side}</button>`;
  const nToday = allEvents().filter(x => x.e.date === TODAY).length;
  const find = `<button class="sfield" data-search>${gl('search')}<span>Buscar</span><kbd>${/Mac|iP/.test(navigator.platform) ? '⌘K' : 'Ctrl K'}</kbd></button>`;
  const keys = S.navlook === 'bloques'
    ? `<div class="tiles"><button class="tile${S.screen === 'board' ? ' on' : ''}" data-go="board">${gl('home')}<span>Inicio</span></button><button class="tile${S.screen === 'cal' ? ' on' : ''}" data-go="cal">${calGlyph()}<span>Calendario${nToday ? `<small>${nToday} hoy</small>` : ''}</span></button></div>`
    : `<div class="ri key${S.screen === 'board' ? ' on' : ''}"><button class="rn" data-go="board">${gl('home')}<span>Inicio</span></button></div>
       <div class="ri key${S.screen === 'cal' ? ' on' : ''}"><button class="rn" data-go="cal">${calGlyph()}<span>Calendario</span>${nToday ? `<small class="cnt2 hot">${nToday} hoy</small>` : ''}</button></div>`;
  return `<aside class="rail" aria-label="Barra lateral"><div class="rhead"><span class="eyetile"><span id="raileye"></span></span><span class="sp"></span>${tog}</div>
    <nav class="keys${S.navlook === 'bloques' ? ' nb' : ''}" aria-label="Principal">${find}${keys}</nav>
    ${shared.length ? `<div class="rl">Compartidos</div>${shared.map(row).join('')}` : ''}
    <div class="rl">Míos<button data-newproj aria-label="Nuevo proyecto">+</button></div>${mine.map(row).join('')}
    <div class="ri add"><button class="rn" data-newproj><span>+ Nuevo proyecto</span></button></div>
    <span class="sp"></span>
    <div class="ri key bin${S.screen === 'bin' ? ' on' : ''}"><button class="rn" data-go="bin">${gl('bin')}<span>Papelera</span>${S.bin.length ? `<small class="cnt2">${S.bin.length}</small>` : ''}</button></div>
    <div class="ri me2${S.menu?.kind === 'me' ? ' menuon' : ''}"><button class="rn" data-mepop aria-haspopup="menu" aria-expanded="${S.menu?.kind === 'me'}"><i class="wsq me" style="--av:${cv(S.avatar)}">${esc((S.myName || '?')[0])}</i><span>${esc(S.myName)}</span><span class="chev" aria-hidden="true">···</span></button></div></aside>`;
}
// docked as a floating card; « hides it, and it comes back with » or by touching the left edge
const effSide = () => S.collapsed ? 'asoma' : 'flota';
// the o from the logo lives at the top of the sidebar, mounted once so it keeps watching across renders
const eyeHost = document.createElement('span'); eyeHost.className = 'eyebox'; eyeHost.id = 'raileye';
let eyeOn = false;
function placeEye() {
  const slot = document.getElementById('raileye'); if (!slot || slot === eyeHost) return;
  if (!eyeOn) { eyeOn = true; mountNotiHero(eyeHost, { intro: false, label: 'Noti' }); }
  slot.replaceWith(eyeHost);
}
const sideBtn = () => `<button class="b sidebtn" data-peek aria-label="Mostrar la barra lateral" title="Mostrar la barra">${GL.side}</button>`;
// whether the sidebar is hidden is remembered per device, not per account: a phone and a computer want different things
const sideMem = () => { try { return JSON.parse(localStorage.getItem('noti-side') || '{}'); } catch { return {}; } };
function saveSide() { try { const m = sideMem(); m[S.dev] = S.collapsed; localStorage.setItem('noti-side', JSON.stringify(m)); } catch {} }
// sign in with Google, with a mail and a password, or with a link sent by mail (which also covers a forgotten password)
const GLOGO = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.6 13.2l7.9 6.2C12.4 13.7 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.2 5.6c4.2-3.9 7.1-9.6 7.1-17.1z"/><path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.2C1 16.5 0 20.1 0 24s1 7.5 2.6 10.8l7.9-6.2z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.2-5.6c-2 1.4-4.7 2.3-8.7 2.3-6.3 0-11.6-4.2-13.5-10l-7.9 6.2C6.6 42.6 14.6 48 24 48z"/></svg>';
function signin() {
  const m = S.authMode ?? 'in', up = m === 'up', link = m === 'link';
  const sent = S.sent === 'confirm' ? `Te mandamos un mail a ${esc(S.mail)} para confirmar la cuenta. Es solo esta vez.` : `Te mandamos un link a ${esc(S.mail || 'tu mail')}. Abrilo en este mismo aparato.`;
  return `<div class="signin"><div class="logo" id="logo"></div>
    <div class="form">${S.sent
      ? `<p class="big">${sent}</p><button class="b" type="button" data-resend>Volver</button>`
      : `${boot.google ? `<button class="b gbtn" type="button" data-google>${GLOGO}<span>Seguir con Google</span></button><div class="or"><span>o</span></div>` : ''}
        <form class="form" id="signin"><label class="fl">Mail<input id="mail" type="email" required placeholder="vos@ejemplo.com" autocomplete="email" value="${esc(S.mail)}"></label>
        ${link ? '' : `<label class="fl">Contraseña<input id="pass" type="password" required minlength="6" autocomplete="${up ? 'new-password' : 'current-password'}"></label>`}
        <button class="b solid" type="submit"${S.sending ? ' disabled' : ''}>${S.sending ? 'Un momento…' : up ? 'Crear cuenta' : link ? 'Mandarme el link' : 'Entrar'}</button>${S.signErr ? `<p class="quiet">${esc(S.signErr)}</p>` : ''}</form>
        <p class="alt">${up ? '<button type="button" data-amode="in">Ya tengo cuenta</button>' : '<button type="button" data-amode="up">Crear cuenta</button>'}<span>·</span>${link ? '<button type="button" data-amode="in">Entrar con contraseña</button>' : '<button type="button" data-amode="link">Entrar con un link por mail</button>'}</p>`}</div>
    ${S.sent ? '' : '<p class="hint">Si sos alumno o alumna, abrí el link que te pasaron.</p>'}</div>`;
}
function authErr(msg) {
  const m = (msg || '').toLowerCase();
  if (m.includes('invalid login')) return 'Mail o contraseña incorrectos. Si siempre entraste con un link, entrá así y creá tu contraseña desde tu perfil.';
  if (m.includes('already registered')) return 'Ese mail ya tiene cuenta. Entrá con tu contraseña o con un link.';
  if (m.includes('not confirmed')) return 'Falta confirmar el mail: abrí el que te mandamos.';
  if (m.includes('password')) return 'La contraseña tiene que tener al menos 6 caracteres.';
  if (m.includes('not authorized') || m.includes('sending')) return 'Por ahora los mails de Noti no llegan a todos. Creá tu cuenta con una contraseña.';
  if (m.includes('rate limit') || m.includes('security purposes')) return 'Demasiados intentos seguidos. Esperá un minuto y probá de nuevo.';
  if (m.includes('provider')) return 'Google todavía no está listo. Entrá con tu mail.';
  return 'No pudimos entrar. Revisá el mail y probá de nuevo.';
}
function pubBtn(p) {
  if (!p.shared) return '';
  const n = draftCount(p);
  return n ? `<button class="b solid" data-pub>Publicar</button>` : `<span class="quiet">Publicado</span>`;
}
// ways to start, not kinds of project: what a project is for is up to whoever makes it
const STARTERS = [
  { k: 'blank', t: 'Proyecto nuevo', d: 'Vacío, le ponés nombre vos', g: '+', pc: 'var(--c-v)' },
  { k: 'paste', t: 'Pegar una canción', d: 'Letra, acordes o las dos cosas', g: 'Aa', pc: 'var(--c-y)' },
  { k: 'cal', t: 'Ir al calendario', d: 'Para anotar fechas primero', g: '', pc: 'var(--c-r)' },
];
const pmeta = (p) => `${p.songs.length} ${p.songs.length === 1 ? 'canción' : 'canciones'}${p.owner !== ME ? ' · ' + esc(p.owner) : ''}`;
const pdot = (p) => draftCount(p) ? '<i class="dot"></i>' : '';
function board() {
  const top = `<div class="top">${sideBtn()}<span class="crumbs"><span class="crumb cur">Inicio</span></span><span class="sp"></span></div>`;
  if (!PROJECTS.length) return `${top}<div class="scroll"><div class="board fresh">
    <header><h1 class="h1">Hola, ${esc(S.myName)}</h1><p class="lede">Todavía no hay nada acá.</p></header>
    <div class="starters">${STARTERS.map(x => `<button class="starter" data-starter="${x.k}" style="--pc:${x.pc}"><span class="sg">${x.k === 'cal' ? calGlyph() : x.g}</span><span><b>${x.t}</b><small>${x.d}</small></span></button>`).join('')}</div>
    <p class="hint">Si te pasaron un link, abrilo y aparece en Compartidos.</p>
  </div></div>`;
  const list = PROJECTS.filter(p => S.filter === 'todos' || (S.filter === 'mios' ? p.owner === ME : p.owner !== ME));
  const up = upcoming().slice(0, 4);
  return `${top}<div class="scroll"><div class="board">
    <section class="bsec"><div class="bh"><h1 class="h1">Proyectos</h1>${vsw('fview', [['carpetas', 'Carpetas'], ['lista', 'Lista']])}</div>
      <nav class="filters">${[['todos', 'Todos'], ['mios', 'Míos'], ['comp', 'Compartidos']].map(([k, t]) => `<button class="b" data-filter="${k}" aria-pressed="${S.filter === k}">${t}</button>`).join('')}</nav>
      ${S.fview === 'lista' ? listV(list) : foldersV(list)}</section>
    ${up.length ? `<section class="agroup up"><div class="glab"><span>Próximo</span><button class="lk" data-go="cal">Calendario</button></div>${up.map(x => evRow(x)).join('')}</section>` : ''}
  </div></div>`;
}
// 1. Lista: Notion's list view, one quiet row per project, details to the right
const listV = (list) => `<div class="plist2">${list.map(p => `<button class="prow2" data-proj="${p.id}" style="--pc:${p.pc}"><i class="sq"></i><span class="pn">${esc(p.name || 'Sin nombre')}${pdot(p)}</span><span class="pmeta">${pmeta(p)}</span><span class="pdate">${nextEv(p) ? dayShort(nextEv(p).e.date) : ''}</span></button>`).join('')}
  <button class="prow2 add" data-newproj><i class="sq">+</i><span class="pn">Nuevo proyecto</span></button></div>`;
// 2. Índice: each project as a programme, its running order right there
const indexV = (list) => `<div class="pidx">${list.map(p => `<section class="pix" style="--pc:${p.pc}"><button class="pixh" data-proj="${p.id}"><i class="sq"></i><b>${esc(p.name || 'Sin nombre')}</b>${pdot(p)}</button>
    <span class="pmeta">${p.next ? esc(p.next.short) + ' · ' : ''}${pmeta(p)}</span>
    ${p.songs.length ? `<ol>${p.songs.slice(0, 6).map((s, i) => `<li><button data-opensong="${p.id}:${i}"><span class="k">${i + 1}</span><span class="t">${esc(titleOf(s))}</span></button></li>`).join('')}</ol>` : '<p class="quiet0">Sin canciones</p>'}
    ${p.songs.length > 6 ? `<button class="more2" data-proj="${p.id}">y ${p.songs.length - 6} más</button>` : ''}</section>`).join('')}
  <section class="pix add"><button class="pixh" data-newproj><i class="sq">+</i><b>Nuevo proyecto</b></button></section></div>`;
// 3. Hoja: a tiny print of the first song, highlights and all, so you recognise a project by its page
function miniSheetOf(s) {
  if (!s) return '<span class="mini"><span class="mt quiet0">Vacío</span></span>';
  const colors = colorsFor(s); const out = [];
  for (const sec of s.secs) {
    if (out.length >= 8) break; if (sec.name) out.push(`<span class="ms">${esc(sec.name)}</span>`);
    for (const r of sec.rows) {
      if (out.length >= 8) break;
      if (r.kind === 'bars') out.push(`<span class="mb">${r.bars.map(b => `<i>${esc(b.join(' ') || '·')}</i>`).join('')}</span>`);
      else if (!isEmptyRow(r)) out.push(`<span class="ml">${r.words.map((w, i) => { const who = s.main[r.id]?.[i]; return who ? `<i style="--h:${cv(colors[who])}">${esc(w)} </i>` : esc(w) + ' '; }).join('')}</span>`);
    }
  }
  return `<span class="mini"><span class="mt">${esc(titleOf(s))}</span>${out.join('')}</span>`;
}
const sheetsV = (list) => `<div class="psheets">${list.map(p => `<button class="psheet" data-proj="${p.id}" style="--pc:${p.pc}">${miniSheetOf(p.songs[0])}<span class="pn"><i class="sq"></i>${esc(p.name || 'Sin nombre')}${pdot(p)}</span><span class="pmeta">${pmeta(p)}</span></button>`).join('')}
  <button class="psheet add" data-newproj><span class="mini"><span class="plus">+</span></span><span class="pn">Nuevo proyecto</span></button></div>`;
// 4. Agenda: by what's coming up, because a show is a date before it is anything else
function agendaV(list) {
  const dated = list.filter(p => p.next).sort((a, b) => a.next.t - b.next.t), rest = list.filter(p => !p.next);
  const row = (p) => `<button class="arow" data-proj="${p.id}" style="--pc:${p.pc}"><span class="ad">${p.next ? `<b>${p.next.day}</b><small>${p.next.mon}</small>` : '<i class="sq"></i>'}</span><span class="ab"><span class="pn">${esc(p.name || 'Sin nombre')}${pdot(p)}</span><span class="pmeta">${p.next ? esc(p.next.line) + ' · ' : ''}${pmeta(p)}</span></span></button>`;
  return `${dated.length ? `<div class="agroup"><div class="glab">Próximo</div>${dated.map(row).join('')}</div>` : ''}
    ${rest.length ? `<div class="agroup"><div class="glab">Sin fecha</div>${rest.map(row).join('')}</div>` : ''}
    <button class="b add" data-newproj>+ Nuevo proyecto</button>`;
}
function castOf(s) {
  const used = new Set(); for (const r of rowsOf(s)) { Object.values(s.main[r.id] ?? {}).forEach(w => used.add(w)); Object.values(s.ov[r.id] ?? {}).forEach(o => used.add(o.who)); }
  const colors = colorsFor(s); return [...used].map(w => ({ w, c: colors[w] }));
}
function orderRow(p, s, i) {
  const ed = S.editing?.kind === 'stitle' && S.editing.i === i;
  const cast = castOf(s);
  return `<li class="orow" data-oi="${i}"><span class="grip" data-grip="${i}" aria-label="Arrastrar para ordenar">⠿</span><span class="k">${i + 1}</span>
    ${ed ? `<div class="ot"><b class="editing" data-stitle="${i}" contenteditable="plaintext-only">${esc(s.title)}</b></div>`
      : `<button class="ot" data-open="${i}"><b>${esc(titleOf(s))}${p.shared && s.changed.size ? '<i class="dot"></i>' : ''}</b>${cast.length ? `<span class="cast">${cast.map(x => `<i style="--h:${cv(x.c)}" title="${esc(nameOf(x.w))}"></i>`).join('')}</span>` : ''}</button>`}
    <span class="m">${hasChords(s) ? keyName(s.key) : ''}</span><button class="b more" data-smenu="${i}" aria-label="Opciones">···</button></li>`;
}
// generic blocks, like Notion's: what a block is for is up to whoever writes it
const INSERT = [
  { k: 'lyric', g: 'Aa', t: 'Texto', d: 'Letra, una indicación, lo que sea', a: 'texto letra renglon parrafo' },
  { k: 'part', g: 'H', t: 'Sección', d: 'Un título que agrupa lo que sigue', a: 'seccion parte titulo encabezado estrofa estribillo' },
  { k: 'bars', g: '|:', t: 'Compases', d: 'Una grilla para acordes', a: 'compases acordes barras grilla' },
  { k: 'note', g: '“', t: 'Comentario', d: 'Una nota al margen, con tu nombre', a: 'comentario nota' },
];
const insItems = (q = '', attr = 'data-ins', active = 0) => {
  const list = INSERT.filter(x => !q || (x.t + ' ' + x.a).toLowerCase().includes(q.toLowerCase()));
  return list.length ? list.map((x, i) => `<button class="mi${i === active ? ' active' : ''}" ${attr}="${x.k}"><span class="mg">${x.g}</span><span>${x.t}<small>${x.d}</small></span></button>`).join('') : '<div class="mlab">Nada con ese nombre</div>';
};
const AVATARS = ['o', 'c', 'g', 'p', 'v', 'r', 'y', 'l'];
const curTheme = () => document.documentElement.dataset.theme || 'system';
// the profile: who you are, how Noti looks, how it warns you, your calendar, and the way out
function meV() {
  return `<div class="pop menu mep" role="menu" aria-label="Tu perfil"><div class="meh"><i class="wsq me big" style="--av:${cv(S.avatar)}">${esc((S.myName || '?')[0])}</i><span><b>${esc(S.myName)}</b><small>${esc(boot.me?.email ?? '')}</small></span></div>
    <form class="mename" data-mename><label class="mlab" for="myname">Nombre</label><input id="myname" value="${esc(S.myName)}" autocomplete="off"></form>
    <div class="sws">${AVATARS.map(c => `<button class="swb${S.avatar === c ? ' on' : ''}" style="--h:${cv(c)}" data-avatar="${c}" aria-label="Color ${c}"></button>`).join('')}</div>
    <div class="mlab">Apariencia</div><span class="vsw mth" role="group">${[['system', 'Auto'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([k, t]) => `<button class="b" data-th="${k}" aria-pressed="${curTheme() === k}">${t}</button>`).join('')}</span>
    <div class="mlab">Calendario</div>
    <label class="mrow2"><span>La semana empieza</span><select id="wkstart"><option value="1"${S.weekStart === 1 ? ' selected' : ''}>el lunes</option><option value="0"${S.weekStart === 0 ? ' selected' : ''}>el domingo</option></select></label>
    <hr>${boot.setPassword ? '<button data-setpass>Contraseña</button>' : ''}<button data-keys>Atajos de teclado</button>${boot.signOut ? '<button data-signout>Cerrar sesión</button>' : ''}</div>`;
}
function menuV() {
  const M = S.menu;
  if (M.kind === 'me') return meV();
  if (M.kind === 'insert') return `<div class="pop menu ins"><div class="mlab">Insertar</div>${insItems()}</div>`;
  if (M.kind === 'sec') {
    const sec = cur().secs.find(x => x.id === M.id); const i = cur().secs.indexOf(sec);
    return `<div class="pop menu"><button data-mact="secren">Renombrar</button>
      <div class="mlab">Color</div><div class="sws">${SWATCHES.map(c => `<button class="swb${secCol(sec) === c ? ' on' : ''}" style="--h:${cv(c)}" data-mact="seccol" data-as="${c}" aria-label="Color"></button>`).join('')}</div>
      <button data-mact="secrep">${sec.rep > 1 ? 'Cantar una vez' : 'Repetir ×2'}</button><button data-mact="secdup">Duplicar</button><button data-mact="secfold">${S.fold.has(sec.id) ? 'Desplegar' : 'Plegar'}</button>
      ${i > 0 ? '<button data-mact="secup">Subir</button>' : ''}${i < cur().secs.length - 1 ? '<button data-mact="secdown">Bajar</button>' : ''}
      ${i > 0 ? '<button data-mact="secmerge">Unir con la de arriba</button>' : ''}
      <button data-mact="secdel" class="danger">Borrar sección</button></div>`;
  }
  if (M.kind === 'row') {
    const l = findRow(cur(), M.id); const lyric = l.row.kind === 'lyric';
    return `<div class="pop menu">${lyric ? '<button data-mact="rowedit">Editar texto</button>' : ''}<button data-mact="rownote">Comentar</button><button data-mact="rowdup">Duplicar</button>${clip ? '<button data-mact="rowpaste">Pegar debajo</button>' : ''}
      ${l.i > 0 ? '<button data-mact="rowup">Subir</button>' : ''}${l.i < l.sec.rows.length - 1 ? '<button data-mact="rowdown">Bajar</button>' : ''}
      ${l.i > 0 ? '<button data-mact="rowsplit">Empezar una parte acá</button>' : ''}
      <button data-mact="rowdel" class="danger">Borrar</button></div>`;
  }
  if (M.kind === 'song') return `<div class="pop menu">${M.here ? '<button data-mact="sreh">Ensayar</button><button data-mact="sshare">Compartir</button>' : ''}<button data-mact="rename">Renombrar</button><button data-mact="dup">Duplicar</button>${PROJECTS.length > 1 ? '<button data-mact="move">Mover a…</button>' : ''}<button data-mact="del" class="danger">Borrar canción</button></div>`;
  if (M.kind === 'move') return `<div class="pop menu"><div class="mlab">Mover a</div>${PROJECTS.filter(x => x.id !== (M.pid || S.pid)).map(x => `<button class="mvp" data-moveto="${x.id}" style="--pc:${x.pc}"><i class="sq"></i>${esc(x.name || 'Sin nombre')}</button>`).join('')}</div>`;
  if (M.kind === 'share') return shareV();
  return `<div class="pop menu">${proj(M.pid || S.pid)?.songs.length ? '<button data-mact="preh">Ensayar todo</button>' : ''}<button data-mact="prename">Renombrar</button><button data-mact="pdup">Duplicar</button><button data-mact="pdel" class="danger">Borrar proyecto</button></div>`;
}
function project() {
  const p = proj(); const tab = S.ptab; const ed = S.editing?.kind === 'pname';
  let pane = '';
  if (tab === 'canciones' && S.sview === 'hojas' && p.songs.length) pane = songTiles(p);
  else if (tab === 'canciones') pane = `${p.songs.length ? '<div class="ohead"><span></span><span>#</span><span>Canción</span><span>Tono</span><span></span></div>' : '<p class="empty1">Sin canciones todavía.</p>'}<ol class="order" id="order">${p.songs.map((s, i) => orderRow(p, s, i)).join('')}</ol>
    <button class="b add" data-newsong>+ Canción</button>`;
  if (tab === 'personas') pane = `<div class="people"><div><h3>Con acceso</h3><div class="plist">${p.editors.map(([n, r]) => `<span>${esc(n)}${n === ME ? ' (vos)' : ''}<small>${r}</small></span>`).join('')}</div></div>
      <button class="b add" data-sharepop>+ Invitar</button>
      ${p.people ? `<div><h3>Grupos</h3>${crew(p).groups.filter(g => g.id !== 'todxs').map(g => `<div class="grp"><b>${esc(g.label)}</b><span>${g.members.join(', ')}</span></div>`).join('')}</div>`
        : `<div><h3>Grupos</h3><button class="b add" data-addpeople>+ Crear un grupo</button></div>`}</div>`;
  if (tab === 'fechas') { const all = evs(p).map(e => ({ e, p })).sort(byWhen), up = all.filter(x => x.e.date >= TODAY), past = all.filter(x => x.e.date < TODAY).reverse();
    pane = `<div class="agroup">${up.length ? up.map(x => evRow(x, { noProj: true })).join('') : '<p class="empty1">Nada próximo.</p>'}</div>
      <div class="evbtns"><button class="b add" data-newev="${p.id}|">+ Evento</button><button class="b" data-go="cal">Ver en el calendario</button></div>
      ${past.length ? `<details class="past"><summary>Pasados (${past.length})</summary>${past.map(x => evRow(x, { noProj: true })).join('')}</details>` : ''}`; }
  return `<div class="top">${sideBtn()}<span class="crumbs"><span class="crumb cur">${esc(p.name || 'Sin nombre')}</span></span><span class="sp"></span><button class="b" data-sharepop>Compartir</button>${pubBtn(p)}<button class="b more" data-pmenu aria-label="Opciones del proyecto">···</button></div>
  <div class="scroll"><div class="proj">
    <header class="ph"><h1 class="h1" data-pname${ed ? ' contenteditable="plaintext-only" class="editing"' : ''} data-ph="Sin nombre">${esc(p.name)}</h1>${nextLine(p)}${descV('proj', p.desc, 'Notas del proyecto')}</header>
    <div class="tabrow"><nav class="tabs2" role="tablist">${[['canciones', 'Canciones'], ['fechas', 'Eventos'], ['personas', 'Personas']].map(([k, t]) => `<button class="b" role="tab" aria-selected="${tab === k}" data-ptab="${k}">${t}${k === 'fechas' && upcoming(p).length ? ` <small class="quiet0">${upcoming(p).length}</small>` : ''}</button>`).join('')}</nav>${tab === 'canciones' && p.songs.length ? vsw('sview', [['hojas', 'Hojas'], ['lista', 'Lista']]) : ''}</div>
    ${pane}
  </div></div>`;
}
// a free note under the title, for whoever edits; students never see it
const fitDesc = (t) => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; };
const descV = (k, v, ph) => `<textarea class="desc" data-desc="${k}" rows="1" placeholder="${ph}" aria-label="${ph}">${esc(v ?? '')}</textarea>`;
function editor() {
  const p = proj(), song = cur(), colors = colorsFor(song), lanes = hasChords(song);
  const only = rowsOf(song).length === 1;
  const empty = rowsOf(song).every(isEmptyRow) && !song.clips.length;
  const ted = S.editing?.kind === 'title';
  const cast = castOf(song);
  const props = `<div class="props">${lanes ? `<span class="pk">Tono</span><button class="pv" data-pop="meta">${keyName(song.key)}</button>` : ''}
      <span class="pk">Tempo</span><button class="pv" data-pop="meta">${song.bpm} bpm · ${song.ts}</button>
      <span class="pk">Etiquetas</span><span class="pv">${cast.length ? cast.map(x => `<span class="chip" style="--h:${cv(x.c)}">${esc(nameOf(x.w))}</span>`).join('') : '<span class="quiet0">Ninguna</span>'}</span>
      ${(() => { const on = upcoming().filter(x => x.e.songs.includes(song.id)).slice(0, 3); return on.length ? `<span class="pk">Eventos</span><span class="pv">${on.map(x => `<button class="chip evc" data-ev="${x.e.id}">${dayShort(x.e.date)} · ${esc(evTitle(x.e))}</button>`).join('')}</span>` : ''; })()}
      ${p.shared ? `<span class="pk">Estado</span><span class="pv">${song.changed.size ? '<span class="chip draft">Sin publicar</span>' : '<span class="chip ok">Publicada</span>'}</span>` : ''}</div>`;
  return `<div class="top">${sideBtn()}<span class="crumbs"><button class="crumb" data-go="project">${esc(p.name)}</button><span class="sl">/</span><span class="crumb cur">${esc(titleOf(song))}</span></span><span class="sp"></span><button class="b wide" data-reh="song">Ensayar</button><button class="b wide" data-sharepop>Compartir</button><button class="b" data-undo ${S.hist.length ? '' : 'disabled'}>Deshacer</button>${pubBtn(p)}<button class="b more" data-songmenu aria-label="Opciones de la canción">···</button></div>
  <div class="ed${S.tbar === 'lateral' ? ' lat' : ''}"><div class="sheetwrap" id="sw"><div class="page">
    <header class="shead"><h1 class="title${ted ? ' editing' : ''}" data-title${ted ? ' contenteditable="plaintext-only"' : ''} data-ph="Sin título">${esc(song.title)}</h1>
      ${props}${descV('song', song.desc, 'Notas de la canción')}${lanes ? `<button class="fact play${PLAY.song ? ' on' : ''}" data-playsong>${PLAY.song ? ICON.stop + ' Parar' : ICON.play + ' Escuchar'}</button>` : ''}</header>
    <div class="doc${lanes ? ' lanes' : ''}" id="doc">${song.secs.map(sec => secV(song, sec, colors, only)).join('')}</div>
    ${empty ? `<div class="starts"><button class="b" data-start="chords">+ Compases</button></div>` : ''}
  </div></div>${dockV()}</div>`;
}
function dockV() {
  // always there: with words selected a tool acts on them, otherwise it arms and the next tap uses it
  const p = proj(), song = cur(), on = (t) => S.tool === t ? ' on' : '';
  if (S.tbar === 'notion') return `<button class="fab" data-plus="end:" aria-label="Insertar" aria-expanded="${S.menu?.kind === 'insert' && S.menu.at === 'end:'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.7 3.5h2.6v7.2h7.2v2.6h-7.2v7.2h-2.6v-7.2H3.5v-2.6h7.2z"/></svg></button>`;
  if (S.tbar === 'isla' && S.sel.length) { const n = S.sel.length;
    return `<div class="dock isla selm" role="toolbar" aria-label="Selección"><span class="cnt">${n} ${n === 1 ? 'palabra' : 'palabras'}</span>${selInner()}<span class="sep"></span><button data-clear>Listo</button></div>`; }
  const brushOn = S.tool === 'singer' && S.brush !== undefined;
  const g = (k) => `<i class="g g-${k}"></i>`;
  const brush = brushOn ? `<i class="bsw" style="--h:${S.brush ? cv(colorPreview(song, S.brush)) : 'transparent'}"></i><span>${S.brush ? esc(nameOf(S.brush)) : 'Borrar'}</span>` : `${g('s')}<span>Canta</span>`;
  return `<div class="dock ${S.tbar}" role="toolbar" aria-label="Herramientas">
    <button data-tool="write">${g('w')}<span>Escribir</span></button><button class="${on('chord')}" data-tool="chord">${g('a')}<span>Acorde</span></button><button data-tool="bars">${g('b')}<span>Compases</span></button>
    ${p.people ? `<button class="${on('singer')}" data-tool="singer">${brush}</button>` : ''}<button class="${on('note')}" data-tool="note">${g('n')}<span>Nota</span></button></div>`;
}
function selInner() {
  const song = cur(); const tags = new Set(tagsOf(proj()));
  return `<button data-act="chord">Acorde</button><span class="sep"></span>
    <button data-act="singer">Etiqueta</button>${S.recent.filter(w => tags.has(w)).slice(0, 3).map(w => `<button class="sw" data-paint="${esc(w)}" aria-label="${esc(nameOf(w))}" title="${esc(nameOf(w))}"><i style="--h:${cv(colorPreview(song, w))}"></i></button>`).join('')}<span class="sep"></span>
    <button data-act="note">Comentar</button><button data-act="edit">Editar</button><span class="sep"></span>
    <button data-act="cut">Cortar</button><button data-act="copy">Copiar</button>${clip ? '<button data-act="paste">Pegar debajo</button>' : ''}`;
}
function toolbarV() { return `<div class="tb" role="toolbar" aria-label="Selección">${selInner()}</div>`; }
function popV() {
  const song = cur(); const P = S.pop;
  if (P.type === 'chord') {
    const pal = palette(song.key).concat(S.custom.map(c => ({ c, rn: '' })));
    const isBar = P.bar != null;
    return `<div class="pop"><div class="cgrid">${pal.map(x => `<button data-setc="${esc(x.c)}"><b>${esc(x.c)}</b><small>${x.rn}</small></button>`).join('')}</div>
      <form class="otro" data-otro><input id="otro" placeholder="Otro acorde" autocomplete="off" autocapitalize="off" spellcheck="false"></form>
      <div class="prow">${isBar ? `<button class="b" data-setc="%">%</button><button class="b${S.split ? ' on' : ''}" data-split>Dos por compás</button><button class="b" data-delbar>Quitar compás</button>` : ''}<button class="b" data-setc="">Sin acorde</button></div></div>`;
  }
  if (P.type === 'singer') {
    // tags, the way Notion does select options: type to find one, or to make one; the square changes its colour
    const list = tagsOf(proj()); seedTagColors(song, list); const mode = S.role === 'canta' ? 'canta' : 'sub';
    const row = (id) => `<div class="trow" data-tag="${esc(nameOf(id).toLowerCase())}"><button class="rc" data-recolor="${esc(id)}" aria-expanded="${S.recolorOpen === id}" aria-label="Cambiar el color de ${esc(nameOf(id))}" title="Cambiar color"><i style="--h:${cv(colorPreview(song, id))}"></i></button><button class="tn" data-paint="${esc(id)}">${esc(nameOf(id))}</button></div>${S.recolorOpen === id ? `<div class="tcol" role="group" aria-label="Color de ${esc(nameOf(id))}">${SWATCHES.map(c => `<button class="swb${colorPreview(song, id) === c ? ' on' : ''}" style="--h:${cv(c)}" data-setcolor="${esc(id)}|${c}" aria-label="Color ${c}"></button>`).join('')}</div>` : ''}`;
    return `<div class="pop tagpop"><div class="roles">${[['canta', 'Resaltar'], ['sub', 'Subrayar']].map(([r, t]) => `<button class="b${mode === r ? ' on' : ''}" data-role="${r}">${t}</button>`).join('')}</div>
      <form class="tagq" data-newtag><input id="tagq" placeholder="Buscar o crear etiqueta" autocomplete="off" spellcheck="false"></form>
      <div class="tlist">${list.map(row).join('')}<button class="tnew" data-mknew hidden></button></div>
      ${list.length ? '' : '<p class="tempty">Escribí un nombre para crear la primera.</p>'}
      <div class="prow"><button class="b" data-paint="">Quitar etiqueta</button></div></div>`;
  }
  if (P.type === 'meta') return `<div class="pop">
      <div class="mrow"><span>Tono</span><button class="b" data-tr="-1" aria-label="Bajar">−</button><b>${keyName(song.key)}</b><button class="b" data-tr="1" aria-label="Subir">+</button></div>
      <div class="mrow"><span>Tempo</span><button class="b" data-bpm="-4" aria-label="Más lento">−</button><b>${song.bpm}</b><button class="b" data-bpm="4" aria-label="Más rápido">+</button></div>
      <div class="mrow"><span>Compás</span>${['4/4', '3/4', '6/8', '2/4'].map(t => `<button class="b${song.ts === t ? ' on' : ''}" data-setts="${t}">${t}</button>`).join('')}</div></div>`;
  return '';
}
function pubModal(p) {
  const n = draftCount(p);
  return `<div class="scrim" data-close><form class="modal" id="pubform"><h3>Publicar</h3>
    <p>${n} ${n === 1 ? 'cambio' : 'cambios'} en ${p.songs.filter(s => s.changed.size).map(s => esc(titleOf(s))).join(', ')}.</p>
    <textarea id="pubnote" placeholder="Qué cambió (opcional)"></textarea>
    <div class="mbtns"><button class="b" type="button" data-close>Cancelar</button><button class="b solid" type="submit">Publicar</button></div></form></div>`;
}

const nameModal = () => `<div class="scrim"><form class="modal" id="nameform"><h3>¿Cómo te llamás?</h3><p>Así te ven en los proyectos que compartís.</p>
  <input id="firstname" autocomplete="given-name" value="${esc(boot.me?.name ?? '')}" aria-label="Tu nombre"><div class="mbtns"><button class="b solid" type="submit">Listo</button></div></form></div>`;
const passModal = () => `<div class="scrim" data-close><form class="modal" id="passform"><h3>Contraseña</h3><p>Para entrar con tu mail sin esperar un link.</p>
  <input id="newpass" type="password" minlength="6" required autocomplete="new-password" placeholder="Al menos 6 caracteres" aria-label="Contraseña nueva"><input type="email" value="${esc(boot.me?.email ?? '')}" autocomplete="username" hidden>
  <div class="mbtns"><button class="b" type="button" data-close>Cancelar</button><button class="b solid" type="submit">Guardar</button></div></form></div>`;
const keysModal = () => `<div class="scrim"><div class="modal"><h3>Atajos de teclado</h3><dl class="keys2">${[['⌘K', 'Buscar'], ['/', 'Insertar algo en una línea vacía'], ['Enter', 'Línea nueva; en una línea vacía, sección nueva'], ['⌫', 'Al principio de una parte: unirla con la de arriba'], ['⌘X ⌘C ⌘V', 'Cortar, copiar y pegar lo seleccionado, con acordes y etiquetas'], ['⌘Z', 'Deshacer'], ['Esc', 'Cerrar o soltar la selección'], ['Espacio', 'Ensayo: correr o pausar'], ['← →', 'Ensayo: canción anterior o siguiente']].map(([k, t]) => `<dt><kbd>${k}</kbd></dt><dd>${t}</dd>`).join('')}</dl><div class="mbtns"><button class="b solid" data-close>Listo</button></div></div></div>`;
// B: a calendar subscription puts the events in the phone's own calendar and keeps them updated; the reminders then come from that calendar
const subModal = () => `<div class="scrim"><div class="modal"><h3>Conectar con tu calendario</h3><p>Tus eventos aparecen en Google Calendar, Apple u Outlook y se actualizan solos.</p>
  <div class="lnk"><span>webcal://noti.app/cal/calen-7k2q.ics</span><button class="b" data-copy="noti.app/cal/calen-7k2q.ics">Copiar</button></div>
  <div class="subl">${[...PROJECTS, NOPROJ].map(p => `<label class="evs"><input type="checkbox" checked><span>${esc(p.id ? (p.name || 'Sin nombre') : 'Eventos sin proyecto')}</span></label>`).join('')}</div>
  <div class="mbtns"><button class="b solid" data-close>Listo</button></div></div></div>`;
// an in-app view switch, Notion's way: two words, the current one raised
const vsw = (k, opts) => `<span class="vsw" role="group">${opts.map(([v, t]) => `<button class="b" data-vsw="${k}:${v}" aria-pressed="${S[k] === v}">${t}</button>`).join('')}</span>`;
// a project as a folder: songs peek out as papers, the front carries the name and the next date
function paperOf(s) {
  const rows = rowsOf(s).filter(r => r.kind === 'bars' || !isEmptyRow(r)).slice(0, 6);
  return `<span class="ppr"><b>${esc(titleOf(s))}</b>${rows.map(r => `<i style="width:${r.kind === 'bars' ? 88 : 40 + (r.words.join(' ').length * 1.7) % 52}%"></i>`).join('')}</span>`;
}
function folderV(p) {
  const n = nextEv(p);
  return `<div class="fwrap" style="--pf:${p.pf}"><button class="folder" data-proj="${p.id}" style="--pc:${p.pc};--pf:${p.pf}"><span class="fback"></span>
    <span class="papers">${p.songs.slice(0, 3).reverse().map(paperOf).join('')}</span>
    <span class="ffront">${n ? `<span class="fdate">${dayShort(n.e.date)}</span>` : ''}<span class="fname">${esc(p.name || 'Sin nombre')}${pdot(p)}</span><span class="fmeta">${pmeta(p)}</span></span></button><button class="fmore" data-fmenu="${p.id}" aria-label="Opciones de ${esc(p.name || 'Sin nombre')}"${S.menu?.fold && S.menu.pid === p.id ? ' aria-expanded="true"' : ''}>···</button></div>`;
}
const foldersV = (list) => `<div class="folders">${list.map(folderV).join('')}<button class="folder add" data-newproj><span class="fback"></span><span class="ffront"><span class="fplus">+</span><span class="fname">Nuevo proyecto</span></span></button></div>`;
// the songs of a project as sheets, numbered in running order; drag a sheet (or its number) to reorder
function songTiles(p) {
  return `<div class="sgrid" id="sgrid">${p.songs.map((s, i) => { const n = castOf(s).length;
    return `<div class="stile" data-gi="${i}"><button class="sopen" data-open="${i}" aria-label="Abrir ${esc(titleOf(s))}">${miniSheetOf(s)}</button><span class="gk" data-ggrip="${i}" title="Arrastrar para ordenar">${i + 1}</span>
      <span class="sfoot"><span class="st2"><b>${esc(titleOf(s))}${p.shared && s.changed.size ? '<i class="dot"></i>' : ''}</b><small>${[hasChords(s) ? keyName(s.key) : '', n ? `${n} ${n === 1 ? 'etiqueta' : 'etiquetas'}` : ''].filter(Boolean).join(' · ') || '&nbsp;'}</small></span><button class="b more" data-smenu="${i}" aria-label="Opciones" aria-expanded="${S.menu?.i === i && /song|move/.test(S.menu.kind)}">···</button></span></div>`; }).join('')}
    <button class="stile add" data-newsong><span class="mini"><span class="plus">+</span></span><span class="sfoot"><span class="st2"><b>Canción</b></span></span></button></div>`;
}
// one date as a row: the day as a block, then what, when and where
function evRow({ e, p }, opt = {}) {
  const dt = D(e.date);
  const meta = [`${DIA[dt.getDay()]} ${e.time ? hora(e.time) : 'todo el día'}`, opt.noProj || !p.id ? '' : esc(p.name || 'Sin nombre'), esc(e.place)].filter(Boolean).join(' · ');
  const n = e.songs.filter(id => songAny(id)).length;
  return `<button class="arow ev${e.star ? ' show' : ''}${daysFrom(e.date) === 0 ? ' today' : ''}${S.ev === e.id ? ' on' : ''}" data-ev="${e.id}" style="--pc:${p.pc}"><span class="ad"><b>${dt.getDate()}</b><small>${MES[dt.getMonth()]}</small></span>
    <span class="ab"><span class="pn">${opt.noProj ? '' : '<i class="sq"></i>'}${esc(evTitle(e))}</span><span class="pmeta">${meta}${n ? ` · ${n} ${n === 1 ? 'canción' : 'canciones'}` : ''}</span></span>
    <span class="arel${daysFrom(e.date) === 0 ? ' now' : ''}">${rel(e.date)}</span></button>`;
}
function nextLine(p) {
  const n = nextEv(p), sh = nextStar(p);
  if (!n) return '';
  return `<div class="nextl"><button class="nx" data-ev="${n.e.id}"><span class="ndl">Próximo</span><b>${esc(evTitle(n.e))}</b><span>${dayShort(n.e.date)}${n.e.time ? ', ' + hora(n.e.time) : ''}</span><span class="nrel">${rel(n.e.date)}</span></button>${sh && sh.e !== n.e ? `<span class="cdown">faltan <b>${daysFrom(sh.e.date)}</b> días para ${esc(evTitle(sh.e))}</span>` : ''}</div>`;
}

/* ---------------- calendar ---------------- */
function calendar() {
  const [y, m] = S.calMonth.split('-').map(Number);
  const first = new Date(y, m - 1, 1), start = addDays(iso(first), -((first.getDay() - S.weekStart + 7) % 7));
  const all = allEvents().filter(x => !S.calHide.has(x.p.id)); const byDay = {}; all.forEach(x => (byDay[x.e.date] ??= []).push(x));
  const cells = Array.from({ length: 42 }, (_, k) => addDays(start, k)); const weeks = cells[35].slice(0, 7) === S.calMonth ? 6 : 5;
  const shown = cells.slice(0, weeks * 7), hasToday = shown.includes(TODAY), tdow = D(TODAY).getDay();
  const grid = shown.map(ds => { const list = byDay[ds] ?? [], td = ds === TODAY;
    return `<div class="day${ds.slice(0, 7) !== S.calMonth ? ' out' : ''}${td ? ' today' : ''}${ds === S.calSel ? ' sel' : ''}" data-day="${ds}"${td ? ' aria-current="date"' : ''}><span class="dh"><span class="dn">${D(ds).getDate()}</span>${td ? '<span class="tdl">Hoy</span>' : ''}</span>
      ${list.slice(0, 3).map(({ e, p }) => `<button class="ce${e.star ? ' show' : ''}${S.ev === e.id ? ' on' : ''}" data-ev="${e.id}" style="--pc:${p.pc};--pf:${p.pf}" title="${esc(evTitle(e))}"><time>${e.time ? hora(e.time).replace(' h', '') : ''}</time><b>${esc(evTitle(e))}</b></button>`).join('')}
      ${list.length > 3 ? `<span class="cmore">${list.length - 3} más</span>` : ''}${ds === S.calSel ? `<button class="addd" data-newev="|${ds}" aria-label="Nuevo evento el ${dayLong(ds)}">+</button>` : ''}</div>`; }).join('');
  const up = all.filter(x => x.e.date >= TODAY).slice(0, 8);
  const day = S.calSel ? `<div class="agroup"><div class="glab"><span>${S.calSel === TODAY ? 'Hoy, ' + dayLong(S.calSel) : cap(dayLong(S.calSel))}</span><button class="lk" data-newev="|${S.calSel}">+ Evento</button></div>${(byDay[S.calSel] ?? []).map(x => evRow(x)).join('') || '<p class="empty1" style="padding:10px 0">Nada este día.</p>'}</div>` : '';
  const cals = [...PROJECTS, ...(EVENTS.some(e => !e.pid) ? [NOPROJ] : [])];
  const dows = Array.from({ length: 7 }, (_, k) => (k + S.weekStart) % 7);
  return `<div class="top">${sideBtn()}<span class="crumbs"><span class="crumb cur">Calendario</span></span><span class="sp"></span><button class="b" data-newev="|${S.calSel ?? ''}">+ Evento</button></div>
  <div class="scroll"><div class="cal">
    <div class="calm"><div class="calh"><h1 class="h1">${cap(MESL[m - 1])} <span>${y}</span></h1><button class="b" data-calm="-1" aria-label="Mes anterior">‹</button><button class="b" data-caltoday>Hoy</button><button class="b" data-calm="1" aria-label="Mes siguiente">›</button></div>
      <div class="calsub"><button class="calnow" data-caltoday><i></i>Hoy es ${dayLong(TODAY)}</button>${cals.length > 1 ? `<div class="calf">${cals.map(p => `<button class="b" data-calhide="${p.id}" aria-pressed="${!S.calHide.has(p.id)}" style="--pc:${p.pc}"><i class="sq"></i>${esc(p.id ? (p.name || 'Sin nombre') : 'Sin proyecto')}</button>`).join('')}</div>` : ''}</div>
      <div class="mgrid">${dows.map(k => `<span class="dow${hasToday && k === tdow ? ' tdw' : ''}">${DIA[k]}</span>`).join('')}${grid}</div></div>
    <div class="calside">${day}<div class="agroup"><div class="glab"><span>Próximo</span></div>${up.map(x => evRow(x)).join('') || '<p class="empty1" style="padding:10px 0">Nada próximo.</p>'}</div></div>
  </div></div>`;
}
function evPanel() {
  const F = findEv(S.ev); if (!F) { S.ev = null; return ''; } const { e, p } = F;
  const tags = p.id ? [...crew(p).groups.map(g => g.id), ...(p.tags ?? [])] : [];
  const from = p.id ? [p] : PROJECTS.filter(x => x.songs.length);
  const songList = from.map(x => `${p.id ? '' : `<div class="evsg">${esc(x.name || 'Sin nombre')}</div>`}${x.songs.map(s => `<label class="evs"><input type="checkbox" data-evsong="${s.id}"${e.songs.includes(s.id) ? ' checked' : ''}><span>${esc(titleOf(s))}</span></label>`).join('')}`).join('');
  const linked = !!p.id && p.shared;
  return `<aside class="evp" aria-label="Evento"><div class="eh"><span class="evproj" style="--pc:${p.pc}"><i class="sq"></i><select id="evproj" aria-label="Proyecto"><option value=""${p.id ? '' : ' selected'}>Sin proyecto</option>${PROJECTS.map(x => `<option value="${x.id}"${x === p ? ' selected' : ''}>${esc(x.name || 'Sin nombre')}</option>`).join('')}</select></span><span class="sp"></span><button class="b star${e.star ? ' on' : ''}" data-evstar aria-pressed="${e.star}" title="Un evento destacado cuenta los días que faltan">${e.star ? 'Destacado' : 'Destacar'}</button><button class="b" data-evclose aria-label="Cerrar">×</button></div>
    <div class="eb"><input class="evt" id="evtitle" value="${esc(e.title)}" placeholder="Sin título" autocomplete="off" aria-label="Título">
      <div class="evgrid"><span>Cuándo</span><span class="evwhen"><input type="date" id="evdate" value="${e.date}" aria-label="Día"><input type="time" id="evtime" value="${e.time}" aria-label="Hora">${e.time ? `<button class="lk" data-evallday>Todo el día</button>` : '<small class="quiet0">todo el día</small>'}</span>
        <span>Repetir</span><span><select id="evrep" class="evsel">${REPEAT.map(([k, t]) => `<option value="${k}"${(e.repeat || '') === k ? ' selected' : ''}>${t}</option>`).join('')}</select></span>
        <span>Dónde</span><input id="evplace" value="${esc(e.place)}" placeholder="Agregar lugar" autocomplete="off">
        ${tags.length ? `<span>Para</span><span class="evtags">${tags.map(id => `<button class="chip${e.who.includes(id) ? ' on' : ''}" data-evwho="${esc(id)}" style="--h:${cv(tagColor(p, id))}">${esc(nameOf(id))}</button>`).join('')}</span>` : ''}</div>
      <div class="evsec"><div class="mlab">Canciones</div>${songList || '<p class="empty1">Todavía no hay canciones.</p>'}</div>
      <div class="evsec"><div class="mlab">Nota</div><textarea id="evnote" placeholder="Algo para recordar">${esc(e.note)}</textarea>${linked ? `<label class="tgl evvis"><span>${e.noteAll ? 'La ven quienes tienen el link' : 'Solo la ven quienes editan'}<small>${e.noteAll ? 'Aparece con el evento en su vista' : 'Queda como nota tuya y de quienes editan'}</small></span><input type="checkbox" id="evnoteall"${e.noteAll ? ' checked' : ''}><i></i></label>` : ''}</div>
      <div class="evact">${e.songs.some(id => songAny(id)) ? '<button class="b solid" data-reh="ev">Ensayar estas canciones</button>' : ''}<button class="b" data-ics="${e.id}">Agregar a mi calendario</button><button class="b danger" data-evdel>Borrar evento</button></div>
    </div></aside>`;
}
function icsFor(list) {
  const z = (t) => String(t).replace(/[,;\\]/g, m => '\\' + m).replace(/\n/g, '\\n'), stamp = (dd, t) => dd.replace(/-/g, '') + 'T' + t.replace(':', '') + '00';
  const out = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Noti//ES'];
  for (const { e, p } of list) { const t = e.time || '00:00', h = Math.min(23, +t.slice(0, 2) + 2);
    out.push('BEGIN:VEVENT', `UID:${e.id}@noti.app`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`, `DTSTART:${stamp(e.date, t)}`, `DTEND:${stamp(e.date, String(h).padStart(2, '0') + t.slice(2))}`, `SUMMARY:${z(evTitle(e) + (p.id ? ' · ' + p.name : ''))}`);
    if (e.place) out.push(`LOCATION:${z(e.place)}`);
    const songs = e.songs.map(songAny).filter(Boolean).map(x => titleOf(x.s)).join(', '); if (songs || e.note) out.push(`DESCRIPTION:${z([songs, e.note].filter(Boolean).join('\n'))}`);
    out.push('END:VEVENT'); }
  out.push('END:VCALENDAR'); return out.join('\r\n');
}
function downloadIcs(list, name) {
  // a .ics file: the phone or computer offers to add it to its own calendar
  if (!list.length) return toast('No hay fechas próximas');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([icsFor(list)], { type: 'text/calendar' }));
  a.download = (norm(name || 'fechas').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'fechas') + '.ics'; document.body.append(a); a.click(); a.remove();
}

/* ---------------- search ---------------- */
const norm = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function searchResults(q) {
  const n = norm(q.trim());
  if (!n) { // what you opened last, or the first songs of each project
    const rec = S.recentS.map(id => { for (const p of PROJECTS) { const i = p.songs.findIndex(x => x.id === id); if (i >= 0) return { p, i }; } return null; }).filter(Boolean);
    const list = (rec.length ? rec : PROJECTS.flatMap(p => p.songs.slice(0, 2).map((_, i) => ({ p, i })))).slice(0, 6);
    return [{ g: rec.length ? 'Recientes' : 'Canciones', items: list.map(({ p, i }) => ({ go: `song:${p.id}:${i}`, t: esc(titleOf(p.songs[i])), m: esc(p.name || 'Sin nombre'), pc: p.pc })) }];
  }
  const hl = (txt) => { const k = norm(txt).indexOf(n); return k < 0 ? esc(txt) : esc(txt.slice(0, k)) + '<mark>' + esc(txt.slice(k, k + n.length)) + '</mark>' + esc(txt.slice(k + n.length)); };
  const snip = (txt) => { const k = norm(txt).indexOf(n), a = Math.max(0, k - 22); return (a ? '…' : '') + hl(txt.slice(a)); };
  const songs = [], lines = [], tags = [], projs = [], dates = [];
  for (const p of PROJECTS) {
    if (norm(p.name).includes(n)) projs.push({ go: `proj:${p.id}`, t: hl(p.name), m: pmeta(p), pc: p.pc });
    p.songs.forEach((s, i) => {
      if (norm(titleOf(s)).includes(n)) songs.push({ go: `song:${p.id}:${i}`, t: hl(titleOf(s)), m: esc(p.name), pc: p.pc });
      for (const r of rowsOf(s)) { const txt = r.kind === 'lyric' ? r.words.join(' ') : barsText(r.bars); if (lines.length < 8 && norm(txt).includes(n)) lines.push({ go: `song:${p.id}:${i}:${r.id}`, t: snip(txt), m: esc(titleOf(s)), pc: p.pc }); }
      const ws = new Set(rowsOf(s).flatMap(r => whoOfRow(s, r)));
      for (const w of ws) if (norm(nameOf(w)).includes(n)) { const k = rowsOf(s).filter(r => whoOfRow(s, r).includes(w)).length; tags.push({ go: `song:${p.id}:${i}:${rowsOf(s).find(r => whoOfRow(s, r).includes(w)).id}`, t: esc(titleOf(s)), m: `<span class="chip" style="--h:${cv(colorsFor(s)[w])}">${hl(nameOf(w))}</span>${k} ${k === 1 ? 'renglón' : 'renglones'}`, pc: p.pc }); }
    });
  }
  for (const { e, p } of allEvents()) if (e.date >= TODAY && norm([evTitle(e), e.place, e.note].join(' ')).includes(n)) dates.push({ go: `ev:${e.id}`, t: hl(evTitle(e)), m: `${dayShort(e.date)}${p.id ? ' · ' + esc(p.name) : ''}`, pc: p.pc });
  return [['Canciones', songs], ['Etiquetas', tags.slice(0, 6)], ['Letra y acordes', lines], ['Proyectos', projs], ['Eventos', dates.slice(0, 5)]].map(([g, items]) => ({ g, items }));
}
function resultsHTML(q) {
  const gs = searchResults(q).filter(g => g.items.length); let k = 0;
  return gs.length ? gs.map(g => `<div class="mlab">${g.g}</div>${g.items.map(it => `<button class="sr${k++ === S.search.active ? ' active' : ''}" data-sres="${it.go}" style="--pc:${it.pc}"><i class="sq"></i><span class="srt">${it.t}</span><span class="srm">${it.m}</span></button>`).join('')}`).join('') : `<p class="snone">Nada con “${esc(q.trim())}”.</p>`;
}
const searchV = () => `<div class="scrim srch"><div class="search" role="dialog" aria-label="Buscar"><input id="sq" placeholder="Buscar canciones, letra, etiquetas, eventos" autocomplete="off" spellcheck="false" value="${esc(S.search.q)}"><div class="sres" id="sres">${resultsHTML(S.search.q)}</div></div></div>`;

/* ---------------- share ---------------- */
function shareV() {
  const p = proj(); const link = p.link ? `${location.origin}/m/${p.link}` : '', inv = `${location.origin}/unirse/${p.invite}`;
  return `<div class="pop menu sharep"><div class="mlab">Para que edite</div>
    <p class="shint">Mandale este link. Entra con su mail y el proyecto le aparece.</p>
    <div class="lnk"><span>${esc(inv.replace(/^https?:\/\//, ''))}</span><button class="b" data-copy="${esc(inv)}">Copiar</button></div>
    <div class="eds">${p.editors.map(([n, r]) => `<div class="edr"><i class="wsq">${esc(n[0])}</i><span>${esc(n)}${n === ME ? ' (vos)' : ''}</span><small>${esc(r)}</small></div>`).join('')}</div>
    <div class="mlab">Con el link</div>
    <label class="tgl"><span>Cualquiera con el link puede ver<small>${p.shared ? 'Sin cuenta. Ve lo publicado, no los borradores' : 'Apagado: solo lo ven quienes tienen acceso'}</small></span><input type="checkbox" id="stulink"${p.shared ? ' checked' : ''}><i></i></label>
    ${p.shared && link ? `<div class="lnk"><span>${esc(link.replace(/^https?:\/\//, ''))}</span><button class="b" data-copy="${esc(link)}">Copiar</button></div><button data-asstudent>Ver como lo ven con el link</button>` : ''}</div>`;
}

/* ---------------- trash ---------------- */
const toBin = (kind, item, extra = {}) => { const x = { id: uid('t'), kind, item, ...extra }; S.bin.unshift(x); return x.id; };
function binV() {
  const what = { song: 'Canción', proj: 'Proyecto', ev: 'Evento' };
  const name = (x) => x.kind === 'song' ? titleOf(x.item) : x.kind === 'proj' ? (x.item.name || 'Sin nombre') : `${evTitle(x.item)}, ${dayShort(x.item.date)}`;
  return `<div class="top">${sideBtn()}<span class="crumbs"><span class="crumb cur">Papelera</span></span><span class="sp"></span></div>
  <div class="scroll"><div class="board bin"><div class="bh"><h1 class="h1">Papelera</h1></div><p class="lede">Lo que borrás queda acá 30 días.</p>
    ${S.bin.length ? `<div class="plist2">${S.bin.map(x => `<div class="prow2 binr"><span class="bk">${what[x.kind]}</span><span class="pn">${esc(name(x))}</span><span class="pmeta">${x.pid ? `de ${esc(proj(x.pid)?.name || 'un proyecto borrado')} · ` : ''}hoy</span>
      <span class="bacts"><button class="b" data-unbin="${x.id}">Restaurar</button>${S.binAsk === x.id ? `<button class="b solid" data-purge="${x.id}">Sí, borrar para siempre</button>` : `<button class="b" data-purge="${x.id}">Borrar del todo</button>`}</span></div>`).join('')}</div>` : '<p class="empty1">Vacía.</p>'}
  </div></div>`;
}

/* ---------------- rehearsal ---------------- */
function rehList(kind) {
  if (kind === 'song') return [{ pid: S.pid, sid: cur().id }];
  if (kind === 'ev') { const F = findEv(S.ev); return F ? F.e.songs.map(songAny).filter(Boolean).map(x => ({ pid: x.p.id, sid: x.s.id })) : []; }
  return proj().songs.map(x => ({ pid: S.pid, sid: x.id }));
}
function startReh(list) { if (!list.length) return toast('No hay canciones para ensayar'); stopSong(false); S.menu = null; S.ev = null; S.reh = { list, k: 0, speed: 1, play: false, y: 0 }; render(); }
const rehAt = (k) => { const x = S.reh.list[k]; return x && songById(proj(x.pid), x.sid); };
function rehV() {
  const R = S.reh, s = rehAt(R.k); if (!s) { S.reh = null; return ''; }
  const colors = colorsFor(s), lanes = hasChords(s), nx = rehAt(R.k + 1);
  const body = s.secs.map(sec => `<section class="rsec">${sec.name ? `<div class="rsn" style="--h:${cv(secCol(sec))}">${esc(sec.name)}${sec.rep > 1 ? ` ×${sec.rep}` : ''}</div>` : ''}${s.notes[sec.id] ? `<p class="rnote">${esc(s.notes[sec.id])}</p>` : ''}
    ${sec.rows.map(r => r.kind === 'bars' ? `<div class="rbars">${r.bars.map(b => `<span>${esc(b.join(' ') || '·')}</span>`).join('')}</div>` : isEmptyRow(r) ? ''
      : `<p class="rl2">${r.words.map((w, i) => { const who = s.main[r.id]?.[i], o = s.ov[r.id]?.[i], st = (who ? `--h:${cv(colors[who])};` : '') + (o ? `--h2:${cv(colors[o.who])}` : '');
        return `<span class="rw${who ? ' on' : ''}${o ? ' ov' : ''}"${st ? ` style="${st}"` : ''}><i>${r.chords[i] ? esc(r.chords[i]) : ''}</i><span class="ww">${esc(w)}${i < r.words.length - 1 ? ' ' : ''}</span></span>`; }).join('<wbr>')}</p>${s.notes[r.id] ? `<p class="rnote">${esc(s.notes[r.id])}</p>` : ''}`).join('')}</section>`).join('');
  return `<div class="reh${lanes ? ' lanes' : ''}" role="dialog" aria-label="Ensayo"><div class="rtop"><button class="rb" data-rehx aria-label="Salir del ensayo">×</button><span class="rt"><b>${esc(titleOf(s))}</b><small>${R.list.length > 1 ? `${R.k + 1} de ${R.list.length} · ` : ''}${lanes ? keyName(s.key) + ' · ' : ''}${s.bpm} bpm</small></span><span class="sp"></span>
    <span class="rsp"><button class="rb" data-rehsp="-1" aria-label="Más lento">−</button><span>${R.speed}×</span><button class="rb" data-rehsp="1" aria-label="Más rápido">+</button></span><button class="rb play" data-rehplay>${R.play ? 'Pausa' : 'Correr'}</button></div>
    <div class="rbody" id="rehs"><div class="rpage">${body}<div class="rend">${nx ? `<button class="rb big" data-rehgo="1">Sigue: ${esc(titleOf(nx))} ›</button>` : 'Fin'}</div></div></div>
    <div class="rbot"><button class="rb" data-rehgo="-1" ${R.k ? '' : 'disabled'}>‹ Anterior</button><span class="rhint">Tocá abajo para avanzar, arriba para volver</span><button class="rb" data-rehgo="1" ${nx ? '' : 'disabled'}>Siguiente ›</button></div></div>`;
}
let rehRaf = 0, rehT = 0;
function rehLoop(t) {
  const el = document.getElementById('rehs'), s = S.reh && rehAt(S.reh.k);
  if (!S.reh?.play || !el || !s) { rehRaf = 0; rehT = 0; return; }
  if (rehT) { S.reh.y += Math.min(0.1, (t - rehT) / 1000) * 24 * (s.bpm / 90) * S.reh.speed; el.scrollTop = S.reh.y; } // a line or so every few beats
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2 && rehT) { S.reh.play = false; rehRaf = 0; rehT = 0; render(); return; }
  rehT = t; rehRaf = requestAnimationFrame(rehLoop);
}
function rehPage(dir) {
  const el = document.getElementById('rehs'); if (!el) return;
  S.reh.y = Math.max(0, Math.min(el.scrollHeight - el.clientHeight, el.scrollTop + dir * el.clientHeight * 0.8)); el.scrollTo({ top: S.reh.y, behavior: 'smooth' });
}

/* ---------------- student ---------------- */
const whoOfRow = (s, r) => [...Object.values(s.main[r.id] ?? {}), ...Object.values(s.ov[r.id] ?? {}).map(o => o.who)];
function myRows(s, set) { return set ? rowsOf(s).filter(r => r.kind === 'lyric' && whoOfRow(s, r).some(w => set.has(w))).length : 0; }
function namesSheet() {
  return S.sheet === 'names' ? `<div class="sheetup" role="dialog" aria-label="Quién sos"><h2>¿Quién sos?</h2>
    <div class="names">${crew(proj(S.sPid)).people.map(x => `<button data-me="${esc(x)}" aria-pressed="${S.me === x}">${esc(x)}</button>`).join('')}</div>
    <button class="b" data-me="">Ver todo</button></div>` : '';
}
function alumnoHome(p) {
  // the student's way in: what changed, then the running order with how much they sing in each song
  const pub = p.published, me = p.people ? S.me : null, set = me ? new Set([me, ...groupsOf(p, me)]) : null;
  return `<div class="st">
    <div class="head"><div class="row"><span class="k">${me ? `Hola, ${esc(me)}` : 'Noti'}</span>${p.people ? `<button class="me${me ? '' : ' ask'}" data-sheet="names">${me ? 'Cambiar' : '¿Quién sos?'}</button>` : ''}</div>
      <h1>${esc(p.name)}</h1></div>
    <div class="scroll">${snextV(p, set)}
      ${pub.note ? `<div class="news2"><b>Nuevo</b> ${esc(pub.note)}</div>` : ''}
      <ol class="slist home">${pub.songs.map((s, i) => { const n = myRows(s, set);
        return `<li><button data-sgo="${i}"><span class="n">${i + 1}</span><span class="t">${esc(titleOf(s))}${pub.changed.size && rowsOf(s).some(r => pub.changed.has(r.id)) ? '<i class="dot"></i>' : ''}</span><span class="you">${set ? (n ? `${n} ${n === 1 ? 'parte' : 'partes'}` : '—') : ''}</span></button></li>`; }).join('')}</ol>
    </div>${namesSheet()}</div>`;
}
function snextV(p, set) {
  const n = nextEv(p); if (!n) return ''; const { e } = n, dt = D(e.date), sh = nextStar(p);
  const songs = e.songs.map(id => p.published.songs.find(x => x.id === id)).filter(Boolean), mine = set ? songs.filter(x => myRows(x, set) > 0).length : 0;
  return `<div class="snext"><div class="sn1"><span class="ad"><b>${dt.getDate()}</b><small>${MES[dt.getMonth()]}</small></span><span class="sn2"><b>${esc(evTitle(e))}, ${rel(e.date)}</b><small>${cap(dayLong(e.date))}${e.time ? ' · ' + hora(e.time) : ''}${e.place ? ' · ' + esc(e.place) : ''}</small></span></div>
    ${songs.length ? `<p class="sn3">${set ? (mine ? `Estás en <b>${mine} de ${songs.length}</b>: ` : 'No estás en estas: ') : 'Canciones: '}${songs.map(x => esc(titleOf(x))).join(', ')}</p>` : ''}${e.note && e.noteAll ? `<p class="sn3">${esc(e.note)}</p>` : ''}
    <div class="sn4"><button class="b" data-ics="p:${p.id}">Agregar a mi calendario</button>${sh && sh.e !== e ? `<span>Faltan ${daysFrom(sh.e.date)} días para ${esc(evTitle(sh.e))}</span>` : ''}</div></div>`;
}
// names stay visible for students too, written once per run of lines that share them
let stuPrev = '';
const stuWho = (song, r, colors) => { const w = lineWho(song, r, colors); if (w === stuPrev) return ''; stuPrev = w; return w ? `<div class="who">${w}</div>` : ''; };
function alumnoMine(p, song, set, colors) {
  // only my lines, big and in colour; everything else shrinks to grey context
  return song.secs.map(sec => { stuPrev = '';
    const body = sec.rows.map(r => {
      if (r.kind === 'bars') return `<div class="ctx">${esc(barsText(r.bars))}</div>`;
      const ws = whoOfRow(song, r);
      if (ws.some(w => set.has(w))) return `<div class="ln mine"><div class="tx">${wordsV(song, r, colors, { student: true, mine: (w) => set.has(w), noChords: !S.sChords, pre: 's' })}</div>${stuWho(song, r, colors)}${commentsV(song, r.id, true)}</div>`;
      const who = [...new Set(ws)].map(nameOf).join(', ');
      return r.words.join('').trim() ? `<div class="ctx">${who ? `<b>${esc(who)}</b> ` : ''}${esc(r.words.join(' '))}</div>` : '';
    }).join('');
    return `<section class="sec" style="--h:${cv(secCol(sec))}">${sec.name ? `<div class="sn">${esc(sec.name)}${sec.rep > 1 ? `<span class="rep">×${sec.rep}</span>` : ''}</div>` : ''}${commentsV(song, sec.id, true)}${body}</section>`;
  }).join('');
}
function alumno() {
  const p = proj(S.sPid);
  if (!p) return `<div class="st"><div class="head"><span class="k">Noti</span><h1>Nada todavía</h1><span class="k">Abrí el link que te pasaron.</span></div></div>`;
  const pub = p.published;
  if (!pub.songs.length) return `<div class="st"><div class="head"><h1>${esc(p.name)}</h1></div></div>`;
  if (S.sView === 'home') return alumnoHome(p);
  const idx = Math.min(S.sSong, pub.songs.length - 1); const song = pub.songs[idx]; const colors = colorsFor(song);
  const me = p.people ? S.me : null; const set = me ? new Set([me, ...groupsOf(p, me)]) : null; const mine = set ? (w) => set.has(w) : null;
  let count = 0;
  const sheet = song.secs.map(sec => { stuPrev = '';
    const rows = sec.rows.map(r => {
      if (r.kind === 'bars') return S.sChords ? barsV(song, sec, r, true) : '';
      const ws = [...Object.values(song.main[r.id] ?? {}), ...Object.values(song.ov[r.id] ?? {}).map(o => o.who)];
      if (set && ws.some(w => set.has(w))) count++;
      return `<div class="ln"><div class="tx">${wordsV(song, r, colors, { student: true, mine, noChords: !S.sChords, pre: 's' })}${pub.changed.has(r.id) ? '<i class="dot"></i>' : ''}</div>${stuWho(song, r, colors)}${commentsV(song, r.id, true)}</div>`;
    }).join('');
    return `<section class="sec" style="--h:${cv(secCol(sec))}">${sec.name ? `<div class="sn">${esc(sec.name)}${sec.rep > 1 ? `<span class="rep">×${sec.rep}</span>` : ''}</div>` : ''}${commentsV(song, sec.id, true)}${rows}</section>`;
  }).join('');
  const lanes = S.sChords && hasChords(song);
  const mineMode = set && !S.sAll && count > 0;
  return `<div class="st">
    <div class="head"><div class="row"><button class="b back" data-shome>‹ ${esc(p.name)}</button>${p.people ? `<button class="me${me ? '' : ' ask'}" data-sheet="names">${me ? me : '¿Quién sos?'}</button>` : ''}</div>
      <button class="titlebtn" data-sheet="songs"><h1>${esc(titleOf(song))}</h1></button></div>
    <div class="scroll">
      ${S.newsOpen && pub.note ? `<div class="news"><span>${esc(pub.note)}</span><button data-news aria-label="Cerrar">×</button></div>` : ''}
      <div class="page"><div class="doc${lanes ? ' lanes' : ''}${mineMode ? ' minev' : ''}">${mineMode ? alumnoMine(p, song, set, colors) : sheet}</div>
      ${set && count ? `<button class="b add" data-sall>${S.sAll ? 'Solo mis partes' : 'Ver toda la canción'}</button>` : ''}
      ${hasChords(song) ? `<button class="b add" data-schords>${S.sChords ? 'Ocultar acordes' : 'Mostrar acordes'}</button>` : ''}</div>
    </div>
    <div class="bot"><button class="b" data-sstep="-1" ${idx ? '' : 'disabled'} aria-label="Anterior">‹</button>
      <span class="mid">${me ? (count ? `${count} ${count === 1 ? 'renglón tuyo' : 'renglones tuyos'}` : 'No estás en esta') : ''}</span>
      <button class="b" data-sstep="1" ${idx < pub.songs.length - 1 ? '' : 'disabled'} aria-label="Siguiente">›</button></div>
    ${namesSheet()}
    ${S.sheet === 'songs' ? `<div class="sheetup" role="dialog" aria-label="Canciones"><h2>${esc(p.name)}</h2><ol class="slist">${pub.songs.map((s, i) => {
        const sings = set && rowsOf(s).some(r => [...Object.values(s.main[r.id] ?? {}), ...Object.values(s.ov[r.id] ?? {}).map(o => o.who)].some(w => set.has(w)));
        return `<li><button data-sgo="${i}"><span class="n">${i + 1}</span><span>${esc(titleOf(s))}</span><span class="you">${sings ? 'estás' : ''}</span></button></li>`; }).join('')}</ol></div>` : ''}
  </div>`;
}

/* ---------------- editing helpers ---------------- */
function pushHist() { const s = cur(); S.hist.push({ sid: s.id, data: structuredClone({ secs: s.secs, main: s.main, ov: s.ov, notes: s.notes, replies: s.replies ?? {}, noteBy: s.noteBy ?? {}, clips: s.clips, changed: s.changed, key: s.key, title: s.title, bpm: s.bpm, ts: s.ts }) }); if (S.hist.length > 80) S.hist.shift(); }
function undo() { const h = S.hist.pop(); if (!h) return; const s = proj().songs.find(x => x.id === h.sid); if (s) Object.assign(s, h.data); S.editing = null; clearSel(); }
const mark = (id) => cur().changed.add(id);
function clearSel() { S.sel = []; S.selAnchor = null; S.pop = null; }

function textOffset(root, node, off) { let n = 0; const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let t; while ((t = tw.nextNode())) { if (t === node) return n + off; n += t.length; } return n; }
function caretOffset(el) { const s = getSelection(); if (!s.rangeCount) return el.textContent.length; const r = s.getRangeAt(0); return el.contains(r.startContainer) ? textOffset(el, r.startContainer, r.startOffset) : el.textContent.length; }
function placeCaret(el, off) {
  const s = getSelection(); const r = document.createRange(); const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let t, n = 0;
  while ((t = tw.nextNode())) { if (n + t.length >= off) { r.setStart(t, Math.max(0, off - n)); r.collapse(true); s.removeAllRanges(); s.addRange(r); return; } n += t.length; }
  r.selectNodeContents(el); r.collapse(false); s.removeAllRanges(); s.addRange(r);
}
function caretFromPoint(x, y) {
  if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(x, y); return r && { node: r.startContainer, off: r.startOffset }; }
  if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(x, y); return p && { node: p.offsetNode, off: p.offset }; }
  return null;
}
function remapLine(song, row, nw) {
  const map = new Map(lcs(row.words, nw));
  if (row.words.length === nw.length) row.words.forEach((_, i) => { if (!map.has(i)) map.set(i, i); });
  const rm = (obj) => { const o = {}; for (const k in obj) { const j = map.get(+k); if (j !== undefined) o[j] = obj[k]; } return o; };
  row.chords = rm(row.chords);
  if (song.main[row.id]) song.main[row.id] = rm(song.main[row.id]);
  if (song.ov[row.id]) song.ov[row.id] = rm(song.ov[row.id]);
  row.words = nw;
}
// Apply typed text to a line. A line of chords or bars ("G D Em C", "| G | D |") becomes a row of bars.
function applyLine(song, row, raw) {
  const text = raw.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  if (row.kind !== 'lyric') return false;
  const asBars = text.includes('|') || (isChordLine(text) && text.split(' ').length >= 2);
  if (!asBars && text === row.words.join(' ').trim()) return false;
  if (asBars) { row.kind = 'bars'; row.bars = parseBars(text); delete row.words; delete row.chords; delete song.main[row.id]; delete song.ov[row.id]; }
  else remapLine(song, row, text ? text.split(' ') : ['']);
  mark(row.id); return true;
}
// Parts nobody named get a faint suggestion, never a name. A part whose words mostly repeat another's is a chorus; a short
// part right before a chorus, a pre-chorus; a new part once two choruses have gone by, a bridge; bars alone, an intro or ending.
// Pasted and typed names always win, and a suggestion only becomes a name when you tap Usar.
function nameParts(song) {
  const words = (s) => new Set(s.rows.filter(r => r.kind === 'lyric').flatMap(r => r.words.map(w => norm(w).replace(/[^a-zñ0-9]/g, ''))).filter(Boolean));
  const sim = (a, b) => { if (!a.size || !b.size) return 0; let n = 0; for (const w of a) if (b.has(w)) n++; return n / Math.min(a.size, b.size); };
  const W = song.secs.map(words);
  const chorus = song.secs.map((s, i) => /^(estribillo|coro|chorus)/i.test(s.name) || (!s.name && W[i].size > 2 && song.secs.some((o, j) => j !== i && sim(W[i], W[j]) >= 0.7)));
  let est = 0, seen = 0;
  song.secs.forEach((s, i) => {
    s.sugg = '';
    if (chorus[i]) seen++;
    if (s.name) { if (/^estrofa/i.test(s.name)) est++; return; }
    if (song.secs.length < 2) return;
    const lyr = W[i].size > 0;
    if (!lyr) { if (s.rows.some(r => r.kind === 'bars')) s.sugg = i === 0 ? 'Intro' : i === song.secs.length - 1 ? 'Final' : 'Interludio'; return; }
    if (chorus[i]) { s.sugg = 'Estribillo'; return; }
    const lines = s.rows.filter(r => r.kind === 'lyric' && !isEmptyRow(r)).length;
    if (i > 0 && chorus[i + 1] && !chorus[i - 1] && W[i - 1].size && lines <= 2) { s.sugg = 'Pre-estribillo'; return; } // short, between a verse and a chorus
    if (seen >= 2) { s.sugg = 'Puente'; return; }
    s.sugg = 'Estrofa ' + (++est);
  });
  if (song.secs.filter(s => /^estrofa/i.test(s.name || s.sugg)).length === 1) song.secs.forEach(s => { if (s.sugg === 'Estrofa 1') s.sugg = 'Estrofa'; });
}
function editingEl() {
  const e = S.editing; if (!e) return null;
  if (e.kind === 'row') return document.querySelector(`.ln[data-row="${e.id}"] .tx`);
  if (e.kind === 'sec') return document.querySelector(`[data-secname="${e.id}"]`);
  if (e.kind === 'title') return document.querySelector('[data-title]');
  if (e.kind === 'stitle') return document.querySelector(`[data-stitle="${e.i}"]`);
  return document.querySelector('[data-pname]');
}
// Write what is in the field being edited back into the song. Returns true if anything was being edited.
function commitEditing() {
  S.slash = null; document.querySelector('.slashm')?.remove();
  const e = S.editing; if (!e) return false;
  if (e.kind === 'row') S.lastRow = e.id;
  const el = editingEl(); S.editing = null; if (!el) return true;
  const text = el.textContent;
  if (e.kind === 'pname') { proj().name = text.trim() || 'Sin nombre'; return true; }
  if (e.kind === 'stitle') { const s = proj().songs[e.i]; if (s && s.title !== text.trim()) { s.title = text.trim(); if (rowsOf(s)[0]) s.changed.add(rowsOf(s)[0].id); } return true; }
  const song = cur();
  if (e.kind === 'title') { if (text.trim() !== song.title) { pushHist(); song.title = text.trim(); } return true; }
  if (e.kind === 'sec') {
    const sec = song.secs.find(x => x.id === e.id); if (!sec) return true;
    const t = text.trim(); pushHist();
    sec.rep = +((t.match(/x(\d+)/i) || [])[1] || 1); sec.ts = (t.match(/(\d+\/\d+)/) || [])[1] || null;
    sec.name = t.replace(/x\d+/i, '').replace(/\d+\/\d+/, '').trim(); sec.auto = !sec.name; nameParts(song); return true;
  }
  const loc = findRow(song, e.id); if (!loc) return true;
  const before = structuredClone({ secs: song.secs, main: song.main, ov: song.ov, notes: song.notes, clips: song.clips, changed: song.changed });
  if (applyLine(song, loc.row, text)) { S.hist.push({ sid: song.id, data: before }); nameParts(song); autoKey(song); }
  return true;
}
function wordOrder() { const out = []; for (const r of rowsOf(cur())) if (r.kind === 'lyric') r.words.forEach((_, i) => out.push({ row: r.id, i })); return out; }
function selectRange(a, b) {
  const all = wordOrder(); const ia = all.findIndex(x => x.row === a.row && x.i === a.i), ib = all.findIndex(x => x.row === b.row && x.i === b.i);
  S.sel = all.slice(Math.min(ia, ib), Math.max(ia, ib) + 1);
}
const isSel = (row, i) => S.sel.some(x => x.row === row && x.i === i);

/* chords + parts */
function setChord(c) {
  const song = cur(); const P = S.pop; pushHist();
  if (P.bar != null) {
    const { row } = findRow(song, P.row); const b = row.bars[P.bar];
    if (c === '') row.bars[P.bar] = [];
    else if (c === '%') row.bars[P.bar] = ['%'];
    else if (S.split && b.length === 1 && b[0] !== '%') row.bars[P.bar] = [b[0], c];
    else row.bars[P.bar] = [c];
    mark(row.id);
    // move on to the next bar so a progression can be tapped in one go
    if (!(S.split && row.bars[P.bar].length < 2 && c)) { P.bar++; if (P.bar >= row.bars.length) row.bars.push([]); }
  } else {
    const { row } = findRow(song, P.row);
    if (c === '' || c === '%') delete row.chords[P.i]; else row.chords[P.i] = c;
    mark(row.id); S.pop = null; clearSel();
  }
  if (c && c !== '%') { ac().resume(); strum(c, ac().currentTime + 0.02, 1.1); }
  autoKey(song);
}
function paint(who) {
  const song = cur(); pushHist();
  for (const { row, i } of S.sel) {
    if (!who) { if (song.main[row]) delete song.main[row][i]; if (song.ov[row]) delete song.ov[row][i]; }
    else if (S.role === 'canta') { (song.main[row] ??= {})[i] = who; }
    else (song.ov[row] ??= {})[i] = { who, role: '' };
    mark(row);
  }
  if (who) S.recent = [who, ...S.recent.filter(x => x !== who)].slice(0, 6);
  clearSel();
}

/* cut, copy and paste: a run of selected words, across lines and parts, keeps its chords, tags and comments */
let clip = null;
const flat = (t) => t.replace(/\s+/g, ' ').trim();
function pickWords(song, row, idx) {
  const m = (o) => { const out = {}; idx.forEach((w, j) => { if (o?.[w] !== undefined) out[j] = structuredClone(o[w]); }); return out; };
  return { kind: 'lyric', words: idx.map(w => row.words[w]), chords: m(row.chords), main: m(song.main[row.id]), ov: m(song.ov[row.id]) };
}
function keepWords(song, row, idx) { const c = pickWords(song, row, idx); row.words = c.words.length ? c.words : ['']; row.chords = c.chords; song.main[row.id] = c.main; song.ov[row.id] = c.ov; mark(row.id); }
function wholeLine(song, row) {
  const { id, ...rest } = structuredClone(row);
  return { ...rest, main: structuredClone(song.main[id] ?? {}), ov: structuredClone(song.ov[id] ?? {}), note: song.notes[id], noteBy: song.noteBy?.[id], replies: structuredClone(song.replies?.[id]) };
}
function clipLine(song, c) { // a copied line back into the song, with an id of its own
  const { main, ov, note, noteBy, replies, ...row } = structuredClone(c); row.id = uid();
  if (main && Object.keys(main).length) song.main[row.id] = main; if (ov && Object.keys(ov).length) song.ov[row.id] = ov;
  if (note) { song.notes[row.id] = note; if (noteBy) (song.noteBy ??= {})[row.id] = noteBy; if (replies) (song.replies ??= {})[row.id] = replies; }
  mark(row.id); return row;
}
const lineText = (c) => c.kind === 'bars' ? barsText(c.bars) : c.words.join(' ').trim();
// the lines the selection covers, first to last; a line only partly selected gives just those words
function selLines(song) {
  const by = new Map(); for (const { row, i } of S.sel) (by.get(row) ?? by.set(row, []).get(row)).push(i);
  const all = rowsOf(song); const pos = [...by.keys()].map(id => all.findIndex(r => r.id === id)).filter(k => k >= 0); if (!pos.length) return [];
  return all.slice(Math.min(...pos), Math.max(...pos) + 1).map(row => {
    const idx = row.kind === 'lyric' ? (by.get(row.id) ?? row.words.map((_, k) => k)).sort((a, b) => a - b) : null;
    const whole = !idx || idx.length >= row.words.length;
    return { row, idx, whole, c: whole ? wholeLine(song, row) : pickWords(song, row, idx) };
  });
}
function copySel(cut) {
  const song = cur(); const lines = selLines(song); if (!lines.length) return;
  clip = { items: lines.map(l => l.c), text: lines.map(l => lineText(l.c)).join('\n') };
  navigator.clipboard?.writeText(clip.text).catch(() => {});
  if (cut) {
    pushHist();
    for (const l of lines) {
      if (!l.whole) { keepWords(song, l.row, l.row.words.map((_, k) => k).filter(k => !l.idx.includes(k))); continue; }
      const f = findRow(song, l.row.id); f.sec.rows.splice(f.i, 1);
      for (const t of ['main', 'ov', 'notes', 'noteBy', 'replies']) if (song[t]) delete song[t][l.row.id];
    }
    song.secs = song.secs.filter(s => s.rows.length); if (!song.secs.length) song.secs.push(Sec('', [L('')]));
    song.secs.forEach(s => s.rows.forEach(r => mark(r.id))); nameParts(song); autoKey(song);
  }
  clearSel(); toast(cut ? 'Cortado' : 'Copiado');
}
// put the copied lines into a part, at a line's index; true when the text pasted is what was copied here
function pasteClip(song, sec, at, text) {
  if (!clip || (text != null && flat(text) !== flat(clip.text))) return false;
  sec.rows.splice(at, 0, ...clip.items.map(c => clipLine(song, c))); return true;
}
function pasteBelow() {
  const song = cur(); const last = selLines(song).at(-1)?.row ?? findRow(song, S.lastRow)?.row; if (!clip || !last) return;
  pushHist(); const l = findRow(song, last.id); pasteClip(song, l.sec, l.i + 1); nameParts(song); autoKey(song); clearSel(); render();
}

/* recording */
let recIv = 0, mediaRec = null, recChunks = [];
async function startRec(at, label = 'Audio') {
  stopSong(false); stopClip(false);
  let real = false;
  try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); mediaRec = new MediaRecorder(stream); recChunks = []; mediaRec.ondataavailable = (e) => recChunks.push(e.data); mediaRec.start(); real = true; }
  catch { mediaRec = null; }
  S.rec = { real, t0: Date.now(), at, label }; S.composer = null; render();
  recIv = setInterval(() => {
    const el = document.getElementById('rect'); if (el) el.textContent = fmt((Date.now() - S.rec.t0) / 1000);
    const live = document.getElementById('live'); if (live) [...live.children].forEach(i => i.style.height = (10 + Math.random() * 90) + '%');
  }, 120);
}
function stopRec() {
  clearInterval(recIv); const secs = Math.max(1, (Date.now() - S.rec.t0) / 1000); const song = cur(); const { at, label } = S.rec;
  const vis = proj().shared && S.cvis === 'alumnos' && label !== 'Idea' ? 'alumnos' : 'solo';
  const add = (extra) => { pushHist(); song.clips.push({ id: uid('c'), at, who: ME, kind: '', vis, label, rate: 1, loop: false, ...extra }); mark(at); S.rec = null; render(); };
  if (S.rec.real && mediaRec) { mediaRec.onstop = () => { mediaRec.stream.getTracks().forEach(t => t.stop()); add({ url: URL.createObjectURL(new Blob(recChunks, { type: mediaRec.mimeType })), dur: secs }); }; mediaRec.stop(); }
  else {
    const scale = [57, 60, 62, 64, 67, 69, 72]; const mel = []; let left = secs / 0.6;
    while (left > 0) { const d = [0.5, 0.5, 1, 1.5][Math.floor(Math.random() * 4)]; mel.push([Math.random() < 0.12 ? 0 : scale[Math.floor(Math.random() * scale.length)], d]); left -= d; }
    add({ mel, dur: melDur(mel) });
  }
}

/* blocks: the part and line menus, the + insert menu and the / menu */
function blockAct(M, a, as) {
  const song = cur();
  if (M.kind === 'sec') {
    const i = song.secs.findIndex(x => x.id === M.id); const sec = song.secs[i]; if (!sec) return render();
    if (a === 'secren') { S.editing = { kind: 'sec', id: sec.id }; return render(); }
    if (a === 'secfold') { S.fold.has(sec.id) ? S.fold.delete(sec.id) : S.fold.add(sec.id); return render(); }
    pushHist();
    if (a === 'seccol') sec.color = as;
    if (a === 'secas') { let n = as; if (as === 'Estrofa') { const k = song.secs.filter(x => x !== sec && /^estrofa/i.test(x.name)).length; n = k ? 'Estrofa ' + (k + 1) : 'Estrofa'; } sec.name = n; sec.auto = false; }
    if (a === 'secrep') sec.rep = sec.rep > 1 ? 1 : 2;
    if (a === 'secdup') { const c = structuredClone(sec); c.id = uid('s'); c.rows.forEach(r => { const o = r.id; r.id = uid(); for (const t of ['main', 'ov']) if (song[t][o]) song[t][r.id] = structuredClone(song[t][o]); mark(r.id); }); song.secs.splice(i + 1, 0, c); }
    if (a === 'secmerge' && i > 0) { const prev = song.secs[i - 1]; prev.rows.push(...sec.rows); song.secs.splice(i, 1); prev.rows.forEach(r => mark(r.id)); nameParts(song); return render(); }
    if (a === 'secup' && i > 0) [song.secs[i - 1], song.secs[i]] = [song.secs[i], song.secs[i - 1]];
    if (a === 'secdown' && i < song.secs.length - 1) [song.secs[i + 1], song.secs[i]] = [song.secs[i], song.secs[i + 1]];
    sec.rows.forEach(r => mark(r.id));
    if (a === 'secdel') { song.secs.splice(i, 1); if (!song.secs.length) song.secs.push(Sec('', [L('')])); nameParts(song); return toast(`Borraste ${sec.name || 'la parte'}. Deshacer está arriba.`); }
    nameParts(song); return render();
  }
  const l = findRow(song, M.id); if (!l) return render(); const { sec, i, row } = l;
  if (a === 'rowedit') { S.editing = { kind: 'row', id: row.id }; return render(); }
  if (a === 'rownote') { S.composer = { at: row.id }; return render(); }
  if (a === 'rowrec') { S.composer = { at: row.id, mode: 'att' }; return render(); }
  pushHist();
  if (a === 'rowsplit' && i > 0) { const ns = Sec('', sec.rows.splice(i)); ns.auto = true; song.secs.splice(song.secs.indexOf(sec) + 1, 0, ns); ns.rows.forEach(r => mark(r.id)); }
  if (a === 'rowpaste') { pasteClip(song, sec, i + 1); autoKey(song); }
  if (a === 'rowdup') { const c = structuredClone(row); c.id = uid(); for (const t of ['main', 'ov']) if (song[t][row.id]) song[t][c.id] = structuredClone(song[t][row.id]); sec.rows.splice(i + 1, 0, c); mark(c.id); }
  if (a === 'rowup' && i > 0) { [sec.rows[i - 1], sec.rows[i]] = [sec.rows[i], sec.rows[i - 1]]; mark(row.id); }
  if (a === 'rowdown' && i < sec.rows.length - 1) { [sec.rows[i + 1], sec.rows[i]] = [sec.rows[i], sec.rows[i + 1]]; mark(row.id); }
  if (a === 'rowdel') { sec.rows.splice(i, 1); mark(row.id); if (!sec.rows.length) song.secs.splice(song.secs.indexOf(sec), 1); if (!song.secs.length) song.secs.push(Sec('', [L('')])); nameParts(song); return toast('Borrado. Deshacer está arriba.'); }
  nameParts(song); render();
}
function insertAt(W, what) {
  const song = cur(); let sec, idx, at;
  if (W?.kind === 'row') { const l = findRow(song, W.id); sec = l.sec; idx = l.i + 1; at = W.id; }
  else if (W?.kind === 'sec') { sec = song.secs.find(x => x.id === W.id); idx = 0; at = sec.id; }
  else { sec = song.secs.at(-1); idx = sec.rows.length; at = rowsOf(song).at(-1)?.id ?? sec.id; }
  if (what === 'note') { S.composer = { at }; return render(); }
  if (what === 'rec') { S.composer = { at, mode: 'att' }; return render(); }
  pushHist();
  if (what === 'lyric') { const r = L(''); sec.rows.splice(idx, 0, r); S.editing = { kind: 'row', id: r.id }; }
  if (what === 'bars') { const r = B('- | - | - | -'); sec.rows.splice(idx, 0, r); mark(r.id); S.pop = { type: 'chord', row: r.id, bar: 0 }; }
  if (what === 'part') { // a heading: what follows the block it was added under moves under it
    const rest = W?.kind === 'row' ? sec.rows.splice(idx) : [];
    const ns = Sec('', rest.length ? rest : [L('')]); song.secs.splice(song.secs.indexOf(sec) + 1, 0, ns); rest.forEach(r => mark(r.id)); S.editing = { kind: 'sec', id: ns.id }; }
  render();
}
function slashMenu(el) {
  document.querySelector('.slashm')?.remove();
  if (S.slash && el) place(`<div class="pop menu ins slashm"><div class="mlab">Insertar</div>${insItems(S.slash.q, 'data-slash', S.slash.active)}</div>`, rectOf([el]), 'below');
}
const slashList = () => INSERT.filter(x => !S.slash.q || (x.t + ' ' + x.a).toLowerCase().includes(S.slash.q.toLowerCase()));
function pickSlash(k) {
  // what was typed after the slash is dropped; on an empty line the block takes the line's place
  const id = S.slash?.id ?? S.editing?.id; S.slash = null; S.editing = null;
  const song = cur(); const l = findRow(song, id); if (!l) return render();
  const empty = isEmptyRow(l.row);
  if (k === 'lyric') { S.editing = { kind: 'row', id, caret: 0 }; return render(); }
  if (k === 'bars' && empty) { pushHist(); const r = B('- | - | - | -'); l.sec.rows.splice(l.i, 1, r); mark(r.id); S.pop = { type: 'chord', row: r.id, bar: 0 }; return render(); }
  if (k === 'part' && empty && l.i > 0) { pushHist(); const rest = l.sec.rows.splice(l.i); const ns = Sec('', rest); song.secs.splice(song.secs.indexOf(l.sec) + 1, 0, ns); S.editing = { kind: 'sec', id: ns.id }; return render(); }
  insertAt({ kind: 'row', id }, k);
}

let toastTimer;
function toast(t, undoable = false) { S.toast = t; if (!undoable) S.trash = null; render(); clearTimeout(toastTimer); toastTimer = setTimeout(() => { S.toast = null; S.trash = null; render(); }, undoable ? 6000 : 2400); }

/* ---------------- after render: focus, overlays ---------------- */
function rectOf(els) {
  let r = null; for (const el of els) { if (!el) continue; for (const b of el.getClientRects()) { r = r ? { left: Math.min(r.left, b.left), top: Math.min(r.top, b.top), right: Math.max(r.right, b.right), bottom: Math.max(r.bottom, b.bottom) } : { left: b.left, top: b.top, right: b.right, bottom: b.bottom }; } }
  return r;
}
function place(html, anchor, prefer = 'above') {
  const app = document.getElementById('app'); if (!anchor) return; const ar = app.getBoundingClientRect();
  app.insertAdjacentHTML('beforeend', html); const el = app.lastElementChild; const w = el.offsetWidth, h = el.offsetHeight;
  let x = (anchor.left + anchor.right) / 2 - ar.left - w / 2; x = Math.max(8, Math.min(ar.width - w - 8, x));
  const above = anchor.top - ar.top - h - 10, below = anchor.bottom - ar.top + 10;
  const roomUp = anchor.top - ar.top - 18, roomDown = ar.bottom - anchor.bottom - 18;
  let y;
  if (prefer === 'above' && h <= roomUp) y = above;
  else if (h <= roomDown) y = below;
  else if (h <= roomUp) y = above;
  else if (roomDown >= roomUp) { el.style.maxHeight = roomDown + 'px'; el.style.overflow = 'auto'; y = below; }
  else { el.style.maxHeight = roomUp + 'px'; el.style.overflow = 'auto'; y = anchor.top - ar.top - 10 - roomUp; }
  y = Math.max(8, y);
  el.style.left = x + 'px'; el.style.top = y + 'px';
}
// a chord wider than its word (a "y" under "D7") pushes the next word along instead of colliding
let measureCtx;
function spaceChords() {
  const ws = document.querySelectorAll('.w[data-c]'); if (!ws.length) return;
  measureCtx ??= document.createElement('canvas').getContext('2d');
  for (const w of ws) {
    measureCtx.font = getComputedStyle(w, '::before').font;
    const need = measureCtx.measureText(w.dataset.c).width + 8, have = w.getBoundingClientRect().width;
    if (need > have) w.style.paddingRight = (need - have) + 'px';
  }
}
let hero = null;
const logoHost = document.createElement('div'); logoHost.className = 'logo'; logoHost.id = 'logo';
function after() {
  const app = document.getElementById('app');
  const logo = document.getElementById('logo'); // the sign-in logo plays its intro once and stays put while the form changes
  if (logo && logo !== logoHost) { if (!hero) hero = mountNotiHero(logoHost, { intro: true }); logo.replaceWith(logoHost); }
  placeEye();
  if (S.modal === 'pub') app.insertAdjacentHTML('beforeend', pubModal(proj()));
  else if (S.modal === 'keys') app.insertAdjacentHTML('beforeend', keysModal());
  else if (S.modal === 'pass') { app.insertAdjacentHTML('beforeend', passModal()); document.getElementById('newpass')?.focus(); }
  else if (S.modal === 'name') { app.insertAdjacentHTML('beforeend', nameModal()); document.getElementById('firstname')?.focus(); }
  else if (S.modal === 'subcal') app.insertAdjacentHTML('beforeend', subModal());
  if (S.conflict) app.insertAdjacentHTML('beforeend', `<div class="toast warn" role="alert">Alguien más cambió esto mientras editabas, y lo tuyo de ese momento no se guardó. <button data-reload>Recargar</button></div>`);
  else if (S.offline) app.insertAdjacentHTML('beforeend', `<div class="toast warn" role="status">Sin conexión. Lo que cambies se guarda cuando vuelva.</div>`);
  if (S.toast) app.insertAdjacentHTML('beforeend', `<div class="toast" role="status">${esc(S.toast)}${S.trash ? ' <button data-restore>Deshacer</button>' : ''}</div>`);
  if (S.menu) {
    const M = S.menu;
    const q = M.q ?? (M.kind === 'me' ? '[data-mepop]' : M.kind === 'share' ? '[data-sharepop]' : (M.kind === 'song' || M.kind === 'move') ? (M.here ? '[data-songmenu]' : `[data-smenu="${M.i}"]`) : M.kind === 'proj' ? (M.fold ? `[data-fmenu="${M.pid}"]` : M.pid ? `[data-pmenu2="${M.pid}"]` : '[data-pmenu]') : M.kind === 'insert' ? `[data-plus="${M.at}"]` : `[data-handle="${M.kind}:${M.id}"]`);
    const a = document.querySelector(q);
    if (a) place(menuV(), rectOf([a]), M.at === 'end:' || M.kind === 'me' ? 'above' : 'below'); else S.menu = null;
  }
  if (S.ev) app.insertAdjacentHTML('beforeend', evPanel());
  if (S.search) { app.insertAdjacentHTML('beforeend', searchV()); const i = document.getElementById('sq'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  if (S.reh) { app.insertAdjacentHTML('beforeend', rehV()); const r = document.getElementById('rehs'); if (r) { r.scrollTop = S.reh.y; r.addEventListener('scroll', () => { if (Math.abs(r.scrollTop - S.reh.y) > 3) S.reh.y = r.scrollTop; }, { passive: true }); } }
  if (S.replyAt) document.getElementById('rnote')?.focus({ preventScroll: true });
  if (S.flash) { const f = document.querySelector(`.ln[data-row="${S.flash}"], .br[data-row="${S.flash}"]`); if (f) { f.classList.add('flash'); f.scrollIntoView({ block: 'center' }); } S.flash = null; }
  const el = editingEl();
  if (el) { el.focus({ preventScroll: true }); placeCaret(el, S.editing.caret ?? el.textContent.length); }
  if (S.composer) document.getElementById('cnote')?.focus();
  spaceChords(); document.querySelectorAll('.desc').forEach(fitDesc);
  if (S.screen === 'song' && S.dev !== 'alumno') {
    if (S.pop) {
      const P = S.pop;
      if (P.bar != null) document.getElementById(`e-${P.row}-b${P.bar}`)?.scrollIntoView({ block: 'nearest' });
      const anchor = P.dock ? rectOf([document.querySelector('[data-tool="singer"]')])
        : P.type === 'meta' ? rectOf([document.querySelector('[data-pop="meta"]')])
        : P.bar != null ? rectOf([document.getElementById(`e-${P.row}-b${P.bar}`)])
        : P.type === 'chord' ? rectOf([document.getElementById(`e-${P.row}-${P.i}`)])
        : rectOf(S.sel.map(x => document.getElementById(`e-${x.row}-${x.i}`)));
      place(popV(), anchor, P.type === 'meta' || P.bar != null ? 'below' : 'above');
      if (P.type === 'singer' && matchMedia('(pointer: fine)').matches) document.getElementById('tagq')?.focus({ preventScroll: true });
    } else if (S.sel.length && !S.tool && S.tbar !== 'isla') {
      const a = rectOf(S.sel.map(x => document.getElementById(`e-${x.row}-${x.i}`)));
      const lane = document.getElementById(`e-${S.sel[0].row}-${S.sel[0].i}`)?.closest('.lanes') ? 20 : 0; // keep the chords above the selection visible
      place(toolbarV(), a && { ...a, top: a.top - lane }, 'above');
    }
    const sw = document.getElementById('sw');
    const y0 = sw?.scrollTop; // a real scroll hides the toolbar; the render's own scroll restore doesn't
    sw?.addEventListener('scroll', () => { if ((S.pop || S.sel.length) && Math.abs(sw.scrollTop - y0) > 40) document.querySelectorAll('.tb, .pop').forEach(n => n.remove()); }, { passive: true });
  }
}

/* ---------------- input ---------------- */
let dragSel = false;
let downAt = null;
// drag a song by its handle to change the running order
let drag = null, dragEnd = 0;
document.addEventListener('pointerdown', (e) => {
  const g = e.target.closest('[data-grip]'); if (!g) return;
  e.preventDefault(); const li = g.closest('.orow');
  drag = { li, list: li.parentElement, from: +g.dataset.grip, off: e.clientY - li.getBoundingClientRect().top }; li.classList.add('dragging');
});
document.addEventListener('pointermove', (e) => {
  if (!drag) return; const { li, list } = drag;
  li.style.transform = '';
  const before = [...list.children].find(x => x !== li && e.clientY < x.getBoundingClientRect().top + x.getBoundingClientRect().height / 2) ?? null;
  if (li.nextElementSibling !== before) list.insertBefore(li, before);
  li.style.transform = `translateY(${e.clientY - drag.off - li.getBoundingClientRect().top}px)`;
});
document.addEventListener('pointerup', () => {
  if (!drag) return; const { li, list, from } = drag; drag = null; li.classList.remove('dragging'); li.style.transform = '';
  const to = [...list.children].indexOf(li); dragEnd = Date.now(); if (to === from) return;
  const p = proj(); const [x] = p.songs.splice(from, 1); p.songs.splice(to, 0, x); p.orderDirty = true; render();
});
let gdrag = null;
document.addEventListener('pointerdown', (e) => {
  const tile = e.target.closest('.stile[data-gi]'); if (!tile || e.button || e.target.closest('.more')) return;
  if (e.pointerType !== 'mouse' && !e.target.closest('[data-ggrip]')) return;
  const r0 = tile.getBoundingClientRect(); gdrag = { el: tile, grid: tile.parentElement, from: +tile.dataset.gi, x0: e.clientX, y0: e.clientY, ox: e.clientX - r0.left, oy: e.clientY - r0.top, on: false };
  if (e.target.closest('[data-ggrip]')) e.preventDefault();
});
document.addEventListener('pointermove', (e) => {
  if (!gdrag) return; const G = gdrag;
  if (!G.on) { if (Math.hypot(e.clientX - G.x0, e.clientY - G.y0) < 7) return; G.on = true; G.el.classList.add('dragging'); G.grid.classList.add('ongrab'); getSelection().removeAllRanges(); }
  G.el.style.transform = '';
  const tiles = [...G.grid.querySelectorAll('.stile[data-gi]')].filter(x => x !== G.el);
  let best = null, bd = Infinity; for (const x of tiles) { const r = x.getBoundingClientRect(); const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)); if (d < bd) { bd = d; best = x; } }
  if (best) { const r = best.getBoundingClientRect(); const after = e.clientY > r.bottom - 4 || (e.clientY >= r.top && e.clientX > r.left + r.width / 2); if (after) { if (best.nextElementSibling !== G.el) best.after(G.el); } else if (best.previousElementSibling !== G.el) best.before(G.el); }
  const r0 = G.el.getBoundingClientRect();
  G.el.style.transform = `translate(${e.clientX - G.ox - r0.left}px, ${e.clientY - G.oy - r0.top}px)`;
});
document.addEventListener('pointerup', () => {
  if (!gdrag) return; const G = gdrag; gdrag = null; if (!G.on) return;
  G.el.classList.remove('dragging'); G.grid.classList.remove('ongrab'); G.el.style.transform = ''; dragEnd = Date.now();
  const to = [...G.grid.querySelectorAll('.stile[data-gi]')].indexOf(G.el); if (to === G.from) return render();
  const p = proj(); const [x] = p.songs.splice(G.from, 1); p.songs.splice(to, 0, x); if (p.shared) p.orderDirty = true; render();
});
let bdrag = null;
document.addEventListener('pointerdown', (e) => {
  const h = e.target.closest('[data-handle]'); if (!h) return;
  e.preventDefault(); const [kind, id] = h.dataset.handle.split(':');
  const el = kind === 'sec' ? document.querySelector(`.sec[data-sec="${id}"]`) : h.closest('.ln, .br');
  if (el) bdrag = { kind, id, el, list: el.parentElement, y0: e.clientY, on: false, off: 0 };
});
document.addEventListener('pointermove', (e) => {
  if (!bdrag) return; const D = bdrag;
  if (!D.on) { if (Math.abs(e.clientY - D.y0) < 6) return; D.on = true; D.off = e.clientY - D.el.getBoundingClientRect().top; D.el.classList.add('dragging'); document.querySelectorAll('.tb, .pop').forEach(n => n.remove()); getSelection().removeAllRanges(); }
  D.el.style.transform = '';
  const sibs = [...D.list.querySelectorAll(D.kind === 'sec' ? ':scope > .sec' : ':scope > .ln, :scope > .br')];
  const before = sibs.find(x => x !== D.el && e.clientY < x.getBoundingClientRect().top + x.getBoundingClientRect().height / 2);
  if (before) { if (D.el.nextElementSibling !== before) D.list.insertBefore(D.el, before); }
  else { const last = sibs.filter(x => x !== D.el).at(-1); if (last && last.nextElementSibling !== D.el) last.after(D.el); }
  D.el.style.transform = `translateY(${e.clientY - D.off - D.el.getBoundingClientRect().top}px)`;
});
document.addEventListener('pointerup', () => {
  if (!bdrag) return; const D = bdrag; bdrag = null; if (!D.on) return;
  D.el.classList.remove('dragging'); D.el.style.transform = ''; dragEnd = Date.now();
  const song = cur(); pushHist();
  if (D.kind === 'sec') { const ids = [...D.list.querySelectorAll(':scope > .sec')].map(x => x.dataset.sec); song.secs.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)); song.secs.forEach(x => x.rows.forEach(r => mark(r.id))); nameParts(song); }
  else { const sec = findRow(song, D.id).sec; const ids = [...D.list.querySelectorAll(':scope > .ln, :scope > .br')].map(x => x.dataset.row); sec.rows.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)); mark(D.id); }
  render();
});
// the hidden sidebar peeks out when the mouse touches the left edge, and goes when it leaves
document.addEventListener('pointerover', (e) => {
  if (e.pointerType === 'mouse' && e.target.closest?.('[data-edge]') && effSide() === 'asoma' && !S.peek) { S.peek = 'hover'; S.peekAnim = true; render(); }
});
document.addEventListener('pointermove', (e) => {
  if (S.peek !== 'hover' || e.pointerType !== 'mouse') return;
  const r = document.querySelector('.rail')?.getBoundingClientRect();
  if (r && e.clientX > r.right + 40 && !document.querySelector('.menu')) { S.peek = false; render(); }
});
document.addEventListener('pointerdown', (e) => { dragSel = false; downAt = { x: e.clientX, y: e.clientY }; });
document.addEventListener('pointerup', (e) => { // only a real drag counts, never a leftover browser selection
  const moved = downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 8; downAt = null;
  if (moved) checkDragSelection();
});
function checkDragSelection() {
  if (S.screen !== 'song' || S.dev === 'alumno') return;
  const s = getSelection(); if (s.isCollapsed) return;
  const doc = document.getElementById('doc'); if (!doc || !doc.contains(s.anchorNode)) return;
  let extra = [];
  if (S.editing) { // a drag that leaves the open line selects across lines, that line's picked words included
    const ed = editingEl(); if (!ed || (ed.contains(s.anchorNode) && ed.contains(s.focusNode))) return;
    const id = S.editing.kind === 'row' && S.editing.id; const r = s.getRangeAt(0); const txt = ed.textContent;
    const a = ed.contains(r.startContainer) ? textOffset(ed, r.startContainer, r.startOffset) : 0, b = ed.contains(r.endContainer) ? textOffset(ed, r.endContainer, r.endOffset) : txt.length;
    const spans = [...txt.matchAll(/\S+/g)].map(m => [m.index, m.index + m[0].length]);
    const hit = s.containsNode(ed, true) ? spans.map(([x, y], k) => (x < b && y > a ? k : -1)).filter(k => k >= 0) : [];
    commitEditing(); const row = id && findRow(cur(), id)?.row;
    if (row?.kind === 'lyric') extra = hit.map(i => ({ row: id, i }));
  }
  const words = [...doc.querySelectorAll('.w')].filter(w => s.containsNode(w, true)); if (!words.length && !extra.length) return;
  const order = wordOrder().map(x => x.row + ':' + x.i); const seen = new Set();
  S.sel = [...words.map(w => ({ row: w.dataset.row, i: +w.dataset.i })), ...extra].filter(x => !seen.has(x.row + ':' + x.i) && seen.add(x.row + ':' + x.i)).sort((x, y) => order.indexOf(x.row + ':' + x.i) - order.indexOf(y.row + ':' + y.i)); S.selAnchor = S.sel[0]; S.pop = null;
  if (S.tool === 'singer' && S.brush !== undefined) paint(S.brush); // dragging with a singer picked paints the run
  else if (S.tool === 'chord') S.pop = { type: 'chord', row: S.sel[0].row, i: S.sel[0].i };
  s.removeAllRanges(); dragSel = true; render();
}
function startEditRow(rowId, caret) { S.slash = null;  S.editing = { kind: 'row', id: rowId, caret }; clearSel(); render(); }

document.addEventListener('click', (e) => {
  if (dragSel) { dragSel = false; return; }
  if (Date.now() - dragEnd < 350) return;
  const t = e.target;
  if (S.reh) { const rb = t.closest('button'); if (rb && handle(rb, e)) return; const body = t.closest('.rbody'); if (body) { const r = body.getBoundingClientRect(); rehPage(e.clientY < r.top + r.height / 2 ? -1 : 1); } return; }
  if (S.search && t.classList.contains('srch')) { S.search = null; return render(); }
  const sl = t.closest('[data-slash]'); if (sl) { pickSlash(sl.dataset.slash); return; }
  if (t.closest('a.clip')) return; // an attached file opens on its own
  if (t.closest('[contenteditable="plaintext-only"]')) return;
  const inOverlay = t.closest('.tb, .pop, .composer, .scrim, .pbar, .note, .evp, .search');
  const wasEditing = !inOverlay && commitEditing();
  const b = t.closest('button, label');
  if (S.menu && !t.closest('.menu, [data-smenu], [data-pmenu], [data-pmenu2], [data-fmenu], [data-handle], [data-plus], [data-songmenu], [data-sharepop], [data-mepop]')) { S.menu = null; if (!b) return render(); }
  if (S.ev && !t.closest('.evp, [data-ev], [data-newev], .pbar, .pop, .toast')) { S.ev = null; if (!b && !t.closest('[data-day]')) return render(); }
  if (S.peek && !t.closest('.rail, [data-peek], .pbar, .menu')) { S.peek = false; if (!b) return render(); }
  if (b && handle(b, e)) return;
  const dy = t.closest('[data-day]'); if (dy && S.screen === 'cal') { S.calSel = S.calSel === dy.dataset.day ? null : dy.dataset.day; return render(); }
  if (S.screen === 'song' && S.dev !== 'alumno' && !inOverlay) {
    const song = cur();
    const w = t.closest('.w');
    if (w) {
      const row = w.dataset.row, i = +w.dataset.i; const r = w.getBoundingClientRect();
      if (S.tool && !S.sel.length) { // an armed tool from the dock
        if (S.tool === 'chord') { S.sel = [{ row, i }]; S.pop = { type: 'chord', row, i }; return render(); }
        if (S.tool === 'singer' && S.brush !== undefined) { S.sel = [{ row, i }]; paint(S.brush); return render(); }
        if (S.tool === 'note') { S.tool = null; S.composer = { at: row }; return render(); }
      }
      if (w.dataset.c !== undefined && e.clientY < r.top) { S.sel = [{ row, i }]; S.pop = { type: 'chord', row, i }; return render(); }
      if (isSel(row, i)) { const cp = caretFromPoint(e.clientX, e.clientY); const tx = w.closest('.tx'); return startEditRow(row, cp && tx.contains(cp.node) ? textOffset(tx, cp.node, cp.off) : undefined); }
      if (S.sel.length && S.selAnchor) selectRange(S.selAnchor, { row, i }); else { S.sel = [{ row, i }]; S.selAnchor = { row, i }; }
      S.pop = null; return render();
    }
    const tx = t.closest('.tx');
    if (tx) {
      const row = tx.closest('.ln').dataset.row;
      const lanes = tx.closest('.lanes');
      if (lanes && !S.sel.length) { // a tap in the chord lane above a word
        const below = document.elementFromPoint(e.clientX, e.clientY + tx.getBoundingClientRect().height * 0.45)?.closest?.('.w');
        if (below && e.clientY < below.getBoundingClientRect().top) { S.sel = [{ row: below.dataset.row, i: +below.dataset.i }]; S.pop = { type: 'chord', row: below.dataset.row, i: +below.dataset.i }; return render(); }
      }
      if (!S.sel.length) return startEditRow(row);
    }
    const sn = t.closest('[data-secname]'); if (sn) { clearSel(); S.editing = { kind: 'sec', id: sn.dataset.secname }; return render(); }
    if (t.closest('[data-title]')) { clearSel(); S.editing = { kind: 'title' }; return render(); }
    if (t.closest('.ln')) { const row = t.closest('.ln').dataset.row; if (!S.sel.length) return startEditRow(row); }
    // tapping the empty page below the last line continues writing there
    if (!S.sel.length && !S.pop && t.closest('.page') && !t.closest('.sec, .shead, .starts')) {
      const last = rowsOf(song).at(-1);
      if (last && last.kind === 'lyric') return startEditRow(last.id);
      const r = L(''); pushHist(); (song.secs.at(-1) ?? (song.secs[0] = Sec('', []))).rows.push(r); return startEditRow(r.id);
    }
  }
  if (S.screen === 'project' && t.closest('[data-pname]')) { S.editing = { kind: 'pname' }; return render(); }
  if (!inOverlay && (S.sel.length || S.pop || wasEditing)) { clearSel(); render(); }
});

function handle(b, e, over) {
  const d = over ?? b.dataset;
  if (d.look) { setLook(d.look); return true; }
  if (d.th) { setTheme(d.th); return true; }
  if ('peek' in d) { if (S.collapsed && !narrow()) { S.collapsed = false; S.peek = false; saveSide(); } else { S.peek = !S.peek; S.peekAnim = !!S.peek; } render(); return true; }
  if ('collapse' in d) { if (S.peek) S.peek = false; else { S.collapsed = true; saveSide(); } render(); return true; }
  if ('pin' in d) { S.collapsed = false; S.peek = false; saveSide(); render(); return true; }
  // v6: view switches, dates, search, share, replies, moving, the trash, rehearsal
  if (d.vsw) { const [k, v] = d.vsw.split(':'); S[k] = v; render(); return true; }
  // v7: sidebar look, profile, suggestions
  if (d.navlook) { S.navlook = d.navlook; render(); return true; }
  if ('mepop' in d) { S.menu = S.menu?.kind === 'me' ? null : { kind: 'me' }; render(); return true; }
  if (d.avatar) { S.avatar = d.avatar; render(); return true; }
  if ('keys' in d) { S.menu = null; S.modal = 'keys'; render(); return true; }
  if ('subcal' in d) { S.menu = null; S.modal = 'subcal'; render(); return true; }
  if (d.oksugg) { const song = cur(), sec = song.secs.find(x => x.id === d.oksugg); if (sec?.sugg) { pushHist(); sec.name = sec.sugg; sec.rows.forEach(r => mark(r.id)); nameParts(song); } render(); return true; }
  if ('search' in d) { S.search = { q: '', active: 0 }; S.peek = false; render(); return true; }
  if (d.sres) { const [k, a, i, row] = d.sres.split(':'); S.search = null;
    if (k === 'proj') return handle(b, e, { proj: a });
    if (k === 'ev') { const F = findEv(a); S.screen = 'cal'; S.calMonth = F.e.date.slice(0, 7); S.calSel = F.e.date; S.ev = a; render(); return true; }
    S.pid = a; S.open.add(a); S.flash = row || null; openSong(+i); return true; }
  if (d.ev) { S.ev = S.ev === d.ev ? null : d.ev; S.menu = null; render(); return true; }
  if ('evclose' in d) { S.ev = null; render(); return true; }
  if (d.newev !== undefined) { const [pid, date] = d.newev.split('|'); // from the calendar it belongs to nobody; from a project, to that project
    const ev = Ev(pid && proj(pid) ? pid : '', date || S.calSel || TODAY, '', { remind: S.remindDef }); EVENTS.push(ev); S.ev = ev.id; render(); document.getElementById('evtitle')?.focus(); return true; }
  if ('evstar' in d) { const { e: ev } = findEv(S.ev); ev.star = !ev.star; render(); return true; }
  if ('evallday' in d) { findEv(S.ev).e.time = ''; render(); return true; }
  if ('sturemind' in d) { S.stuRemind = !S.stuRemind; if (S.stuRemind) toast('Te llega un mail un día antes de cada evento (prototipo)'); else render(); return true; }
  if (d.evwho) { const { e: ev } = findEv(S.ev); ev.who = ev.who.includes(d.evwho) ? ev.who.filter(x => x !== d.evwho) : [...ev.who, d.evwho]; render(); return true; }
  if ('evnotify' in d) { const { e: ev, p } = findEv(S.ev); toast(`Aviso enviado a quienes tienen el link de ${p.name}: ${evTitle(ev)}, ${dayShort(ev.date)}${ev.time ? ' ' + hora(ev.time) : ''} (prototipo)`); return true; }
  if ('evdel' in d) { const F = findEv(S.ev); EVENTS.splice(EVENTS.indexOf(F.e), 1); S.ev = null; S.trash = { kind: 'ev', item: F.e, bin: toBin('ev', F.e, { pid: F.e.pid }) }; toast(`Borraste “${evTitle(F.e)}”`, true); return true; }
  if (d.ics) { if (d.ics.startsWith('p:')) { const p = proj(d.ics.slice(2)); downloadIcs(upcoming(p), p.name); } else { const F = findEv(d.ics); downloadIcs([F], evTitle(F.e)); } return true; }
  if (d.calm) { const [y, m] = S.calMonth.split('-').map(Number); const dt = new Date(y, m - 1 + +d.calm, 1); S.calMonth = iso(dt).slice(0, 7); S.calSel = null; render(); return true; }
  if ('caltoday' in d) { S.calMonth = TODAY.slice(0, 7); S.calSel = TODAY; render(); return true; }
  if (d.calhide !== undefined) { S.calHide.has(d.calhide) ? S.calHide.delete(d.calhide) : S.calHide.add(d.calhide); render(); return true; }
  if ('sharepop' in d) { const p = proj(); if (p && !p.invite) p.invite = token(); S.menu = S.menu?.kind === 'share' ? null : { kind: 'share' }; render(); return true; }
  if ('songmenu' in d) { S.menu = S.menu?.here ? null : { kind: 'song', here: true, i: S.si }; render(); return true; }
  if (d.moveto) { const M = S.menu; S.menu = null; const from = proj(M.pid || S.pid), to = proj(d.moveto), i = M.here ? S.si : M.i; const [x] = from.songs.splice(i, 1);
    to.songs.push(x); if (to.shared) rowsOf(x).forEach(r => x.changed.add(r.id)); if (from.shared) from.orderDirty = true; evs(from).forEach(ev => ev.songs = ev.songs.filter(id => id !== x.id));
    if (M.here) { S.pid = to.id; S.si = to.songs.length - 1; S.open.add(to.id); }
    toast(`“${titleOf(x)}” ahora está en ${to.name || 'Sin nombre'}`); return true; }
  if ('reply' in d) { S.replyAt = d.reply || null; render(); return true; }
  if (d.resolve) { const s = cur(), at = d.resolve; pushHist(); S.trash = { kind: 'note', sid: s.id, at, note: s.notes[at], by: s.noteBy?.[at], reps: s.replies?.[at] }; delete s.notes[at]; if (s.replies) delete s.replies[at]; mark(at); toast('Comentario resuelto', true); return true; }
  if (d.unbin) { const x = S.bin.find(y => y.id === d.unbin); const p = x.pid && proj(x.pid);
    if (x.kind !== 'proj' && x.pid && !p) { toast('Primero restaurá su proyecto'); return true; }
    S.bin = S.bin.filter(y => y !== x); S.binAsk = null;
    if (x.kind === 'song') { p.songs.splice(Math.min(x.i, p.songs.length), 0, x.item); toast(`“${titleOf(x.item)}” volvió a ${p.name}`); }
    if (x.kind === 'proj') { PROJECTS.splice(Math.min(x.i, PROJECTS.length), 0, x.item); toast(`“${x.item.name || 'Sin nombre'}” volvió`); }
    if (x.kind === 'ev') { EVENTS.push(x.item); toast(`“${evTitle(x.item)}” volvió al calendario`); }
    return true; }
  if (d.purge) { if (S.binAsk !== d.purge) { S.binAsk = d.purge; render(); return true; } S.bin = S.bin.filter(y => y.id !== d.purge); S.binAsk = null; toast('Borrado para siempre'); return true; }
  if (d.reh) { startReh(rehList(d.reh)); return true; }
  if ('rehx' in d) { S.reh = null; render(); return true; }
  if (d.rehsp) { const v = [0.5, 0.75, 1, 1.25, 1.5, 2], k = v.indexOf(S.reh.speed); S.reh.speed = v[Math.max(0, Math.min(v.length - 1, k + +d.rehsp))]; render(); return true; }
  if ('rehplay' in d) { S.reh.play = !S.reh.play; rehT = 0; render(); if (S.reh.play && !rehRaf) rehRaf = requestAnimationFrame(rehLoop); return true; }
  if (d.rehgo) { const k = S.reh.k + +d.rehgo; if (k >= 0 && k < S.reh.list.length) { S.reh.k = k; S.reh.y = 0; render(); } return true; }
  if (d.tog) { S.open.has(d.tog) ? S.open.delete(d.tog) : S.open.add(d.tog); render(); return true; }
  if (d.opensong) { const [pid, i] = d.opensong.split(':'); S.pid = pid; S.peek = false; openSong(+i); return true; }
  if (d.fmenu) { S.menu = S.menu?.fold && S.menu.pid === d.fmenu ? null : { kind: 'proj', pid: d.fmenu, fold: true }; render(); return true; }
  if (d.pmenu2) { S.menu = S.menu?.kind === 'proj' && S.menu.pid === d.pmenu2 ? null : { kind: 'proj', pid: d.pmenu2 }; render(); return true; }
  if (d.newsong2) { S.pid = d.newsong2; S.open.add(d.newsong2); S.peek = false; return handle(b, e, { newsong: '' }); }
  if ('clear' in d) { clearSel(); render(); return true; }
  if (d.plus) { let [kind, id] = d.plus.split(':');
    if (d.plus === 'end:') { const rid = S.sel[0]?.row ?? S.lastRow; if (rid && findRow(cur(), rid)) { kind = 'row'; id = rid; } } /* the big + adds after where you were */
    S.menu = S.menu?.kind === 'insert' && S.menu.at === d.plus ? null : { kind: 'insert', at: d.plus, id: id || null, where: kind }; clearSel(); S.editing = null; render(); return true; }
  if (d.handle) { const [kind, id] = d.handle.split(':'); S.menu = S.menu?.kind === kind && S.menu.id === id ? null : { kind, id }; clearSel(); render(); return true; }
  if (d.fold) { S.fold.has(d.fold) ? S.fold.delete(d.fold) : S.fold.add(d.fold); render(); return true; }
  if (d.ins) { const M = S.menu; S.menu = null; insertAt(M && { kind: M.where, id: M.id }, d.ins); return true; }
  if (d.go) { stopSong(false); S.menu = null; S.peek = false; S.ev = null; S.binAsk = null; S.screen = d.go; if (d.go === 'signin') S.sent = false; clearSel(); S.composer = null; render(); return true; }
  if (d.filter) { S.filter = d.filter; render(); return true; }
  // project + song management
  if (d.smenu !== undefined) { S.menu = S.menu?.kind === 'song' && S.menu.i === +d.smenu ? null : { kind: 'song', i: +d.smenu }; render(); return true; }
  if ('pmenu' in d) { S.menu = S.menu?.kind === 'proj' ? null : { kind: 'proj' }; render(); return true; }
  if (d.mact) {
    const M = S.menu, p = proj(M.pid || S.pid); S.menu = null;
    if (M.kind === 'sec' || M.kind === 'row') { blockAct(M, d.mact, d.as); return true; }
    if (d.mact === 'move') { S.menu = { ...M, kind: 'move' }; render(); return true; }
    if (d.mact === 'sreh') { startReh(rehList('song')); return true; }
    if (d.mact === 'sshare') { S.menu = { kind: 'share' }; render(); return true; }
    if (d.mact === 'preh') { S.pid = p.id; startReh(rehList('proj')); return true; }
    if (d.mact === 'rename') S.editing = M.here ? { kind: 'title' } : { kind: 'stitle', i: M.i };
    if (d.mact === 'dup' && M.here) M.i = S.si;
    if (d.mact === 'dup') { const c = structuredClone(p.songs[M.i]); c.id = uid('s'); c.title = titleOf(p.songs[M.i]) + ' (copia)'; c.changed = new Set(rowsOf(c).map(r => r.id)); p.songs.splice(M.i + 1, 0, c); }
    if (d.mact === 'del') { const i = M.here ? S.si : M.i; const [x] = p.songs.splice(i, 1); S.trash = { kind: 'song', pid: p.id, i, item: x, bin: toBin('song', x, { pid: p.id, i }) }; p.orderDirty = true; if (M.here) S.screen = 'project'; toast(`Borraste “${titleOf(x)}”. Queda en la Papelera.`, true); return true; }
    if (d.mact === 'prename') { S.pid = p.id; S.screen = 'project'; S.editing = { kind: 'pname' }; }
    if (d.mact === 'pdup') { const c = structuredClone(p); c.id = uid('p'); c.name = p.name + ' (copia)'; c.owner = ME; c.shared = false; c.link = undefined; c.invite = token(); c.editors = [[ME, 'organiza']]; c.songs = c.songs.map(x => ({ ...x, id: uid('s'), changed: new Set() })); snapshot(c); PROJECTS.splice(PROJECTS.indexOf(p) + 1, 0, c); S.pid = c.id; S.screen = 'project'; }
    if (d.mact === 'pdel') { const i = PROJECTS.indexOf(p); PROJECTS.splice(i, 1); S.trash = { kind: 'proj', i, item: p, bin: toBin('proj', p, { i }) }; S.screen = 'board'; toast(`Borraste “${p.name}”`, true); return true; }
    render(); return true;
  }
  if ('restore' in d) {
    const T = S.trash; S.trash = null; clearTimeout(toastTimer); S.toast = null;
    if (T?.kind === 'song') { const p = proj(T.pid); p.songs.splice(T.i, 0, T.item); }
    if (T?.kind === 'proj') { PROJECTS.splice(T.i, 0, T.item); S.pid = T.item.id; S.screen = 'project'; }
    if (T?.kind === 'ev') EVENTS.push(T.item);
    if (T?.kind === 'note') { const s = PROJECTS.flatMap(x => x.songs).find(x => x.id === T.sid); if (s) { s.notes[T.at] = T.note; if (T.by) (s.noteBy ??= {})[T.at] = T.by; if (T.reps) (s.replies ??= {})[T.at] = T.reps; } }
    if (T?.bin) S.bin = S.bin.filter(x => x.id !== T.bin);
    render(); return true;
  }
  if (d.proj) { S.pid = d.proj; S.open.add(d.proj); S.peek = false; S.screen = 'project'; S.ptab = 'canciones'; S.ev = null; render(); return true; }
  if (d.starter) {
    if (d.starter === 'cal') return handle(b, e, { go: 'cal' });
    const p = { id: uid('p'), name: '', when: '', owner: ME, pc: 'var(--c-v)', pf: '#111', editors: [[ME, 'organiza']], people: false, shared: false, songs: [], tags: [], version: 0, note: '', invite: token() };
    snapshot(p); PROJECTS.push(p); S.pid = p.id; S.open.add(p.id); S.ptab = 'canciones';
    if (d.starter === 'blank') { S.screen = 'project'; S.editing = { kind: 'pname' }; render(); return true; }
    const s = Song('', 'C', 90, '4/4', [Sec('', [L('')])]); s.keyAuto = true; p.songs.push(s); S.si = 0; S.screen = 'song'; S.hist = []; clearSel();
    if (d.starter === 'paste') { S.editing = { kind: 'row', id: s.secs[0].rows[0].id }; toast('Pegala acá: las partes se separan solas'); }
    else { S.composer = { at: s.secs[0].rows[0].id, mode: 'att' }; render(); }
    return true;
  }
  if ('newproj' in d) {
    const p = { id: uid('p'), name: '', when: '', owner: ME, pc: 'var(--c-v)', pf: '#111', editors: [[ME, 'organiza']], people: false, shared: false, songs: [], tags: [], version: 0, note: '', invite: token() };
    snapshot(p); PROJECTS.push(p); S.pid = p.id; S.screen = 'project'; S.ptab = 'canciones'; S.editing = { kind: 'pname' }; render(); return true;
  }
  if (d.ptab) { S.ptab = d.ptab; render(); return true; }
  if (d.open) { openSong(+d.open); return true; }
  if ('newsong' in d) {
    const s = Song('', 'C', 90, '4/4', [Sec('', [L('')])]); s.keyAuto = true; s.secs[0].auto = true;
    proj().songs.push(s); S.si = proj().songs.length - 1; S.screen = 'song'; S.hist = []; clearSel(); S.editing = { kind: 'title' }; render(); return true;
  }
  if ('share' in d) { const p = proj(); p.shared = true; p.link ??= token(); p.songs.forEach(s => s.changed = new Set()); p.version = Math.max(1, p.version); snapshot(p); render(); return true; }
  if ('addpeople' in d) { proj().people = true; render(); return true; }
  if ('asstudent' in d) { S.menu = null; S.sPid = S.pid; S.sSong = 0; S.sView = 'home'; S.dev = 'alumno'; S.preview = true; S.newsOpen = true; render(); return true; }
  if ('unpreview' in d) { S.dev = devOf(); S.preview = false; S.sheet = null; render(); return true; }
  if ('signout' in d) { S.menu = null; flush().finally(() => boot.signOut()); return true; }
  if ('resend' in d) { S.sent = false; render(); return true; }
  if (d.amode) { S.mail = document.getElementById('mail')?.value.trim() ?? S.mail; S.authMode = d.amode; S.signErr = ''; render(); document.getElementById(d.amode === 'link' ? 'mail' : 'pass')?.focus(); return true; }
  if ('google' in d) { S.signErr = ''; boot.google().then((err) => { if (err) { S.signErr = authErr(err); render(); } }); return true; }
  if ('setpass' in d) { S.menu = null; S.modal = 'pass'; render(); return true; }
  if ('pub' in d) { S.modal = 'pub'; render(); return true; }
  if ('close' in d) { S.modal = null; render(); return true; }
  if (d.copy) { flush(); try { navigator.clipboard.writeText(d.copy).then(() => toast('Link copiado'), () => toast(d.copy)); } catch { toast(d.copy); } return true; }
  if (d.toast) { toast(d.toast); return true; }
  if ('undo' in d) { undo(); render(); return true; }
  if ('playsong' in d) { PLAY.song ? stopSong() : playSong(); return true; }
  if (d.clip) { const c = allClips().find(x => x.id === d.clip); if (c) PLAY.clip === c.id ? stopClip() : playClip(c); return true; }
  if (d.rate) { const c = allClips().find(x => x.id === d.rate); c.rate = c.rate < 1 ? 1 : 0.75; playClip(c); return true; }
  if (d.loop) { const c = allClips().find(x => x.id === d.loop); c.loop = !c.loop; render(); return true; }
  if (d.pop === 'meta') { S.sel = []; S.pop = S.pop?.type === 'meta' ? null : { type: 'meta' }; render(); return true; }
  if (d.tr) { const s = cur(); const n = +d.tr; pushHist(); s.keyAuto = false; const nk = transKey(s.key, n);
    for (const r of rowsOf(s)) { if (r.kind === 'bars') r.bars = r.bars.map(x => x.map(c => c === '%' ? c : transChord(c, n, nk))); else for (const k in r.chords) r.chords[k] = transChord(r.chords[k], n, nk); if (r.kind === 'bars' || Object.keys(r.chords).length) mark(r.id); }
    s.key = nk; S.custom = S.custom.map(c => transChord(c, n, nk)); render(); return true; }
  if (d.bpm) { const s = cur(); s.bpm = Math.max(40, Math.min(220, s.bpm + +d.bpm)); render(); return true; }
  if (d.setts) { cur().ts = d.setts; render(); return true; }
  if (d.tool) {
    const t = d.tool, song = cur();
    if (S.sel.length && t !== 'bars') { const map = { write: 'edit', chord: 'chord', singer: 'singer', note: 'note', rec: 'rec' }; S.tool = null; return handle(b, e, { act: map[t] }); }
    if (t === 'write') { S.tool = null; const rows = rowsOf(song); let last = rows[rows.length - 1];
      if (!last || last.kind === 'bars') { pushHist(); last = L(''); song.secs[song.secs.length - 1].rows.push(last); }
      clearSel(); S.editing = { kind: 'row', id: last.id }; render(); return true; }
    if (t === 'bars') { S.tool = null; pushHist(); const r = B('- | - | - | -'); const at = S.sel[0] && findRow(song, S.sel[0].row);
      if (at) at.sec.rows.splice(at.i + 1, 0, r); else song.secs[song.secs.length - 1].rows.push(r);
      mark(r.id); clearSel(); S.pop = { type: 'chord', row: r.id, bar: 0 }; render(); return true; }
    if (t === 'rec') { S.tool = null; clearSel(); const rows = rowsOf(song); startRec(rows[rows.length - 1].id, 'Idea'); return true; }
    if (S.tool === t) { S.tool = null; S.pop = null; render(); return true; }
    S.tool = t; clearSel();
    if (t === 'singer') S.pop = { type: 'singer', dock: true };
    render(); return true;
  }
  // selection toolbar
  if (d.act) {
    if (d.act === 'cut' || d.act === 'copy') { copySel(d.act === 'cut'); return true; }
    if (d.act === 'paste') { pasteBelow(); return true; }
    const first = S.sel[0];
    if (d.act === 'chord') S.pop = { type: 'chord', row: first.row, i: first.i };
    if (d.act === 'singer') S.pop = { type: 'singer' };
    if (d.act === 'note') { S.composer = { at: first.row }; clearSel(); }
    if (d.act === 'rec') { S.composer = { at: first.row, mode: 'att' }; clearSel(); }
    if (d.act === 'edit') { clearSel(); S.editing = { kind: 'row', id: first.row }; }
    render(); return true;
  }
  if ('paint' in d) {
    if (S.pop?.dock) { S.brush = d.paint; S.pop = null; if (d.paint) S.recent = [d.paint, ...S.recent.filter(x => x !== d.paint)].slice(0, 6); render(); return true; }
    paint(d.paint); render(); return true;
  }
  if (d.role) { S.role = d.role; render(); return true; }
  if (d.recolor) { S.recolorOpen = S.recolorOpen === d.recolor ? null : d.recolor; render(); return true; }
  if (d.setcolor) { // any tag can take any colour; it changes on every song of the project, and that counts as a change to publish
    const [id, c] = d.setcolor.split('|'), p = proj(); colorsFor(cur())[id] = c; S.recolorOpen = null;
    p.songs.forEach(s => rowsOf(s).forEach(r => whoOfRow(s, r).includes(id) && s.changed.add(r.id))); render(); return true; }
  if ('mknew' in d) { makeTag(document.getElementById('tagq')?.value ?? ''); return true; }
  if ('setc' in d) { setChord(d.setc); render(); return true; }
  if ('split' in d) { S.split = !S.split; render(); return true; }
  if ('delbar' in d) { const { row } = findRow(cur(), S.pop.row); pushHist(); row.bars.splice(S.pop.bar, 1); mark(row.id); if (!row.bars.length) { const l = findRow(cur(), row.id); l.sec.rows.splice(l.i, 1); } S.pop = null; render(); return true; }
  if (d.bar) { const [row, i] = d.bar.split(':'); S.sel = []; S.pop = { type: 'chord', row, bar: +i }; render(); return true; }
  if (d.addbar) { const { row } = findRow(cur(), d.addbar); pushHist(); row.bars.push([]); mark(row.id); S.sel = []; S.pop = { type: 'chord', row: row.id, bar: row.bars.length - 1 }; render(); return true; }
  // comments
  if ('recstart' in d) { const at = S.composer.at; startRec(at); return true; }
  if ('recstop' in d) { stopRec(); return true; }
  if ('cclose' in d) { S.composer = null; render(); return true; }
  if (d.start) {
    const s = cur(); pushHist(); S.editing = null;
    if (d.start === 'chords') { const r = B('- | - | - | -'); s.secs = [Sec('', [r])]; s.secs[0].auto = true; mark(r.id); S.pop = { type: 'chord', row: r.id, bar: 0 }; render(); return true; }
    S.composer = { at: s.secs[0].rows[0].id, mode: 'att' }; render(); return true;
  }
  // student
  if (d.sheet) { S.sheet = S.sheet === d.sheet ? null : d.sheet; render(); return true; }
  if ('me' in d) { S.me = d.me || null; S.sheet = null; try { localStorage.setItem('noti-me-' + S.sPid, S.me ?? ''); } catch {} render(); return true; }
  if ('reload' in d) { location.reload(); return true; }
  if (d.sgo) { S.sSong = +d.sgo; S.sheet = null; S.sView = 'song'; render(); return true; }
  if ('shome' in d) { S.sView = 'home'; render(); return true; }
  if ('sall' in d) { S.sAll = !S.sAll; render(); return true; }
  if (d.sstep) { const n = proj(S.sPid).published.songs.length; S.sSong = Math.max(0, Math.min(n - 1, S.sSong + +d.sstep)); render(); return true; }
  if ('news' in d) { S.newsOpen = false; render(); return true; }
  if ('schords' in d) { S.sChords = !S.sChords; render(); return true; }
  return false;
}
function makeTag(raw) {
  const v = raw.trim(); if (!v) return; const p = proj(); const all = tagsOf(p), lv = v.toLowerCase();
  const hit = all.find(id => nameOf(id).toLowerCase() === lv);
  if (hit) paint(hit); else { (p.tags ??= []).push(v); paint(v); }
  render();
}
function openSong(i) { stopSong(false); S.si = i; const os = proj()?.songs[i]; if (os) S.recentS = [os.id, ...S.recentS.filter(x => x !== os.id)].slice(0, 8); S.ev = null; S.screen = 'song'; S.lastRow = null; S.hist = []; clearSel(); S.editing = null; S.composer = null; render(); }

document.addEventListener('keydown', (e) => {
  const el = e.target;
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && S.dev !== 'alumno' && S.screen !== 'signin' && !S.reh) { e.preventDefault(); commitEditing(); S.search = S.search ? null : { q: '', active: 0 }; render(); return; }
  if (S.search) { const items = [...document.querySelectorAll('.sr')];
    if (e.key === 'Escape') { e.preventDefault(); S.search = null; render(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); S.search.active = (S.search.active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % Math.max(1, items.length); items.forEach((x, k) => x.classList.toggle('active', k === S.search.active)); items[S.search.active]?.scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'Enter') { e.preventDefault(); items[S.search.active]?.click(); }
    return; }
  if (S.reh) { const k = e.key;
    if (k === 'Escape') { S.reh = null; render(); }
    else if (k === ' ') { e.preventDefault(); handle(null, e, { rehplay: '' }); }
    else if (k === 'ArrowDown' || k === 'PageDown') { e.preventDefault(); rehPage(1); }
    else if (k === 'ArrowUp' || k === 'PageUp') { e.preventDefault(); rehPage(-1); }
    else if (k === 'ArrowRight') handle(null, e, { rehgo: '1' }); else if (k === 'ArrowLeft') handle(null, e, { rehgo: '-1' });
    return; }
  if (e.key === 'Escape' && S.ev && !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) { S.ev = null; render(); return; }
  if (e.key === 'Escape' && /share|me/.test(S.menu?.kind ?? '')) { S.menu = null; render(); return; }
  if (e.key === 'Escape' && S.modal && S.modal !== 'pub') { S.modal = null; render(); return; }
  if ((e.metaKey || e.ctrlKey) && /^[cxv]$/i.test(e.key) && S.sel.length && !el.isContentEditable && !/^(INPUT|TEXTAREA)$/.test(el.tagName) && S.screen === 'song' && S.dev !== 'alumno') {
    if (e.key.toLowerCase() === 'v') { clearTimeout(pasteWait); pasteWait = setTimeout(pasteBelow, 80); return; } // the paste event normally gets there first
    e.preventDefault(); copySel(e.key.toLowerCase() === 'x'); return;
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !el.isContentEditable && !/^(INPUT|TEXTAREA)$/.test(el.tagName) && S.screen === 'song') { e.preventDefault(); undo(); render(); return; }
  if (e.key === 'Escape' && (S.sel.length || S.pop || S.composer || S.tool) && !el.isContentEditable) { clearSel(); S.composer = null; S.tool = null; render(); return; }
  if (!el.isContentEditable || !S.editing) return;
  const ed = S.editing;
  if (ed.kind !== 'row') {
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault(); commitEditing();
      const first = cur()?.secs[0]?.rows[0]; // a fresh song: Enter on the title goes straight to the first line
      if (ed.kind === 'title' && e.key === 'Enter' && first && isEmptyRow(first)) S.editing = { kind: 'row', id: first.id, caret: 0 };
      const sr = ed.kind === 'sec' && e.key === 'Enter' && cur()?.secs.find(x => x.id === ed.id)?.rows[0]; // Enter on a new heading goes on to its first line
      if (sr && isEmptyRow(sr)) S.editing = { kind: 'row', id: sr.id, caret: 0 };
      render();
    }
    return;
  }
  const song = cur(); const loc = findRow(song, ed.id); if (!loc) return;
  const text = el.textContent; const caret = caretOffset(el);
  if (S.slash) {
    const list = slashList();
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); S.slash.active = (S.slash.active + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % Math.max(1, list.length); slashMenu(el); return; }
    if (e.key === 'Enter') { e.preventDefault(); if (list[S.slash.active]) pickSlash(list[S.slash.active].k); return; }
    if (e.key === 'Escape') { e.preventDefault(); S.slash = null; slashMenu(); return; }
  }
  if (e.key === 'Escape') { e.preventDefault(); commitEditing(); render(); return; }
  if (e.key === 'Enter') {
    e.preventDefault();
    const { sec, i } = loc;
    if (!text.trim()) {
      // Enter on an empty line starts a new part from here
      if (i === 0) return;
      pushHist(); const rest = sec.rows.splice(i); const ns = Sec('', rest); ns.auto = true;
      song.secs.splice(song.secs.indexOf(sec) + 1, 0, ns); nameParts(song); S.editing = { kind: 'row', id: ed.id, caret: 0 }; render(); return;
    }
    pushHist();
    applyLine(song, loc.row, text.slice(0, caret));
    const nr = L(text.slice(caret).trim()); const l2 = findRow(song, ed.id); l2.sec.rows.splice(l2.i + 1, 0, nr); mark(nr.id);
    nameParts(song); autoKey(song); S.editing = { kind: 'row', id: nr.id, caret: 0 }; render(); return;
  }
  if (e.key === 'Backspace' && caret === 0 && getSelection().isCollapsed) {
    const { sec, i, row } = loc;
    if (i > 0 && sec.rows[i - 1].kind === 'lyric') {
      e.preventDefault(); pushHist(); applyLine(song, row, text);
      const prev = sec.rows[i - 1]; const pw = prev.words.join('').trim() ? prev.words : []; const cw = row.words.join('').trim() ? row.words : [];
      const off = pw.length; const pos = prev.words.join(' ').trim().length + (pw.length && cw.length ? 1 : 0);
      prev.words = [...pw, ...cw]; if (!prev.words.length) prev.words = [''];
      for (const k in row.chords) prev.chords[+k + off] = row.chords[k];
      for (const t of ['main', 'ov']) if (song[t][row.id]) { song[t][prev.id] ??= {}; for (const k in song[t][row.id]) song[t][prev.id][+k + off] = song[t][row.id][k]; delete song[t][row.id]; }
      sec.rows.splice(i, 1); mark(prev.id); S.editing = { kind: 'row', id: prev.id, caret: pos }; render(); return;
    }
    if (i === 0 && song.secs.indexOf(sec) > 0) {
      e.preventDefault(); pushHist(); applyLine(song, row, text); const ps = song.secs[song.secs.indexOf(sec) - 1];
      ps.rows.push(...sec.rows); song.secs.splice(song.secs.indexOf(sec), 1); nameParts(song); S.editing = { kind: 'row', id: row.id, caret: 0 }; render(); return;
    }
  }
});
document.addEventListener('input', (e) => {
  if (!S.editing || !e.target.isContentEditable) return;
  S.editing.caret = caretOffset(e.target);
  if (S.editing.kind === 'row') { const m = e.target.textContent.match(/^\/(\S*)$/); S.slash = m ? { id: S.editing.id, q: m[1], active: S.slash?.q === m[1] ? S.slash.active : 0 } : null; slashMenu(e.target); }
});
document.addEventListener('input', (e) => {
  const k = e.target.dataset?.desc; if (!k) return;
  const v = e.target.value; if (k === 'song') cur().desc = v; else proj().desc = v; fitDesc(e.target); queueSave();
});
document.addEventListener('input', (e) => { // search, and the date panel's text fields, update in place so typing never loses focus
  const id = e.target.id;
  if (id === 'sq') { S.search.q = e.target.value; S.search.active = 0; document.getElementById('sres').innerHTML = resultsHTML(S.search.q); return; }
  const F = S.ev && findEv(S.ev); if (!F) return;
  if (id === 'evtitle') F.e.title = e.target.value; if (id === 'evplace') F.e.place = e.target.value; if (id === 'evnote') F.e.note = e.target.value;
});
document.addEventListener('input', (e) => { // the tag search filters in place, so typing never loses focus
  if (e.target.id !== 'tagq') return;
  const raw = e.target.value.trim(), q = raw.toLowerCase(), pop = e.target.closest('.pop'); let exact = false;
  pop.querySelectorAll('.trow').forEach(r => { r.hidden = !r.dataset.tag.includes(q); if (r.dataset.tag === q) exact = true; });
  const nb = pop.querySelector('[data-mknew]'); nb.hidden = !q || exact; nb.innerHTML = `Crear <b>${esc(raw)}</b>`;
});
document.addEventListener('contextmenu', (e) => { // right-click a project, wherever it shows, for its menu
  const t = e.target.closest?.('[data-proj]'); if (!t || S.dev === 'alumno' || !proj(t.dataset.proj)) return;
  e.preventDefault(); commitEditing(); const id = t.dataset.proj;
  S.menu = t.classList.contains('folder') ? { kind: 'proj', pid: id, fold: true } : { kind: 'proj', pid: id, q: `.${t.classList[0]}[data-proj="${id}"]` }; render();
});
let pasteWait = 0;
document.addEventListener('paste', (e) => {
  clearTimeout(pasteWait);
  const t = e.clipboardData.getData('text/plain');
  if (!S.editing && S.sel.length && S.screen === 'song' && S.dev !== 'alumno' && !/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) { // words picked: paste under them
    e.preventDefault(); if (!t.trim() || flat(t) === flat(clip?.text ?? '')) return pasteBelow();
    const song = cur(); pushHist(); const l = findRow(song, selLines(song).at(-1).row.id);
    const rows = parseBlocks(t).flatMap(b => b.rows); rows.forEach(r => mark(r.id)); l.sec.rows.splice(l.i + 1, 0, ...rows);
    nameParts(song); autoKey(song); clearSel(); render(); return;
  }
  const el = e.target.closest?.('[contenteditable]'); if (!el || S.editing?.kind !== 'row') return;
  { // lines copied here go back in whole, chords and tags included
    const all = el.textContent, cc = caretOffset(el); const pre = all.slice(0, cc), post = all.slice(cc);
    if (clip && flat(t) === flat(clip.text) && !(pre.trim() && post.trim() && clip.items.length === 1 && clip.items[0].kind === 'lyric')) {
      e.preventDefault(); const song = cur(); const id = S.editing.id; pushHist(); applyLine(song, findRow(song, id).row, all);
      const { sec, i, row } = findRow(song, id);
      if (!pre.trim()) { pasteClip(song, sec, i); if (isEmptyRow(row)) sec.rows.splice(sec.rows.indexOf(row), 1); }
      else if (!post.trim() || row.kind !== 'lyric') pasteClip(song, sec, i + 1);
      else { // the caret splits the line: what follows it goes under the pasted lines
        const k = flat(pre).split(' ').length, n = row.words.length, range = (a, b) => Array.from({ length: b - a }, (_, j) => a + j);
        const rest = pickWords(song, row, range(k, n)); keepWords(song, row, range(0, k));
        pasteClip(song, sec, i + 1); sec.rows.splice(i + 1 + clip.items.length, 0, clipLine(song, rest));
      }
      song.secs = song.secs.filter(x => x.rows.length); nameParts(song); autoKey(song); S.editing = null; render(); return;
    }
  }
  if (!t.includes('\n')) return;
  e.preventDefault();
  const song = cur(); const id = S.editing.id; const text = el.textContent; const caret = caretOffset(el);
  pushHist(); const loc = findRow(song, id); applyLine(song, loc.row, text.slice(0, caret));
  const blocks = parseBlocks(t);
  let { sec, i } = findRow(song, id); let at = i + 1;
  blocks.forEach((b, k) => {
    if (k === 0 && !b.name) { sec.rows.splice(at, 0, ...b.rows); at += b.rows.length; }
    else { const ns = Sec(b.name || '', b.rows, { rep: b.rep, ts: b.ts }); ns.auto = !b.name; song.secs.splice(song.secs.indexOf(sec) + 1, 0, ns); sec = ns; at = ns.rows.length; }
    b.rows.forEach(r => mark(r.id));
  });
  const rest = text.slice(caret).trim(); if (rest) sec.rows.splice(at, 0, L(rest));
  const l = findRow(song, id); if (l && isEmptyRow(l.row) && rowsOf(song).length > 1) l.sec.rows.splice(l.i, 1);
  song.secs = song.secs.filter(s => s.rows.length);
  nameParts(song); autoKey(song); S.editing = null; render();
});
function parseBlocks(text) {
  return text.replace(/\r/g, '').split(/\n\s*\n/).map(b => b.split('\n').filter(l => l.trim())).filter(b => b.length).map(b => {
    let name = null, rep = 1, ts = null, lines = b; const first = b[0].trim();
    const m = first.match(/^\[(.+)\]$/) || (b.length > 1 && /^(intro|estrofa|estribillo|puente|final|coro|verse|chorus|bridge|outro)\b/i.test(first) && first.length < 30 && [first, first]);
    if (m) { const tt = m[1]; rep = +((tt.match(/x(\d+)/i) || [])[1] || 1); ts = (tt.match(/(\d+\/\d+)/) || [])[1] || null; name = tt.replace(/x\d+/i, '').replace(/\d+\/\d+/, '').replace(/:$/, '').trim(); lines = b.slice(1); }
    const rows = [];
    for (let k = 0; k < lines.length; k++) {
      const l = lines[k];
      if (l.includes('|')) { rows.push(B(l)); continue; }
      if (isChordLine(l)) { const nx = lines[k + 1]; if (nx && !nx.includes('|') && !isChordLine(nx)) { rows.push(chordOver(l, nx)); k++; } else rows.push(B(l)); continue; }
      rows.push(L(l.trim().replace(/\s+/g, ' ')));
    }
    return { name, rep, ts, rows };
  });
}
document.addEventListener('submit', (e) => {
  e.preventDefault(); const f = e.target;
  if (f.id === 'signin') { S.mail = document.getElementById('mail').value.trim(); const pw = document.getElementById('pass')?.value ?? ''; const m = S.authMode ?? 'in';
    S.sending = true; S.signErr = ''; render();
    (m === 'link' ? boot.signIn(S.mail) : m === 'up' ? boot.signUp(S.mail, pw) : boot.signInPassword(S.mail, pw)).then((r) => {
      S.sending = false; if (r.error) S.signErr = authErr(r.error); else if (r.sent) S.sent = r.sent; render(); }); return; }
  if (f.id === 'passform') { const v = document.getElementById('newpass').value; if (v.length < 6) return; f.querySelector('[type=submit]').disabled = true;
    boot.setPassword(v).then((err) => { if (err) { toast(authErr(err)); return; } S.modal = null; toast('Listo. Ya podés entrar con tu mail y esta contraseña.'); }); return; }
  if (f.id === 'pubform') { const p = proj(); p.version++; p.note = document.getElementById('pubnote').value.trim(); snapshot(p); p.songs.forEach(s => s.changed = new Set()); p.orderDirty = false; S.modal = null; S.newsOpen = true; toast('Publicado'); return; }
  if (f.dataset.mename !== undefined) { setName(document.getElementById('myname').value); render(); return; }
  if (f.id === 'nameform') { const v = document.getElementById('firstname').value.trim(); if (!v) return; setName(v); S.modal = null; render(); return; }
  if (f.dataset.rform !== undefined) { const v = document.getElementById('rnote').value.trim(); const s = cur(); if (v) { pushHist(); ((s.replies ??= {})[S.replyAt] ??= []).push({ who: ME, text: v }); mark(S.replyAt); } S.replyAt = null; render(); return; }
  if (f.dataset.otro !== undefined) { const v = document.getElementById('otro').value.trim(); if (!splitChord(v)) { toast('No reconozco ese acorde'); return; } if (!S.custom.includes(v)) S.custom.push(v); setChord(v); render(); return; }
  if (f.dataset.cform !== undefined) { const v = document.getElementById('cnote').value.trim(); const s = cur(); const at = S.composer.at; if ((s.notes[at] ?? '') !== v) { pushHist(); if (v) { s.notes[at] = v; (s.noteBy ??= {})[at] = ME; } else delete s.notes[at]; mark(at); } S.composer = null; render(); return; }
  if (f.dataset.newtag !== undefined) { const v = document.getElementById('tagq').value; const vis = [...f.closest('.pop').querySelectorAll('.trow:not([hidden]) .tn')];
    if (vis.length === 1 && !vis[0].closest('.tagpop').querySelector('[data-mknew]:not([hidden])')) { paint(vis[0].dataset.paint); render(); } else makeTag(v); return; }
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.id === 'cvis') { S.cvis = el.checked ? 'alumnos' : 'solo'; return; }
  if (el.id === 'myname') { setName(el.value); render(); return; }
  if (el.id === 'remdef') { S.remindDef = el.value; return; }
  if (el.id === 'remmail') { S.remMail = el.checked; return; }
  if (el.id === 'wkstart') { S.weekStart = +el.value; render(); return; }
  if (el.id === 'stulink') { if (el.checked) handle(null, e, { share: '' }); else { proj().shared = false; render(); } return; }
  const F = S.ev && findEv(S.ev);
  if (F && (el.id === 'evdate' || el.id === 'evtime')) { if (el.value) F.e[el.id === 'evdate' ? 'date' : 'time'] = el.value; if (el.id === 'evdate' && el.value) S.calMonth = el.value.slice(0, 7); render(); return; }
  if (F && el.id === 'evrep') { const ev = F.e, v = el.value; // the copies after this one are rebuilt; earlier ones stay as they were
    if (ev.series) for (let k = EVENTS.length - 1; k >= 0; k--) { const x = EVENTS[k]; if (x !== ev && x.series === ev.series && x.date > ev.date) EVENTS.splice(k, 1); }
    ev.repeat = v; ev.series = v ? uid('w') : null;
    if (v) { for (let k = 1; k <= 7; k++) EVENTS.push({ ...structuredClone(ev), id: uid('e'), date: v === 'mes' ? addMonths(ev.date, k) : addDays(ev.date, (v === '2semanas' ? 14 : 7) * k) }); toast(`${REPEAT.find(x => x[0] === v)[1]}: 7 más en el calendario`); }
    else toast('Ya no se repite');
    return; }
  if (F && el.id === 'evproj') { const to = proj(el.value); F.e.pid = to ? to.id : ''; if (to) F.e.songs = F.e.songs.filter(id => songById(to, id)); F.e.who = []; render(); return; }
  if (F && el.id === 'evremind') { F.e.remind = el.value; render(); return; }
  if (F && el.id === 'evtell') { F.e.tell = el.checked; return; }
  if (F && el.id === 'evnoteall') { F.e.noteAll = el.checked; render(); return; }
  if (F && el.dataset.evsong) { const sid = el.dataset.evsong; F.e.songs = el.checked ? [...F.e.songs, sid] : F.e.songs.filter(x => x !== sid); render(); return; }
  if (el.id === 'upl' && el.files[0] && !el.files[0].type.startsWith('audio/')) { // a photo of a chart, a PDF: kept as a file on the line
    const file = el.files[0]; const song = cur(); const at = S.composer.at; pushHist();
    song.clips.push({ id: uid('c'), at, who: ME, file: true, img: file.type.startsWith('image/'), ext: (file.name.split('.').pop() || 'archivo').slice(0, 4).toUpperCase(), vis: proj().shared && S.cvis === 'alumnos' ? 'alumnos' : 'solo', label: file.name, url: URL.createObjectURL(file) });
    mark(at); S.composer = null; render(); return;
  }
  if (el.id === 'upl' && el.files[0]) {
    const file = el.files[0]; const url = URL.createObjectURL(file); const a = new Audio(url); const song = cur(); const at = S.composer.at;
    a.onloadedmetadata = () => { pushHist(); song.clips.push({ id: uid('c'), at, who: ME, kind: '', vis: proj().shared && S.cvis === 'alumnos' ? 'alumnos' : 'solo', label: file.name.replace(/\.[^.]+$/, ''), url, dur: a.duration || 1, rate: 1, loop: false }); mark(at); S.composer = null; render(); };
    a.onerror = () => toast('No pude leer ese audio');
  }
});

/* theme + look */
function setTheme(th) {
  if (th === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = th;
  try { localStorage.setItem('noti-theme', th); } catch {}
  document.querySelectorAll('[data-th]').forEach(b => b.setAttribute('aria-pressed', b.dataset.th === th));
}
function setLook(lk) {
  document.documentElement.dataset.look = lk;
  try { localStorage.setItem('noti-look', lk); } catch {}
  document.querySelectorAll('[data-look]').forEach(b => b !== document.documentElement && b.setAttribute('aria-pressed', b.dataset.look === lk));
  if (S.sel.length || S.pop) render();
}
let th = 'system', lk = 'cinta'; try { th = localStorage.getItem('noti-theme') || 'system'; lk = localStorage.getItem('noti-look') || 'cinta'; } catch {}
/* ---------------- saving ---------------- */
// After a change the studio writes what changed: each project's settings and dates as one document, each song
// as its own, and your profile. A version number per document catches two people saving the same thing at once.
const enc = (x) => JSON.stringify(x, (k, v) => v instanceof Set ? { $set: [...v] } : v);
const dec = (x) => x == null ? x : JSON.parse(JSON.stringify(x), (k, v) => v && typeof v === 'object' && Array.isArray(v.$set) ? new Set(v.$set) : v);
const PKEYS = ['name', 'desc', 'when', 'owner', 'pc', 'pf', 'people', 'shared', 'tags', 'cast', 'colors', 'version', 'note', 'orderDirty', 'link', 'invite'];
function projDoc(p) { const d = {}; for (const k of PKEYS) if (p[k] !== undefined) d[k] = p[k]; d.order = p.songs.map(x => x.id); d.events = EVENTS.filter(e => e.pid === p.id); return d; }
const profDoc = () => [S.myName, { avatar: S.avatar, weekStart: S.weekStart, events: EVENTS.filter(e => !e.pid), recentS: S.recentS }];
const saved = new Map(); // what the database has: key -> { json, v, conflict }
let saveTimer = 0, saving = null, retryTimer = 0;
function current() {
  const out = new Map();
  for (const p of PROJECTS) {
    out.set('p:' + p.id, { json: enc([projDoc(p), p.published ?? null]), send: (v, j, del) => boot.store.project(p.id, ...JSON.parse(j), v, del) });
    for (const x of p.songs) out.set(`s:${p.id}:${x.id}`, { json: enc(x), send: (v, j, del) => boot.store.song(p.id, x.id, JSON.parse(j), v, del) });
  }
  out.set('me', { json: enc(profDoc()), send: (v, j) => boot.store.profile(...JSON.parse(j)) });
  return out;
}
function remember() { for (const [k, x] of current()) saved.set(k, { ...saved.get(k), json: x.json }); }
function queueSave() { if (!boot.store) return; clearTimeout(saveTimer); saveTimer = setTimeout(flush, 700); }
function flush() {
  clearTimeout(saveTimer);
  if (!boot.store) return Promise.resolve();
  if (saving) return saving.then(() => flush());
  saving = writeChanges().finally(() => { saving = null; });
  return saving;
}
async function writeChanges() {
  const now = current(), jobs = [];
  for (const [k, x] of now) { const m = saved.get(k); if (!m?.conflict && m?.json !== x.json) jobs.push({ k, json: x.json, send: x.send, v: m?.v ?? 0, del: false }); }
  for (const [k, m] of saved) { // gone from the studio: deleted (a song whose project went with it stays as it was)
    if (now.has(k) || m.json === 'gone' || m.conflict || k === 'me') continue;
    const [kind, pid, sid] = k.split(':'); if (kind === 's' && !PROJECTS.some(p => p.id === pid)) continue;
    const json = m.json;
    jobs.push({ k, json: 'gone', v: m.v ?? 0, del: true, send: kind === 'p' ? (v, j, del) => boot.store.project(pid, ...JSON.parse(json), v, del) : (v, j, del) => boot.store.song(pid, sid, JSON.parse(json), v, del) });
  }
  if (!jobs.length) return;
  let failed = 0;
  await Promise.all(jobs.map(async (j) => {
    try {
      const v = await j.send(j.v, j.json, j.del);
      if (v == null) { saved.set(j.k, { ...saved.get(j.k), conflict: true }); S.conflict = true; }
      else saved.set(j.k, { json: j.json, v });
    } catch (err) { failed++; console.warn('Noti: no se pudo guardar', j.k, err); }
  }));
  const was = S.offline; S.offline = failed > 0;
  if (S.offline) { clearTimeout(retryTimer); retryTimer = setTimeout(flush, 5000); }
  if (S.offline !== was || S.conflict) render();
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
window.addEventListener('beforeunload', (e) => { if (!boot.store) return; const now = current(); for (const [k, x] of now) if (!saved.get(k)?.conflict && saved.get(k)?.json !== x.json) { flush(); e.preventDefault(); return; } });
function setName(v) {
  v = v.trim(); if (!v || v === S.myName) return;
  for (const p of PROJECTS) { p.editors?.forEach(x => { if (x[0] === S.myName) x[0] = v; }); if (p.owner === S.myName && !p.shared) p.owner = v; }
  S.myName = v; ME = v;
}

/* ---------------- start ---------------- */
function load(data) {
  const songsOf = (pid) => data.songs.filter(x => x.project_id === pid);
  for (const row of data.projects) {
    const doc = dec(row.doc) ?? {}, order = doc.order ?? [];
    const list = songsOf(row.id).map(x => ({ doc: dec(x.doc), v: x.version })).sort((a, b) => (order.indexOf(a.doc.id) + 1 || 1e6) - (order.indexOf(b.doc.id) + 1 || 1e6));
    const members = data.members.filter(m => m.project_id === row.id && m.name !== doc.owner);
    const p = { ...doc, id: row.id, songs: list.map(x => x.doc), published: dec(row.published) ?? { version: 0, note: '', changed: new Set(), songs: [] },
      editors: [[doc.owner || 'Sin nombre', 'organiza'], ...members.map(m => [m.name || 'Sin nombre', m.role])], tags: doc.tags ?? [] };
    for (const x of p.songs) { x.changed ??= new Set(); nameParts(x); } // unnamed parts get their faint suggested names
    delete p.order; delete p.events;
    EVENTS.push(...(doc.events ?? []));
    PROJECTS.push(p);
    saved.set('p:' + p.id, { v: row.version }); list.forEach(x => saved.set(`s:${p.id}:${x.doc.id}`, { v: x.v }));
  }
  const prof = dec(data.profile?.doc) ?? {};
  EVENTS.push(...(prof.events ?? []));
  if (prof.avatar) S.avatar = prof.avatar;
  if (prof.weekStart != null) S.weekStart = prof.weekStart;
  S.recentS = prof.recentS ?? [];
  saved.set('me', { v: 1 });
  remember();
}
if (boot.mode === 'studio') {
  load(boot.data);
  if (!boot.me?.name) S.modal = 'name';
  const want = PROJECTS.find(p => p.id === boot.open);
  S.pid = (want ?? PROJECTS[0])?.id ?? null; if (S.pid) S.open.add(S.pid);
  if (want) S.screen = 'project';
}
if (boot.mode === 'demo') { // the examples the first time; after that, what was saved in this browser
  if (boot.data?.projects?.length) load(boot.data);
  else { const d = demoData(); PROJECTS.push(...d.projects); EVENTS.push(...d.events); }
  S.pid = PROJECTS[0]?.id ?? null; if (S.pid) S.open.add(S.pid);
}
if (boot.mode === 'student') {
  const x = boot.data;
  PROJECTS.push({ id: x.id, name: x.name, pc: x.pc, people: !!x.people, cast: x.cast, colors: x.colors ?? { todxs: 'y' }, shared: true, songs: [], tags: [], editors: [], published: dec(x.published) });
  EVENTS.push(...(x.events ?? []).map(e => ({ ...e, pid: x.id })));
  S.sPid = x.id; S.pid = x.id;
  try { S.me = localStorage.getItem('noti-me-' + x.id) || null; } catch {}
  if (S.me && !crew(PROJECTS[0]).people.includes(S.me)) S.me = null;
}
setTheme(th); setLook('cinta'); S.collapsed = !!sideMem()[S.dev];
render();
return { flush };
}
