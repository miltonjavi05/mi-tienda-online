async function fetchWithTimeout(url: string, ms = 5000): Promise<any> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    const r = await fetch(url, { cache: "no-store", signal: controller.signal });
    if (!r.ok) throw new Error("bad status " + r.status);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

export async function GET() {
  // Fuente principal: dólar paralelo (dolarapi.com Venezuela) — verificado en vivo,
  // la referencia pública más cercana y estable al precio de Binance/USDT.
  try {
    const d = await fetchWithTimeout("https://ve.dolarapi.com/v1/dolares/paralelo", 5000);
    const rate = parseFloat(d?.promedio ?? d?.venta ?? d?.compra ?? 0);
    if (rate > 0) return Response.json({ rate });
  } catch {}

  // Respaldo 1: listado completo de dolarapi.com, tomando la fuente "paralelo"
  try {
    const list = await fetchWithTimeout("https://ve.dolarapi.com/v1/dolares", 5000);
    const found = Array.isArray(list) ? list.find((x: any) => x?.fuente === "paralelo") : null;
    const rate = parseFloat(found?.promedio ?? found?.venta ?? found?.compra ?? 0);
    if (rate > 0) return Response.json({ rate });
  } catch {}

  // Respaldo 2: pydolarve.org (API pública de monitores de Venezuela)
  try {
    const d2 = await fetchWithTimeout("https://pydolarve.org/api/v1/dollar?page=enparalelovzla", 5000);
    const rate2 = parseFloat(d2?.price ?? d2?.monitors?.usd?.price ?? 0);
    if (rate2 > 0) return Response.json({ rate: rate2 });
  } catch {}

  return Response.json({ rate: 0 }, { status: 200 });
}