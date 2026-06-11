# CLAUDE.md — Gran Almacén

Context file for Claude Code. Read this before touching anything.

## What this is

A browser arcade game: an **Argentine corner-store (almacén de barrio) simulator**, inspired by Overcooked (time-pressure counter service) and Theme Hospital (management layer + end-of-day reports). It is Nadim's personal side project, a nostalgia piece inspired by his family's Argentine supermarket. Tone matters as much as mechanics: Rioplatense Spanish copy, vecinos with personality, synthesized cumbia. "Fun to experience, not just fun to play."

Vanilla JS, zero dependencies at runtime, zero build step for development. Every visual is CSS/emoji, every sound is synthesized Web Audio. Keep it that way unless explicitly asked otherwise.

## How this came to be (conversation history)

1. **v1** (commit `9b9c820`): core loop in a single HTML file. Counter queue with patience bars, tray assembly from góndolas, fiambre slicing minigame (hold-and-release, golden zone = tip), the **libreta de fiados** (caseritos ask to buy on credit: accept = no cash now but +fama and collection with 15% tip on paydays days 3/5/7; deny = cash but −fama), 7-day cycle with nightly rent, newspaper-style day summaries, lose by bankruptcy or fama=0, synthesized cumbia.
2. **v2** (commit `04239d0`): variety pass after feedback that the loop got repetitive.
   - **Festive events** ("el almanaque corre rápido"): day 2 = 1° de Mayo asado (cuarteto music, ember visuals, rushed customers), day 4 = 25 de Mayo locro patrio (chacarera in 6/8 with bombo legüero, celeste bunting, picky doñas), day 6 = Nochebuena (cumbia with bells, string lights, caseritos surge). Each event: intro card, special shelf with event items, spawn-rate multiplier, archetype weight boosts, own music theme and body CSS theme.
   - **Customer archetypes**: `kid` 🎒 swaps a (non-sliced) order item mid-wait up to 2 times; `picky` 🧐 rejects sliced items below quality 2 and removes them from the tray, but tips +10%; `rushed` ⏱️ has 0.55× patience and tips +25% if served above 50% patience; `caserito` ⭐ is the fiado-asking loyal customer.
   - Radio AM Barrio flavor toasts, floating money on sales, event-aware newspaper headlines.
3. **Refactor** (commit `0115d6c`): split the 1,158-line monolith into ES modules, converted all click handling to event delegation via `data-*` attributes, added `tools/build_standalone.py`.
4. **v3** (commit `a8552c9`): **sudestada** on day 5 — the first event with a mid-day mechanic. Rain theme + "tormenta" music (milonga triste); at 35–50% of the day the power cuts for 22–30s: heladera items unbuyable, cold items drop out of pending orders (all-cold orders become velas), the radio music goes silent, body gets `power-out` (dark + flickering candles). Velas/pilas/linterna on the event shelf. Also: repo pushed to GitHub, deployed to Pages, storage swapped to localStorage. Later renamed Almacén Alegre → **Gran Almacén** (repo `nadimest/gran-almacen`).

## Repo layout

```
index.html                  DOM shell only (modals, HUD, containers)
css/styles.css              all styles incl. theme-asado/patrio/navidad/sudestada + power-out
js/helpers.js               pure utils ($, rnd, ri, pick, fmt, clamp)
js/data.js                  ITEMS, STATIONS, EVENTS, ARCH, FOLKS, all dialogue  ← most content work happens here
js/audio.js                 Web Audio sequencer + synth engine: tone() generic ADSR voice (detuned osc stacks, filter env, vibrato), instrument recipes (acordeon/bajo/pianito/cencerro/timbal/bombo/guiro), synthesized convolver reverb + compressor master. MUSIC themes (cumbia, cuarteto, chacarera, navidad, tormenta) are 8-bar 2-phase loops (comping → melody via mel arrays + playMel) with phrase-end fills. setPower() mutes music during apagón
js/state.js                 G (single mutable state container) + pure queries (currentEvent, unlockedItems, grabItems, neededGrams, anyoneWants)
js/storage.js               best-run persistence via localStorage (try/catch tolerant: jsdom/private mode)
js/ui.js                    pure DOM rendering, NO event listeners; buttons carry data-cid / data-ti / data-key
js/game.js                  day cycle, rAF loop, spawning, archetype behavior, serve/pricing, fiado, slicing
js/main.js                  entry point; all wiring via 3 delegated listeners + modal buttons
tools/build_standalone.py   inlines css + concatenates modules (stripping import/export) → dist/index.html
tools/smoke_test.mjs        jsdom integration test against the built bundle (npm test)
.github/workflows/test.yml  CI: npm ci + npm test on every push/PR (README badge)
docs/*.png                  screenshots embedded in the README (re-capture via browse if visuals change)
LICENSE                     MIT
```

### Architecture rules (keep these invariants)

- **All mutable state lives in `G`** (`G.S` = current run, `G.paused`, `G.running`, `G.slice`, `G.fiado`, `G.custId`). Never add module-level mutable game state elsewhere (audio.js's internal engine vars are the one exception).
- **`ui.js` renders, never listens.** Interactive elements get `data-*` attributes; `main.js` delegates. Don't attach listeners inside render functions.
- **No circular imports.** Dependency DAG: helpers/data/audio ← state ← storage ← ui ← game ← main. `game.js` may touch modal DOM directly (slice/fiado/summary/title overlays); that's accepted.
- **Unique top-level names across all modules.** The standalone build concatenates everything into one scope and strips `ui.` / `game.` prefixes. A name collision between modules will break `dist/` silently — run `npm test` after structural changes.
- All player-facing text is **Rioplatense Spanish** (vos, che, querido, m'hijito). Code comments are Spanish or English, either is fine.

## Commands

```
python3 -m http.server 8000          # dev server (ES modules need http://)
python3 tools/build_standalone.py    # → dist/index.html (single shareable file)
npm install                          # dev only: jsdom for tests
npm test                             # build + jsdom smoke suite
```

Live at **https://nadimest.github.io/gran-almacen/** — GitHub Pages serves the repo root (`main` branch) directly; pushing to `main` redeploys. Remote: `github.com/nadimest/gran-almacen` (public). `dist/` and `node_modules/` are gitignored.

## Game balance reference (current values)

- Start: $20.000, fama 50/100. Day length: `80 + day*8` seconds. Rent: `6000 + day*2000` nightly. Lose: money < 0 after rent, or fama ≤ 0. Win: finish day 7.
- Patience: `clamp(34 − day*1.6 + (fama−50)/12, 16, 42)` × archetype patMul (kid 1.25, picky 0.72, rushed 0.55); caserito +5s.
- Fama deltas: sale +2, fiado accepted +6, fiado denied −9, customer walks −7.
- Slicing: target ±12g = perfect (quality 2, +20% tip on that item), ±30g = ok, beyond = ruined (recut). Slicer only opens if some customer needs that fiambre (`neededGrams`).
- Tips: +8% total if served above 60% patience; rushed +25% above 50%; picky +10% always (when satisfied).
- Fiado: caseritos ask with p=0.55 after a successful serve. Paydays at start of days 3/5/7 collect all debts ×1.15.
- Spawn: max concurrent `min(1+ceil(day/2), 3)`; interval `rnd(4,9) − min(day*0.4, 3)`, ÷ event spawnMul, floor 1.6s. Tray cap 6 items.
- Archetype weights: normal 30, caserito 24, kid 16 (day≥2), picky 13 (day≥3), rushed 11 (day≥2), plus per-event `archBoost`.
- Sudestada (day 5): apagón starts at `dayLen × rnd(0.35, 0.5)` elapsed, lasts `rnd(22, 30)`s, one per day (config in `EVENTS[5].cut`). During it: heladera blocked in `stationClick` and excluded from `unlockedItems`; pending cold order items dropped (`APAGON_SAY`), all-cold orders become velas (`APAGON_VELAS`). Radio uses `RADIO_SUDESTADA` all day.

## How to add content

- **New item**: entry in `ITEMS` (data.js) with `st` pointing at a station; `day:N` gates unlock. Done.
- **New festive event**: entry in `EVENTS` keyed by day + its items with `event:"id"` + optionally a `MUSIC` theme (audio.js) and a `body.theme-X` block (styles.css). `applyTheme` handles class swapping. Optional `cut:{from,to,dur}` gives the event a mid-day apagón (see sudestada).
- **New archetype**: `ARCH` + `FOLKS` + `GREETS` entries, weight in `pickArch()`, behavior hook in `update()` or `tryServe()` (see kid/picky for the two patterns: timed behavior vs. serve-time rule).

## Testing approach

`tools/smoke_test.mjs` boots the built bundle in jsdom and drives real click paths: start → simulated updates → delegated serve → fiado accept → station/tray clicks → event-day transition (theme + music) → picky rejection → sudestada apagón cycle (cut → cold orders dropped → heladera blocked → restore). jsdom has no AudioContext; the code already tolerates it being absent — keep it that way. Always run `npm test` before committing; add a scenario when you add a mechanic. For visual QA, build and drive `dist/index.html` in a real browser (game globals are reachable there because the bundle is one classic script).

## Backlog (discussed, not built — in rough priority order)

1. **Monedero minigame**: school kids pay with a fistful of coins — quick coin-counting interaction under time pressure (analogous to the slicer, but for payment).
2. **Persistent caseritos**: the same Doña Coca returns across days; debt, trust and dialogue evolve per person instead of per transaction. Needs identity in `S.debts` and spawn pool changes.
3. Endless mode after day 7 (victory screen already hints at it).
4. Mobile polish pass (it's already touch-first, 580px column).

## Quirks worth knowing

- The slicer keeps game time running (intentional Overcooked-style pressure); fiado and libreta modals pause it.
- `S.power === false` only ever happens during a `cut` event's apagón; `=== false` (not falsy) checks keep normal days (`power` undefined) unaffected.
- The apagón can outlive the day's closing bell if customers linger; `startDay`/`applyTheme`/`gameOver` all reset `power-out` + `setPower(true)`, so it can't leak across days.
