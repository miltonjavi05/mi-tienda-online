// app/api/catalog/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Feed XML para Meta Catalog — corrige el problema del carrusel que repite
// solo 2 productos.
//
// CAUSAS del bug "solo 2 productos se repiten en carrusel":
//   1. Meta descarta productos cuya imagen NO es cuadrada (1:1) o < 500×500px
//   2. Meta descarta productos con URLs de imagen que devuelven redirect o
//      content-type incorrecto (Cloudinary con f_auto o f_webp puede fallar)
//   3. Meta descarta productos sin `g:image_link` estático y accesible
//
// SOLUCIONES aplicadas:
//   • optImgMeta() → fuerza formato JPG, 1:1 (c_fill), mínimo 800×800px
//   • additional_image_link → imagen alternativa por si la principal falla
//   • item_group_id único → sin agrupación como variantes
//   • product_type legible → filtros de conjunto funcionan correctamente
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";

// ── Config ────────────────────────────────────────────────────────────────────
const FIREBASE_PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "fokus-16a0c";
const SITE_URL         = process.env.NEXT_PUBLIC_SITE_URL || "https://fokus-accesorios.vercel.app";
const CURRENCY         = "USD";
const BRAND            = "Fokus";
const CONDITION        = "new";
const AVAILABILITY     = "in stock";

// ── Cloudinary helpers ────────────────────────────────────────────────────────

/**
 * Imagen optimizada para Meta Ads:
 *  - Formato JPG (no webp — Meta Crawler tiene problemas con webp en algunos casos)
 *  - Recorte cuadrado c_fill,g_center para cumplir ratio 1:1
 *  - 800x800px (Meta recomienda >= 500x500, usamos 800 para calidad)
 *  - Sin dpr_auto (Meta descarga en servidor, no en browser)
 */
function optImgMeta(url: string): string {
  if (!url) return url;
  if (!url.includes("cloudinary.com")) return url;
  return url.replace(
    /\/upload\/([^/]+\/)?/,
    "/upload/w_800,h_800,c_fill,g_center,q_85,f_jpg/"
  );
}

/**
 * Segunda imagen sin recorte como respaldo para additional_image_link.
 * Meta la usa si la principal tiene algun problema de validacion.
 */
function optImgFallback(url: string): string {
  if (!url) return url;
  if (!url.includes("cloudinary.com")) return url;
  return url.replace(
    /\/upload\/([^/]+\/)?/,
    "/upload/w_1000,q_90,f_jpg/"
  );
}

// ── Tipos ─────────────────────────────────────────────────────────────────────
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
  description?: string;
  order?: number;
}

// ── Firestore REST ────────────────────────────────────────────────────────────
function fromFsVal(f: FsVal): unknown {
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
    name:        (fromFsVal(f.name        ?? { nullValue: null }) as string) || "",
    category:    ((fromFsVal(f.category   ?? { nullValue: null }) as string) || "").toUpperCase(),
    price:       (fromFsVal(f.price       ?? { nullValue: null }) as number) || 0,
    img:         (fromFsVal(f.img         ?? { nullValue: null }) as string) || "",
    description: (fromFsVal(f.description ?? { nullValue: null }) as string) || "",
    order:       (fromFsVal(f.order       ?? { nullValue: null }) as number) || 0,
  };
}

async function fetchAllProducts(): Promise<Product[]> {
  const url =
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}` +
    `/databases/(default)/documents/products?pageSize=300`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Firestore ${res.status}: ${await res.text()}`);
  const data = await res.json() as { documents?: FsDoc[] };
  return (data.documents || [])
    .map(docToProduct)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

// ── Mapeo de categorias ───────────────────────────────────────────────────────
const GOOGLE_CATEGORY: Record<string, string> = {
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
  "BILLETERAS":            "Apparel & Accessories > Handbags, Wallets & Cases > Wallets & Money Clips",
};

function productType(cat: string): string {
  const map: Record<string, string> = {
    "LENTES":                "Lentes",
    "LENTES·SOL":            "lentes de sol",
    "LENTES·FOTOCROMATICOS": "lentes fotocromaticos",
    "LENTES·ANTI-LUZ-AZUL":  "lentes anti luz azul",
    "LENTES·MOTORIZADOS":    "lentes motorizados",
    "RELOJES":               "Relojes",
    "COLLARES":              "Collares",
    "PULSERAS":              "Pulseras",
    "ANILLOS":               "Anillos",
    "ARETES":                "Aretes",
    "BILLETERAS":            "Billeteras",
  };
  return map[cat] ?? cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
}

// ── XML escape ────────────────────────────────────────────────────────────────
function esc(str: string): string {
  return str
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&apos;");
}

// ── Genera un <item> ──────────────────────────────────────────────────────────
function productToItem(p: Product): string {
  const googleCat   = GOOGLE_CATEGORY[p.category] ?? "Apparel & Accessories > Jewelry";
  const pType       = productType(p.category);
  const imgSquare   = esc(optImgMeta(p.img));
  const imgFallback = esc(optImgFallback(p.img));
  const productUrl  = esc(`${SITE_URL}/?product=${encodeURIComponent(p.id)}`);
  const desc = p.description?.trim()
    ? esc(p.description.trim())
    : esc(`${p.name} — ${pType}. Disponible en Fokus Venezuela. Envios a todo el pais.`);

  return `
  <item>
    <g:id>${esc(p.id)}</g:id>
    <g:title>${esc(p.name)}</g:title>
    <g:description>${desc}</g:description>
    <g:link>${productUrl}</g:link>
    <g:image_link>${imgSquare}</g:image_link>
    <g:additional_image_link>${imgFallback}</g:additional_image_link>
    <g:availability>${AVAILABILITY}</g:availability>
    <g:price>${p.price.toFixed(2)} ${CURRENCY}</g:price>
    <g:brand>${BRAND}</g:brand>
    <g:condition>${CONDITION}</g:condition>
    <g:google_product_category>${esc(googleCat)}</g:google_product_category>
    <g:product_type>${esc(pType)}</g:product_type>
    <g:item_group_id>${esc(p.id)}</g:item_group_id>
  </item>`;
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cat = searchParams.get("category");

  try {
    let products = await fetchAllProducts();

    if (cat) {
      const catUp = cat.toUpperCase();
      products = products.filter(
        p => p.category === catUp || p.category.startsWith(catUp + "·")
      );
    }

    const valid = products.filter(p => p.img && p.name && p.price > 0);
    const items = valid.map(productToItem).join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${esc(BRAND)} – Accesorios Venezuela</title>
    <link>${esc(SITE_URL)}</link>
    <description>Catalogo de accesorios Fokus. Lentes, relojes, collares, pulseras, anillos, aretes y billeteras.</description>
    ${items}
  </channel>
</rss>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type":  "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("[catalog feed]", err);
    return new NextResponse("Error generating catalog feed", { status: 500 });
  }
}