import { NextResponse } from "next/server";

export async function GET() {
  try {
    const r = await fetch(
      "https://pydolarve.org/api/v1/dollar?page=bcv&monitor=usd",
      { cache: "no-store" }
    );
    const d = await r.json();
    const rate = parseFloat(d.price ?? d.monitors?.usd?.price ?? 0);
    if (rate > 0) {
      return NextResponse.json({ rate });
    }
    throw new Error("invalid rate");
  } catch {
    try {
      const r2 = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
      const d2 = await r2.json();
      const rate = parseFloat(d2.rates?.VES ?? 0);
      if (rate > 0) {
        return NextResponse.json({ rate, fallback: true });
      }
    } catch { /* silent */ }

    return NextResponse.json(
      { error: "No se pudo obtener la tasa" },
      { status: 503 }
    );
  }
}