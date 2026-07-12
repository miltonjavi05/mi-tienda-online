export async function GET() {
  const sources: Array<() => Promise<number>> = [
    async () => {
      const r = await fetch("https://ve.dolarapi.com/v1/dolares/binance", { cache: "no-store" });
      if (!r.ok) return 0;
      const d = await r.json();
      return parseFloat(d.promedio ?? d.venta ?? d.compra ?? 0);
    },
    async () => {
      const r = await fetch("https://ve.dolarapi.com/v1/dolares/bitcoin", { cache: "no-store" });
      if (!r.ok) return 0;
      const d = await r.json();
      return parseFloat(d.promedio ?? d.venta ?? d.compra ?? 0);
    },
    async () => {
      const r = await fetch("https://pydolarvenezuela-api.vercel.app/api/v1/dollar?page=binance", { cache: "no-store" });
      if (!r.ok) return 0;
      const d = await r.json();
      return parseFloat(d.price ?? d.monitors?.usd?.price ?? 0);
    },
    async () => {
      const r = await fetch("https://pydolarve.org/api/v1/dollar?page=binance", { cache: "no-store" });
      if (!r.ok) return 0;
      const d = await r.json();
      return parseFloat(d.price ?? d.monitors?.usd?.price ?? 0);
    },
  ];

  for (const getRate of sources) {
    try {
      const rate = await getRate();
      if (rate > 0) return Response.json({ rate });
    } catch {
      /* intenta la siguiente fuente */
    }
  }

  return Response.json({ rate: 0 }, { status: 200 });
}