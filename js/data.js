/* Datos del juego: catálogo, calendario festivo, arquetipos y diálogos */

export const ITEMS = {
  pan:     {name:"Pan flauta",      emoji:"🥖", price:500,  st:"panaderia", day:1},
  factura: {name:"Facturas ½ doc.", emoji:"🥐", price:2200, st:"panaderia", day:2},
  criollo: {name:"Criollitos",      emoji:"🥨", price:1400, st:"panaderia", day:4},
  soda:    {name:"Gaseosa",         emoji:"🥤", price:1500, st:"heladera",  day:1},
  leche:   {name:"Leche",           emoji:"🥛", price:1000, st:"heladera",  day:1},
  birra:   {name:"Birra fría",      emoji:"🍺", price:2500, st:"heladera",  day:3},
  yerba:   {name:"Yerba",           emoji:"🧉", price:3000, st:"gondola",   day:1},
  fideos:  {name:"Fideos",          emoji:"🍝", price:1300, st:"gondola",   day:1},
  huevos:  {name:"Huevos ½ doc.",   emoji:"🥚", price:1600, st:"gondola",   day:2},
  pure:    {name:"Puré de tomate",  emoji:"🥫", price:900,  st:"gondola",   day:3},
  queso:   {name:"Queso máquina",   emoji:"🧀", per100:1800, st:"fiambrera", day:1, sliced:true},
  jamon:   {name:"Jamón cocido",    emoji:"🥓", per100:2200, st:"fiambrera", day:2, sliced:true},
  salame:  {name:"Salame de Tandil",emoji:"🍖", per100:2000, st:"fiambrera", day:3, sliced:true},
  /* --- de evento --- */
  carbon:  {name:"Carbón 4kg",      emoji:"🔥", price:4800, st:"evento", day:99, event:"asado"},
  chori:   {name:"Choris x6",       emoji:"🌭", price:5500, st:"evento", day:99, event:"asado"},
  chimi:   {name:"Chimichurri",     emoji:"🫙", price:1900, st:"evento", day:99, event:"asado"},
  zapallo: {name:"Zapallo p/ locro",emoji:"🎃", price:2600, st:"evento", day:99, event:"patrio"},
  porotos: {name:"Porotos y maíz",  emoji:"🫘", price:2300, st:"evento", day:99, event:"patrio"},
  pastel:  {name:"Pastelitos x6",   emoji:"🥟", price:3200, st:"evento", day:99, event:"patrio"},
  pandulce:{name:"Pan dulce",       emoji:"🍰", price:6200, st:"evento", day:99, event:"navidad"},
  sidra:   {name:"Sidra fría",      emoji:"🍾", price:4500, st:"evento", day:99, event:"navidad"},
  garrapi: {name:"Garrapiñada",     emoji:"🥜", price:1600, st:"evento", day:99, event:"navidad"},
};

export const STATIONS = [
  {id:"evento",    label:"🎉 ESPECIAL DE HOY", fest:true},
  {id:"panaderia", label:"PANADERÍA"},
  {id:"heladera",  label:"HELADERA"},
  {id:"gondola",   label:"GÓNDOLA"},
  {id:"fiambrera", label:"FIAMBRERA — AL PESO"},
];

export const GRAM_OPTS = [100, 150, 200, 250, 300];

/* En este barrio el almanaque corre rápido */
export const EVENTS = {
  2:{ id:"asado", emoji:"🔥🌭", name:"1° DE MAYO — ASADO DEL BARRIO", theme:"asado", music:"cuarteto",
      desc:"Feriado del Trabajador y la cuadra entera prende la parrilla. Cae todo el mundo apurado por carbón y choris.",
      rules:"🌭 Productos de asado en la <b>góndola especial</b> (precios de feriado, caja feliz).<br>⏱️ Mucho vecino <b>apurado</b>: poca paciencia, gran propina si volás.<br>🎵 Suena cuarteto: tunga-tunga hasta que se apague la brasa.",
      spawnMul:1.45, archBoost:{rushed:28} },
  4:{ id:"patrio", emoji:"🇦🇷🍲", name:"25 DE MAYO — LOCRO PATRIO", theme:"patrio", music:"chacarera",
      desc:"Escarapelas, llovizna y olor a locro. Las doñas del barrio compiten por el locro más espeso de la cuadra.",
      rules:"🎃 Zapallo, porotos y pastelitos en la <b>góndola especial</b>.<br>🧐 Las <b>doñas exigentes</b> salen en banda: el fiambre va al gramo o lo cortás de nuevo.<br>🎵 Chacarera con bombo legüero, como debe ser.",
      spawnMul:1.2, archBoost:{picky:30} },
  6:{ id:"navidad", emoji:"🎄🍾", name:"NOCHEBUENA EN EL BARRIO", theme:"navidad", music:"navidad",
      desc:"En este barrio el almanaque corre rápido: ya es 24 de diciembre. Lucecitas, calor de 40 grados y todos dejaron el pan dulce para último momento.",
      rules:"🍰 Pan dulce, sidra y garrapiñada en la <b>góndola especial</b>.<br>📒 Los <b>caseritos</b> caen a saludar (y a fiar): es tu última chance de hacer fama.<br>🎵 Cumbia navideña con campanitas. Brindis a las 12.",
      spawnMul:1.3, archBoost:{caserito:20, picky:10} },
};

export const ARCH = {
  normal:  { badge:"" },
  caserito:{ badge:"⭐ caserito" },
  kid:     { badge:"🎒 de la escuela", patMul:1.25 },
  picky:   { badge:"🧐 exigente",      patMul:0.72 },
  rushed:  { badge:"⏱️ apurado",       patMul:0.55 },
};

export const FOLKS = {
  normal:[{nm:"Tito",em:"👨‍🦱"},{nm:"Marta",em:"👩‍🦰"},{nm:"Beto",em:"🧔"},{nm:"El Colo",em:"👨‍🦰"},{nm:"Walter",em:"👷"},{nm:"La Seño Inés",em:"👩‍🏫"}],
  caserito:[{nm:"Doña Coca",em:"👵"},{nm:"Don Atilio",em:"👴"},{nm:"Doña Pocha",em:"👩‍🦳"},{nm:"Cacho",em:"👨‍🦳"}],
  kid:[{nm:"Tomi",em:"🧒"},{nm:"Mili",em:"👧"},{nm:"Juampi",em:"🧒"},{nm:"Sofi",em:"👧"}],
  picky:[{nm:"Doña Nélida",em:"🧓"},{nm:"Doña Beba",em:"👵"},{nm:"Madame Cristina",em:"💇‍♀️"}],
  rushed:[{nm:"Lic. Páez",em:"👨‍💼"},{nm:"La Dra. Ruiz",em:"👩‍⚕️"},{nm:"Rafa el remisero",em:"🧢"}],
};

export const GREETS = {
  normal:["¡Buenaaas!","¿Cómo anda, jefe?","¡Buen día, vecino!","¿Qué hacés, pibe?","Permiso…"],
  caserito:["Hola querido…","¡Llegó el casero!","¿Cómo anda la familia?"],
  kid:["¡Hola don! Me mandó mi mamá","Eeeh… ¿tenés…?","*mascando chicle* Hola","Dice mi vieja que…"],
  picky:["Buenas. Espero que hoy sí…","A ver, atendeme bien…","Que sea fresco, ¿eh?"],
  rushed:["¡Rápido que pierdo el bondi!","Dale dale dale…","Tengo el remís esperando…"],
};

export const HAPPY=["¡Gracias, papá!","¡Sos un fenómeno!","¡Hasta luego!","¡Un capo!","Que ande bien…","¡Saludos a la familia!"];
export const ANGRY=["¡Me voy a lo de los chinos!","¡Qué atención, por favor!","¡Pierdo el bondi por vos!","Mejor el súper, mirá…"];
export const WRONG=["No, eso no pedí…","¿Me estás cargando?","Fijate de nuevo, querido","Eso no, lo otro"];
export const FIADO_ASK=["“¿Me lo anotás? El viernes te pago, de verdad.”","“Ando corta esta semana… ¿va a la libreta?”","“Anotámelo que cobro el lunes, jefe.”","“¿Te debo? Sabés que pago siempre.”"];
export const KID_SWAP=["¡Ay no! Mejor","Uh, me olvidé… era","Pará pará… mi mamá dijo","Mentira, era"];
export const PICKY_REJECT=["“Ese corte está grueso, m’hijito. De nuevo.”","“¿Esto es cortado a ojo? Al gramo, querido.”","“Mi finado Osvaldo lo cortaba mejor. Otra vez.”"];
export const RADIO=[
  "Radio AM Barrio: la del 3° B vio al almacenero cortar al gramo. “Un artista”, dijo.",
  "Radio AM Barrio: paro de colectivos mañana… o pasado. No se sabe.",
  "Radio AM Barrio: el club juega el domingo. Se viene el choripán solidario.",
  "Radio AM Barrio: la municipalidad promete arreglar la vereda “a la brevedad”.",
  "Radio AM Barrio: dicen que el súper grande no fía. Acá sí, señora.",
  "Radio AM Barrio: humedad al 98%. Se viene la sudestada.",
  "Radio AM Barrio: tango a las 20, cumbia a las 21, lo de siempre.",
];
