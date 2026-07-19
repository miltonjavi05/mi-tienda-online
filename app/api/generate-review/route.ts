import { NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const SAMPLE_REVIEW_NAMES = ["Javier Jose", "Anderson", "Carrillo", "Gamarra", "Arturo Jose"];

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

const OPENING_STYLES = [
  "empieza contando en qué momento u ocasión lo usó (ej: un viaje, el trabajo, una salida)",
  "empieza con una opinión directa y espontánea sobre la calidad o el material",
  "empieza comparando el producto con lo que esperaba antes de comprarlo",
  "empieza mencionando por qué decidió comprarlo",
  "empieza mencionando el envío, el empaque o la atención, y luego pasa al producto",
  "empieza contando para quién lo compró (regalo, familiar, pareja, etc.)",
  "empieza con un detalle específico y concreto del producto (color, tamaño, textura, ajuste)",
  "empieza como si le estuviera contando la experiencia a un amigo por WhatsApp",
  "empieza mencionando cuánto tiempo lleva usándolo",
  "empieza con una pregunta retórica corta antes de dar su opinión",
];

const TONE_STYLES = [
  "tono entusiasta pero natural, sin sonar exagerado",
  "tono tranquilo, satisfecho, casi de paso",
  "tono casual y directo, como mensaje rápido",
  "tono breve y telegráfico, pocas palabras",
  "tono cálido con un toque de humor sutil",
  "tono orgulloso, como quien presume su compra",
];

const BANNED_OPENERS = [
  "Me encantó", "Excelente producto", "Muy buena calidad", "Súper recomendado",
  "Increíble calidad", "Estoy muy satisfecho", "Quedé encantada", "Superó mis expectativas",
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
- El comentario debe tener aproximadamente ${lengthWords} palabras, natural y coloquial, mencionando el producto o la categoría.
- Para este comentario específico, ${opening}, con ${tone}.
- NUNCA empieces el comentario con estas frases ni nada parecido: ${BANNED_OPENERS.join(" / ")}.
- Evita muletillas repetitivas de reseña genérica. Que suene como algo que alguien realmente escribiría, con su propio estilo, no como plantilla.`;
}

function parseReviewText(text: string) {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
  const parsed = JSON.parse(cleaned);
  const name = capitalizeName(String(parsed.name || "Cliente Fokus"));
  const email = String(parsed.email || "").toLowerCase().trim();
  const stars = Math.max(4, Math.min(5, parseInt(parsed.stars) || 5));
  const comment = String(parsed.comment || "").trim();
  if (!comment) return null;
  return { name, email, stars, comment };
}

async function callGroq(prompt: string): Promise<string> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 1,
          response_format: { type: "json_object" },
        }),
      });
      const d = await r.json();
      if (r.status === 429) {
        await new Promise(res => setTimeout(res, 1500));
        continue;
      }
      if (!r.ok) throw new Error(d?.error?.message || `Error ${r.status} de Groq`);
      const text = d?.choices?.[0]?.message?.content;
      if (!text) throw new Error("Groq no devolvió texto");
      return text;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Se agotaron los reintentos de Groq");
}

export async function POST(req: Request) {
  try {
    const { productName, category } = await req.json();
    if (!productName) return NextResponse.json({ error: "Falta productName" }, { status: 400 });

    if (!GROQ_API_KEY) {
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