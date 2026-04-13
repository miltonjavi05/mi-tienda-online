import { NextResponse } from "next/server";

const PROJECT_ID = "fokus-16a0c";
const SITE_URL   = process.env.NEXT_PUBLIC_SITE_URL || "https://tu-dominio.com";

export const revalidate = 3600;

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

function optImg(url: string): string {
  if (!url || !url.includes("cloudinary.com")) return url;
  return url.replace("/upload/", "/upload/w_800,h_800,c_pad,q_auto,f_jpg/");
}

function esc(s: string): string {
  return (s || "")
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&apos;");
}

// ─── CATEGORÍAS META ──────────────────────────────────────────────────────────
// item_group_id = clave para crear conjuntos en Meta Ads Manager
// Todos los productos con el mismo item_group_id aparecen juntos como "variantes"
function getGroupId(cat: string): string {
  // Todos los tipos de lentes van al grupo "lentes"
  if (cat.startsWith("LENTES")) return "lentes";
  // El resto, en minúscula limpia
  return cat.toLowerCase().replace(/[^a-z]/g, "");
}

function getCategoryLabel(cat: string): string {
  const map: Record<string, string> = {
    "LENTES":                "Lentes",
    "LENTES·SOL":            "Lentes de Sol",
    "LENTES·FOTOCROMATICOS": "Lentes Fotocromaticos",
    "LENTES·ANTI-LUZ-AZUL":  "Lentes Anti Luz Azul",
    "LENTES·MOTORIZADOS":    "Lentes para Motos",
    "RELOJES":               "Relojes",
    "COLLARES":              "Collares",
    "PULSERAS":              "Pulseras",
    "ANILLOS":               "Anillos",
    "ARETES":                "Aretes",
    "BILLETERAS":            "Billeteras",
  };
  return map[cat] ?? cat;
}

function metaCategory(cat: string): string {
  const map: Record<string, string> = {
    "LENTES":                "Apparel & Accessories > Clothing Accessories > Sunglasses",
    "LENTES·SOL":            "Apparel & Accessories > Clothing Accessories > Sunglasses",
    "LENTES·FOTOCROMATICOS": "Apparel & Accessories > Clothing Accessories > Sunglasses",
    "LENTES·ANTI-LUZ-AZUL":  "Apparel & Accessories > Clothing Accessories > Sunglasses",
    "LENTES·MOTORIZADOS":    "Apparel & Accessories > Clothing Accessories > Sunglasses",
    "RELOJES":               "Apparel & Accessories > Jewelry > Watches",
    "COLLARES":              "Apparel & Accessories > Jewelry > Necklaces",
    "PULSERAS":              "Apparel & Accessories > Jewelry > Bracelets",
    "ANILLOS":               "Apparel & Accessories > Jewelry > Rings",
    "ARETES":                "Apparel & Accessories > Jewelry > Earrings",
    "BILLETERAS":            "Apparel & Accessories > Handbags, Wallets & Cases > Wallets",
  };
  return map[cat] ?? "Apparel & Accessories > Jewelry";
}

export async function GET() {
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/products?pageSize=300`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) throw new Error(`Firestore ${res.status}: ${await res.text()}`);

    const data = await res.json() as { documents?: FsDoc[] };
    const products: Product[] = (data.documents || [])
      .map(docToProduct)
      .filter(p => p.name && p.price > 0 && p.img);

    const items = products.map(p => {
      const groupId     = getGroupId(p.category);
      const label       = getCategoryLabel(p.category);
      const productUrl  = `${SITE_URL}/?shop=1&product=${p.id}`;
      const imageUrl    = optImg(p.img);
      const googleCat   = metaCategory(p.category);
      const description = p.description || `${p.name} - ${label} - Fokus Accesorios Venezuela`;

      return `    <item>
      <g:id>${esc(p.id)}</g:id>
      <g:title>${esc(p.name)}</g:title>
      <g:description>${esc(description)}</g:description>
      <g:link>${esc(productUrl)}</g:link>
      <g:image_link>${esc(imageUrl)}</g:image_link>
      <g:price>${p.price.toFixed(2)} USD</g:price>
      <g:availability>in stock</g:availability>
      <g:condition>new</g:condition>
      <g:brand>Fokus</g:brand>
      <g:google_product_category>${esc(googleCat)}</g:google_product_category>
      <g:product_type>${esc(label)}</g:product_type>
      <g:item_group_id>${esc(groupId)}</g:item_group_id>
      <g:custom_label_0>${esc(label)}</g:custom_label_0>
      <g:custom_label_1>Fokus Venezuela</g:custom_label_1>
    </item>`;
    }).join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Fokus Accesorios</title>
    <link>${SITE_URL}</link>
    <description>Catálogo Fokus — Accesorios Venezuela</description>
${items}
  </channel>
</rss>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type":  "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (err) {
    console.error("[catalog] Error:", err);
    // Devuelve XML vacío válido en vez de error 500
    // así Meta no marca el feed como roto
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Fokus Accesorios</title>
    <link>${SITE_URL}</link>
    <description>Catálogo Fokus</description>
  </channel>
</rss>`;
    return new NextResponse(fallback, {
      status: 200,
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  }
}