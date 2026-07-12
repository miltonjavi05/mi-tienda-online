async function fetchWithTimeout(url: string, ms = 4000): Promise<any> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    const r = await fetch(url, { cache: "no-store", signal: controller.signal });
    if (!r.ok) throw new Error("bad status");
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

function extractRate(d: any): number {
  const v = parseFloat(d?.promedio ?? d?.venta ?? d?.compra ?? d?.price ?? d?.monitors?.usd?.price ?? 0);
  return isNaN(v) ? 0 : v;
}

export async function GET() {
  const urls = [
    "https://ve.dolarapi.com/v1/dolares/binance",
    "https://ve.dolarapi.com/v1/dolares/bitcoin",
    "https://pydolarvenezuela-api.vercel.app/api/v1/dollar?page=binance",
    "https://pydolarve.org/api/v1/dollar?page=binance",
  ];

  const attempts = urls.map(async (url) => {
    const data = await fetchWithTimeout(url, 4000);
    const rate = extractRate(data);
    if (rate > 0) return rate;
    throw new Error("sin tasa válida");
  });

  try {
    const rate = await Promise.any(attempts);
    return Response.json({ rate });
  } catch {
    return Response.json({ rate: 0 }, { status: 200 });
  }
}