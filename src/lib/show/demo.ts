import { newId } from '../sheet/ids';
import { lyricsFromPaste } from '../sheet/paste';
import type { Group, Person, Show } from './types';

// A made-up show with made-up songs, so the editor can be tried (and shown in a portfolio)
// without real lyrics or real students.

const NAMES = ['Abril', 'Bruno', 'Camila', 'Dante', 'Elena', 'Facundo', 'Guada', 'Iván', 'Juli', 'Lara', 'Mateo', 'Nina'];

const SONGS: { title: string; artist: string; lyrics: string }[] = [
  {
    title: 'Faroles de papel',
    artist: 'Demo',
    lyrics: `[Estrofa 1]
Se apagan las luces del barrio
y alguien canta desde un balcón
la calle se llena de pasos
que siguen el mismo compás

[Estribillo]
Faroles de papel, faroles de papel
que vuelan cuando nadie los ve
faroles de papel (que vuelan otra vez)
nos llevan a donde no sé

[Estrofa 2]
Mi abuela guardaba canciones
adentro de un frasco de miel
las abro de noche, despacio
y suenan igual que ayer

[Estribillo]
Faroles de papel, faroles de papel
que vuelan cuando nadie los ve
faroles de papel (que vuelan otra vez)
nos llevan a donde no sé`,
  },
  {
    title: 'Paper Lanterns Over Main Street',
    artist: 'Demo',
    lyrics: `[Verse]
Every window on Main Street is open tonight
somebody's humming a song that we know
hold on, hold on, hold on to the light
the night is long and the river is slow

[Chorus]
Sing it loud, sing it low
let the whole town know
sing it loud (sing it loud), sing it low (sing it low)
all the way home`,
  },
];

export function demoShow(): Show {
  const people: Person[] = NAMES.map((name) => ({ id: newId(), name }));
  const byName = (n: string) => people.find((p) => p.name === n)!.id;
  const groups: Group[] = [
    { id: newId(), kind: 'everyone', label: 'Todxs', members: people.map((p) => p.id) },
    { id: newId(), kind: 'mic', label: 'Mic 1', members: ['Abril', 'Bruno', 'Camila'].map(byName) },
    { id: newId(), kind: 'mic', label: 'Mic 2', members: ['Dante', 'Elena', 'Facundo'].map(byName) },
    { id: newId(), kind: 'mic', label: 'Mic 3', members: ['Guada', 'Iván', 'Juli'].map(byName) },
    { id: newId(), kind: 'mic', label: 'Mic 4', members: ['Lara', 'Mateo', 'Nina'].map(byName) },
    { id: newId(), kind: 'part', label: 'Voces graves', members: ['Bruno', 'Dante', 'Iván', 'Mateo'].map(byName) },
  ];
  return {
    id: newId(),
    title: 'Muestra de prueba',
    date: '2026-12-12',
    people,
    groups,
    songs: SONGS.map((s) => ({ id: newId(), title: s.title, artist: s.artist, lyrics: lyricsFromPaste(s.lyrics) })),
  };
}
