#!/usr/bin/env python3
"""Genera dist/index.html: un solo archivo HTML autocontenido.

Concatena los módulos ES en orden de dependencia, pelando imports/exports
(todos los nombres son únicos entre módulos), e inlinea el CSS.
Útil para compartir el juego como un archivo o jugarlo sin servidor.
"""
import re, os, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
ORDER = ["helpers.js", "data.js", "audio.js", "state.js", "storage.js", "ui.js", "game.js", "main.js"]

def strip_module(src: str) -> str:
    out = []
    for line in src.splitlines():
        if re.match(r"\s*import\b", line):
            continue
        line = re.sub(r"^(\s*)export\s+", r"\1", line)
        out.append(line)
    return "\n".join(out)

def main():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "css" / "styles.css").read_text(encoding="utf-8")

    bundle = ['"use strict";']
    for name in ORDER:
        src = (ROOT / "js" / name).read_text(encoding="utf-8")
        bundle.append(f"/* ========== js/{name} ========== */")
        bundle.append(strip_module(src))
    js = "\n".join(bundle)
    # los módulos usan `ui.x` y `game.x`; en el bundle plano creamos alias
    js = js.replace("import * as ui", "").replace("import * as game", "")
    js = re.sub(r"\bui\.", "", js)
    js = re.sub(r"\bgame\.", "", js)

    out = html.replace('<link rel="stylesheet" href="css/styles.css">', "<style>\n" + css + "</style>")
    out = out.replace('<script type="module" src="js/main.js"></script>', "<script>\n" + js + "\n</script>")

    dist = ROOT / "dist"
    dist.mkdir(exist_ok=True)
    (dist / "index.html").write_text(out, encoding="utf-8")
    print(f"OK -> dist/index.html ({len(out):,} bytes)")

if __name__ == "__main__":
    main()
