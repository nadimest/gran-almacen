/* Smoke test de integración: corre el bundle (dist/index.html) en jsdom
   y ejercita los caminos reales de click. Requiere: npm i (jsdom) y
   python3 tools/build_standalone.py (lo hace `npm test`). */
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";

const html = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true });
const w = dom.window;
w.requestAnimationFrame = cb => setTimeout(() => cb(w.performance.now()), 16);

let failed = 0;
const check = (name, cond) => {
  console.log((cond ? "✅" : "❌") + " " + name);
  if (!cond) failed++;
};

setTimeout(() => {
  try {
    // arranque
    w.document.getElementById("startBtn").click();
    for (let i = 0; i < 400; i++) w.eval("update(0.05)");
    check("día 1 arranca y llegan vecinos", w.eval("G.S.day===1 && G.S.customers.length>0"));
    check("música default cumbia", w.eval('getMusicTheme()==="cumbia"'));

    // entrega por delegación (camino real de click)
    w.eval("G.S.customers=[];spawnCustomer();");
    w.eval("const c=G.S.customers[0]; G.S.tray=c.order.map(o=>o.grams?{key:o.key,grams:o.grams,quality:2}:{key:o.key});");
    w.document.querySelector(".servebtn").click();
    if (w.eval("!!G.fiado")) w.document.getElementById("fiadoYes").click();
    check("entrega delegada funciona", w.eval("G.S.stats.served===1 && G.S.customers.length===0"));

    // góndola y bandeja por delegación
    w.eval('G.S.customers=[{id:99,nm:"T",em:"🧔",arch:"normal",loyal:false,order:[{key:"pan"}],patience:30,maxPat:30,greet:"h",changes:9}];renderCustomers();G.S.tray=[];');
    w.document.querySelector('.stbtn[data-key="pan"]').click();
    check("click en góndola agrega a bandeja", w.eval('G.S.tray.length===1 && G.S.tray[0].key==="pan"'));
    w.document.querySelector(".titem").click();
    check("click en ítem de bandeja lo devuelve", w.eval("G.S.tray.length===0"));

    // transición a día de evento (asado)
    w.eval("G.S.timeLeft=0;G.S.closing=true;G.S.customers=[];update(0.05)");
    w.document.getElementById("nextDayBtn").click();
    check("día 2: overlay de evento", !w.document.getElementById("eventOverlay").classList.contains("hidden"));
    check("día 2: tema asado + cuarteto", w.document.body.className.includes("theme-asado") && w.eval('getMusicTheme()==="cuarteto"'));
    w.document.getElementById("eventGo").click();
    check("góndola especial renderizada", w.document.querySelectorAll(".stbtn.evento").length === 3);

    // doña exigente rechaza corte no perfecto y lo saca de la bandeja
    w.eval('G.S.customers=[];G.S.tray=[{key:"queso",grams:200,quality:1}];G.S.customers.push({id:3,nm:"Doña Beba",em:"👵",arch:"picky",loyal:false,order:[{key:"queso",grams:200}],patience:30,maxPat:30,greet:"h",changes:9});renderCustomers();');
    w.eval("tryServe(G.S.customers[0])");
    check("picky rechaza calidad<2 y vacía el corte", w.eval("G.S.customers.length===1 && G.S.tray.length===0"));
    w.eval('G.S.tray=[{key:"queso",grams:200,quality:2}];tryServe(G.S.customers[0])');
    check("picky acepta corte perfecto", w.eval("G.S.customers.length===0"));

    // pibe de la escuela cambia el pedido
    w.eval('G.S.customers=[];const c={id:4,nm:"Tomi",em:"🧒",arch:"kid",loyal:false,order:[{key:"pan"},{key:"soda"}],patience:30,maxPat:30,greet:"h",changes:0,changeT:0.01};G.S.customers.push(c);renderCustomers();');
    const before = w.eval("JSON.stringify(G.S.customers[0].order)");
    w.eval("update(0.05)");
    check("kid cambia el pedido a mitad de espera", before !== w.eval("JSON.stringify(G.S.customers[0].order)"));

    // sudestada (día 5): apagón de luz
    w.eval("G.S.day=4;G.S.customers=[];G.S.debts=[];startDay()");
    w.document.getElementById("eventGo").click();
    check("día 5: tema sudestada + tormenta", w.document.body.className.includes("theme-sudestada") && w.eval('getMusicTheme()==="tormenta"'));
    w.eval('G.S.customers=[];G.S.tray=[];' +
      'G.S.customers.push({id:7,nm:"Beto",em:"🧔",arch:"normal",loyal:false,order:[{key:"birra"},{key:"pan"}],patience:30,maxPat:30,greet:"h",changes:9});' +
      'G.S.customers.push({id:8,nm:"Marta",em:"👩‍🦰",arch:"normal",loyal:false,order:[{key:"leche"}],patience:30,maxPat:30,greet:"h",changes:9});' +
      'renderCustomers();G.S.cutIn=0.01;update(0.05);');
    check("apagón: corta la luz y baja los pedidos fríos",
      w.eval("G.S.power===false") && w.document.body.classList.contains("power-out") &&
      w.eval('G.S.customers[0].order.length===1 && G.S.customers[0].order[0].key==="pan"'));
    check("apagón: pedido todo frío pasa a velas", w.eval('G.S.customers[1].order.length===1 && G.S.customers[1].order[0].key==="velas"'));
    w.document.querySelector('.stbtn[data-key="soda"]').click();
    check("apagón: heladera bloqueada", w.eval("G.S.tray.length===0"));
    w.eval("G.S.cutLeft=0.01;update(0.05)");
    w.document.querySelector('.stbtn[data-key="soda"]').click();
    check("vuelve la luz: heladera anda de nuevo",
      w.eval("G.S.power===true && G.S.tray.length===1") && !w.document.body.classList.contains("power-out"));

    console.log(failed ? `\n${failed} chequeo(s) fallaron` : "\nTodos los chequeos pasaron 🧉");
    process.exit(failed ? 1 : 0);
  } catch (e) {
    console.error("💥 Excepción en el smoke test:", e.stack || e);
    process.exit(1);
  }
}, 300);
