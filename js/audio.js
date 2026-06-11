/* Motor de audio: secuenciador Web Audio con temas por género + efectos.
   Sin assets: cada instrumento es una receta de síntesis (tone/acordeon/cencerro/timbal…)
   y la reverb es un impulso de ruido generado al vuelo (mkImpulse). */

let AC = null, musicOn = true, seqStep = 0, seqNext = 0;
let musicTheme = "cumbia";
let powerOn = true; /* apagón: la radio del almacén enmudece */
let dryBus = null, verbBus = null;

/* ---------- LUTHERÍA (instrumentos sintetizados) ---------- */

/* Impulso de reverb: ruido estéreo con caída exponencial, generado al iniciar */
function mkImpulse(dur, decay) {
  const len = Math.floor(AC.sampleRate * dur), buf = AC.createBuffer(2, len, AC.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

/* Voz genérica: osciladores apilados/desafinados + ADSR + filtro con envolvente
   + vibrato opcional + envío a reverb. Acá muere el sonido a chip de los 80. */
function tone(o) {
  if (!AC || !musicOn) return;
  const t = o.t, dur = Math.max(o.dur, 0.02), dets = o.dets || [0];
  const a = o.a ?? 0.004, d = Math.min(o.d ?? dur * 0.5, dur), s = o.s ?? 0, r = o.r ?? 0.05;
  const peak = Math.max(o.g, 0.0012), sus = Math.max(peak * s, 0.001);
  const vca = AC.createGain();
  vca.gain.setValueAtTime(0.001, t);
  vca.gain.exponentialRampToValueAtTime(peak, t + a);
  vca.gain.exponentialRampToValueAtTime(sus, Math.min(t + a + d, t + dur));
  vca.gain.setValueAtTime(sus, t + dur);
  vca.gain.exponentialRampToValueAtTime(0.001, t + dur + r);
  let head = vca;
  if (o.lp) {
    const fl = AC.createBiquadFilter();
    fl.type = "lowpass"; fl.Q.value = o.q || 0.7;
    fl.frequency.setValueAtTime(o.lp, t);
    fl.frequency.exponentialRampToValueAtTime(o.lpEnd || o.lp, t + dur);
    fl.connect(vca); head = fl;
  }
  const pre = AC.createGain(); pre.gain.value = 1 / dets.length; pre.connect(head);
  let lfoG = null;
  if (o.vib) {
    const lfo = AC.createOscillator();
    lfo.frequency.value = o.vib.f;
    lfoG = AC.createGain();
    lfoG.gain.setValueAtTime(0, t);
    lfoG.gain.setValueAtTime(0, t + (o.vib.delay || 0));
    lfoG.gain.linearRampToValueAtTime(o.vib.amp, t + (o.vib.delay || 0) + 0.15);
    lfo.connect(lfoG);
    lfo.start(t); lfo.stop(t + dur + r + 0.05);
  }
  for (const det of dets) {
    const osc = AC.createOscillator();
    osc.type = o.type || "triangle";
    osc.frequency.setValueAtTime(o.f, t);
    if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t + dur);
    osc.detune.value = det;
    if (lfoG) lfoG.connect(osc.detune);
    osc.connect(pre);
    osc.start(t); osc.stop(t + dur + r + 0.06);
  }
  vca.connect(dryBus);
  if (o.rev) {
    const send = AC.createGain(); send.gain.value = o.rev;
    vca.connect(send); send.connect(verbBus);
  }
}

/* compat: la firma vieja de note() la usan los sfx */
function note(f, t, dur, type, g, slideTo) {
  tone({ f, t, dur, type, g, slideTo, a: 0.004, d: dur, s: 0, r: 0.04, rev: 0.12 });
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
  src.connect(bp).connect(gn).connect(dryBus); src.start(t);
}

function bombo(t, g) { /* legüero: golpe grave con caída y cuerpo */
  note(70, t, 0.32, "sine", g, 44);
  guiro(t, 0.03, g * 0.5, 900);
}

function bajo(f, t, dur, g) { /* bajo redondo: triángulo con pasabajos que se cierra */
  tone({ f, t, dur, g, type: "triangle", lp: 560, lpEnd: 340, a: 0.008, d: dur * 0.6, s: 0.35, r: 0.05, rev: 0.06 });
}

function acordeon(f, t, dur, g) { /* sierras desafinadas + vibrato tardío = fueye de barrio */
  tone({ f, t, dur, g, type: "sawtooth", dets: [-9, 0, 9], lp: 2100, lpEnd: 1250, q: 1.4,
         a: 0.025, d: dur * 0.4, s: 0.65, r: 0.09, vib: { f: 5.2, amp: 8, delay: 0.10 }, rev: 0.33 });
}

function pianito(f, t, g, dur) { /* stab cuartetero: ataque seco + parcial brillante + martillito */
  dur = dur || 0.16;
  tone({ f, t, dur, g, type: "triangle", dets: [0, 2], lp: 3200, lpEnd: 800, a: 0.002, d: dur * 0.9, s: 0, r: 0.04, rev: 0.18 });
  tone({ f: f * 2, t, dur: dur * 0.6, g: g * 0.35, type: "square", lp: 4200, lpEnd: 1300, a: 0.002, d: dur * 0.5, s: 0, r: 0.03, rev: 0.15 });
  guiro(t, 0.012, g * 0.5, 3000);
}

function cencerro(t, g) { /* cencerro 808: dos cuadradas detonadas por un pasabanda */
  if (!AC || !musicOn) return;
  for (const f of [540, 845]) {
    const osc = AC.createOscillator(); osc.type = "square"; osc.frequency.value = f;
    const bp = AC.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 700; bp.Q.value = 1.1;
    const gn = AC.createGain();
    gn.gain.setValueAtTime(g, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    osc.connect(bp).connect(gn).connect(dryBus);
    osc.start(t); osc.stop(t + 0.13);
  }
}

function timbal(t, g, f) { /* parche tenso: senoidal que cae + golpe de ruido */
  tone({ f, t, dur: 0.10, g, type: "sine", slideTo: f * 0.72, a: 0.002, d: 0.09, s: 0, r: 0.03, rev: 0.25 });
  guiro(t, 0.025, g * 0.8, 2200);
}

/* Agenda la línea melódica del compás: mel = [[paso, freq, duraciónEnPasos], …] */
function playMel(mel, q, t, ST, inst) {
  for (const m of mel) if (m[0] === q) inst(m[1], t, m[2] * ST);
}

/* ---------- TEMAS ----------
   Cada tema: stepDur, total de pasos y qué suena en cada paso.
   Loops de 8 compases en dos fases: la primera acompaña, la segunda canta.
   Cada frase de 4 compases cierra con un repique. */
const MUSIC = {
  cumbia: { stepDur: 60 / 98 / 4, total: 128,
    bars: [
      { b: [110, 164.81], c: [220, 261.63, 329.63] },                 /* Am */
      { b: [110, 164.81], c: [220, 261.63, 329.63] },                 /* Am */
      { b: [146.83, 220], c: [293.66, 349.23, 440] },                 /* Dm */
      { b: [164.81, 246.94], c: [329.63, 415.30, 493.88] },           /* E  */
    ],
    mel: [
      [[0, 659.25, 3], [4, 523.25, 2], [6, 587.33, 2], [8, 659.25, 4], [14, 440, 2]],
      [[0, 523.25, 2], [2, 493.88, 2], [4, 440, 5], [12, 329.63, 2], [14, 440, 2]],
      [[0, 698.46, 3], [4, 587.33, 2], [6, 659.25, 2], [8, 698.46, 4], [14, 587.33, 2]],
      [[0, 493.88, 2], [2, 415.30, 2], [4, 493.88, 3], [8, 659.25, 6]],
    ],
    on(s, t) {
      const bar = this.bars[Math.floor(s / 16) % 4], q = s % 16, ST = this.stepDur;
      const fase2 = s >= 64, fin = (s % 64) >= 60;
      if (q === 0) bajo(bar.b[0], t, ST * 3, 0.20);
      if (q === 4) bajo(bar.b[1], t, ST * 3, 0.16);
      if (q === 8) bajo(bar.b[0], t, ST * 3, 0.19);
      if (q === 12) bajo(bar.b[1], t, ST * 3, 0.16);
      if (q === 14) bajo(bar.b[0], t, ST * 1.5, 0.10);
      /* acordeón en contratiempo */
      if (q === 2 || q === 6 || q === 10 || q === 14) bar.c.forEach(f => acordeon(f, t, ST * 1.6, fase2 ? 0.016 : 0.022));
      /* güiro: raspado largo en 1 y 3, cortos apenas atrasados (groove) */
      if (q === 0 || q === 8) guiro(t, 0.16, 0.09);
      if (q === 4 || q === 6 || q === 12) guiro(t + ST * 0.10, 0.05, 0.07);
      if (fase2 && q % 4 === 0) cencerro(t, q === 0 ? 0.075 : 0.05);
      if (fase2 && !fin) playMel(this.mel[Math.floor(s / 16) % 4], q, t, ST, (f, tt, dd) => acordeon(f, tt, dd, 0.075));
      if (fin) timbal(t, 0.10, [400, 360, 320, 260][(s % 64) - 60]);
    } },
  cuarteto: { stepDur: 60 / 124 / 4, total: 128, /* tunga-tunga cordobés */
    bars: [
      { b: [130.81, 196.00], c: [261.63, 329.63, 392.00] },           /* C */
      { b: [174.61, 261.63], c: [349.23, 440.00, 523.25] },           /* F */
      { b: [196.00, 293.66], c: [392.00, 493.88, 587.33] },           /* G */
      { b: [130.81, 196.00], c: [261.63, 329.63, 392.00] },           /* C */
    ],
    mel: [
      [[0, 659.25, 2], [2, 783.99, 2], [4, 659.25, 3], [8, 523.25, 4], [12, 587.33, 2], [14, 659.25, 2]],
      [[0, 698.46, 2], [2, 659.25, 2], [4, 587.33, 3], [8, 698.46, 4], [12, 523.25, 2]],
      [[0, 587.33, 2], [2, 493.88, 2], [4, 392, 3], [8, 493.88, 2], [10, 587.33, 2], [12, 698.46, 3]],
      [[0, 659.25, 2], [2, 587.33, 2], [4, 523.25, 6], [12, 392, 2], [14, 493.88, 2]],
    ],
    on(s, t) {
      const bar = this.bars[Math.floor(s / 16) % 4], q = s % 16, ST = this.stepDur;
      const fase2 = s >= 64, fin = (s % 64) >= 59;
      if (q === 0 || q === 8) bajo(bar.b[0], t, ST * 2.4, 0.21);      /* tun */
      if (q === 4 || q === 12) bajo(bar.b[1], t, ST * 2.4, 0.18);     /* ga */
      if (q === 2 || q === 6 || q === 10 || q === 14) bar.c.forEach(f => pianito(f, t, fase2 ? 0.030 : 0.040));
      if (q % 2 === 0) guiro(t, 0.035, q % 4 === 0 ? 0.075 : 0.045, 5600); /* shaker con acento */
      if (fase2 && q % 4 === 2) cencerro(t, 0.045);
      if (!fase2 && q === 12) pianito(1046.5, t, 0.035);              /* campanita arriba */
      if (fase2 && !fin) playMel(this.mel[Math.floor(s / 16) % 4], q, t, ST, (f, tt, dd) => { pianito(f, tt, 0.065, dd); pianito(f * 2, tt, 0.02, dd); });
      if (fin) pianito([523.25, 587.33, 659.25, 698.46, 783.99][(s % 64) - 59], t, 0.05); /* subida cerrando la frase */
    } },
  chacarera: { stepDur: 60 / 72 / 6, total: 96, /* 6/8: 12 pasos por compás */
    bars: [
      { b: 110.00, c: [220, 261.63, 329.63] },      /* Am */
      { b: 98.00,  c: [196, 246.94, 293.66] },      /* G */
      { b: 87.31,  c: [174.61, 220, 261.63] },      /* F */
      { b: 82.41,  c: [164.81, 207.65, 246.94] },   /* E */
    ],
    mel: [
      [[0, 659.25, 3], [3, 523.25, 3], [6, 440, 5]],
      [[0, 587.33, 3], [3, 493.88, 3], [6, 392, 5]],
      [[0, 523.25, 3], [3, 440, 3], [6, 349.23, 5]],
      [[0, 493.88, 3], [3, 415.30, 3], [6, 329.63, 5]],
    ],
    on(s, t) {
      const bar = this.bars[Math.floor(s / 12) % 4], q = s % 12, ST = this.stepDur;
      const fase2 = s >= 48;
      if (q === 0 || q === 6) bombo(t, q === 0 ? 0.34 : 0.26);
      if (q === 3 || q === 9) guiro(t, 0.05, 0.10, 1400);             /* aro del bombo */
      if (q === 2 || q === 4 || q === 8 || q === 10)                  /* rasguido: cuerdas apenas desfasadas */
        bar.c.forEach((f, i) => tone({ f, t: t + i * 0.012, dur: ST * 1.4, g: 0.020, type: "sawtooth", dets: [-4, 4], lp: 2600, lpEnd: 900, a: 0.004, d: ST * 1.2, s: 0, r: 0.05, rev: 0.22 }));
      if (fase2) playMel(this.mel[Math.floor(s / 12) % 4], q, t, ST, (f, tt, dd) => acordeon(f, tt, dd, 0.07));
      else if (q === 6) tone({ f: bar.b * 4, t, dur: ST * 2.4, g: 0.05, type: "triangle", a: 0.01, rev: 0.3 }); /* bordoneo */
    } },
  navidad: { stepDur: 60 / 100 / 4, total: 128, /* cumbia con campanitas */
    bars: [
      { b: [130.81, 196.00], c: [261.63, 329.63, 392.00], bell: [1568, 1318.5] },   /* C */
      { b: [130.81, 196.00], c: [261.63, 329.63, 392.00], bell: [1318.5, 1046.5] }, /* C */
      { b: [174.61, 261.63], c: [349.23, 440.00, 523.25], bell: [1760, 1396.9] },   /* F */
      { b: [196.00, 293.66], c: [392.00, 493.88, 587.33], bell: [1975.5, 1568] },   /* G */
    ],
    mel: [ /* cascabeles acumbiados (dominio público desde 1857) */
      [[0, 659.25, 2], [4, 659.25, 2], [8, 659.25, 6]],
      [[0, 659.25, 2], [4, 659.25, 2], [8, 659.25, 6]],
      [[0, 659.25, 2], [4, 783.99, 2], [8, 523.25, 3], [12, 587.33, 3]],
      [[0, 659.25, 10]],
    ],
    on(s, t) {
      const bar = this.bars[Math.floor(s / 16) % 4], q = s % 16, ST = this.stepDur;
      const fase2 = s >= 64, fin = (s % 64) >= 60;
      if (q === 0) bajo(bar.b[0], t, ST * 3, 0.19);
      if (q === 4) bajo(bar.b[1], t, ST * 3, 0.15);
      if (q === 8) bajo(bar.b[0], t, ST * 3, 0.18);
      if (q === 12) bajo(bar.b[1], t, ST * 3, 0.15);
      if (q === 2 || q === 6 || q === 10 || q === 14) bar.c.forEach(f => acordeon(f, t, ST * 1.5, fase2 ? 0.014 : 0.020));
      if (q === 0 || q === 8) guiro(t, 0.16, 0.08);
      if (q === 4 || q === 12) guiro(t, 0.05, 0.06);
      if (!fase2 && q === 0) tone({ f: bar.bell[0], t, dur: ST * 3, g: 0.05, type: "sine", a: 0.003, rev: 0.55 });
      if (!fase2 && q === 8) tone({ f: bar.bell[1], t, dur: ST * 3, g: 0.05, type: "sine", a: 0.003, rev: 0.55 });
      if (fase2 && q % 4 === 0) cencerro(t, q === 0 ? 0.06 : 0.04);
      if (fase2 && !fin) playMel(this.mel[Math.floor(s / 16) % 4], q, t, ST, (f, tt, dd) => {
        acordeon(f, tt, dd, 0.07);
        tone({ f: f * 2, t: tt, dur: dd, g: 0.028, type: "sine", a: 0.004, rev: 0.5 });
      });
      if (fin) timbal(t, 0.09, [420, 380, 340, 280][(s % 64) - 60]);
      if (q === 6) guiro(t, 0.10, 0.04, 8000); /* shimmer navideño */
    } },
  tormenta: { stepDur: 60 / 88 / 4, total: 128, /* milonga triste bajo la lluvia */
    bars: [
      { b: 110.00, c: [220, 261.63, 329.63] },      /* Am */
      { b: 146.83, c: [220, 293.66, 349.23] },      /* Dm */
      { b: 82.41,  c: [207.65, 246.94, 329.63] },   /* E7 */
      { b: 110.00, c: [220, 261.63, 329.63] },      /* Am */
    ],
    mel: [
      [[0, 659.25, 6], [6, 698.46, 2], [8, 659.25, 7]],
      [[0, 587.33, 6], [6, 698.46, 2], [8, 440, 7]],
      [[0, 493.88, 6], [6, 415.30, 2], [8, 587.33, 4], [12, 493.88, 3]],
      [[0, 523.25, 4], [4, 493.88, 2], [6, 440, 9]],
    ],
    on(s, t) {
      const bar = this.bars[Math.floor(s / 16) % 4], q = s % 16, ST = this.stepDur;
      const fase2 = s >= 64;
      if (q === 0) bajo(bar.b, t, ST * 5, 0.19);          /* bajo milonguero 3-3-2 */
      if (q === 6) bajo(bar.b * 1.5, t, ST * 5, 0.14);
      if (q === 12) bajo(bar.b, t, ST * 3.5, 0.16);
      if (q === 4 || q === 10) bar.c.forEach(f => acordeon(f, t, ST * 2.4, 0.013)); /* bandoneón lánguido */
      if (q % 2 === 0) guiro(t, 0.14, 0.03, 6800);        /* llovizna constante */
      if (fase2) playMel(this.mel[Math.floor(s / 16) % 4], q, t, ST, (f, tt, dd) => acordeon(f, tt, dd, 0.06));
      else if (q === 14 && Math.floor(s / 16) % 2 === 1) tone({ f: bar.c[2] * 2, t, dur: ST * 3, g: 0.04, type: "sine", a: 0.02, rev: 0.5 }); /* silbido triste */
      if (s === 96) { tone({ f: 48, t, dur: 1.4, g: 0.13, type: "sine", slideTo: 30, a: 0.01, rev: 0.4 }); guiro(t, 0.6, 0.05, 150); } /* trueno lejano */
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
  /* máster: compresor suave + bus seco + bus de reverb (impulso sintetizado) */
  const comp = AC.createDynamicsCompressor();
  comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.18;
  comp.connect(AC.destination);
  dryBus = AC.createGain(); dryBus.gain.value = 0.9; dryBus.connect(comp);
  const conv = AC.createConvolver();
  conv.buffer = mkImpulse(1.6, 2.6);
  verbBus = AC.createGain(); verbBus.gain.value = 0.32;
  verbBus.connect(conv); conv.connect(comp);
  seqNext = AC.currentTime + 0.1; seqStep = 0;
  setInterval(seqTick, 25);
}
export function setMusicTheme(th) { if (MUSIC[th] && th !== musicTheme) { musicTheme = th; seqStep = 0; } }
export function getMusicTheme() { return musicTheme; }
export function toggleMusic() { musicOn = !musicOn; if (musicOn) audioInit(); return musicOn; }
export function setPower(on) { powerOn = on; }

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
