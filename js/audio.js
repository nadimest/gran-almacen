/* Motor de audio: secuenciador Web Audio con temas por género + efectos */

let AC = null, musicOn = true, seqStep = 0, seqNext = 0;
let musicTheme = "cumbia";
let powerOn = true; /* apagón: la radio del almacén enmudece */

function note(f, t, dur, type, g, slideTo) {
  if (!AC || !musicOn) return;
  const o = AC.createOscillator(), gn = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gn.gain.setValueAtTime(g, t); gn.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(gn).connect(AC.destination); o.start(t); o.stop(t + dur + 0.02);
}
function guiro(t, dur, g, freq) {
  if (!AC || !musicOn) return;
  const len = Math.max(1, Math.floor(AC.sampleRate * dur));
  const buf = AC.createBuffer(1, len, AC.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = AC.createBufferSource(); src.buffer = buf;
  const bp = AC.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = freq || 3800; bp.Q.value = 2;
  const gn = AC.createGain(); gn.gain.value = g;
  src.connect(bp).connect(gn).connect(AC.destination); src.start(t);
}
function bombo(t, g) { /* legüero: golpe grave con caída */
  note(72, t, 0.30, "sine", g, 50);
  guiro(t, 0.03, g * 0.5, 900);
}

/* Cada tema define: stepDur, total de pasos y qué suena en cada paso */
const MUSIC = {
  cumbia: { stepDur: 60 / 98 / 4, total: 64,
    bars: [
      { b: [110, 164.81], c: [220, 261.63, 329.63] },
      { b: [110, 164.81], c: [220, 261.63, 329.63] },
      { b: [146.83, 220], c: [293.66, 349.23, 440] },
      { b: [164.81, 246.94], c: [329.63, 415.30, 493.88] },
    ],
    on(s, t) {
      const bar = this.bars[Math.floor(s / 16) % 4], q = s % 16, ST = this.stepDur;
      if (q === 0 || q === 4) note(bar.b[0], t, ST * 3.2, "triangle", 0.16);
      if (q === 8 || q === 12) note(bar.b[1], t, ST * 3.2, "triangle", 0.16);
      if (q === 14) note(bar.b[0], t, ST * 1.6, "triangle", 0.10);
      if (q === 2 || q === 6 || q === 10 || q === 14) bar.c.forEach(f => note(f, t, ST * 1.4, "square", 0.028));
      if (q === 0 || q === 8) guiro(t, 0.16, 0.10);
      if (q === 4 || q === 6 || q === 12) guiro(t, 0.05, 0.08);
    } },
  cuarteto: { stepDur: 60 / 124 / 4, total: 64, /* tunga-tunga cordobés */
    bars: [
      { b: [130.81, 196.00], c: [261.63, 329.63, 392.00] },   /* C */
      { b: [174.61, 261.63], c: [349.23, 440.00, 523.25] },   /* F */
      { b: [196.00, 293.66], c: [392.00, 493.88, 587.33] },   /* G */
      { b: [130.81, 196.00], c: [261.63, 329.63, 392.00] },   /* C */
    ],
    on(s, t) {
      const bar = this.bars[Math.floor(s / 16) % 4], q = s % 16, ST = this.stepDur;
      if (q === 0 || q === 8) note(bar.b[0], t, ST * 2.6, "triangle", 0.17);   /* tun */
      if (q === 4 || q === 12) note(bar.b[1], t, ST * 2.6, "triangle", 0.17);  /* ga */
      if (q === 2 || q === 6 || q === 10 || q === 14) bar.c.forEach(f => note(f, t, ST * 1.2, "square", 0.034)); /* piano */
      if (q % 2 === 0) guiro(t, 0.04, 0.07, 5200); /* shaker */
      if (q === 12) note(1046.5, t, ST * 1.2, "triangle", 0.05); /* campanita arriba */
    } },
  chacarera: { stepDur: 60 / 72 / 6, total: 48, /* 6/8: 12 pasos por compás */
    bars: [
      { b: 110.00, c: [220, 261.63, 329.63] },      /* Am */
      { b: 98.00,  c: [196, 246.94, 293.66] },      /* G */
      { b: 87.31,  c: [174.61, 220, 261.63] },      /* F */
      { b: 82.41,  c: [164.81, 207.65, 246.94] },   /* E */
    ],
    on(s, t) {
      const bar = this.bars[Math.floor(s / 12) % 4], q = s % 12, ST = this.stepDur;
      if (q === 0 || q === 6) bombo(t, 0.30);
      if (q === 3 || q === 9) guiro(t, 0.05, 0.10, 1400); /* aro del bombo */
      if (q === 2 || q === 4 || q === 8 || q === 10) bar.c.forEach(f => note(f, t, ST * 1.6, "sawtooth", 0.018)); /* rasguido */
      if (q === 6) note(bar.b * 4, t, ST * 2.4, "triangle", 0.06); /* bordoneo */
    } },
  navidad: { stepDur: 60 / 100 / 4, total: 64, /* cumbia con campanitas */
    bars: [
      { b: [110, 164.81], c: [220, 261.63, 329.63], bell: [1568, 1318] },
      { b: [110, 164.81], c: [220, 261.63, 329.63], bell: [1318, 1046.5] },
      { b: [146.83, 220], c: [293.66, 349.23, 440], bell: [1760, 1396.9] },
      { b: [164.81, 246.94], c: [329.63, 415.30, 493.88], bell: [1975.5, 1568] },
    ],
    on(s, t) {
      const bar = this.bars[Math.floor(s / 16) % 4], q = s % 16, ST = this.stepDur;
      if (q === 0 || q === 4) note(bar.b[0], t, ST * 3.2, "triangle", 0.15);
      if (q === 8 || q === 12) note(bar.b[1], t, ST * 3.2, "triangle", 0.15);
      if (q === 2 || q === 6 || q === 10 || q === 14) bar.c.forEach(f => note(f, t, ST * 1.4, "square", 0.026));
      if (q === 0 || q === 8) guiro(t, 0.16, 0.09);
      if (q === 4 || q === 12) guiro(t, 0.05, 0.07);
      if (q === 0) note(bar.bell[0], t, ST * 3, "sine", 0.055);
      if (q === 8) note(bar.bell[1], t, ST * 3, "sine", 0.055);
      if (q === 6) guiro(t, 0.10, 0.05, 8000); /* shimmer navideño */
    } },
  tormenta: { stepDur: 60 / 88 / 4, total: 64, /* milonga triste bajo la lluvia */
    bars: [
      { b: 110.00, c: [220, 261.63, 329.63] },      /* Am */
      { b: 146.83, c: [220, 293.66, 349.23] },      /* Dm */
      { b: 82.41,  c: [207.65, 246.94, 329.63] },   /* E7 */
      { b: 110.00, c: [220, 261.63, 329.63] },      /* Am */
    ],
    on(s, t) {
      const bar = this.bars[Math.floor(s / 16) % 4], q = s % 16, ST = this.stepDur;
      if (q === 0) note(bar.b, t, ST * 5, "triangle", 0.17);          /* bajo milonguero 3-3-2 */
      if (q === 6) note(bar.b * 1.5, t, ST * 5, "triangle", 0.13);
      if (q === 12) note(bar.b, t, ST * 3.5, "triangle", 0.15);
      if (q === 4 || q === 10) bar.c.forEach(f => note(f, t, ST * 2.2, "sawtooth", 0.013)); /* bandoneón lánguido */
      if (q % 2 === 0) guiro(t, 0.14, 0.03, 6800);                    /* llovizna constante */
      if (q === 14 && Math.floor(s / 16) % 2 === 1) note(bar.c[2] * 2, t, ST * 3, "sine", 0.045); /* silbido triste */
      if (s === 32) { note(48, t, 1.4, "sine", 0.14, 30); guiro(t, 0.6, 0.05, 150); } /* trueno lejano */
    } },
};

function seqTick() {
  if (!AC) return;
  if (!powerOn) { seqNext = AC.currentTime + 0.1; return; }
  const M = MUSIC[musicTheme];
  while (seqNext < AC.currentTime + 0.12) {
    M.on(seqStep, seqNext);
    seqStep = (seqStep + 1) % M.total;
    seqNext += M.stepDur;
  }
}

export function audioInit() {
  if (AC) return;
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  seqNext = AC.currentTime + 0.1; seqStep = 0;
  setInterval(seqTick, 25);
}
export function setMusicTheme(th) { if (MUSIC[th] && th !== musicTheme) { musicTheme = th; seqStep = 0; } }
export function setPower(on) { powerOn = on; }
export function getMusicTheme() { return musicTheme; }
export function toggleMusic() { musicOn = !musicOn; if (musicOn) audioInit(); return musicOn; }

/* ---------- SFX ---------- */
export const sfx = {
  bell()    { if (!AC) return; const t = AC.currentTime; note(1318, t, 0.18, "sine", 0.12); note(1760, t + 0.10, 0.30, "sine", 0.10); },
  kaching() { if (!AC) return; const t = AC.currentTime; note(987, t, 0.07, "square", 0.07); note(1567, t + 0.07, 0.25, "square", 0.07); guiro(t, 0.05, 0.12); },
  buzz()    { if (!AC) return; const t = AC.currentTime; note(140, t, 0.28, "sawtooth", 0.10, 110); },
  pickItem(){ if (!AC) return; const t = AC.currentTime; note(660, t, 0.06, "triangle", 0.08); },
  sliceTick(){ if (!AC) return; guiro(AC.currentTime, 0.04, 0.07); },
  tada()    { if (!AC) return; const t = AC.currentTime; [523, 659, 784, 1046].forEach((f, i) => note(f, t + i * 0.09, 0.22, "triangle", 0.09)); },
  kid()     { if (!AC) return; const t = AC.currentTime; note(880, t, 0.08, "square", 0.05); note(740, t + 0.09, 0.10, "square", 0.05); },
  trueno()  { if (!AC) return; const t = AC.currentTime; note(55, t, 1.0, "sine", 0.22, 32); guiro(t, 0.7, 0.10, 180); guiro(t + 0.25, 0.5, 0.06, 120); },
  persiana(){ if (!AC) return; const t = AC.currentTime; for (let i = 0; i < 8; i++) guiro(t + 0.3 + i * 0.09, 0.06, 0.09 - i * 0.007, 650 + i * 170); },
};
