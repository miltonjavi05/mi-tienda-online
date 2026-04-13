import { NextResponse } from "next/server";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const PROJECT_ID = "fokus-16a0c";
const SITE_URL   = process.env.NEXT_PUBLIC_SITE_URL || "https://tu-dominio.com";

// Revalidar cada 1 hora (3600s) — Meta actualiza el catálogo 1-2x por día,
// pero tener ISR asegura que siempre estés actualizado
export const revalidate = 3600;

// ─── TIPOS ────────────────────────────────────────────────────────────────────
interface FsVal {
  stringValue?: string;
  doubleValue?: number;
  integerValue?: string;
  booleanValue?: boolean;
  nullValue?: null;
}
interface FsDoc {
  name: string;
  fields: Record<string, FsVal>;
}
interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  img: string;
  description: string;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fromFs(f: FsVal): unknown {
  if ("stringValue"  in f) return f.stringValue;
  if ("doubleValue"  in f) return f.doubleValue;
  if ("integerValue" in f) return Number(f.integerValue);
  if ("booleanValue" in f) return f.booleanValue;
  return null;
}

function docToProduct(doc: FsDoc): Product {
  const f = doc.fields || {};
  return {
    id:          doc.name.split("/").pop() as string,
    name:        (fromFs(f.name        ?? {}) as string) || "",
    category:    ((fromFs(f.category   ?? {}) as string) || "").toUpperCase(),
    price:       (fromFs(f.price       ?? {}) as number) || 0,
    img:         (fromFs(f.img         ?? {}) as string) || "",
    description: (fromFs(f.description ?? {}) as string) || "",
  };
}

// Optimiza imagen Cloudinary al tamaño recomendado por Meta (600x600 mínimo)
function optImg(url: string): string {
  if (!url || !url.includes("cloudinary.com")) return url;
  return url.replace("/upload/", "/upload/w_800,h_800,c_pad,q_auto,f_jpg/");
}

// Escapa caracteres especiales XML
function esc(s: string): string {
  return s
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&apos;");
}

// Mapea tus categorías al sistema de categorías de Meta/Google
function metaCategory(cat: string): string {
  const map: Record<string, string> = {
    "LENTES":                 "Apparel & Accessories > Clothing Accessories > Sunglasses",
    "LENTES·SOL":             "Apparel & Accessories > Clothing Accessories > Sunglasses",
    "LENTES·FOTOCROMATICOS":  "Apparel & Accessories > Clothing Accessories > Sunglasses",
    "LENTES·ANTI-LUZ-AZUL":  "Apparel & Accessories > Clothing Accessories > Sunglasses",
    "LENTES·MOTORIZADOS":     "Apparel & Accessories > Clothing Accessories > Sunglasses",
    "RELOJES":                "Apparel & Accessories > Jewelry > Watches",
    "COLLARES":               "Apparel & Accessories > Jewelry > Necklaces",
    "PULSERAS":               "Apparel & Accessories > Jewelry > Bracelets",
    "ANILLOS":                "Apparel & Accessories > Jewelry > Rings",
    "ARETES":                 "Apparel & Accessories > Jewelry > Earrings",
    "BILLETERAS":             "Apparel & Accessories > Handbags, Wallets & Cases > Wallets",
  };
  return map[cat] ?? "Apparel & Accessories > Jewelry";
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    // Fetch desde Firestore REST (sin SDK — zero cold-start overhead)
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/products?pageSize=300`,
      {
        next: { revalidate: 3600 }, // ISR cache
      }
    );

    if (!res.ok) {
      throw new Error(`Firestore error: ${res.status}`);
    }

    const data = await res.json() as { documents?: FsDoc[] };
    const products: Product[] = (data.documents || [])
      .map(docToProduct)
      .filter(p => p.name && p.price > 0 && p.img) // solo productos válidos
      .sort((a, b) => a.name.localeCompare(b.name));

    // ── Generar XML formato Meta Catalog (RSS/Atom feed) ──────────────────────
    // Este formato es el más compatible y soporta todos los campos de Meta Ads
    const items = products.map(p => {
      const productUrl = `${SITE_URL}/shop?product=${p.id}`;
      const imageUrl   = optImg(p.img);
      const category   = metaCategory(p.category);
      const brand      = "Fokus";
      const condition  = "new";
      const availability = "in stock";

      return `    <item>
      <id>${esc(p.id)}</id>
      <title>${esc(p.name)}</title>
      <description>${esc(p.description || p.name)}</description>
      <link>${esc(productUrl)}</link>
      <image_link>${esc(imageUrl)}</image_link>
      <price>${p.price.toFixed(2)} USD</price>
      <sale_price>${p.price.toFixed(2)} USD</sale_price>
      <availability>${availability}</availability>
      <condition>${condition}</condition>
      <brand>${brand}</brand>
      <google_product_category>${esc(category)}</google_product_category>
      <product_type>${esc(p.category)}</product_type>
    </item>`;
    }).join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Fokus Accesorios</title>
    <link>${SITE_URL}</link>
    <description>Catálogo de productos Fokus — Accesorios Venezuela</description>
${items}
  </channel>
</rss>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type":  "application/xml; charset=utf-8",
        // Cache agresivo: CDN guarda 1h, cliente 5min
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        // Meta puede acceder sin restricciones
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("[catalog] Error:", err);
    return new NextResponse("Error generando catálogo", { status: 500 });
  }
}