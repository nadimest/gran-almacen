/* Render puro del DOM. Sin listeners: los botones llevan data-* y main.js delega. */
import { $, clamp, fmt } from "./helpers.js";
import { ITEMS, STATIONS, ARCH } from "./data.js";
import { G, currentEvent, anyoneWants } from "./state.js";

export function applyTheme(ev) {
  document.body.classList.remove("theme-asado", "theme-patrio", "theme-navidad", "theme-sudestada", "power-out");
  if (ev) document.body.classList.add("theme-" + ev.theme);
  const L = $("lights");
  if (ev && ev.theme === "navidad" && !L.children.length) {
    for (let i = 0; i < 14; i++) { const d = document.createElement("div"); d.className = "light"; L.appendChild(d); }
  }
}

/* La persiana metálica sube al arrancar cada día */
export function persiana(day) {
  const p = $("persiana");
  $("persianaDay").textContent = "DÍA " + day;
  p.classList.remove("hidden", "up");
  void p.offsetWidth; /* reinicia la animación si quedó aplicada */
  p.classList.add("up");
  setTimeout(() => p.classList.add("hidden"), 1600);
}

export function renderHUD() {
  const S = G.S;
  $("hudDay").textContent = S.day;
  $("hudMoney").textContent = fmt(S.money);
  $("repFill").style.width = S.rep + "%";
  $("repFill").style.background = S.rep > 50 ? "var(--ok)" : (S.rep > 25 ? "var(--warn)" : "var(--bad)");
  const t = Math.max(0, S.timeLeft);
  const h = 8 + Math.floor((1 - t / S.dayLen) * 12);
  $("hudTime").textContent = S.closing ? "CIERRE" : (h + ":00");
  $("hudClock").classList.toggle("urgent", !S.closing && t < 15);
  $("libretaBtn").textContent = S.debts.length ? "📒" + S.debts.length : "📒";
}

function chipHTML(o) {
  const it = ITEMS[o.key];
  return '<span class="chip" data-k="' + o.key + '" data-g="' + (o.grams || 0) + '">' + it.emoji + " " + (o.grams ? o.grams + "g " : "") + it.name + "</span>";
}

export function renderCustomers() {
  const box = $("customers");
  box.innerHTML = "";
  if (!G.S.customers.length) {
    box.innerHTML = '<div id="emptyShop">' + (G.S.closing ? "Bajando la persiana…" : "La campanita está por sonar…") + "</div>";
    return;
  }
  for (const c of G.S.customers) {
    const d = document.createElement("div");
    d.className = "cust a-" + c.arch;
    const badge = ARCH[c.arch].badge;
    d.innerHTML =
      '<div class="face"><span class="em">' + c.em + '</span><span class="nm">' + c.nm + "</span>" + (badge ? '<span class="star">' + badge + "</span>" : "") + "</div>" +
      '<div class="bubble"><div class="say">' + c.greet + '</div><div class="chips">' + c.order.map(chipHTML).join("") + "</div>" +
      '<div class="bubblefoot"><div class="pat"><i></i></div><button class="servebtn" data-cid="' + c.id + '">ENTREGAR ➜</button></div></div>';
    box.appendChild(d);
    c.el = d; c.patEl = d.querySelector(".pat i");
  }
  markWanted();
}

export function updateBubble(c, flashIdx) {
  if (!c.el) return;
  const chips = c.el.querySelector(".chips");
  chips.innerHTML = c.order.map(chipHTML).join("");
  if (flashIdx != null && chips.children[flashIdx]) chips.children[flashIdx].classList.add("flash");
}

export function shakeCustomer(c) {
  if (!c.el) return;
  c.el.classList.remove("shake"); void c.el.offsetWidth; c.el.classList.add("shake");
}

export function animOut(c) {
  if (c.el) { c.el.classList.add("leaving"); const el = c.el; setTimeout(() => { el.remove(); }, 380); c.el = null; }
  if (G.S.customers.length === 0) renderCustomers();
}

export function updatePatienceBars() {
  for (const c of G.S.customers) {
    if (!c.patEl) continue;
    const r = c.patience / c.maxPat;
    c.patEl.style.width = clamp(r * 100, 0, 100) + "%";
    c.patEl.style.background = r > 0.5 ? "var(--ok)" : (r > 0.25 ? "var(--warn)" : "var(--bad)");
  }
}

/* Tacha chips ya cubiertos por la bandeja + puntito rojo en góndolas pedidas */
export function markWanted() {
  const supply = {};
  for (const t of G.S.tray) { const k = t.key + "@" + (t.grams || 0); supply[k] = (supply[k] || 0) + 1; }
  for (const c of G.S.customers) {
    if (!c.el) continue;
    c.el.querySelectorAll(".chip").forEach(ch => {
      const k = ch.dataset.k + "@" + ch.dataset.g;
      if ((supply[k] || 0) > 0) { supply[k]--; ch.classList.add("have"); }
      else ch.classList.remove("have");
    });
  }
  document.querySelectorAll(".stbtn[data-key]").forEach(b => {
    b.classList.toggle("wanted", anyoneWants(b.dataset.key));
  });
}

export function renderTray() {
  const tr = $("tray");
  tr.innerHTML = "";
  if (!G.S.tray.length) { tr.innerHTML = '<span class="empty">Agarrá lo que te pidan…</span>'; $("trayHint").textContent = ""; return; }
  G.S.tray.forEach((t, i) => {
    const it = ITEMS[t.key];
    const b = document.createElement("button");
    b.className = "titem" + (t.quality === 2 ? " perfect" : "");
    b.title = "Devolver";
    b.dataset.ti = i;
    b.innerHTML = it.emoji + " " + (t.grams ? t.grams + "g" : it.name.split(" ")[0]) + (t.quality === 2 ? " ✨" : "");
    tr.appendChild(b);
  });
  $("trayHint").textContent = "tocá un ítem para devolverlo";
}

export function buildStations() {
  const box = $("stations");
  box.innerHTML = "";
  const ev = currentEvent();
  for (const st of STATIONS) {
    if (st.id === "evento" && !ev) continue;
    const keys = Object.keys(ITEMS).filter(k => {
      const it = ITEMS[k];
      if (it.st !== st.id) return false;
      if (it.event) return ev && ev.id === it.event;
      return true;
    });
    if (!keys.length) continue;
    const row = document.createElement("div");
    row.className = "shelfrow";
    row.innerHTML = '<div class="shelflabel' + (st.fest ? " fest" : "") + '">' + st.label + "</div>";
    for (const k of keys) {
      const it = ITEMS[k];
      const locked = !it.event && it.day > G.S.day;
      const b = document.createElement("button");
      b.className = "stbtn" + (locked ? " locked" : "") + (it.sliced ? " fiambre" : "") + (it.event ? " evento" : "");
      b.dataset.key = k;
      b.dataset.st = it.st;
      b.innerHTML = '<span class="em">' + it.emoji + '</span><span class="nm">' + it.name + '</span><span class="pr">' + (it.sliced ? fmt(it.per100) + "/100g" : fmt(it.price)) + "</span>";
      row.appendChild(b);
    }
    box.appendChild(row);
  }
}

export function renderLibreta() {
  const dl = $("debtList");
  if (!G.S.debts.length) { dl.innerHTML = '<i style="color:#9a865f;">Nadie debe nada… por ahora.</i>'; return; }
  let tot = 0;
  dl.innerHTML = G.S.debts.map(d => { tot += d.amount; return '<div class="drow"><span>' + d.nm + "</span><span>" + fmt(d.amount) + "</span></div>"; }).join("") +
    '<div class="drow" id="debtTotal"><span>TOTAL</span><span>' + fmt(tot) + "</span></div>";
}

export function toast(msg, cls) {
  const t = document.createElement("div");
  t.className = "toast" + (cls ? " " + cls : "");
  t.textContent = msg;
  $("toasts").appendChild(t);
  setTimeout(() => t.remove(), 2580);
  while ($("toasts").children.length > 3) $("toasts").firstChild.remove();
}

export function floatMoney(txt) {
  const f = document.createElement("div");
  f.className = "float"; f.textContent = txt;
  $("counter").appendChild(f);
  setTimeout(() => f.remove(), 1150);
}
