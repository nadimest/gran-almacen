/* Lógica central: ciclo de días, loop, vecinos, entrega, fiado y cortadora */
import { $, rnd, ri, pick, fmt, clamp } from "./helpers.js";
import { ITEMS, GRAM_OPTS, EVENTS, ARCH, FOLKS, GREETS, HAPPY, ANGRY, WRONG, FIADO_ASK, KID_SWAP, PICKY_REJECT, RADIO, RADIO_SUDESTADA, APAGON_SAY, APAGON_VELAS } from "./data.js";
import { G, currentEvent, unlockedItems, grabItems, neededGrams } from "./state.js";
import { audioInit, setMusicTheme, setPower, sfx } from "./audio.js";
import { saveBest, renderBest } from "./storage.js";
import * as ui from "./ui.js";

/* =================== FLUJO DE PARTIDA =================== */
export function newGame() {
  G.S = { day: 0, money: 20000, rep: 50, debts: [], total: { served: 0, earned: 0 } };
  startDay();
}

export function startDay() {
  const S = G.S;
  S.day++;
  S.timeLeft = 80 + S.day * 8;
  S.dayLen = S.timeLeft;
  S.closing = false;
  S.tray = [];
  S.customers = [];
  S.spawnT = 1.2;
  S.radioT = rnd(16, 26);
  S.stats = { served: 0, lost: 0, earned: 0, fiadoN: 0, perfect: 0, denied: 0, eventSold: 0 };
  const ev = currentEvent();
  ui.applyTheme(ev);
  setMusicTheme(ev ? ev.music : "cumbia");
  /* sudestada: queda programado el apagón del día */
  S.power = true;
  setPower(true);
  if (ev && ev.cut) S.cutIn = S.dayLen * rnd(ev.cut.from, ev.cut.to);
  ui.buildStations();
  ui.renderTray(); ui.renderCustomers(); ui.renderHUD();
  ui.persiana(S.day);
  sfx.persiana();
  /* día de cobro */
  if ((S.day === 3 || S.day === 5 || S.day === 7) && S.debts.length) {
    const tot = S.debts.reduce((a, d) => a + d.amount, 0);
    const pay = Math.round(tot * 1.15);
    S.money += pay; S.debts = [];
    setTimeout(() => { ui.toast("📒 ¡Día de cobro! Los caseritos pagaron " + fmt(pay), "money"); sfx.tada(); }, 900);
  }
  if (ev) {
    G.paused = true;
    $("eventEmoji").textContent = ev.emoji;
    $("eventName").textContent = ev.name;
    $("eventDesc").textContent = ev.desc;
    $("eventRules").innerHTML = ev.rules;
    $("eventOverlay").classList.remove("hidden");
  } else {
    ui.toast("☀️ Día " + S.day + " — ¡arriba la persiana!", "good");
    G.paused = false;
  }
  if (!G.running) { G.running = true; G.lastT = performance.now(); requestAnimationFrame(tick); }
}

function endDay() {
  const S = G.S;
  G.paused = true;
  const rent = 6000 + S.day * 2000;
  S.money -= rent;
  S.total.served += S.stats.served;
  S.total.earned += S.stats.earned;
  ui.renderHUD();
  saveBest();
  if (S.money < 0) { gameOver("plata", rent); return; }
  if (S.day >= 7) { victory(); return; }
  showSummary(rent);
}

function showSummary(rent) {
  const S = G.S, st = S.stats, ev = currentEvent();
  let head;
  if (ev && st.eventSold >= 4) head = ev.id === "asado" ? "“SE QUEDÓ SIN CARBÓN: EL ALMACÉN SALVÓ EL FERIADO”"
    : ev.id === "patrio" ? "“EL LOCRO DE LA CUADRA SALIÓ DEL GRAN ALMACÉN”"
    : ev.id === "sudestada" ? "“EL ALMACÉN QUE ALUMBRÓ EL APAGÓN: VELAS PARA TODA LA CUADRA”"
    : "“NOCHEBUENA SALVADA: HABÍA PAN DULCE HASTA LAS 23:59”";
  else if (st.lost === 0 && st.served >= 4) head = "“EL GRAN ALMACÉN CONQUISTA LA CUADRA”";
  else if (st.lost > st.served) head = "“VECINOS MURMURAN: ¿QUÉ PASA EN EL ALMACÉN?”";
  else if (st.fiadoN >= 2) head = "“EL ALMACENERO QUE TODAVÍA FÍA: UNA RAREZA”";
  else if (st.perfect >= 3) head = "“CORTA EL FIAMBRE AL GRAMO: VECINOS FASCINADOS”";
  else head = "“EL GRAN ALMACÉN SOBREVIVE OTRO DÍA”";
  $("sumHeadline").textContent = head;
  $("sumDate").textContent = "Edición vespertina — Día " + S.day + (ev ? " · " + ev.name : "");
  $("sumStats").innerHTML =
    "Vecinos atendidos <b>" + st.served + "</b><br>" +
    "Clientes perdidos <b>" + st.lost + "</b><br>" +
    "Cortes perfectos 🔪 <b>" + st.perfect + "</b><br>" +
    "Fiados anotados 📒 <b>" + st.fiadoN + "</b><br>" +
    (ev ? ("Especiales vendidos 🎉 <b>" + st.eventSold + "</b><br>") : "") +
    "Recaudación del día <b>" + fmt(st.earned) + "</b><br>" +
    "Alquiler y luz <b style='color:#C0341F'>−" + fmt(rent) + "</b><br>" +
    "<span style='border-top:1.5px solid #2A1F14;display:block;margin-top:4px;padding-top:3px;'>Caja total <b>" + fmt(S.money) + "</b></span>";
  const nx = EVENTS[S.day + 1];
  $("nextDayBtn").innerHTML = "⬆️ Subir la persiana — Día " + (S.day + 1) + (nx ? ("<small style='display:block;font-size:10px;font-weight:normal;'>mañana: " + nx.name + "</small>") : "");
  $("sumOverlay").classList.remove("hidden");
}

function gameOver(why, rent) {
  const S = G.S;
  G.running = false;
  const c = $("titleCard");
  document.body.classList.remove("theme-asado", "theme-patrio", "theme-navidad", "theme-sudestada", "power-out");
  setPower(true);
  $("titleOverlay").classList.remove("hidden");
  const msg = why === "rep"
    ? "El barrio se cansó de esperar. Hasta Doña Coca cruzó a comprarle a la competencia. La persiana bajó para siempre…"
    : "Entre el alquiler (" + fmt(rent) + ") y la luz, la caja quedó en rojo. El contador te lo venía avisando…";
  c.querySelector(".logo").innerHTML = "SE CIERRA<br>EL ALMACÉN";
  c.querySelector(".sub").textContent = "★ Q.E.P.D. ★";
  $("howto").innerHTML = "😢 " + msg + "<br><br>Llegaste al <b>día " + S.day + "</b> con <b>" + fmt(Math.max(0, S.money)) + "</b> y atendiste a <b>" + (S.total.served + S.stats.served) + "</b> vecinos en total.";
  $("startBtn").textContent = "🔄 VOLVER A EMPEZAR";
  renderBest();
}

function victory() {
  const S = G.S;
  G.running = false;
  sfx.tada();
  const c = $("titleCard");
  $("titleOverlay").classList.remove("hidden");
  c.querySelector(".logo").innerHTML = "¡ALMACÉN<br>DEL AÑO!";
  c.querySelector(".sub").textContent = "★ ORGULLO DEL BARRIO ★";
  $("howto").innerHTML = "🏆 Sobreviviste la semana entera: asado, locro patrio, sudestada y Nochebuena incluidos. La cuadra te quiere y el fiambre sale al gramo.<br><br>Caja final: <b>" + fmt(S.money) + "</b> · Vecinos atendidos: <b>" + S.total.served + "</b> · Fama de barrio: <b>" + Math.round(S.rep) + "/100</b>";
  $("startBtn").textContent = "🔄 JUGAR OTRA SEMANA";
  renderBest();
}

/* =================== LOOP =================== */
function tick(t) {
  if (!G.running) return;
  requestAnimationFrame(tick);
  const dt = Math.min((t - G.lastT) / 1000, 0.1); G.lastT = t;
  if (G.paused) return;
  update(dt);
}

export function update(dt) {
  const S = G.S, ev = currentEvent();
  if (!S.closing) {
    S.timeLeft -= dt;
    if (S.timeLeft <= 0) { S.closing = true; ui.toast(ev && ev.id === "navidad" ? "🕛 ¡Casi medianoche! Atendé a los últimos…" : ev && ev.id === "sudestada" ? "🕗 ¡Cerrando! Con esta agua, los últimos y a casa…" : "🕗 ¡Estamos cerrando! Atendé a los que quedan…"); }
  } else if (S.customers.length === 0) { endDay(); return; }
  /* radio del barrio */
  S.radioT -= dt;
  if (S.radioT <= 0) { S.radioT = rnd(22, 38); ui.toast("📻 " + pick(ev && ev.id === "sudestada" ? RADIO_SUDESTADA : RADIO), "radio"); }
  /* sudestada: el reloj del apagón */
  if (ev && ev.cut) {
    if (S.power && S.cutIn > 0) { S.cutIn -= dt; if (S.cutIn <= 0) powerCut(ev); }
    else if (!S.power) { S.cutLeft -= dt; if (S.cutLeft <= 0) powerBack(); }
  }
  /* llegan vecinos */
  const maxC = Math.min(1 + Math.ceil(S.day / 2), 3);
  if (!S.closing && S.customers.length < maxC) {
    S.spawnT -= dt;
    if (S.spawnT <= 0) {
      spawnCustomer();
      let base = rnd(4, 9) - Math.min(S.day * 0.4, 3);
      if (ev) base /= ev.spawnMul;
      S.spawnT = Math.max(1.6, base);
    }
  }
  /* paciencia y comportamiento */
  for (const c of [...S.customers]) {
    c.patience -= dt;
    if (c.arch === "kid" && c.changes < 2) {
      c.changeT -= dt;
      if (c.changeT <= 0) kidSwap(c);
    }
    if (c.patience <= 0) leaveAngry(c);
  }
  ui.updatePatienceBars();
  /* cortadora */
  const sl = G.slice;
  if (sl && sl.holding) {
    sl.g += dt * (110 + sl.g * 0.25);
    if (sl.g >= sl.max) { sl.g = sl.max; stopHold(); }
    renderSliceGauge();
    sl.tickAcc = (sl.tickAcc || 0) + dt;
    if (sl.tickAcc > 0.09) { sl.tickAcc = 0; sfx.sliceTick(); }
  }
  ui.renderHUD();
}

/* =================== EL APAGÓN (sudestada) =================== */
function powerCut(ev) {
  const S = G.S;
  S.power = false;
  S.cutLeft = rnd(ev.cut.dur[0], ev.cut.dur[1]);
  document.body.classList.add("power-out");
  setPower(false);
  sfx.trueno();
  ui.toast("⚡ ¡ZAS! Se cortó la luz en toda la cuadra…", "bad");
  /* la heladera queda a oscuras: los pedidos fríos se bajan */
  for (const c of S.customers) {
    if (!c.order.some(o => ITEMS[o.key].st === "heladera")) continue;
    c.order = c.order.filter(o => ITEMS[o.key].st !== "heladera");
    if (c.order.length) ui.toast("🕯️ " + c.nm + ": “" + pick(APAGON_SAY) + "”");
    else { c.order.push({ key: "velas" }); ui.toast("🕯️ " + c.nm + ": “" + pick(APAGON_VELAS) + "”"); }
    ui.updateBubble(c);
  }
  ui.markWanted();
}

function powerBack() {
  G.S.power = true;
  document.body.classList.remove("power-out");
  setPower(true);
  sfx.tada();
  ui.toast("💡 ¡Volvió la luz! La heladera ronronea de nuevo", "good");
}

/* =================== VECINOS =================== */
function pickArch() {
  const S = G.S, ev = currentEvent();
  const w = { normal: 30, caserito: 24,
    kid: S.day >= 2 ? 16 : 0, picky: S.day >= 3 ? 13 : 0, rushed: S.day >= 2 ? 11 : 0 };
  if (ev && ev.archBoost) for (const k in ev.archBoost) w[k] = (w[k] || 0) + ev.archBoost[k];
  let tot = 0; for (const k in w) tot += w[k];
  let r = Math.random() * tot;
  for (const k in w) { r -= w[k]; if (r <= 0) return k; }
  return "normal";
}

export function spawnCustomer() {
  const S = G.S;
  const arch = pickArch();
  const who = pick(FOLKS[arch]);
  const ev = currentEvent();
  let nItems = S.day < 2 ? ri(1, 2) : S.day < 4 ? ri(1, 3) : ri(2, 4);
  if (arch === "rushed") nItems = Math.min(nItems, 2);
  const pool = unlockedItems();
  const evPool = ev ? pool.filter(k => ITEMS[k].event) : [];
  const order = [];
  let slicedCount = 0;
  const maxSliced = S.day < 3 ? 1 : 2;
  for (let i = 0; i < nItems; i++) {
    let k;
    if (ev && evPool.length && Math.random() < 0.55) k = pick(evPool);
    else k = pick(pool);
    if (ITEMS[k].sliced) {
      if (slicedCount >= maxSliced || arch === "kid") { i--; continue; } /* los pibes no compran fiambre al peso */
      slicedCount++;
      order.push({ key: k, grams: pick(GRAM_OPTS) });
    } else order.push({ key: k });
  }
  if (!order.length) order.push({ key: pick(grabItems()) });
  const seen = {};
  for (const o of order) { if (o.grams) { if (seen[o.key]) o.grams = seen[o.key]; else seen[o.key] = o.grams; } }
  let maxPat = clamp(34 - S.day * 1.6 + (S.rep - 50) / 12, 16, 42);
  maxPat *= (ARCH[arch].patMul || 1);
  if (arch === "caserito") maxPat += 5;
  const c = { id: ++G.custId, nm: who.nm, em: who.em, arch, loyal: arch === "caserito",
    order, patience: maxPat, maxPat, greet: pick(GREETS[arch]),
    changes: 0, changeT: rnd(5, 9) };
  S.customers.push(c);
  ui.renderCustomers();
  sfx.bell();
  ui.markWanted();
}

function kidSwap(c) {
  const grabs = c.order.map((o, i) => o.grams ? null : i).filter(i => i !== null);
  if (!grabs.length) { c.changes = 9; return; }
  const i = pick(grabs);
  const oldKey = c.order[i].key;
  const opts = grabItems().filter(k => k !== oldKey);
  if (!opts.length) { c.changes = 9; return; }
  const nk = pick(opts);
  c.order[i] = { key: nk };
  c.changes++; c.changeT = rnd(6, 10);
  ui.toast("🎒 " + c.nm + ": “" + pick(KID_SWAP) + " " + ITEMS[nk].name.toLowerCase() + "”", "bad");
  sfx.kid();
  ui.updateBubble(c, i);
  ui.markWanted();
}

function leaveAngry(c) {
  const S = G.S;
  S.customers = S.customers.filter(x => x !== c);
  S.rep = clamp(S.rep - 7, 0, 100);
  S.stats.lost++;
  ui.toast("😡 " + c.nm + ": “" + pick(ANGRY) + "”", "bad");
  sfx.buzz();
  ui.animOut(c);
  if (S.rep <= 0) { G.running = false; setTimeout(() => gameOver("rep"), 400); return; }
  ui.markWanted();
}

export function serveById(cid) {
  const c = G.S.customers.find(x => x.id === cid);
  if (c) tryServe(c);
}

export function tryServe(c) {
  const S = G.S;
  const taken = new Array(S.tray.length).fill(false);
  const used = [];
  let ok = true;
  for (const o of c.order) {
    let idx = -1;
    for (let i = 0; i < S.tray.length; i++) {
      const t = S.tray[i];
      if (!taken[i] && t.key === o.key && (!o.grams || t.grams === o.grams)) { idx = i; break; }
    }
    if (idx < 0) { ok = false; break; }
    taken[idx] = true; used.push({ o, i: idx });
  }
  if (!ok || taken.some(v => !v)) {
    c.patience = Math.max(1, c.patience - 3);
    ui.toast("🙄 " + c.nm + ": “" + pick(WRONG) + "”", "bad");
    sfx.buzz();
    ui.shakeCustomer(c);
    return;
  }
  /* doña exigente: el fiambre va al gramo o se corta de nuevo */
  if (c.arch === "picky") {
    const badIdx = used.filter(u => u.o.grams && S.tray[u.i].quality < 2).map(u => u.i);
    if (badIdx.length) {
      badIdx.sort((a, b) => b - a).forEach(i => S.tray.splice(i, 1));
      c.patience = Math.max(1, c.patience - 2);
      ui.toast("🧐 " + c.nm + ": " + pick(PICKY_REJECT), "bad");
      sfx.buzz();
      ui.shakeCustomer(c);
      ui.renderTray(); ui.markWanted();
      return;
    }
  }
  /* precio */
  let total = 0, tip = 0, evSold = 0;
  for (const u of used) {
    const o = u.o, it = ITEMS[o.key];
    if (o.grams) {
      const base = it.per100 * o.grams / 100; total += base;
      if (S.tray[u.i].quality === 2) tip += base * 0.2;
    } else {
      total += it.price;
      if (it.event) evSold++;
    }
  }
  if (c.patience / c.maxPat > 0.6) tip += total * 0.08;
  if (c.arch === "rushed" && c.patience / c.maxPat > 0.5) tip += total * 0.25;
  if (c.arch === "picky") tip += total * 0.10; /* las doñas exigentes pagan bien */
  total = Math.round(total); tip = Math.round(tip);
  S.tray = [];
  ui.renderTray(); ui.markWanted();
  S.stats.eventSold += evSold;
  if (c.loyal && Math.random() < 0.55) {
    G.fiado = { c, total, tip };
    G.paused = true;
    $("fiadoFace").textContent = c.em;
    $("fiadoName").textContent = c.nm + " ⭐";
    $("fiadoSay").textContent = pick(FIADO_ASK);
    $("fiadoAmount").textContent = fmt(total + tip);
    $("fiadoOverlay").classList.remove("hidden");
    return;
  }
  completeSale(c, total, tip, false);
}

function completeSale(c, total, tip, fiado) {
  const S = G.S;
  S.customers = S.customers.filter(x => x !== c);
  S.stats.served++;
  if (fiado) {
    S.debts.push({ nm: c.nm, amount: total + tip });
    S.stats.fiadoN++;
    S.rep = clamp(S.rep + 6, 0, 100);
    ui.toast("📒 Anotado: " + c.nm + " debe " + fmt(total + tip), "good");
    ui.floatMoney("📒 +fama");
  } else {
    S.money += total + tip;
    S.stats.earned += total + tip;
    S.rep = clamp(S.rep + 2, 0, 100);
    const line = c.arch === "rushed" && tip > total * 0.2 ? "¡Justo llego al bondi! Tomá, quedate con el vuelto"
      : c.arch === "picky" ? "Mmm… aceptable, m’hijito" : pick(HAPPY);
    ui.toast("💵 " + fmt(total) + (tip ? (" + propina " + fmt(tip)) : "") + " — " + line, "money");
    ui.floatMoney("+" + fmt(total + tip));
    sfx.kaching();
  }
  ui.animOut(c);
  ui.renderHUD();
  ui.markWanted();
}

export function acceptFiado() {
  const { c, total, tip } = G.fiado; G.fiado = null;
  $("fiadoOverlay").classList.add("hidden"); G.paused = false;
  completeSale(c, total, tip, true);
}

export function denyFiado() {
  const S = G.S;
  const { c, total } = G.fiado; G.fiado = null;
  $("fiadoOverlay").classList.add("hidden"); G.paused = false;
  S.customers = S.customers.filter(x => x !== c);
  S.stats.served++; S.stats.denied++;
  S.money += total; S.stats.earned += total;
  S.rep = clamp(S.rep - 9, 0, 100);
  ui.toast("😒 " + c.nm + " paga de mala gana… el barrio murmura (−fama)", "bad");
  sfx.kaching();
  ui.animOut(c); ui.renderHUD(); ui.markWanted();
  if (S.rep <= 0) { G.running = false; setTimeout(() => gameOver("rep"), 400); }
}

/* =================== BANDEJA Y GÓNDOLAS =================== */
export function stationClick(key) {
  const S = G.S, it = ITEMS[key];
  if (!it.event && it.day > S.day) { ui.toast("📦 Eso llega el día " + it.day, "bad"); return; }
  if (S.power === false && it.st === "heladera") { ui.toast("⚡ Sin luz, la heladera no enfría. Cuando vuelva, hablamos", "bad"); sfx.buzz(); return; }
  if (it.sliced) {
    const g = neededGrams(key);
    if (g == null) { ui.toast("🤷 Nadie pidió " + it.name.toLowerCase() + " ahora"); sfx.buzz(); return; }
    openSlice(key, g);
    return;
  }
  if (S.tray.length >= 6) { ui.toast("🙌 ¡Tenés las manos llenas! Entregá o tirá algo", "bad"); return; }
  S.tray.push({ key });
  sfx.pickItem();
  ui.renderTray(); ui.markWanted();
}

export function removeTray(i) { G.S.tray.splice(i, 1); sfx.pickItem(); ui.renderTray(); ui.markWanted(); }

export function trashAll() { if (G.S.tray.length) { G.S.tray = []; ui.toast("🗑️ Bandeja vacía"); ui.renderTray(); ui.markWanted(); } }

/* =================== LA CORTADORA =================== */
export function openSlice(key, grams) {
  const it = ITEMS[key];
  G.slice = { key, target: grams, max: Math.max(380, grams + 140), g: 0, holding: false, done: false, quality: null };
  const sl = G.slice;
  $("sliceFace").textContent = it.emoji;
  $("sliceTarget").textContent = "Cortame " + grams + "g de " + it.name.toLowerCase();
  $("sliceVerdict").textContent = "";
  $("sliceActions").style.display = "none";
  $("holdBtn").style.display = "block";
  const zl = (sl.target - 30) / sl.max * 100, zw = 60 / sl.max * 100;
  const sweetL = (sl.target - 12) / sl.max * 100, sweetW = 24 / sl.max * 100;
  $("gaugeZone").style.left = zl + "%"; $("gaugeZone").style.width = zw + "%";
  $("gaugeSweet").style.left = sweetL + "%"; $("gaugeSweet").style.width = sweetW + "%";
  renderSliceGauge();
  $("sliceOverlay").classList.remove("hidden");
}

function renderSliceGauge() {
  const sl = G.slice;
  if (!sl) return;
  $("gaugeFill").style.width = (sl.g / sl.max * 100) + "%";
  $("gramsOut").textContent = Math.round(sl.g) + " g";
}

export function startHold() { const sl = G.slice; if (!sl || sl.done) return; sl.holding = true; $("holdBtn").classList.add("holding"); }

export function stopHold() {
  const sl = G.slice;
  if (!sl || !sl.holding) return;
  sl.holding = false; $("holdBtn").classList.remove("holding");
  evalSlice();
}

function evalSlice() {
  const sl = G.slice;
  const diff = Math.abs(sl.g - sl.target);
  sl.done = true;
  $("holdBtn").style.display = "none";
  $("sliceActions").style.display = "flex";
  if (diff <= 12) { sl.quality = 2; $("sliceVerdict").textContent = "✨ ¡JUSTITO! Corte de almacenero viejo (+propina)"; $("sliceVerdict").style.color = "var(--amarillo)"; sfx.tada(); }
  else if (diff <= 30) { sl.quality = 1; $("sliceVerdict").textContent = "👍 “¿Va un poquito más? Bueno, dejalo así.”"; $("sliceVerdict").style.color = "var(--ok)"; }
  else { sl.quality = 0; $("sliceVerdict").textContent = "😬 Se te fue la mano… esto no se puede envolver."; $("sliceVerdict").style.color = "var(--bad)";
    $("wrapBtn").style.display = "none"; sfx.buzz(); return; }
  $("wrapBtn").style.display = "block";
}

export function wrapSlice() {
  const sl = G.slice;
  if (!sl || !sl.done || sl.quality === 0) return;
  if (G.S.tray.length >= 6) { ui.toast("🙌 ¡Manos llenas!", "bad"); return; }
  G.S.tray.push({ key: sl.key, grams: sl.target, quality: sl.quality });
  if (sl.quality === 2) G.S.stats.perfect++;
  closeSlice();
  sfx.pickItem();
  ui.renderTray(); ui.markWanted();
}

export function recut() { const sl = G.slice; if (!sl) return; openSlice(sl.key, sl.target); }

export function closeSlice() { G.slice = null; $("sliceOverlay").classList.add("hidden"); }
