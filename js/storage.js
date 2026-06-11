/* Mejor racha persistente (window.storage si existe; falla en silencio si no) */
import { $, fmt } from "./helpers.js";
import { G } from "./state.js";

let best = null;

export async function loadBest() {
  try { const r = await window.storage.get("almacen-best"); best = r ? JSON.parse(r.value) : null; }
  catch (e) { best = null; }
  renderBest();
}

export async function saveBest() {
  if (!G.S) return;
  const cur = { days: G.S.day, money: Math.round(G.S.money) };
  if (!best || cur.days > best.days || (cur.days === best.days && cur.money > best.money)) {
    best = cur;
    try { await window.storage.set("almacen-best", JSON.stringify(best)); } catch (e) {}
  }
}

export function renderBest() {
  $("bestLine").textContent = best
    ? ("🏆 Tu mejor racha: " + best.days + " día" + (best.days > 1 ? "s" : "") + " · " + fmt(best.money) + " en caja")
    : "";
}
