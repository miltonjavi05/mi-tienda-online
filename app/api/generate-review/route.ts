import { NextResponse } from "next/server";

const GROQ_API_KEYS = [
  process.env.GROQ_API_KEY || "",
  process.env.GROQ_API_KEY_2 || "",
  process.env.GROQ_API_KEY_3 || "",
].filter(Boolean);
const GROQ_MODEL = "llama-3.3-70b-versatile";

const SAMPLE_REVIEW_NAMES = [
  "Jose Arturo", "Anderson Jose", "Maria Carrillo", "Luis Gamarra", "Arturo Jose",
  "Valeria Sofia", "Sofi Marquez", "Yorbelis Rodriguez", "Neirimar Peña", "Jhonaiker Blanco",
  "Marielvis Suarez", "Yusneidy Contreras", "Deivis Alejandro", "Yolimar Perez", "Franyelis Diaz",
  "Kleiver Andres", "Yeraldin Moreno", "Nairobis Salazar", "Wilfredo Rangel", "Yusbeidy Ramirez",
  "Katiuska Fernandez", "Maiker Gonzalez", "Rosmary Torres", "Yeison David", "Estefany Nava",
  "Gleimar Rincon", "Marielys Camacho", "Deiker Rojas", "Yubelkis Aponte", "Franyeli Bastidas",
];

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
  const last = parts[1] || "";
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
  const domain = pick(["gmail.com", "hotmail.com", "outlook.com"]);
  return `${local}@${domain}`;
}

function generateRandomPastDate(maxDaysAgo = 25): Date {
  const daysAgo = randomInt(0, maxDaysAgo);
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(randomInt(8, 22), randomInt(0, 59), 0, 0);
  return d;
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
];

const BANNED_OPENERS = [
  "Me encantó", "Excelente producto", "Muy buena calidad", "Súper recomendado",
  "Increíble calidad", "Estoy muy satisfecho", "Quedé encantada", "Superó mis expectativas",
  "Totalmente satisfecho", "Cumplió mis expectativas", "Buenísima calidad", "Producto de excelente calidad",
];

function buildPrompt(productName: string, category: string): string {
  const opening = OPENING_STYLES[Math.floor(Math.random() * OPENING_STYLES.length)];
  const tone = TONE_STYLES[Math.floor(Math.random() * TONE_STYLES.length)];
  const lengthWords = 12 + Math.floor(Math.random() * 25); // varía la longitud real
  return `Genera una reseña de cliente en español (Venezuela) para este producto de accesorios: "${productName}" (categoría: ${catLabel(category)}).
Responde ÚNICAMENTE con un JSON válido, sin texto adicional ni backticks, con este formato exacto:
{"name":"...","email":"...","stars":5,"comment":"..."}
Reglas:
- El nombre debe ser un nombre venezolano realista, en el estilo de estos ejemplos: ${SAMPLE_REVIEW_NAMES.join(", ")}. No repitas siempre los mismos, varía muchísimo (nombres compuestos, apodos, solo primer nombre, etc).
- Cada palabra del nombre debe empezar con mayúscula y el resto en minúscula.
- El correo debe estar completamente en minúsculas, basado en el nombre (sin tildes ni espacios), con dominio gmail.com, hotmail.com o outlook.com.
- Las estrellas deben ser 4 o 5 (mayormente 5).
- El comentario debe tener aproximadamente ${lengthWords} palabras, natural y coloquial. La mayoría de las veces menciona el producto o la categoría, pero a veces puede hablar más de la tienda, el trato o la experiencia de compra en general sin nombrar el producto textualmente.
- Para este comentario específico, ${opening}, con ${tone}.
- No repitas estructuras de frase típicas de reseña genérica de e-commerce. Escribe como lo escribiría alguien rápido desde el celular: puede tener alguna palabra pegada, abreviación común de Venezuela (xq, q, tmb) usada con moderación, o signos de exclamación de forma natural, no forzada.
- NUNCA empieces el comentario con estas frases ni nada parecido: ${BANNED_OPENERS.join(" / ")}.
- Evita muletillas repetitivas de reseña genérica. Que suene como algo que alguien realmente escribiría, con su propio estilo, no como plantilla.`;
}

function parseReviewText(text: string) {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
  const parsed = JSON.parse(cleaned);
  const name = capitalizeName(String(parsed.name || "Cliente Fokus"));
  const email = generateCreativeEmail(name); // generado localmente, más variado que el de la IA
  const stars = Math.max(4, Math.min(5, parseInt(parsed.stars) || 5));
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
    const { productName, category } = await req.json();
    if (!productName) return NextResponse.json({ error: "Falta productName" }, { status: 400 });

    if (!GROQ_API_KEYS.length) {
      return NextResponse.json({ error: "Falta configurar GROQ_API_KEY en el servidor" }, { status: 500 });
    }

    const prompt = buildPrompt(productName, category || "");
    let text: string;
    try {
      text = await callGroq(prompt);
    } catch (err) {
      console.error("Groq falló:", err);
      return NextResponse.json({ error: err instanceof Error ? err.message : "No se pudo generar la reseña" }, { status: 502 });
    }

    const result = parseReviewText(text);
    if (!result) return NextResponse.json({ error: "Respuesta vacía o mal formada" }, { status: 502 });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error interno" }, { status: 500 });
  }
}