# Almacén Alegre 🥖🧀📒

Arcade de almacén de barrio argentino. Atendé el mostrador, cortá el fiambre al
peso justo y anotá a los caseritos en la libreta. Inspirado en Overcooked y
Theme Hospital, y en el almacén de la familia.

## Estructura

```
index.html              shell del DOM
css/styles.css          estilos (persiana, kraft, temas festivos)
js/
  helpers.js            utilidades puras
  data.js               catálogo, calendario festivo, arquetipos, diálogos
  audio.js              secuenciador Web Audio (cumbia/cuarteto/chacarera/navidad) + SFX
  state.js              contenedor de estado G + consultas puras
  storage.js            mejor racha persistente
  ui.js                 render puro del DOM (delegación por data-*)
  game.js               lógica: días, vecinos, entrega, fiado, cortadora
  main.js               cableado de eventos y arranque
tools/build_standalone.py   genera dist/index.html (un solo archivo)
```

Módulos ES sin build step. Para desarrollar:

```
python3 -m http.server 8000   # o npx serve
# http://localhost:8000
```

Para compartir como un solo archivo: `python3 tools/build_standalone.py` → `dist/index.html`.
GitHub Pages funciona directo desde la raíz del repo.

## Mecánicas
- Mostrador con cola de vecinos y barras de paciencia
- Cortadora de fiambre al gramo (zona dorada = propina)
- Libreta de fiados: fama vs. flujo de caja, días de cobro 3/5/7
- 7 días de dificultad creciente, alquiler nocturno, diario del barrio
- Cumbia sintetizada en Web Audio, sin assets externos

## v2 — "El almanaque corre rápido"
- **Eventos festivos**: Día 2 = 1° de Mayo (asado del barrio, suena cuarteto),
  Día 4 = 25 de Mayo (locro patrio, chacarera con bombo legüero y banderines),
  Día 6 = Nochebuena (pan dulce, sidra, lucecitas y cumbia con campanitas).
  Cada evento trae góndola especial, mezcla distinta de clientes y tema musical propio.
- **Arquetipos de vecinos**: pibes de la escuela 🎒 que cambian el pedido a mitad
  de espera, doñas exigentes 🧐 que rechazan cortes que no sean al gramo (pero
  pagan bien), apurados ⏱️ con propina grande si volás, y los caseritos ⭐ de siempre.
- **Radio AM Barrio**, plata flotante en el mostrador, titulares de diario por evento.
