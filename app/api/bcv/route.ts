import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

let cached: { rate: number; ts: number } | null = null;
const TTL = 10 * 60 * 1000; // 10 minutos
let refreshing = false;

async function fetchFreshRate(): Promise<number | null> {
  try {
    const r = await fetch(
      "https://pydolarve.org/api/v1/dollar?page=bcv&monitor=usd",
      { cache: "no-store" }
    );
    const d = await r.json();
    const rate = parseFloat(d.price ?? d.monitors?.usd?.price ?? 0);
    if (rate > 0) return rate;
  } catch { /* silent */ }

  try {
    const r2 = await fetch("https://api.exchangerate-api.com/v4/latest/USD", { cache: "no-store" });
    const d2 = await r2.json();
    const rate2 = parseFloat(d2.rates?.VES ?? 0);
    if (rate2 > 0) return rate2;
  } catch { /* silent */ }

  return null;
}

export async function GET() {
  const isStale = !cached || Date.now() - cached.ts > TTL;

  // Si no hay nada en caché todavía, esperamos la primera respuesta
  if (!cached) {
    const rate = await fetchFreshRate();
    if (rate) {
      cached = { rate, ts: Date.now() };
      return NextResponse.json({ rate });
    }
    return NextResponse.json({ error: "No se pudo obtener la tasa" }, { status: 503 });
  }

  // Si está vencida, responde con la caché actual al instante
  // y refresca en segundo plano para la próxima visita
  if (isStale && !refreshing) {
    refreshing = true;
    fetchFreshRate().then(rate => {
      if (rate) cached = { rate, ts: Date.now() };
      refreshing = false;
    }).catch(() => { refreshing = false; });
  }

  return NextResponse.json({ rate: cached.rate });
}

