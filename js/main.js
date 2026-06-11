/* Punto de entrada: cableado del DOM por delegación + arranque */
import { $ } from "./helpers.js";
import { G, currentEvent } from "./state.js";
import { audioInit, toggleMusic } from "./audio.js";
import { loadBest } from "./storage.js";
import * as ui from "./ui.js";
import * as game from "./game.js";

/* ---------- arranque ---------- */
$("startBtn").addEventListener("click", () => {
  audioInit();
  $("titleOverlay").classList.add("hidden");
  game.newGame();
});

$("eventGo").addEventListener("click", () => {
  $("eventOverlay").classList.add("hidden");
  G.paused = false;
  ui.toast("🎉 " + currentEvent().name, "good");
});

$("nextDayBtn").addEventListener("click", () => {
  $("sumOverlay").classList.add("hidden");
  game.startDay();
});

/* ---------- delegación: clientes, bandeja, góndolas ---------- */
$("customers").addEventListener("click", e => {
  const b = e.target.closest(".servebtn");
  if (b) game.serveById(+b.dataset.cid);
});
$("tray").addEventListener("click", e => {
  const b = e.target.closest(".titem");
  if (b) game.removeTray(+b.dataset.ti);
});
$("stations").addEventListener("click", e => {
  const b = e.target.closest(".stbtn");
  if (b) game.stationClick(b.dataset.key);
});
$("trashBtn").addEventListener("click", game.trashAll);

/* ---------- fiado ---------- */
$("fiadoYes").addEventListener("click", game.acceptFiado);
$("fiadoNo").addEventListener("click", game.denyFiado);

/* ---------- libreta ---------- */
$("libretaBtn").addEventListener("click", () => {
  ui.renderLibreta();
  G.paused = true;
  $("libretaOverlay").classList.remove("hidden");
});
$("libretaClose").addEventListener("click", () => {
  $("libretaOverlay").classList.add("hidden");
  if (G.running && !G.fiado) G.paused = false;
});

/* ---------- música ---------- */
$("musicBtn").addEventListener("click", () => {
  $("musicBtn").textContent = toggleMusic() ? "🔊" : "🔇";
});

/* ---------- cortadora ---------- */
const hb = $("holdBtn");
hb.addEventListener("pointerdown", e => { e.preventDefault(); game.startHold(); });
window.addEventListener("pointerup", game.stopHold);
hb.addEventListener("pointerleave", game.stopHold);
hb.addEventListener("keydown", e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); game.startHold(); } });
hb.addEventListener("keyup", e => { if (e.key === " " || e.key === "Enter") game.stopHold(); });
$("wrapBtn").addEventListener("click", game.wrapSlice);
$("recutBtn").addEventListener("click", game.recut);
$("sliceCancel").addEventListener("click", game.closeSlice);

document.addEventListener("visibilitychange", () => { if (document.hidden) G.lastT = performance.now(); });

loadBest();
