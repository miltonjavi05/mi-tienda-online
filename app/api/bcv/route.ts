import { NextResponse } from "next/server";

let cached: { rate: number; ts: number } | null = null;
const TTL = 6 * 60 * 60 * 1000;

export async function GET() {
  // Devuelve caché si aún es válido
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json({ rate: cached.rate, cached: true });
  }

  try {
    const r = await fetch(
      "https://pydolarve.org/api/v1/dollar?page=bcv&monitor=usd",
      { next: { revalidate: 21600 } } // Next.js cache 6h
    );
    const d = await r.json();
    const rate = parseFloat(d.price ?? d.monitors?.usd?.price ?? 0);
    if (rate > 0) {
      cached = { rate, ts: Date.now() };
      return NextResponse.json({ rate });
    }
    throw new Error("invalid rate");
  } catch {
    // Fallback
    try {
      const r2 = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
      const d2 = await r2.json();
      const rate = parseFloat(d2.rates?.VES ?? 0);
      if (rate > 0) {
        cached = { rate, ts: Date.now() };
        return NextResponse.json({ rate, fallback: true });
      }
    } catch { /* silent */ }

    return NextResponse.json(
      { error: "No se pudo obtener la tasa" },
      { status: 503 }
    );
  }
}