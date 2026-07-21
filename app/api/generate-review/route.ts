import { NextResponse } from "next/server";

const GROQ_API_KEYS = [
  process.env.GROQ_API_KEY || "",
  process.env.GROQ_API_KEY_2 || "",
  process.env.GROQ_API_KEY_3 || "",
  process.env.GROQ_API_KEY_4 || "",
  process.env.GROQ_API_KEY_5 || "",
  process.env.GROQ_API_KEY_6 || "",
  process.env.GROQ_API_KEY_7 || "",
].filter(Boolean);
const GROQ_MODEL = "llama-3.3-70b-versatile";

const SAMPLE_REVIEW_NAMES = [
  "Jose Arturo", "Anderson Jose", "Maria Carrillo", "Luis Gamarra", "Arturo Jose",
  "Valeria Sofia", "Sofi Marquez", "Yorbelis Rodriguez", "Neirimar Peña", "Jhonaiker Blanco",
  "Marielvis Suarez", "Yusneidy Contreras", "Deivis Alejandro", "Yolimar Perez", "Franyelis Diaz",
  "Kleiver Andres", "Yeraldin Moreno", "Nairobis Salazar", "Wilfredo Rangel", "Yusbeidy Ramirez",
  "Katiuska Fernandez", "Maiker Gonzalez", "Rosmary Torres", "Yeison David", "Estefany Nava",
  "Gleimar Rincon", "Marielys Camacho", "Deiker Rojas", "Yubelkis Aponte", "Franyeli Bastidas",
  "Jhon Albert", "Alexander Vargas", "Andres Jholbert", "Carlos Uzcategui", "Miguelangel Rondon",
  "Jesus Chourio", "Yeferson Delgado", "Robert Escalona", "Franklin Barrios", "Yordy Lugo",
  "Edgardo Villalobos", "Jeanpierre Zambrano", "Yorman Petit", "Argenis Colmenares", "Jeanfranco Rios",
  "Wuilmer Bracho", "Kervin Montilla", "Yohan Prieto", "Ronaldo Semprun", "Eliezer Paz",
  "Maikel Fuenmayor", "Yerson Chacin", "Angel Urdaneta", "Dailer Morales", "Reinaldo Pirela",
];

const MALE_FIRST_NAMES = [
  "Jose","Luis","Carlos","Anderson","Jhonaiker","Deivis","Kleiver","Wilfredo","Maiker","Yeison",
  "Deiker","Jhon","Alexander","Andres","Franklin","Yeferson","Robert","Yordy","Edgardo","Jeanpierre",
  "Yorman","Argenis","Jeanfranco","Wuilmer","Kervin","Yohan","Ronaldo","Eliezer","Maikel","Yerson",
  "Angel","Dailer","Reinaldo","Yeisson","Cristopher","Jeanmarco","Yorvin","Alixon","Ruben","Yorgel",
  "Emerson","Neomar","Yeikol","Ismael","Yohandry","Marcos","Cristian","Yoendris","Gregory","Ronny",
  "Yorbis","Jeikel","Yeremy","Franyer","Yohander","Deybis","Yerlin","Wilker","Yeimer","Jeanderson",
  "Yosneiber","Kelvin","Yohanser","Endher","Yeimar","Jeanmichael","Yorwin","Ademar","Yeikson","Anthony",
  "Yeiker","Ronal","Yorvis","Miguelangel","Jesus","Yohaner","Freddy","Yorbelis","Elimar","Yerald",
  "Osman","Yohanny","Rixon","Yoiner","Adonai","Yeixon","Ronaldy","Yorgel","Neiber","Yeikcer",
];
const FEMALE_FIRST_NAMES = [
  "Maria","Valeria","Sofia","Yorbelis","Neirimar","Marielvis","Yusneidy","Yolimar","Franyelis","Yeraldin",
  "Nairobis","Yusbeidy","Katiuska","Rosmary","Estefany","Gleimar","Marielys","Yubelkis","Franyeli","Genesis",
  "Yorgelis","Migdalia","Anyelina","Yeimy","Carla","Marielena","Yusmely","Dayana","Yorley","Anakarina",
  "Yubisay","Solangel","Zuleima","Yohana","Wendy","Adriana","Yumelis","Marbelys","Ninoska","Yosmar",
  "Anghy","Deisy","Yeslibeth","Ana","Yusleidy","Carolina","Yulimar","Yenifer","Yoselin","Mariangel",
  "Zoraida","Yubisay","Yorlenis","Marielsi","Yusmar","Karelis","Yorman","Andreina","Yosmely","Elimar",
  "Yenny","Yoleida","Ninoska","Yeliany","Marianyela","Yulaimis","Roselys","Yumaira","Yeismar","Anghela",
];
const LAST_NAMES = [
  "Rodriguez","Perez","Gonzalez","Fernandez","Martinez","Sanchez","Ramirez","Torres","Flores","Rivera",
  "Gomez","Diaz","Reyes","Morales","Ortiz","Chirinos","Bracho","Villalobos","Fuenmayor","Urdaneta",
  "Boscan","Petit","Ferrer","Colmenares","Rincon","Nava","Bermudez","Semprun","Vera","Larez",
  "Andrade","Zambrano","Materan","Atencio","Guerra","Perozo","Portillo","Balza","Chiquinquira","Faria",
  "Añez","Quintero","Vilchez","Contreras","Blanco","Rojas","Aponte","Bastidas","Camacho","Suarez",
  "Salazar","Rangel","Peña","Delgado","Escalona","Barrios","Lugo","Rondon","Chourio","Uzcategui",
  "Villasmil","Sulbaran","Palencia","Mavarez","Machado","Nuñez","Torrealba","Bohorquez","Larrazabal","Finol",
  "Molero","Marin","Reales","Paz","Rincones","Colina","Cova","Duran","Godoy","Gutierrez",
  "Hernandez","Herrera","Jimenez","Leal","Luna","Marquez","Medina","Mendoza","Moreno","Ochoa",
  "Ortega","Paredes","Prieto","Quiroz","Ramos","Salcedo","Silva","Tovar","Uzcanga","Vasquez",
];

function normalizeNameKey(name: string): string {
  return stripAccents(name.trim().toLowerCase()).replace(/\s+/g, " ");
}

function generateUniqueName(usedKeys: Set<string>, preferFemale = false): string {
  const firstPool = preferFemale ? FEMALE_FIRST_NAMES : MALE_FIRST_NAMES;
  let attempts = 0;
  while (attempts < 300) {
    const first = pick(firstPool);
    const last = pick(LAST_NAMES);
    const full = `${first} ${last}`;
    const key = normalizeNameKey(full);
    if (!usedKeys.has(key)) return capitalizeName(full);
    attempts++;
  }
  return capitalizeName(`${pick(firstPool)} ${pick(LAST_NAMES)} ${randomInt(2, 99)}`);
}

function catLabel(cat: string): string {
  const m: Record<string, string> = {
    "LENTES·FOTOCROMATICOS": "Fotocromaticos",
    "LENTES·ANTI-LUZ-AZUL": "Anti Luz Azul",
    "LENTES·SOL": "De Sol",
    "LENTES·MOTORIZADOS": "Para Motos",
  };
  return m[cat] ?? (cat[0] + cat.slice(1).toLowerCase());
}

function capitalizeName(raw: string): string {
  return raw.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const EMAIL_WORDS = [
  "real", "oficial", "vzla", "criollo", "pana", "mijo", "tuki", "full",
  "mega", "top", "pro", "guerrero", "team", "loco", "flow", "style",
  "chamo", "reyna", "king", "queen", "vip", "boss", "cash", "fire",
];

function intercalateNumber(word: string, num: string): string {
  const mid = Math.max(1, Math.min(word.length - 1, Math.floor(word.length / 2) + randomInt(-1, 1)));
  return word.slice(0, mid) + num + word.slice(mid);
}

function generateCreativeEmail(fullName: string): string {
  const clean = stripAccents(fullName.toLowerCase()).replace(/[^a-z\s]/g, "");
  const parts = clean.split(/\s+/).filter(Boolean);
  const first = parts[0] || "user";
  const last = parts[1] || pick(EMAIL_WORDS);
  const num2 = () => String(randomInt(1, 99));
  const num4 = () => String(randomInt(1980, 2010));
  const word = () => pick(EMAIL_WORDS);

  const patterns: Array<() => string> = [
    () => `${first}${word()}${num2()}`,
    () => `${word()}${num2()}${first}`,
    () => `${first}${last.slice(0, 3)}${num2()}`,
    () => `${first.slice(0, 4)}${num2()}${last.slice(0, 2)}`,
    () => intercalateNumber(first, num2()),
    () => `${last || word()}${first.slice(0, 3)}${num2()}`,
    () => `${first}.${last || word()}${Math.random() < 0.5 ? num2() : ""}`,
    () => `${first}_${word()}${num2()}`,
    () => `${first}${num4().slice(2)}`,
    () => `${word()}.${first}${num2()}`,
  ];

  const local = pick(patterns)().replace(/\.+/g, ".").replace(/^\.|\.$/g, "");
  const domain = pick(["gmail.com", "hotmail.com"]);
  return `${local}@${domain}`;
}

function generateRandomPastDate(): Date {
  const r = Math.random();
  let year: number;
  if (r < 0.08) year = 2024;
  else if (r < 0.45) year = 2025;
  else year = 2026;

  let month: number, day: number;
  if (year === 2024) {
    month = randomInt(6, 12); // solo la parte más tardía de 2024
    day = randomInt(1, 28);
  } else if (year === 2025) {
    month = randomInt(1, 12);
    day = randomInt(1, 28);
  } else {
    const now = new Date();
    month = randomInt(1, now.getMonth() + 1);
    day = month === now.getMonth() + 1 ? randomInt(1, now.getDate()) : randomInt(1, 28);
  }
  return new Date(year, month - 1, day, randomInt(8, 22), randomInt(0, 59), 0, 0);
}

function pickWeightedStars(): number {
  const r = Math.random();
  if (r < 0.72) return 5;
  if (r < 0.94) return 4;
  return 3;
}

const OPENING_STYLES = [
  "empieza contando en qué momento u ocasión lo usó (ej: un viaje, el trabajo, una salida)",
  "empieza con una opinión directa y espontánea sobre la calidad o el material",
  "empieza comparando el producto con lo que esperaba antes de comprarlo",
  "empieza mencionando por qué decidió comprarlo",
  "empieza mencionando el envío, el empaque o la atención, y luego pasa al producto",
  "empieza contando para quién lo compró como regalo (novio, hermano, mamá, amiga) y cómo reaccionó al recibirlo",
  "empieza con un detalle específico y concreto del producto (color, tamaño, textura, ajuste)",
  "empieza como si le estuviera contando la experiencia a un amigo por WhatsApp",
  "empieza mencionando cuánto tiempo lleva usándolo",
  "empieza con una pregunta retórica corta antes de dar su opinión",
  "empieza hablando de la tienda en general (confianza, rapidez, trato) más que del producto puntual",
  "empieza diciendo que ya es cliente frecuente o que va a volver a comprar",
  "empieza con una expresión venezolana coloquial de sorpresa o emoción antes de opinar",
  "empieza contando que dudaba en comprar por miedo a que no llegara bien y se llevó una sorpresa",
  "empieza mencionando que se lo mostró a alguien más y esa persona también quedó encantada",
  "empieza a mitad de una idea, como si continuara un pensamiento que ya traía en la cabeza",
  "empieza con una comparación directa contra otra tienda o compra anterior que fue peor",
  "empieza describiendo su reacción física o gesto al abrir el paquete (sonrisa, sorpresa, cara de emoción)",
  "empieza mencionando qué estaba haciendo justo cuando le llegó el pedido",
  "empieza con un elogio corto y seco de una sola palabra o frase muy breve, y luego se explaya",
  "empieza contando una anécdota pequeña y aparentemente sin relación, que luego conecta con el producto",
  "empieza hablando del precio o de que esperaba que fuera más caro para lo que es",
  "empieza contando que había comprado antes un artículo del mismo tipo (la misma categoría exacta: si es un arete, otro arete; si es un reloj, otro reloj; nunca mezcles categorías distintas) en otra tienda y no le gustó la calidad, y que este quedó muchísimo mejor",
  "empieza con una frase corta a modo de titular, y el resto del comentario la desarrolla",
  "empieza contando que lo compró como regalo sorpresa para otra persona, y esa persona (no quien escribe la reseña) fue quien no se lo esperaba — quien escribe siempre es quien compró y pidió el producto, nunca el que lo recibió de sorpresa",
  "empieza quejándose brevemente de un detalle menor (demora, empaque simple) que igual no opaca lo positivo",
  "empieza quejándose de sí mismo por haber tardado tanto en comprarlo",
];

const TONE_STYLES = [
  "tono entusiasta pero natural, sin sonar exagerado",
  "tono tranquilo, satisfecho, casi de paso",
  "tono casual y directo, como mensaje rápido",
  "tono breve y telegráfico, pocas palabras",
  "tono cálido con un toque de humor sutil",
  "tono orgulloso, como quien presume su compra",
  "tono maternal/paternal, hablando de un regalo para un hijo o familiar",
  "tono de pareja enamorada contando la reacción del novio/novia al recibir el regalo",
  "tono de venezolano criollo, con alguna expresión local (ej: 'de pana', 'que fino', 'bien chevere') usada con naturalidad, sin abusar",
  "tono un poco sorprendido, como si no esperaba que fuera tan bueno",
  "tono serio y formal, casi como una recomendación profesional",
  "tono relajado y perezoso, como quien escribe medio dormido pero contento",
  "tono agradecido, dirigiéndose casi como una carta corta a la tienda",
  "tono práctico y sin adornos, centrado solo en datos útiles para otro comprador",
  "tono nostálgico, comparando con una compra parecida de hace tiempo",
];

const BANNED_OPENERS = [
  "Me encantó", "Excelente producto", "Muy buena calidad", "Súper recomendado",
  "Increíble calidad", "Estoy muy satisfecho", "Quedé encantada", "Superó mis expectativas",
  "Totalmente satisfecho", "Cumplió mis expectativas", "Buenísima calidad", "Producto de excelente calidad",
];

const COMMENT_FOCUS_STYLES = [
  "concéntrate en alabar la tienda en general (buena atención, buenos precios, confianza), más que en el producto puntual",
  "concéntrate en decir que la tienda 'siga así', que van a crecer, o que es la mejor tienda del país en su rubro — esta frase va dirigida a la tienda felicitándola por su servicio, nunca es una instrucción a otros clientes de 'seguir comprando'",
  "concéntrate en un beneficio concreto que le trajo el producto en su día a día (ver mejor, no llegar tarde, protegerse del sol, verse bien, cuidar la vista, etc), acorde a la categoría del producto — piensa en un beneficio distinto y específico según sea lentes, reloj, pulsera, collar, arete, anillo o billetera, no repitas siempre el mismo tipo de beneficio",
  "concéntrate en contar que lo pidió desde un estado o ciudad de Venezuela y que llegó rápido y en buen estado",
  "concéntrate en una característica visual o física concreta del producto (color, diseño, tamaño, textura, ajuste, brillo, acabado)",
  "concéntrate en decir que ya había comprado antes y que volverá a comprar pronto",
  "concéntrate en la relación calidad-precio",
  "concéntrate en el envío y la atención recibida, más que en el producto en sí",
  "concéntrate en comparar el producto con uno del mismo tipo de artículo (misma categoría exacta) que compró antes en otra tienda (fuera de aquí) y que no le gustó o no cumplió, y explica con claridad por qué el de esta tienda está muchísimo mejor. importante: el producto de la comparación debe ser exactamente del mismo tipo que el que se está reseñando (arete con arete, pulsera con pulsera, reloj con reloj, etc.), nunca menciones un tipo de accesorio distinto al que corresponde esta reseña. puedes usar frases tipo '100% recomendados' o calificar informalmente el producto, ej: 'esto está 20/10'",
  "concéntrate en lo fácil que fue todo el proceso de compra por WhatsApp, sin mencionar mucho el producto en sí",
  "concéntrate en un comentario sobre el empaque o la presentación al llegar",
  "concéntrate en cómo le quedó puesto o cómo se ve usándolo, más que en describirlo objetivamente",
  "concéntrate en que fue justo lo que buscaba, ni más ni menos, sin adornarlo demasiado",
  "concéntrate en recomendarlo específicamente a un tipo de persona (para trabajar, para estudiar, para el día a día, para salir)",
  "concéntrate específicamente en lo bien cuidado, protegido o presentado que venía el empaque, como si fuera de una tienda de verdad y no algo improvisado",
  "concéntrate en lo original y diferente que es el diseño del artículo comparado con lo que se consigue normalmente en la calle o en otras tiendas",
  "concéntrate específicamente en la calidad del material (que no se ve barato, que pesa bien, que no parece que se va a dañar rápido)",
  "concéntrate en la persona que lo atendió por WhatsApp: que fue amable, rápida para responder, resolvió dudas, o hizo sentir la compra segura",
  "concéntrate en lo fácil, rápido y sin complicaciones que fue comprar directamente desde la página web, sin tener que hacer nada complicado",
  "concéntrate en que el artículo se ve incluso mejor en persona que en las fotos de la página",
  "concéntrate en la durabilidad esperada o ya comprobada del producto tras un tiempo de uso",
  "concéntrate en el detalle de que el precio le pareció justo o incluso bajo para la calidad que recibió",
  "concéntrate en decir que ya le había comprado antes a la tienda y que lo va a seguir haciendo, como cliente de confianza",
  "concéntrate en lo bonito o cuidado que llegó el empaque, con una frase corta y espontánea tipo cumplido directo",
  "concéntrate en decir explícitamente que la experiencia de compra en esta tienda online fue excelente, mencionando que fue directo desde la página web",
  "concéntrate en decir que confió en la tienda tal cual se veía en las fotos o en la página, y que la realidad no lo defraudó",
  "concéntrate en que ya se siente identificado con la marca, algo como 'me identifico con la marca', 'me siento identificada con fokus', 'soy team fokus', 'me encanta su identidad de marca' o 'excelentes productos los que ofrecen', sin mencionar el logo puntualmente",
  "concéntrate en contar una pequeña anécdota puntual con el accesorio (una salida, un comentario que le hicieron usándolo, una situación graciosa o curiosa)",
  "concéntrate en combinar DOS de estos aspectos a la vez de forma natural, sin que se sienta forzado: por ejemplo calidad + rapidez de envío, o diseño + atención, o precio + confianza, eligiendo tú la combinación",
  "concéntrate en lo cómodo que resulta usar el producto en el día a día, más allá de cómo se ve",
  "concéntrate en que fue una compra impulsiva que terminó siendo una excelente decisión",
  "concéntrate en el detalle de que se ve tal cual como en las fotos de la página, ni mejor ni peor, exactamente igual",
  "concéntrate en el orgullo de comprar en una tienda venezolana o local, apoyando algo hecho o vendido en el país",
];

const GIFT_RECIPIENTS_MALE_NONROMANTIC = [
  "mi hijo", "mi papá", "mi hermano", "mi cuñado", "mi tío",
  "mi mejor amigo", "mi suegro", "mi primo", "mi nieto", "mi yerno", "mi compadre",
  "un amigo del trabajo", "mi ahijado", "mi abuelo", "mi sobrino", "un pana del trabajo",
];
const GIFT_RECIPIENTS_FEMALE_NONROMANTIC = [
  "mi mamá", "mi hermana", "mi hija", "mi cuñada", "mi tía",
  "mi mejor amiga", "mi suegra", "mi prima", "mi abuela", "mi sobrina", "mi ahijada",
];
const GIFT_RECIPIENTS_MALE_ROMANTIC = ["mi esposo", "mi novio"];
const GIFT_RECIPIENTS_FEMALE_ROMANTIC = ["mi esposa", "mi novia"];
const GIFT_PHRASE_TEMPLATES = [
  "le regalé {producto} a {persona} y le encantó",
  "le regalé un par de {producto} a {persona}",
  "le regalé {producto} a {persona} por su cumple y me encantó la presentación",
  "le compré {producto} a {persona} y quedó feliz",
  "se lo compré a {persona} de regalo y no se lo esperaba",
  "fue un regalo para {persona} y la reacción valió la pena",
  "se lo di a {persona} de sorpresa y casi llora",
  "le compré esto y otra cosa más a {persona}, quedó encantado",
  "me tocó {persona} en el intercambio de regalos y le regalé esto",
  "le tocó regalarle a {persona} en el amigo secreto y elegí esto",
];

const CATEGORY_BENEFIT_EXAMPLES: Record<string, string[]> = {
  "ANILLOS": [
    "desde que lo compré juego mucho con él para los nervios",
    "lo uso cuando estoy estresado y me relaja bastante",
    "me encanta girarlo, me quita el aburrimiento",
    "qué rica sensación da girarlo cuando estoy ansioso",
  ],
  "LENTES·ANTI-LUZ-AZUL": [
    "estaba jugando GTA V en la play hasta tarde y no se me cansó la vista",
    "paso horas trabajando en la pc y ya no me arden tanto los ojos",
    "veo series en la tele hasta tarde y no me duele tanto la cabeza",
    "estudio de noche en la laptop y ya no se me cansa tanto la vista",
    "leo en el cel antes de dormir y ya no me arden los ojos",
    "jugaba en la compu y se me cansaba la vista, con estos ya no",
    "trabajo todo el día frente a la pantalla y ahora no llego tan cansado de la vista",
  ],
  "PULSERAS": [
    "qué calidad tan brutal tiene esta pulsera",
    "esta 3 en 1 está demasiado original",
    "la mandé a grabar y quedó bella",
  ],
  "RELOJES": [
    "ahora nunca llego tarde jaja",
  ],
  "ARETES": [
    "no había visto aretes tan originales y de tan buena calidad en otro lado",
  ],
  "BILLETERAS": [
    "mandé a grabar mi billetera y quedó espectacular",
    "ya llevo mucho tiempo con ella y de verdad me gusta esta marca, está brutal",
  ],
  "COLLARES": [
    "ya había comprado en otra tienda y se le peló o perdió el color",
    "en esta llevo ya 9 meses y está con el brillo original, intacto",
    "lo metí hasta en la piscina y sigue igual",
    "lo llevé a la playa y sigue igual",
  ],
  "LENTES·MOTORIZADOS": [
    "ahora protejo mi vista cuando manejo, ya no me entra basura ni piedritas",
    "me gusta usarlos con el casco",
    "combinan con el color de mi moto",
  ],
  "LENTES·SOL": [
    "estos cuadran full en la playa",
    "ya los llevé a un playeo y todo bello",
    "los llevé a la piscinada de mi promo de la uni y se ven aesthetic",
    "se los vi puestos a un actor famoso y me gustaron",
  ],
  "LENTES·FOTOCROMATICOS": [
    "ahora protejo mi vista del sol",
    "se oscurecen bien rápido",
    "me gusta cómo cambian de tono",
    "me gusta cómo se ven claritos y también oscuros",
  ],
};

const VENEZUELAN_CITIES = [
  "Caracas","Maracaibo","Valencia","Barquisimeto","Maracay","Ciudad Guayana","Puerto Ordaz",
  "San Cristóbal","Maturín","Barcelona","Puerto La Cruz","Turmero","Ciudad Bolívar","Cumaná",
  "Mérida","Cabimas","Coro","Guarenas","Guatire","Los Teques","Guanare","Acarigua","San Felipe",
  "Barinas","Punto Fijo","Valera","El Tigre","Cagua","Tinaquillo","San Fernando de Apure",
  "San Carlos","Trujillo","La Guaira","Porlamar","Tucupita","Puerto Ayacucho","Carúpano",
  "Guasdualito","Ocumare del Tuy","La Victoria","San Juan de los Morros","El Vigía","Charallave",
];

const VENEZUELAN_STATES = [
  "Amazonas","Anzoátegui","Apure","Aragua","Barinas","Bolívar","Carabobo","Cojedes",
  "Delta Amacuro","Distrito Capital","Falcón","Guárico","Lara","Mérida","Miranda","Monagas",
  "Nueva Esparta","Portuguesa","Sucre","Táchira","Trujillo","Vargas","Yaracuy","Zulia",
];

const MALE_SLANG_EXAMPLES = [
  "nwr", "increíble mi pana", "pana", "verga que buenos", "bello papá",
  "sisas me encantaron manito", "gracias por todo de vrdd", "que fino", "bien chevere",
  "mano", "wn", "chamo", "vrg", "manito", "hermano", "muchachos", "mijo", "jaja",
  "nwr de bellos", "de verdad nwr", "que nota mano", "todo bien pana",
];

const FEMALE_SLANG_EXAMPLES = [
  "nwr", "increíble de verdad", "pana", "que buenos", "amiga",
  "gracias por todo de vrdd", "que fino", "bien chevere", "chamo", "wn",
  "jaja", "nwr de bellos", "de verdad nwr", "que nota", "todo bien",
];

function buildSlangIntensity(isFemale: boolean): string[] {
  const pool = isFemale ? FEMALE_SLANG_EXAMPLES : MALE_SLANG_EXAMPLES;
  const naturalWarning = "IMPORTANTE: nunca pegues la expresión coloquial al final de la frase separada por una coma como si fuera una etiqueta o vocativo suelto (ej: NUNCA escribas algo como 'buenos y no tan caros, pana' o 'me encantaron, mano', eso se lee forzado y falso). En vez de eso, intégrala dentro de la construcción natural de la oración, como la usaría alguien realmente hablando (ej: 'de pana que me encantaron', 'está bien chevere el precio', 'nwr quedé encantado', 'que fino quedaron'). Solo puedes ponerla como vocativo al inicio de la frase si tiene sentido real de estar llamando a alguien (ej: 'pana, quedé full contento'), nunca como cierre pegado con coma.";
  return [
    "sin ninguna jerga venezolana, en español neutro y cercano",
    `con una sola palabra o expresión coloquial venezolana suelta de forma natural en cualquier parte de la frase (elige libremente entre estilos como: ${pool.join(", ")}, u otras similares), nunca forzada. ${naturalWarning}`,
    `con dos expresiones coloquiales venezolanas como máximo, bien naturales, como si lo escribiera alguien de la calle sin pensarlo mucho (puedes inspirarte en: ${pool.join(", ")}, u otras parecidas). ${naturalWarning}`,
  ];
}

const STRUCTURE_PATTERNS = [
  "estructura: una sola frase larga sin pausas, como si lo escribiera de corrido sin pensar",
  "estructura: dos oraciones cortas y separadas, casi telegráficas",
  "estructura: empieza con una idea, se corta con puntos suspensivos, y termina con otra idea distinta",
  "estructura: primero el veredicto final, y solo después explica por qué",
  "estructura: cuenta la experiencia en orden cronológico (antes de comprar, cuando llegó, ahora que lo usa)",
  "estructura: una pregunta seguida de su propia respuesta",
  "estructura: menciona primero un pequeño detalle negativo o duda inicial, y lo resuelve al final de forma positiva",
  "estructura: un párrafo corto y directo sin ninguna anécdota, solo el punto central",
  "estructura: mezcla dos ideas distintas conectadas con 'y' o 'pero', sin puntuación formal",
  "estructura: termina con una recomendación directa a otros compradores, con una frase que tenga sentido lógico como 'se los recomiendo full', 'cómprenlo sin miedo', o 'no duden en pedir aquí' — nunca algo confuso o sin sentido como decirle a otros clientes que 'sigan comprando'",
  "estructura: termina con una emoción o sensación personal, no con una recomendación",
  "estructura: no sigue ningún patrón de reseña, parece un mensaje de texto suelto y espontáneo",
];

const PUNCTUATION_STYLES = [
  "usa signos de exclamación en una sola parte del comentario, no en todo",
  "usa muy poca puntuación, casi sin comas, como si lo escribiera con prisa",
  "usa puntos suspensivos en algún punto para dar sensación de pausa o duda",
  "no uses ningún emoji ni signo especial, solo texto plano",
  "usa mayúsculas en una sola palabra para dar énfasis (ej: SUPER bien, ORIGINAL de verdad)",
];

const EMOJI_POOL = [
  "🖤","😍","🥰","😻","💕","💖","💗","💘","💝","✨","🔥","👌","🙌","👏",
  "🙏","🤗","😊","😄","😁","🥳","🎉","💯","👑","💎","⭐","🌟","😎","🤩",
  "❤️","🧡","💛","💚","💙","💜","🤎","🤍","😌","🥹","😭","🫶","👀","🕶️",
  "⌚","💍","👜","👍","😅","🤙","💪","🎁","📦","🚚","💫","☺️","🫡","🥇",
];

function buildEmojiInstruction(): string {
  const useEmojis = Math.random() < 0.33; // aproximadamente el 33% de los comentarios llevan emojis
  if (!useEmojis) {
    return "- NO uses ningún emoji en este comentario, escríbelo en texto plano de principio a fin.";
  }
  const count = randomInt(1, 4);
  const chosen: string[] = [];
  for (let i = 0; i < count; i++) chosen.push(pick(EMOJI_POOL));

  const placementPatterns = [
    `coloca ${count===1?"ese emoji":"esos emojis"} todos juntos en un solo punto de la frase (puede ser al inicio, en medio, o al final — elige libremente)`,
    `reparte los emojis en distintos puntos de la frase, cada uno intercalado entre dos palabras distintas, no todos juntos`,
    `agrupa algunos de los emojis (por ejemplo 2 juntos) en un punto, y coloca el resto suelto en otra parte de la frase`,
    `pon un emoji justo al principio del comentario, y el resto (si hay más de uno) distribuido entre palabras a lo largo del texto`,
    `pon todos los emojis únicamente al final del comentario, como remate`,
    `intercala cada emoji entre dos palabras específicas a lo largo de toda la frase, como si se le escaparan al escribir rápido`,
  ];
  const placement = pick(placementPatterns);

  const relevance = Math.random() < 0.55
    ? "usa emojis que tengan relación directa con el producto, la emoción de recibirlo, o la tienda (ej: caritas enamoradas, corazones, brillitos, manitos, caja/envío, el tipo de accesorio)"
    : "usa emojis que NO necesariamente tengan relación literal con el producto, simplemente que transmitan alegría, emoción o aprobación de forma espontánea, como los usaría cualquier persona real";

  return `- Este comentario SÍ debe llevar emojis: usa exactamente estos ${count} emoji(s) → ${chosen.join(" ")} (puedes repetir alguno si el conteo lo requiere, o usar variantes similares del mismo estilo). Para su ubicación, ${placement}. Sobre el criterio de selección, ${relevance}. Los emojis deben sentirse naturales y espontáneos, nunca forzados ni puestos todos en el mismo patrón que otros comentarios — la posición y agrupación deben variar completamente de una reseña a otra.`;
}

function buildCategoryBenefitLine(category: string): string {
  const key = (category || "").toUpperCase();
  const examples = CATEGORY_BENEFIT_EXAMPLES[key];
  if (!examples || !examples.length) return "";
  if (Math.random() < 0.4) {
    const chosen = pick(examples);
    return `- Si en este comentario vas a mencionar un beneficio concreto del producto, puedes inspirarte libremente (sin copiarla literal, adáptala a tu propio estilo y palabras) en una idea como esta: "${chosen}".`;
  }
  return "";
}

function buildPrompt(productName: string, category: string, excludeNames: string[] = []): string {
  const opening = OPENING_STYLES[Math.floor(Math.random() * OPENING_STYLES.length)];
  const tone = TONE_STYLES[Math.floor(Math.random() * TONE_STYLES.length)];
  const focus = COMMENT_FOCUS_STYLES[Math.floor(Math.random() * COMMENT_FOCUS_STYLES.length)];
  const structure = STRUCTURE_PATTERNS[Math.floor(Math.random() * STRUCTURE_PATTERNS.length)];
  const punctuation = PUNCTUATION_STYLES[Math.floor(Math.random() * PUNCTUATION_STYLES.length)];
  const emojiInstruction = buildEmojiInstruction();
  const reviewerIsFemale = Math.random() < 0.34;
  const slangPool = buildSlangIntensity(reviewerIsFemale);
  const slang = slangPool[Math.floor(Math.random() * slangPool.length)];
  const lengthTier = Math.random();
  const lengthWords = lengthTier < 0.35
    ? 5 + Math.floor(Math.random() * 8)   // muy cortos: 5-12 palabras
    : lengthTier < 0.8
    ? 13 + Math.floor(Math.random() * 15) // medianos: 13-27 palabras
    : 28 + Math.floor(Math.random() * 15); // largos: 28-42 palabras
  const isGiftComment = Math.random() < 0.12;
  const isRomanticGift = Math.random() < 0.3;
  let giftRecipient: string;
  if (isRomanticGift) {
    const oppositeGenderPool = reviewerIsFemale ? GIFT_RECIPIENTS_MALE_ROMANTIC : GIFT_RECIPIENTS_FEMALE_ROMANTIC;
    const sameGenderPool = reviewerIsFemale ? GIFT_RECIPIENTS_FEMALE_ROMANTIC : GIFT_RECIPIENTS_MALE_ROMANTIC;
    const useSameGenderMinority = Math.random() < 0.05; // muy pequeña minoría
    giftRecipient = useSameGenderMinority
      ? sameGenderPool[Math.floor(Math.random() * sameGenderPool.length)]
      : oppositeGenderPool[Math.floor(Math.random() * oppositeGenderPool.length)];
  } else {
    const giftIsForFemale = Math.random() < 0.10; // 90% hombres, 10% mujeres
    giftRecipient = giftIsForFemale
      ? GIFT_RECIPIENTS_FEMALE_NONROMANTIC[Math.floor(Math.random() * GIFT_RECIPIENTS_FEMALE_NONROMANTIC.length)]
      : GIFT_RECIPIENTS_MALE_NONROMANTIC[Math.floor(Math.random() * GIFT_RECIPIENTS_MALE_NONROMANTIC.length)];
  }
  const giftPhraseExample = GIFT_PHRASE_TEMPLATES[Math.floor(Math.random() * GIFT_PHRASE_TEMPLATES.length)]
    .replace("{persona}", giftRecipient);
  const giftLine = isGiftComment
    ? `- En este comentario en particular, cuenta que el producto fue (o incluye) un REGALO para ${giftRecipient}. Redacta esa parte con tus propias palabras y de forma natural, inspirándote libremente en el estilo de este ejemplo sin copiarlo literalmente: "${giftPhraseExample}". Puedes mencionar solo el regalo, o combinarlo con otro comentario sobre la tienda o la calidad. REGLA DE COHERENCIA OBLIGATORIA: como el producto es un regalo para ${giftRecipient}, NUNCA hables en primera persona de estar usándolo tú mismo (nada de "llevo días usándolo", "lo uso todos los días", "me queda perfecto puesto"), porque quien lo usa es ${giftRecipient}, no quien escribe la reseña. Si quieres mencionar el uso o cómo le queda, hazlo siempre en tercera persona sobre ${giftRecipient} (ej: "le queda increíble", "lo usa a cada rato", "se ve súper bien con ellos"), nunca sobre ti mismo.`
    : "";
  const mentionCity = Math.random() < 0.25;
  const mentionStateInstead = Math.random() < 0.35; // dentro del 25%, a veces usa estado en vez de ciudad
  const city = VENEZUELAN_CITIES[Math.floor(Math.random() * VENEZUELAN_CITIES.length)];
  const state = VENEZUELAN_STATES[Math.floor(Math.random() * VENEZUELAN_STATES.length)];
  const cityLine = mentionCity
    ? mentionStateInstead
      ? `- En este comentario en particular, menciona de forma natural que lo pidió desde el estado ${state} (u otro estado de Venezuela que tú elijas) y cómo fue la experiencia de recibirlo ahí.`
      : `- En este comentario en particular, menciona de forma natural que lo pidió desde ${city} (u otra ciudad de Venezuela que tú elijas) y cómo fue la experiencia de recibirlo ahí.`
    : "";
  const categoryBenefitLine = buildCategoryBenefitLine(category);
  const recentExclude = excludeNames.slice(-30);
  const excludeLine = recentExclude.length ? `- NUNCA uses ninguno de estos nombres y apellidos que ya se usaron antes (elige uno completamente distinto): ${recentExclude.join(", ")}.` : "";
  const genderFirstNames = reviewerIsFemale ? FEMALE_FIRST_NAMES : MALE_FIRST_NAMES;
  const nameStyleRoll = Math.random();
  const nameStyleInstruction = nameStyleRoll < 0.07
    ? `- EXCEPCIÓN DE NOMBRE (poco frecuente): en este comentario usa SOLO un nombre de pila corto o un apodo/diminutivo venezolano de ${reviewerIsFemale?"MUJER":"HOMBRE"}, SIN apellido. Inspírate en nombres como: ${genderFirstNames.slice(0,25).join(", ")}, usando una forma corta o diminutivo natural de ese mismo género. Nunca agregues apellido en este caso.`
    : `- El nombre debe ser un nombre venezolano realista de ${reviewerIsFemale?"MUJER":"HOMBRE"}. Usa un nombre de pila inspirado en esta lista: ${genderFirstNames.slice(0,30).join(", ")}, combinado con un apellido de esta lista: ${LAST_NAMES.slice(0,25).join(", ")}. Usa la MAYOR variedad posible de nombres y apellidos, evitando siempre los más obvios o repetidos.`;
  return `Genera una reseña de cliente en español (Venezuela) para este producto de accesorios: "${productName}" (categoría: ${catLabel(category)}).
Responde ÚNICAMENTE con un JSON válido, sin texto adicional ni backticks, con este formato exacto:
{"name":"...","email":"...","stars":5,"comment":"..."}
Reglas:
${nameStyleInstruction}
${excludeLine}
- Cada palabra del nombre debe empezar con mayúscula y el resto en minúscula.
- El correo debe estar completamente en minúsculas, basado en el nombre (sin tildes ni espacios), con dominio gmail.com, hotmail.com o outlook.com.
- Las estrellas deben ser mayormente 5, con menor frecuencia 4, y en muy pocas ocasiones 3. Sin importar la calificación (incluso si es 3), el comentario debe sonar igual de positivo, bien escrito y satisfecho que uno de 5 estrellas — la calificación no debe bajar la calidad ni el tono del texto.
- El comentario debe tener aproximadamente ${lengthWords} palabras, respeta ese largo con fidelidad y NUNCA lo excedas por mucho. En el conjunto general de reseñas debe haber una mezcla real: algunas muy cortas y directas (una frase de 5-12 palabras, como "ame la tienda, todo bello" o "que buena calidad, la recomiendo"), muchas de largo medio y breves, y unas pocas un poco más largas pero siempre concisas, yendo al punto sin relleno ni vueltas innecesarias. ningún comentario debe sentirse como un párrafo extenso: incluso los más largos deben leerse rápido, como algo que alguien escribe en menos de un minuto desde el celular.
- Para este comentario específico, ${opening}, con ${tone}, y ${focus}. Además, ${structure}, y ${punctuation}.
${categoryBenefitLine}
${giftLine}
- Habla la jerga ${slang}
- REGLA DE GÉNERO Y JERGA: el nombre generado es de ${reviewerIsFemale?"una MUJER":"un HOMBRE"}. Si es mujer, NUNCA uses expresiones como "sisas", "mano", "hermano" o "manito" (suenan masculinas); en su lugar, si quieres un toque coloquial, usa expresiones más neutras como "pana", "chamo", "que fino", "de verdad nwr" o "que nota". Si es hombre, sí puedes usar libremente cualquiera de esas expresiones.
- REGLA SOBRE "QUEDÉ"/"QUEDÓ": si usas "quedé" o "quedó", casi siempre di CÓMO quedó (ej: "quedé feliz", "quedé súper emocionada", "quedé conectada con la marca", "quedé adicta a la tienda", "quedó encantado", "quedó fascinada"). Nunca la dejes suelta pegada a una jerga sin sentido como "quedé de verdad nwr". Solo en pocas ocasiones, como excepción, puedes dejar "quedé" sola sin remate porque en Venezuela a veces se usa así de corta. También puedes usar alternativas como "amo esta tienda", "los amé" (refiriéndose al accesorio), o contar que combinó esta compra con otra de la tienda y que "quedó bello" el conjunto.
${emojiInstruction}
${cityLine}
- IMPORTANTE — RIGOR POR ARTÍCULO: este producto ya tiene o tendrá otras reseñas generadas de forma independiente. Es CRÍTICO que esta reseña en particular sea irreconocible en su forma frente a cualquier otra reseña típica del mismo artículo: no repitas el mismo orden de ideas, el mismo tipo de arranque, el mismo largo de frase ni el mismo cierre que usarías por defecto. Imagina que ya existen 10 reseñas distintas de este mismo producto y la tuya debe notarse a simple vista como diferente en ritmo, forma y construcción de frase, no solo en las palabras usadas.
- Varía también la longitud de las frases, la puntuación y el orden en que aparecen los datos, para que ningún comentario se parezca en su forma a otro. Ninguno debe sonar a plantilla ni seguir el mismo orden de ideas ni la misma cantidad de oraciones que otro.
- Si el comentario menciona una característica o beneficio del producto, que sea coherente con la categoría real (ej: lentes anti luz azul → protegen la vista al usar la computadora o estudiar; lentes fotocromáticos → se oscurecen con el sol y protegen los ojos; monturas/lentes de fórmula → se los colocó en la óptica y ahora ve mejor; relojes → nunca más llega tarde o siempre sabe la hora; pulseras/aretes/collares → se ven originales, bonito color, buen acabado; billeteras → buen material, cómoda, resistente).
- Al mencionar el producto dentro del comentario, NO uses siempre el nombre completo y exacto del artículo (ej: evita repetir "lentes anti luz azul" tal cual en casi todas las reseñas). Varía la forma de referirte a él usando SOLO el tipo genérico del accesorio la mayoría de las veces, inspirándote en ejemplos como estos según la categoría real del producto: "los lentes", "los lentes fotocromáticos", "los lentes de sol" o "los lentes para el sol", "los lentes de moto" o "los lentes para motos", "el reloj", "la pulsera", "la pulsera 3 en 1" (si aplica), "los aretes", "el collar" o "compré unos collares", "el anillo" o "estos anillos", "la billetera". También puedes usar frases más naturales y personales en vez del nombre técnico, como: "compré 3 de estos para mis hijos", "compré de estos y me encantaron", "me gustaron estos anillos, nunca pierden el color", "este anillo nunca se oxida", "llevo 2 años con esta billetera y sigue como nueva". Pocas veces uses el nombre completo tal cual aparece en la tienda, y a veces ni lo menciones explícitamente y habla de "lo que compré", "mi pedido" o simplemente "esto". Que suene natural, como hablaría una persona real, no como una ficha de producto repetida en cada reseña.
- No repitas estructuras de frase típicas de reseña genérica de e-commerce. Escribe como lo escribiría alguien rápido desde el celular: puede tener alguna palabra pegada, abreviación común de Venezuela (xq, q, tmb) usada con moderación, letras repetidas para dar énfasis (ej: bonitooo, bienn, sigan asiii) usado con moderación y solo a veces, o signos de exclamación de forma natural, no forzada.
- NUNCA empieces el comentario con estas frases ni nada parecido: ${BANNED_OPENERS.join(" / ")}.
- Evita muletillas repetitivas de reseña genérica. Que suene como algo que alguien realmente escribiría, con su propio estilo, no como plantilla.
- PROHIBIDO usar palabras en inglés como relleno o placeholder (ej: "none", "n/a", "null", "unknown") o dejar frases incompletas o vacías de sentido. Si no tienes un dato concreto sobre una característica específica del producto (como el ajuste exacto), simplemente no la menciones — habla de otra cosa que sí puedas describir con naturalidad, pero el comentario completo siempre debe estar 100% en español y sonar coherente de principio a fin.
- REVISIÓN DE LÓGICA: antes de responder, verifica que cada frase tenga sentido real. Evita cierres confusos o contradictorios como decirle a otros clientes que "sigan comprando" (eso no lo dice un cliente sobre sí mismo ni tiene sentido como consejo a otros). Si vas a felicitar a la tienda, hazlo dirigido a la tienda (ej: "sigan así", "van a crecer full"); si vas a recomendar el producto a otros compradores, hazlo con una frase que sí tenga lógica (ej: "se los recomiendo", "cómprenlo sin dudar").
- REGLA SOBRE QUIEN ATIENDE: quien atiende los pedidos por WhatsApp en esta tienda es un hombre. Si el comentario menciona a la persona que lo atendió, NUNCA uses un nombre propio (nada de "Karen", "Andrea", ni ningún nombre femenino o masculino específico) y NUNCA te refieras a esa persona en femenino. Usa expresiones genéricas como "el chico que me atendió", "el pana que me atendió", "el que me atendió", "el chamo que me atendió", "muy amable el que respondió", "buena atención de su parte", "me atendieron súper bien y rápido" — sin nombrar a nadie por su nombre propio.
- REVISIÓN DE COHERENCIA POR CATEGORÍA: si el comentario menciona una comparación, anécdota o experiencia previa con "otro producto" o "algo parecido", ese producto SIEMPRE debe ser del mismo tipo exacto de accesorio que el que se está reseñando en este momento (nunca compares, por ejemplo, una pulsera actual con unos aretes de otra tienda, ni un reloj con un collar). Revisa tu propia respuesta antes de entregarla para confirmar que no mezclaste categorías de productos distintas.`;
}

function parseReviewText(text: string) {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
  const parsed = JSON.parse(cleaned);
  const name = capitalizeName(String(parsed.name || "Cliente Fokus"));
  const email = generateCreativeEmail(name); // generado localmente, más variado que el de la IA
  const stars = pickWeightedStars();
  const comment = String(parsed.comment || "").trim();
  const createdAt = generateRandomPastDate(); // úsalo al guardar la reseña en tu DB
  if (!comment) return null;
  return { name, email, stars, comment, createdAt };
}

async function callGroqWithKey(prompt: string, apiKey: string): Promise<{ text?: string; rateLimited?: boolean; error?: string }> {
  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 1,
        response_format: { type: "json_object" },
      }),
    });
    const d = await r.json();
    if (r.status === 429) return { rateLimited: true, error: d?.error?.message || "Rate limited" };
    if (!r.ok) return { error: d?.error?.message || `Error ${r.status} de Groq` };
    const text = d?.choices?.[0]?.message?.content;
    if (!text) return { error: "Groq no devolvió texto" };
    return { text };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error de red" };
  }
}

async function callGroq(prompt: string): Promise<string> {
  if (!GROQ_API_KEYS.length) throw new Error("No hay ninguna GROQ_API_KEY configurada");
  let lastErr = "";
  // Primera pasada: prueba cada key una vez
  for (const key of GROQ_API_KEYS) {
    const res = await callGroqWithKey(prompt, key);
    if (res.text) return res.text;
    lastErr = res.error || lastErr;
  }
  // Segunda pasada: espera un poco y reintenta todas las keys por si el límite ya bajó
  await new Promise(res => setTimeout(res, 2000));
  for (const key of GROQ_API_KEYS) {
    const res = await callGroqWithKey(prompt, key);
    if (res.text) return res.text;
    lastErr = res.error || lastErr;
  }
  throw new Error(lastErr || "Se agotaron los reintentos de Groq (todas las keys)");
}

export async function POST(req: Request) {
  try {
    const { productName, category, existingNames } = await req.json();
    if (!productName) return NextResponse.json({ error: "Falta productName" }, { status: 400 });

    if (!GROQ_API_KEYS.length) {
      return NextResponse.json({ error: "Falta configurar GROQ_API_KEY en el servidor" }, { status: 500 });
    }

    const existingList: string[] = Array.isArray(existingNames) ? existingNames.filter((n: unknown) => typeof n === "string") : [];
    const usedKeys = new Set(existingList.map(normalizeNameKey));

    const prompt = buildPrompt(productName, category || "", existingList);
    let text: string;
    try {
      text = await callGroq(prompt);
    } catch (err) {
      console.error("Groq falló:", err);
      return NextResponse.json({ error: err instanceof Error ? err.message : "No se pudo generar la reseña" }, { status: 502 });
    }

    const result = parseReviewText(text);
    if (!result) return NextResponse.json({ error: "Respuesta vacía o mal formada" }, { status: 502 });

    // Garantía real: si el nombre generado ya se usó antes en la tienda, se reemplaza por uno único
    if (usedKeys.has(normalizeNameKey(result.name))) {
      result.name = generateUniqueName(usedKeys);
      result.email = generateCreativeEmail(result.name);
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error interno" }, { status: 500 });
  }
}