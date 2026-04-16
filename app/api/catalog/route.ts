// app/api/catalog/route.ts  (o pages/api/catalog.ts si usas Pages Router)
// ─────────────────────────────────────────────────────────────────────────────
// Feed XML de productos para Meta (Facebook/Instagram) Catalog.
//
// SOLUCIÓN AL PROBLEMA DE VARIANTES:
//   • Cada producto recibe su propio `g:item_group_id` = product.id
//   • Esto hace que Meta trate CADA producto como artículo independiente,
//     no como variante de otro.
//   • Se añade g:product_type con la categoría exacta del producto para
//     que los filtros del catálogo (tipo de producto) funcionen correctamente.
//
// Cómo conectar en Meta Business Manager:
//   1. Catálogos → tu catálogo → Fuentes de datos → Agregar artículos
//   2. Selecciona "Feed de datos" → "URL programada"
//   3. URL: https://tu-dominio.com/api/catalog
//   4. Formato: XML  |  Actualizar: Diaria
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";

// ── Config reutilizada del proyecto ──────────────────────────────────────────
const FIREBASE_PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "fokus-16a0c";
const SITE_URL         = process.env.NEXT_PUBLIC_SITE_URL || "https://fokus-accesorios.vercel.app";
const CURRENCY         = "USD";
const BRAND            = "Fokus";
const CONDITION        = "new";
const AVAILABILITY     = "in stock";

// Cloudinary helper (igual que en el frontend)
function optImg(url: string, w = 800): string {
  if (!url || !url.includes("cloudinary.com")) return url;
  return url.replace("/upload/", `/upload/w_${w},q_auto,f_jpg,dpr_1/`);
}

// ── Tipos ────────────────────────────────────────────────────────────────────
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

// ── Firestore REST helper ─────────────────────────────────────────────────────
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
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/products?pageSize=300`;
  const res = await fetch(url, { next: { revalidate: 3600 } }); // cache 1h en servidor
  if (!res.ok) throw new Error(`Firestore error: ${res.status}`);
  const data = await res.json() as { documents?: FsDoc[] };
  return (data.documents || [])
    .map(docToProduct)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

// ── Mapeo de categorías internas → Google Product Category ───────────────────
// Referencia: https://www.google.com/basepages/producttype/taxonomy-with-ids.en-US.txt
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

// product_type legible para humanos (aparece en los filtros de Meta)
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

// ── Escapa caracteres XML ─────────────────────────────────────────────────────
function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ── Genera un <item> por producto ─────────────────────────────────────────────
function productToItem(p: Product): string {
  const googleCat  = GOOGLE_CATEGORY[p.category] ?? "Apparel & Accessories > Jewelry";
  const pType      = productType(p.category);
  const imgUrl     = optImg(p.img, 800);
  const productUrl = `${SITE_URL}/?product=${encodeURIComponent(p.id)}`;
  const desc       = p.description?.trim()
    ? esc(p.description.trim())
    : esc(`${p.name} - ${pType} de alta calidad. Marca Fokus Venezuela.`);

  // ┌─────────────────────────────────────────────────────────────────────────┐
  // │  CLAVE: g:item_group_id = p.id (único por producto)                    │
  // │  Esto evita que Meta agrupe productos del mismo tipo como variantes.    │
  // │  Si dos productos comparten item_group_id, Meta los muestra como        │
  // │  variantes del mismo artículo.  Con IDs únicos = artículos separados.  │
  // └─────────────────────────────────────────────────────────────────────────┘
  return `
  <item>
    <g:id>${esc(p.id)}</g:id>
    <g:title>${esc(p.name)}</g:title>
    <g:description>${desc}</g:description>
    <g:link>${esc(productUrl)}</g:link>
    <g:image_link>${esc(imgUrl)}</g:image_link>
    <g:availability>${AVAILABILITY}</g:availability>
    <g:price>${p.price.toFixed(2)} ${CURRENCY}</g:price>
    <g:brand>${BRAND}</g:brand>
    <g:condition>${CONDITION}</g:condition>
    <g:google_product_category>${esc(googleCat)}</g:google_product_category>
    <g:product_type>${esc(pType)}</g:product_type>
    <g:item_group_id>${esc(p.id)}</g:item_group_id>
  </item>`;
}

// ── Handler principal ─────────────────────────────────────────────────────────
export async function GET(request: Request) {
  // Revalidación manual desde el admin (POST a /api/catalog/revalidate)
  const { searchParams } = new URL(request.url);
  const cat = searchParams.get("category"); // filtro opcional: /api/catalog?category=RELOJES

  try {
    let products = await fetchAllProducts();

    if (cat) {
      products = products.filter(p =>
        p.category === cat.toUpperCase() ||
        p.category.startsWith(cat.toUpperCase() + "·")
      );
    }

    const items = products
      .filter(p => p.img && p.name && p.price > 0) // solo productos válidos
      .map(productToItem)
      .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${esc(BRAND)} – Accesorios Venezuela</title>
    <link>${esc(SITE_URL)}</link>
    <description>Catálogo de accesorios Fokus. Lentes, relojes, collares, pulseras, anillos, aretes y billeteras.</description>
    ${items}
  </channel>
</rss>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type":  "application/xml; charset=utf-8",
        // Cache 1 hora en CDN, revalidable desde el servidor
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("[catalog feed]", err);
    return new NextResponse("Error generating catalog feed", { status: 500 });
  }
}