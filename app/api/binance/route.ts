export async function GET() {
  try {
    const r = await fetch("https://ve.dolarapi.com/v1/dolares/bitcoin", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      const rate = parseFloat(d.promedio ?? d.venta ?? d.compra ?? 0);
      if (rate > 0) return Response.json({ rate });
    }
  } catch {}
  try {
    const r2 = await fetch("https://pydolarvenezuela-api.vercel.app/api/v1/dollar?page=binance", { cache: "no-store" });
    if (r2.ok) {
      const d2 = await r2.json();
      const rate2 = parseFloat(d2.price ?? d2.monitors?.usd?.price ?? 0);
      if (rate2 > 0) return Response.json({ rate: rate2 });
    }
  } catch {}
  return Response.json({ rate: 0 }, { status: 200 });
}