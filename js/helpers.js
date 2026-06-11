/* Utilidades puras — sin dependencias */
export const $ = id => document.getElementById(id);
export const rnd = (a, b) => a + Math.random() * (b - a);
export const ri = (a, b) => Math.floor(rnd(a, b + 1));
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const fmt = n => "$" + Math.round(n).toLocaleString("es-AR");
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
