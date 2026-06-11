/* Estado compartido + consultas puras sobre el estado */
import { EVENTS, ITEMS } from "./data.js";

/* Único contenedor mutable del juego. Todo el mundo lee/escribe acá. */
export const G = {
  S: null,        // estado de la partida (día, caja, fama, clientes, bandeja…)
  paused: false,
  running: false,
  lastT: 0,
  slice: null,    // sesión de cortadora activa
  fiado: null,    // pedido de fiado pendiente {c, total, tip}
  custId: 0,
};

export function currentEvent() {
  return G.S ? EVENTS[G.S.day] || null : null;
}

export function unlockedItems() {
  const ev = currentEvent();
  return Object.keys(ITEMS).filter(k => {
    const it = ITEMS[k];
    if (G.S.power === false && it.st === "heladera") return false; /* apagón: la heladera a oscuras */
    if (it.event) return ev && ev.id === it.event;
    return it.day <= G.S.day;
  });
}

export function grabItems() {
  return unlockedItems().filter(k => !ITEMS[k].sliced);
}

/* ¿Qué gramaje de `key` falta cortar según los pedidos vs. la bandeja? */
export function neededGrams(key) {
  const supply = {};
  for (const t of G.S.tray) if (t.grams) { const k = t.key + "@" + t.grams; supply[k] = (supply[k] || 0) + 1; }
  for (const c of G.S.customers) for (const o of c.order) {
    if (o.key === key && o.grams) {
      const k = key + "@" + o.grams;
      if ((supply[k] || 0) > 0) { supply[k]--; } else return o.grams;
    }
  }
  return null;
}

/* ¿Algún cliente pide `key` que la bandeja todavía no cubre? */
export function anyoneWants(key) {
  const supply = {};
  for (const t of G.S.tray) { const k = t.key + "@" + (t.grams || 0); supply[k] = (supply[k] || 0) + 1; }
  for (const c of G.S.customers) for (const o of c.order) {
    const k = o.key + "@" + (o.grams || 0);
    if ((supply[k] || 0) > 0) supply[k]--; else if (o.key === key) return true;
  }
  return false;
}
