// Noti hero logo: the "Typed" intro, then a live eye with the Bar eyebrow.
// Final motion as approved by Fede on 2026-10-28 (board study 13 + round 4).
//
// Usage:
//   import { mountNotiHero } from './noti-hero.js';
//   const hero = mountNotiHero(document.querySelector('#hero-logo'), { intro: true });
//   hero.replay();   // play the intro again
//   hero.destroy();  // stop and remove listeners (call on unmount)
//
// The SVG is sized by its container (width: 100%; aspect ratio about 2:1) and coloured with
// CSS `color`. Clicks on buttons, inputs, labels, links and anything with [data-noti-ignore]
// are ignored, so the sign-in form keeps working normally.

const NS = 'http://www.w3.org/2000/svg';
const PARTS = {
  'n-stem-left': 'M153 150H249V450H153Z',
  'n-diagonal': 'M191 150H253L362.5 450H349L191 150Z',
  'n-stem-right': 'M353 150H449V450H353Z',
  't-stem': 'M775 174H871V450H775Z',
  't-crossbar': 'M919 230V244L733 262V230H919Z',
  'i-stem': 'M947 230H1043V450H947Z',
  'i-dot': 'M1048 161.5C1048 184.972 1028.27 202 995 202C961.729 202 942 184.972 942 161.5C942 138.028 961.729 121 995 121C1028.27 121 1048 138.028 1048 161.5Z'
};
const O_OUTER = 'M608 226C689.036 226 733 277.04 733 340C733 402.96 689.036 454 608 454C526.964 454 483 402.96 483 340C483 277.04 526.964 226 608 226Z';
const O_COUNTER = 'M608 243C590.193 243 583 286.428 583 340C583 393.572 590.193 437 608 437C625.807 437 633 393.572 633 340C633 286.428 625.807 243 608 243Z';
const BROW = 'M528 178H690V192L528 208Z'; // the t crossbar's taper, 20 units above the o
const VIEWBOX = '113 -4 975 478';           // room for the dot hop and the raised brow

const clamp = (x) => Math.max(0, Math.min(1, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const expoOut = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const sineInOut = (x) => -(Math.cos(Math.PI * x) - 1) / 2;
const hold = (w, a, h, r) => (w < 0 ? 0 : w < a ? expoOut(w / a) : w < a + h ? 1 : 1 - sineInOut(clamp((w - a - h) / r)));
const blinkCurve = (w) => (w < 0 ? 0 : w < 80 ? sineInOut(w / 80) : w < 130 ? 1 : w < 340 ? 1 - expoOut((w - 130) / 210) : 0);
const rand = (a, b) => a + Math.random() * (b - a);
let uidCount = 0;

function el(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}
const op = (n, v) => n.setAttribute('opacity', v);
const tf = (n, s) => n.setAttribute('transform', s);

// Intro timeline (ms)
const DUR = 3400, DOT_START = 2250, DOT_FALL = 440, LAND = DOT_START + DOT_FALL, WINK = LAND + 60;

export function mountNotiHero(container, { intro = true, interactive = true, label = 'Noti' } = {}) {
  const uid = 'noti' + ++uidCount;
  const svg = el('svg', { viewBox: VIEWBOX, fill: 'currentColor', role: 'img', 'aria-label': label, style: 'display:block;width:100%;height:auto;overflow:hidden' });
  container.appendChild(svg);
  const defs = el('defs', {}, svg);
  const mask = el('mask', { id: uid + '-eye' }, defs);
  el('rect', { x: 460, y: 200, width: 300, height: 280, fill: '#fff' }, mask);
  const counter = el('path', { d: O_COUNTER, fill: '#000' }, mask);
  const p = {};
  for (const id of ['n-stem-left', 'n-diagonal', 'n-stem-right']) p[id] = el('path', { d: PARTS[id] }, svg);
  p.o = el('g', {}, svg);
  const oPath = el('path', { d: O_OUTER, mask: `url(#${uid}-eye)` }, p.o);
  for (const id of ['t-stem', 't-crossbar', 'i-stem']) p[id] = el('path', { d: PARTS[id] }, svg);
  const caret = el('rect', { x: 153, y: 230, width: 96, height: 220 }, svg);
  const dot = el('path', { d: PARTS['i-dot'] }, svg);
  const brow = el('path', { d: BROW }, svg);

  // ---- intro ("Typed"): a block caret types N, o, t, becomes the i stem; the dot falls; the o glances up and winks
  const glanceAt = (t) => sineInOut(seg(t, WINK - 460, WINK - 220)) * (1 - sineInOut(seg(t, WINK + 520, WINK + 820)));
  function setDot(y, s) { tf(dot, `translate(0 ${y}) translate(995 202) scale(${1 + 0.17 * s} ${1 - 0.22 * s}) translate(-995 -202)`); }
  function setBrow(lx, ly, lift, tilt) { tf(brow, `translate(${22 * lx} ${lift - 6 * ly}) rotate(${-5 * lx + tilt} 608 196)`); }
  function renderIntro(t) {
    const at = (id, ms) => op(p[id], t >= ms ? 1 : 0);
    at('n-stem-left', 900); at('n-diagonal', 950); at('n-stem-right', 1000); at('o', 1320); at('t-stem', 1580); at('t-crossbar', 1630);
    op(p['i-stem'], 0);
    caret.setAttribute('x', t >= 1650 ? 947 : t >= 1340 ? 775 : t >= 1020 ? 483 : 153);
    let vis = 1;
    if (t < 900) vis = Math.floor(t / 220) % 2 === 0 ? 1 : 0;
    else if (t >= 1750 && t < 2250) vis = Math.floor((t - 1750) / 250) % 2 === 0 ? 0 : 1;
    op(caret, vis);
    // dot: gravity fall, squash on contact, one small rebound
    const q = seg(t, DOT_START, LAND), b = seg(t, LAND + 70, LAND + 330);
    setDot(-460 * (1 - q * q) - 18 * Math.sin(Math.PI * b) * (1 - b * 0.4), Math.sin(Math.PI * seg(t, LAND, LAND + 130)));
    // eye: glance up at the falling dot, then the wink
    const g = glanceAt(t), w = t - WINK;
    const c = w < 0 ? 0 : w < 90 ? sineInOut(w / 90) : w < 160 ? 1 : w < 420 ? 1 - expoOut((w - 160) / 260) : 0;
    tf(counter, `translate(${15 * g} ${-9 * g}) translate(608 340) scale(${1 + 0.1 * c} ${1 - 0.94 * c}) translate(-608 -340)`);
    tf(oPath, `translate(608 454) scale(${1 + 0.0175 * c} ${1 - 0.028 * c}) translate(-608 -454)`);
    const land = expoOut(seg(t, LAND - 130, LAND + 10)) * (1 - sineInOut(seg(t, 3000, 3400)));
    setBrow(g * 15 / 52, -g, -16 * land, 0);
    op(brow, t >= 1320 ? 1 : 0);
  }

  // ---- live: the eye follows the pointer, blinks, squints, raises the brow, reacts to clicks
  const look = { x: 0, y: 0 };
  let pointer = null, lastMove = -1e9, wander = { x: 0, y: 0, at: 0 }, raf = 0, prev = 0, idleStart = 0;
  const T = { b1: -1e9, b2: -1e9, nextBlink: 0, raise: -1e9, nextRaise: 0, squint: -1e9, squintLen: 800, nextSquint: 0, flinch: -1e9, hop: -1e9, roll: -1e9, focus: null, focusUntil: 0 };
  const clicks = [];
  const toSvg = (sx, sy) => { const pt = svg.createSVGPoint(); pt.x = sx; pt.y = sy; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
  const dirFromScreen = (sx, sy) => {
    const r = svg.getBoundingClientRect(), k = r.width / 975;
    const dx = sx - (r.left + (608 - 113) * k), dy = sy - (r.top + (340 + 4) * k), d = Math.hypot(dx, dy) || 1, reach = Math.min(1, d / 320);
    return [(dx / d) * reach, (dy / d) * reach];
  };
  const dotY = (now) => { const h = seg(now - T.hop, 60, 620); return -112 * 4 * h * (1 - h); };

  function live(now) {
    const dt = Math.min(64, now - prev); prev = now;
    let tx, ty, rate = 110;
    const roll = now - T.roll;
    if (roll >= 0 && roll < 1000) { const a = -Math.PI / 2 + 2 * Math.PI * sineInOut(roll / 1000); tx = 0.95 * Math.cos(a); ty = 0.95 * Math.sin(a); rate = 25; }
    else if (now - T.hop < 800) { const dx = 387, dy = -178 + dotY(now), d = Math.hypot(dx, dy); tx = dx / d; ty = dy / d; rate = 35; }
    else if (T.focus && now < T.focusUntil) { [tx, ty] = T.focus; rate = 45; }
    else if (pointer && now - lastMove < 5000) { [tx, ty] = dirFromScreen(pointer[0], pointer[1]); }
    else {
      if (now > wander.at) { wander = Math.random() < 0.35 ? { x: 0, y: 0 } : { x: rand(-0.8, 0.8), y: rand(-0.6, 0.6) }; wander.at = now + rand(1400, 3200); }
      tx = wander.x; ty = wander.y; rate = 220;
    }
    const k = 1 - Math.exp(-dt / rate);
    look.x += (tx - look.x) * k; look.y += (ty - look.y) * k;

    const busy = now - T.flinch < 900 || now - T.squint < T.squintLen + 600;
    if (now > T.nextBlink) { if (!busy) { T.b1 = now; if (Math.random() < 0.22) T.b2 = now + 300; } T.nextBlink = now + rand(2200, 5600); }
    if (now > T.nextSquint) { if (!busy && T.nextSquint) { T.squint = now; T.squintLen = rand(600, 1100); } T.nextSquint = now + rand(7000, 12000); }
    if (now > T.nextRaise) { if (!busy && T.nextRaise) T.raise = now; T.nextRaise = now + rand(8000, 13000); }

    const cb = Math.max(blinkCurve(now - T.b1), blinkCurve(now - T.b2));
    const q = hold(now - T.squint, 220, T.squintLen, 320);
    const f = hold(now - T.flinch, 70, 330, 260);
    const rs = hold(now - T.raise, 160, 700, 400);
    const h = sineInOut(seg(now, idleStart, idleStart + 500));
    const strain = sineInOut(seg(Math.abs(look.y), 0.35, 1)) * h; // straining to look far up or down shrinks the eye a little
    const shrink = 1 - 0.18 * strain;
    const sx = (1 - 0.14 * Math.abs(look.x) * h) * (1 + 0.1 * cb + 0.08 * f) * shrink;
    const sy = Math.max(0.04, (1 - 0.94 * cb) * (1 - 0.6 * q) * (1 - 0.94 * f) * shrink);
    tf(counter, `translate(${52 * look.x} ${(look.y > 0 ? 6 + 12 * strain : 9 + 13 * strain) * look.y}) translate(608 340) scale(${sx} ${sy}) translate(-608 -340)`);
    tf(oPath, `translate(608 454) scale(${1 + 0.02 * cb + 0.03 * q + 0.06 * f} ${1 - 0.03 * cb - 0.04 * q - 0.1 * f}) translate(-608 -454)`);
    setBrow(look.x, look.y, -16 * rs + 6 * cb + 10 * q + 14 * f, -4 * rs + 6 * q + 7 * f);
    const hop = now - T.hop;
    if (hop >= 0 && hop < 900) setDot(dotY(now), Math.sin(Math.PI * seg(hop, 620, 760)) - 0.4 * Math.sin(Math.PI * seg(hop, 0, 90)));
    raf = requestAnimationFrame(live);
  }
  function startLive(now) {
    const g = glanceAt(DUR);
    look.x = g * 15 / 52; look.y = -g;
    idleStart = prev = now;
    T.nextBlink = now + rand(1200, 2400); T.nextSquint = now + rand(4000, 6000); T.nextRaise = now + rand(7000, 9000);
    raf = requestAnimationFrame(live);
  }
  function replay() {
    cancelAnimationFrame(raf);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!intro || reduce) { renderIntro(DUR); if (!reduce) startLive(performance.now()); return; }
    const start = performance.now();
    const step = (now) => {
      const t = now - start;
      if (t < DUR) { renderIntro(t); raf = requestAnimationFrame(step); }
      else { renderIntro(DUR); startLive(now); }
    };
    renderIntro(0);
    raf = requestAnimationFrame(step);
  }

  const onMove = (ev) => { pointer = [ev.clientX, ev.clientY]; lastMove = performance.now(); };
  const onClick = (ev) => {
    if (ev.target.closest && ev.target.closest('button, input, select, textarea, label, a, [data-noti-ignore]')) return;
    const now = performance.now();
    clicks.push(now); while (clicks.length && now - clicks[0] > 900) clicks.shift();
    if (clicks.length >= 3) { T.roll = now; T.b1 = now + 1050; T.b2 = now + 1350; clicks.length = 0; return; } // three fast clicks: eye roll
    const pt = toSvg(ev.clientX, ev.clientY);
    if (pt.x > 930 && pt.x < 1060 && pt.y > 100 && pt.y < 225) { T.hop = now; return; }   // the dot hops, the eye follows it
    if (pt.x > 483 && pt.x < 733 && pt.y > 220 && pt.y < 460) { T.flinch = now; return; } // poke the o: it flinches
    T.focus = dirFromScreen(ev.clientX, ev.clientY); T.focusUntil = now + 1100;           // anywhere else: look there, brow up
    T.raise = now; T.b1 = now + 140;
  };
  if (interactive) {
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('click', onClick);
  }
  replay();

  return {
    svg,
    replay,
    destroy() {
      cancelAnimationFrame(raf);
      removeEventListener('pointermove', onMove);
      removeEventListener('click', onClick);
      svg.remove();
    }
  };
}
