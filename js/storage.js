/* Mejor racha persistente (localStorage; falla en silencio si no hay) */
import { $, fmt } from "./helpers.js";
import { G } from "./state.js";

let best = null;

export function loadBest() {
  try { const r = localStorage.getItem("almacen-best"); best = r ? JSON.parse(r) : null; }
  catch (e) { best = null; }
  renderBest();
}

export function saveBest() {
  if (!G.S) return;
  const cur = { days: G.S.day, money: Math.round(G.S.money) };
  if (!best || cur.days > best.days || (cur.days === best.days && cur.money > best.money)) {
    best = cur;
    try { localStorage.setItem("almacen-best", JSON.stringify(best)); } catch (e) {}
  }
}

export function renderBest() {
  $("bestLine").textContent = best
    ? ("🏆 Tu mejor racha: " + best.days + " día" + (best.days > 1 ? "s" : "") + " · " + fmt(best.money) + " en caja")
    : "";
}
