"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
//  🔥 FIREBASE CONFIG
// ═══════════════════════════════════════════════════════════════════════════════
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAyZI3aj5JBfRaIT875ydXeFiaHmtECoXI",
  authDomain:        "fokus-16a0c.firebaseapp.com",
  projectId:         "fokus-16a0c",
  storageBucket:     "fokus-16a0c.firebasestorage.app",
  messagingSenderId: "714751929631",
  appId:             "1:714751929631:web:2b0e898ebee51f4c67942a",
};

// ═══════════════════════════════════════════════════════════════════════════════
//  ☁️ CLOUDINARY
// ═══════════════════════════════════════════════════════════════════════════════
const CLOUDINARY_CLOUD  = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "drgafle8o";
const CLOUDINARY_PRESET = "fokus_products";

// ═══════════════════════════════════════════════════════════════════════════════
//  🔑 ADMIN
// ═══════════════════════════════════════════════════════════════════════════════
const ADMIN_EMAIL    = process.env.NEXT_PUBLIC_ADMIN_EMAIL    || "miltonjavi05@gmail.com";
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "2844242900";

// ─── CONTACTO ─────────────────────────────────────────────────────────────────
const WHATSAPP_NUMBER = "584243005733";
const SOCIAL = {
  whatsapp:  `https://wa.me/${WHATSAPP_NUMBER}`,
  instagram: "https://www.instagram.com/fokus_accesorios?igsh=eGNiNHZmczUwY3Np",
  facebook:  "https://www.facebook.com/share/14d2kQuHQ3y/?mibextid=wwXIfr",
  tiktok:    "https://www.tiktok.com/@fokus_accesorios?_r=1&_t=ZS-95NNWYzuIxV",
};

// ─── MÉTODOS DE PAGO ──────────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { id:"zinli",   icon:"💳", name:"Zinli",        detail:"miltonjavi05@gmail.com" },
  { id:"binance", icon:"🟡", name:"Binance Pay",  detail:"miltonjavi05@gmail.com" },
  { id:"pagomovil_bv", icon:"🏦", name:"Pago Móvil – Banco de Venezuela", detail:"Tlf: 04243005733 · C.I: 28442429" },
  { id:"pagomovil_ba", icon:"🏦", name:"Pago Móvil – Bancamiga",          detail:"Tlf: 04243005733 · C.I: 28442429" },
];

// ─── ESTRUCTURA DE CATEGORÍAS ─────────────────────────────────────────────────
const SHOP_CATS = [
  "LENTES","RELOJES","COLLARES","PULSERAS","ANILLOS","ARETES","BILLETERAS",
] as const;

const LENTES_SUBCATS = [
  "LENTES·FOTOCROMATICOS",
  "LENTES·ANTI-LUZ-AZUL",
  "LENTES·SOL",
  "LENTES·MOTORIZADOS",
] as const;

const ALL_SHOP_CATS = [
  "LENTES",
  ...LENTES_SUBCATS,
  "RELOJES","COLLARES","PULSERAS","ANILLOS","ARETES","BILLETERAS",
] as const;

const ADMIN_CATS = [...ALL_SHOP_CATS] as string[];

// ─── TIPOS ────────────────────────────────────────────────────────────────────
interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  img: string;
  description?: string;
  createdAt?: number;
}
interface CartItem { product: Product; qty: number; }

type MainView = "fokus" | "shop" | "comunidad" | "cart" | "admin";
type ShopFilter = typeof ALL_SHOP_CATS[number] | "TODO" | typeof LENTES_SUBCATS[number];

// ═══════════════════════════════════════════════════════════════════════════════
//  FIREBASE FIRESTORE REST API
// ═══════════════════════════════════════════════════════════════════════════════
const fsBase = () =>
  `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`;

type FsVal =
  | { stringValue: string } | { doubleValue: number } | { integerValue: string }
  | { booleanValue: boolean } | { nullValue: null }
  | { arrayValue: { values?: FsVal[] } }
  | { mapValue: { fields?: Record<string, FsVal> } };

function toFs(v: unknown): FsVal {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "string")  return { stringValue: v };
  if (typeof v === "number")  return { doubleValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (Array.isArray(v))       return { arrayValue: { values: v.map(toFs) } };
  if (typeof v === "object")  return {
    mapValue: { fields: Object.fromEntries(Object.entries(v as Record<string,unknown>).map(([k,val])=>[k,toFs(val)])) }
  };
  return { stringValue: String(v) };
}

function fromFs(f: FsVal): unknown {
  if ("stringValue"  in f) return f.stringValue;
  if ("doubleValue"  in f) return f.doubleValue;
  if ("integerValue" in f) return Number(f.integerValue);
  if ("booleanValue" in f) return f.booleanValue;
  if ("nullValue"    in f) return null;
  if ("arrayValue"   in f) return ((f as {arrayValue:{values?:FsVal[]}}).arrayValue.values||[]).map(fromFs);
  if ("mapValue"     in f) {
    const fields = (f as {mapValue:{fields?:Record<string,FsVal>}}).mapValue.fields||{};
    return Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,fromFs(v)]));
  }
  return null;
}

interface FsDoc { name: string; fields: Record<string, FsVal>; }

function docToProduct(doc: FsDoc): Product {
  const f = doc.fields||{};
  return {
    id:          doc.name.split("/").pop() as string,
    name:        fromFs(f.name        ?? {nullValue:null}) as string || "",
    category:    ((fromFs(f.category  ?? {nullValue:null}) as string)||"").toUpperCase(),
    price:       fromFs(f.price       ?? {nullValue:null}) as number || 0,
    img:         fromFs(f.img         ?? {nullValue:null}) as string || "",
    description: fromFs(f.description ?? {nullValue:null}) as string || "",
    createdAt:   fromFs(f.createdAt   ?? {nullValue:null}) as number || 0,
  };
}

async function fsGetAll(): Promise<Product[]> {
  const r = await fetch(`${fsBase()}/products?pageSize=200`);
  if (!r.ok) throw new Error(await r.text());
  const d = await r.json() as { documents?: FsDoc[] };
  return (d.documents||[]).map(docToProduct);
}
async function fsAdd(p: Omit<Product,"id">): Promise<void> {
  const fields = Object.fromEntries(Object.entries({...p,createdAt:Date.now()}).map(([k,v])=>[k,toFs(v)]));
  const r = await fetch(`${fsBase()}/products`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fields})});
  if (!r.ok) throw new Error(await r.text());
}
async function fsUpdate(id: string, p: Partial<Omit<Product,"id">>): Promise<void> {
  const fields = Object.fromEntries(Object.entries(p).map(([k,v])=>[k,toFs(v)]));
  const mask   = Object.keys(p).map(k=>`updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
  const r = await fetch(`${fsBase()}/products/${id}?${mask}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({fields})});
  if (!r.ok) throw new Error(await r.text());
}
async function fsDelete(id: string): Promise<void> {
  await fetch(`${fsBase()}/products/${id}`,{method:"DELETE"});
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CLOUDINARY
// ═══════════════════════════════════════════════════════════════════════════════
async function uploadImg(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", CLOUDINARY_PRESET);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,{method:"POST",body:fd});
  if (!r.ok) throw new Error("Error subiendo imagen");
  return ((await r.json()) as {secure_url:string}).secure_url;
}

function optImg(url: string, w=400): string {
  if (!url||!url.includes("cloudinary.com")) return url;
  return url.replace("/upload/",`/upload/w_${w},q_auto,f_webp,dpr_auto/`);
}

// ─── DEMO PRODUCTS ────────────────────────────────────────────────────────────
const DEMO: Product[] = [
  {id:"d1",name:"Lentes Fotocromaticos",  category:"LENTES·FOTOCROMATICOS",  price:22,img:"https://images.unsplash.com/photo-1577803645773-f96470509666?w=400&q=80"},
  {id:"d2",name:"Lentes Anti Luz Azul",   category:"LENTES·ANTI-LUZ-AZUL",   price:18,img:"https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&q=80"},
  {id:"d3",name:"Lentes de Sol",          category:"LENTES·SOL",             price:20,img:"https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&q=80"},
  {id:"d4",name:"Lentes para Motos",      category:"LENTES·MOTORIZADOS",     price:25,img:"https://images.unsplash.com/photo-1473496169904-658ba7574b0d?w=400&q=80"},
  {id:"d5",name:"Megir NF56",             category:"RELOJES",                price:40,img:"https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&q=80"},
  {id:"d6",name:"Navigorce NF65",         category:"RELOJES",                price:40,img:"https://images.unsplash.com/photo-1548171916-c8fd28f7f356?w=400&q=80"},
  {id:"d7",name:"Collar de Cruz",         category:"COLLARES",               price:25,img:"https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80"},
  {id:"d8",name:"Pulsera Trenzada",       category:"PULSERAS",               price:15,img:"https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=400&q=80"},
  {id:"d9",name:"Anillo Liso",            category:"ANILLOS",                price:12,img:"https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&q=80"},
  {id:"d10",name:"Aretes Argolla",        category:"ARETES",                 price:10,img:"https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=400&q=80"},
  {id:"d11",name:"Billetera Cuero",       category:"BILLETERAS",             price:30,img:"https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&q=80"},
];

// ─── ÍCONOS SVG (memoized) ────────────────────────────────────────────────────
const IcWA = ({s=22,c="#fff"}:{s?:number;c?:string}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
);
const IcIG = ({s=22,c="#fff"}:{s?:number;c?:string}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
);
const IcFB = ({s=22,c="#fff"}:{s?:number;c?:string}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
);
const IcTT = ({s=22,c="#fff"}:{s?:number;c?:string}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
);

// ─── ESTILOS BASE ─────────────────────────────────────────────────────────────
const NAV_H     = 56;
const TABS_H    = 34;
const TOTAL_NAV = NAV_H + TABS_H;

const C = {
  bg:      "#0d0d0d",
  surface: "#161616",
  border:  "#262626",
  text:    "#f0f0f0",
  muted:   "#666",
  accent:  "#fff",
  catActive:"#fff",
  catInact: "#555",
};

const S = {
  iconBtn:  {background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:6} as React.CSSProperties,
  darkBtn:  {background:C.accent,color:"#111",border:"none",padding:"0.85rem 1.5rem",fontSize:12,fontWeight:700,letterSpacing:1.5,cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:"0.5rem"} as React.CSSProperties,
  qtyBtn:   {background:"none",border:"none",width:36,height:36,fontSize:20,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",color:C.text} as React.CSSProperties,
  socialA:  {display:"flex",alignItems:"center",justifyContent:"center",width:40,height:40,borderRadius:"50%",background:"#1e1e1e",textDecoration:"none",border:"1px solid #2a2a2a",transition:"all 0.2s"} as React.CSSProperties,
  input:    {width:"100%",border:`1px solid ${C.border}`,padding:"0.75rem 1rem",fontSize:14,outline:"none",fontFamily:"inherit",background:"#1c1c1c",color:C.text,borderRadius:6,boxSizing:"border-box"} as React.CSSProperties,
  adminBtn: {background:C.accent,color:"#111",border:"none",padding:"0.8rem 1.5rem",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",borderRadius:6,width:"100%"} as React.CSSProperties,
};

// ─── LAZY IMAGE (with IntersectionObserver) ───────────────────────────────────
function LazyImg({src,alt}:{src:string;alt:string}) {
  const [loaded,setLoaded] = useState(false);
  const [inView,setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    const el = ref.current; if(!el) return;
    const obs = new IntersectionObserver(([e])=>{ if(e.isIntersecting){ setInView(true); obs.disconnect(); } },{rootMargin:"200px"});
    obs.observe(el);
    return ()=>obs.disconnect();
  },[]);

  return (
    <div ref={ref} style={{position:"relative",width:"100%",height:"100%"}}>
      {!loaded && <div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,#1e1e1e 25%,#2a2a2a 50%,#1e1e1e 75%)",backgroundSize:"200% 100%",animation:"shimmer 1.2s infinite"}}/>}
      {inView && <img src={optImg(src,400)} alt={alt} loading="lazy" decoding="async" fetchPriority="low" onLoad={()=>setLoaded(true)}
        style={{width:"100%",height:"100%",objectFit:"cover",display:"block",opacity:loaded?1:0,transition:"opacity 0.25s"}}/>}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div>
      <div style={{aspectRatio:"1",background:"linear-gradient(90deg,#1e1e1e 25%,#2a2a2a 50%,#1e1e1e 75%)",backgroundSize:"200% 100%",animation:"shimmer 1.2s infinite",marginBottom:"0.5rem",borderRadius:6}}/>
      <div style={{height:12,background:"#1e1e1e",borderRadius:4,marginBottom:6,width:"72%"}}/>
      <div style={{height:12,background:"#1e1e1e",borderRadius:4,width:"38%"}}/>
    </div>
  );
}

function catLabel(cat: string): string {
  const map: Record<string,string> = {
    "LENTES·FOTOCROMATICOS": "Fotocromaticos",
    "LENTES·ANTI-LUZ-AZUL":  "Anti Luz Azul",
    "LENTES·SOL":             "De Sol",
    "LENTES·MOTORIZADOS":    "Para Motos",
  };
  return map[cat] ?? (cat[0]+cat.slice(1).toLowerCase());
}

// ─── DRAGGABLE WHATSAPP BUTTON ────────────────────────────────────────────────
function DraggableWA() {
  const [pos, setPos] = useState({x:20, y:20}); // bottom-right offset
  const dragging = useRef(false);
  const offset   = useRef({x:0,y:0});
  const btnRef   = useRef<HTMLAnchorElement>(null);
  const hasMoved = useRef(false);

  const onDown = (e: React.PointerEvent) => {
    dragging.current = true;
    hasMoved.current = false;
    const btn = btnRef.current!.getBoundingClientRect();
    offset.current = {
      x: e.clientX - (window.innerWidth  - btn.right  + btn.width/2 + pos.x),
      y: e.clientY - (window.innerHeight - btn.bottom + btn.height/2 + pos.y),
    };
    btnRef.current!.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    hasMoved.current = true;
    const newX = Math.max(8, Math.min(window.innerWidth  - 60, window.innerWidth  - e.clientX + offset.current.x));
    const newY = Math.max(8, Math.min(window.innerHeight - 60, window.innerHeight - e.clientY + offset.current.y));
    setPos({x:newX, y:newY});
  };
  const onUp = (e: React.PointerEvent) => {
    dragging.current = false;
    if (hasMoved.current) e.preventDefault();
  };

  return (
    <a
      ref={btnRef}
      href={hasMoved.current ? undefined : SOCIAL.whatsapp}
      target="_blank"
      rel="noreferrer"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onClick={(e)=>{ if(hasMoved.current) e.preventDefault(); }}
      style={{
        position:"fixed",
        bottom:pos.y,
        right:pos.x,
        zIndex:150,
        background:"#25D366",
        borderRadius:"50%",
        width:52,
        height:52,
        display:"flex",
        alignItems:"center",
        justifyContent:"center",
        boxShadow:"0 4px 20px rgba(0,0,0,0.45)",
        textDecoration:"none",
        cursor:"grab",
        touchAction:"none",
        userSelect:"none",
      }}>
      <IcWA s={28}/>
    </a>
  );
}

// ─── HORIZONTAL SWIPEABLE TABS ────────────────────────────────────────────────
function SwipeTabs({
  items,
  active,
  onSelect,
  renderItem,
  height=44,
  gap="0",
}:{
  items: string[];
  active: string;
  onSelect:(v:string)=>void;
  renderItem:(item:string,isActive:boolean)=>React.ReactNode;
  height?:number;
  gap?:string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startScroll = useRef(0);
  const isDragging = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startScroll.current = ref.current?.scrollLeft ?? 0;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!ref.current) return;
    const dx = startX.current - e.touches[0].clientX;
    ref.current.scrollLeft = startScroll.current + dx;
  };

  // Scroll active item into view
  useEffect(()=>{
    const el = ref.current?.querySelector(`[data-active="true"]`) as HTMLElement|null;
    el?.scrollIntoView({block:"nearest",inline:"center",behavior:"smooth"});
  },[active]);

  return (
    <div
      ref={ref}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      style={{
        display:"flex",
        overflowX:"auto",
        scrollbarWidth:"none",
        WebkitOverflowScrolling:"touch",
        height,
        gap,
      }}
      className="no-scrollbar">
      {items.map(item=>{
        const isActive = item === active;
        return (
          <button
            key={item}
            data-active={isActive}
            onClick={()=>onSelect(item)}
            style={{
              background:"none",
              border:"none",
              cursor:"pointer",
              fontFamily:"inherit",
              flexShrink:0,
              padding:0,
              display:"flex",
              alignItems:"center",
            }}>
            {renderItem(item,isActive)}
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function Home() {
  const [mainView,setMainView]         = useState<MainView>("fokus");
  const [shopFilter,setShopFilter]     = useState<ShopFilter>("TODO");
  const [lentesOpen,setLentesOpen]     = useState(false);
  const [cart,setCart]                 = useState<CartItem[]>([]);
  const [selectedProduct,setSelectedProduct] = useState<Product|null>(null);
  const [modalQty,setModalQty]         = useState(1);
  const [menuOpen,setMenuOpen]         = useState(false);
  const [searchOpen,setSearchOpen]     = useState(false);
  const [searchQuery,setSearchQuery]   = useState("");

  // Payment
  const [payMethod,setPayMethod]       = useState<string|null>(null);
  const [showPayment,setShowPayment]   = useState(false);

  const [products,setProducts]         = useState<Product[]>([]);
  const [loading,setLoading]           = useState(true);
  const [fbReady,setFbReady]           = useState(false);

  const navRef = useRef<HTMLElement>(null);
  const [navHeight, setNavHeight] = useState(TOTAL_NAV);

  useEffect(()=>{
    const update = () => {
      if (navRef.current) setNavHeight(navRef.current.offsetHeight);
    };
    update();
    const ro = new ResizeObserver(update);
    if (navRef.current) ro.observe(navRef.current);
    return ()=>ro.disconnect();
  },[mainView,lentesOpen,searchOpen]);

  // Admin
  const [adminLogged,setAdminLogged]   = useState(false);
  const [adminEmail,setAdminEmail]     = useState("");
  const [adminPwd,setAdminPwd]         = useState("");
  const [adminErr,setAdminErr]         = useState("");
  const [adminSection,setAdminSection] = useState<"menu"|"products">("menu");

  const [editing,setEditing]   = useState<Product|null>(null);
  const [fName,setFName]       = useState("");
  const [fDesc,setFDesc]       = useState("");
  const [fPrice,setFPrice]     = useState("");
  const [fCat,setFCat]         = useState("");
  const [fFile,setFFile]       = useState<File|null>(null);
  const [fPreview,setFPreview] = useState("");
  const [fLoading,setFLoading] = useState(false);
  const [fError,setFError]     = useState("");
  const [fSuccess,setFSuccess] = useState("");
  const [adminSearch,setAdminSearch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const loadProducts = useCallback(async()=>{
    setLoading(true);
    try {
      const data = await fsGetAll();
      setProducts(data.length>0?data:DEMO);
    } catch { setProducts(DEMO); }
    finally  { setLoading(false); }
  },[]);

  useEffect(()=>{
    const ready = FIREBASE_CONFIG.projectId !== "TU_PROJECT_ID";
    setFbReady(ready);
    if(ready) loadProducts(); else { setProducts(DEMO); setLoading(false); }
    if (typeof window !== "undefined" && window.location.pathname === "/admin") {
      setMainView("admin");
    }
  },[loadProducts]);

  // Memoized derived data
  const isLentesSubcat = useMemo(()=>(LENTES_SUBCATS as readonly string[]).includes(shopFilter),[shopFilter]);
  const isLentesActive = useMemo(()=>shopFilter==="LENTES"||isLentesSubcat,[shopFilter,isLentesSubcat]);

  const getVisibleCats = useCallback((): string[] => {
    if (shopFilter==="TODO") return [...LENTES_SUBCATS, ...SHOP_CATS.filter(c=>c!=="LENTES")];
    if (shopFilter==="LENTES") return [...LENTES_SUBCATS];
    return [shopFilter];
  },[shopFilter]);

  const getProds = useCallback((cat:string) => products.filter(p=>
    p.category===cat &&
    (searchQuery===""||p.name.toLowerCase().includes(searchQuery.toLowerCase()))
  ),[products,searchQuery]);

  const totalItems = useMemo(()=>cart.reduce((s,i)=>s+i.qty,0),[cart]);
  const totalPrice = useMemo(()=>cart.reduce((s,i)=>s+i.product.price*i.qty,0),[cart]);

  const addToCart = useCallback((product:Product,qty:number)=>{
    setCart(prev=>{
      const ex=prev.find(i=>i.product.id===product.id);
      return ex?prev.map(i=>i.product.id===product.id?{...i,qty:i.qty+qty}:i):[...prev,{product,qty}];
    });
    setSelectedProduct(null);
  },[]);

  const updateQty = useCallback((id:string,delta:number)=>
    setCart(prev=>prev.map(i=>i.product.id===id?{...i,qty:i.qty+delta}:i).filter(i=>i.qty>0))
  ,[]);

  const waMsg = useCallback(()=>{
    const lines=cart.map(i=>`• ${i.product.name} x${i.qty} — $${(i.product.price*i.qty).toFixed(2)}`);
    const pm = PAYMENT_METHODS.find(m=>m.id===payMethod);
    const pmLine = pm ? `\n\nMétodo de pago: ${pm.name} (${pm.detail})` : "";
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hola! Quiero hacer un pedido:\n\n${lines.join("\n")}\n\nTotal: $${totalPrice.toFixed(2)}${pmLine}\n\n¡Adjunto comprobante de pago!`)}`;
  },[cart,totalPrice,payMethod]);

  // Admin helpers
  const doLogin=()=>{
    if(adminEmail===ADMIN_EMAIL&&adminPwd===ADMIN_PASSWORD){setAdminLogged(true);setAdminErr("");setAdminSection("menu");}
    else setAdminErr("Credenciales incorrectas");
  };
  const doLogout=()=>{
    setAdminLogged(false);setAdminEmail("");setAdminPwd("");
    setMainView("fokus");
    window.history.pushState("","","/");
  };
  const resetForm=()=>{
    setEditing(null);setFName("");setFDesc("");setFPrice("");setFCat("");
    setFFile(null);setFPreview("");setFError("");setFSuccess("");
    if(fileRef.current) fileRef.current.value="";
  };
  const startEdit=(p:Product)=>{
    setEditing(p);setFName(p.name);setFDesc(p.description||"");
    setFPrice(String(p.price));setFCat(p.category);setFPreview(p.img);
    setFFile(null);setFError("");setFSuccess("");
    if(fileRef.current) fileRef.current.value="";
    window.scrollTo({top:0,behavior:"smooth"});
  };
  const onFileChange=(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0]; if(!file) return;
    setFFile(file);
    const r=new FileReader(); r.onload=ev=>setFPreview(ev.target?.result as string); r.readAsDataURL(file);
  };
  const submitProduct=async()=>{
    setFError("");setFSuccess("");
    if(!fName.trim()||!fPrice||!fCat){setFError("Nombre, precio y categoría son obligatorios.");return;}
    if(!editing&&!fFile){setFError("Selecciona una imagen.");return;}
    if(!fbReady){setFError("Firebase no configurado.");return;}
    setFLoading(true);
    try{
      let imgUrl=fPreview;
      if(fFile) imgUrl=await uploadImg(fFile);
      const data={name:fName.trim(),description:fDesc.trim(),price:parseFloat(fPrice),category:fCat.toUpperCase(),img:imgUrl};
      if(editing){await fsUpdate(editing.id,data);setFSuccess("✓ Producto actualizado");}
      else       {await fsAdd(data);              setFSuccess("✓ Producto agregado");}
      await loadProducts();
      setTimeout(resetForm,1800);
    }catch(err){setFError("Error: "+(err instanceof Error?err.message:"desconocido"));}
    finally{setFLoading(false);}
  };
  const deleteProduct=async(id:string)=>{
    if(!confirm("¿Eliminar este producto?")) return;
    await fsDelete(id); await loadProducts();
  };

  const adminProds=useMemo(()=>products.filter(p=>
    adminSearch===""||p.name.toLowerCase().includes(adminSearch.toLowerCase())||p.category.toLowerCase().includes(adminSearch.toLowerCase())
  ),[products,adminSearch]);

  const isShopView = mainView==="shop";
  const isAdmin    = mainView==="admin";
  const isCart     = mainView==="cart";
  const mainPadTop  = navHeight;
  const catStickyTop = navHeight - 1;

  // ─── NAV TAB ITEMS ──────────────────────────────────────────────
  const NAV_TABS = [
    {id:"fokus" as MainView, label:"FOKUS"},
    {id:"shop"  as MainView, label:"TIENDA"},
    {id:"comunidad" as MainView, label:"COMUNIDAD"},
  ];

  // ─── LENTES SUBCATS AS SWIPEABLE ─────────────────────────────────
  const lentesSubcatItems = useMemo(()=>["LENTES",...LENTES_SUBCATS] as string[],[]);

  return (
    <div style={{fontFamily:"'Helvetica Neue',Arial,sans-serif",background:C.bg,minHeight:"100vh",color:C.text}}>
      <style>{`
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .no-scrollbar::-webkit-scrollbar{display:none}
        .prod-card:hover .prod-img-inner{transform:scale(1.06)}
        .sub-cat-btn:hover{background:#1e1e1e!important;color:#fff!important}
        .lentes-subcat-pill:hover{background:#2a2a2a!important;color:#ddd!important}
        .social-link:hover{background:#2a2a2a!important;border-color:#444!important}
        * { box-sizing: border-box; }
        body { background: ${C.bg}; }
        .pay-card{transition:all 0.18s;}
        .pay-card:hover{background:#1e1e1e!important;}
        @media(max-width:480px){
          .products-grid{grid-template-columns:repeat(2,1fr)!important}
        }
        @media(min-width:481px) and (max-width:767px){
          .products-grid{grid-template-columns:repeat(auto-fill,minmax(160px,1fr))!important}
        }
        @media(min-width:768px){
          .products-grid{grid-template-columns:repeat(auto-fill,minmax(200px,1fr))!important}
        }
      `}</style>

      {/* ══ NAVBAR ══════════════════════════════════════════════════════════ */}
      <nav ref={navRef} style={{position:"fixed",top:0,left:0,right:0,zIndex:200,background:"#111",borderBottom:"1px solid #1a1a1a"}}>
        {/* Fila 1 */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 1rem",height:NAV_H,position:"relative"}}>
          <button onClick={()=>setMenuOpen(true)} style={S.iconBtn} aria-label="Menú">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          <button onClick={()=>setMainView("fokus")} aria-label="Inicio"
            style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:8,position:"absolute",left:"50%",transform:"translateX(-50%)",padding:"0 8px"}}>
            <img src="/favicon.png" alt="Fokus" width={28} height={28} style={{objectFit:"contain"}}/>
            <span style={{color:"#fff",fontSize:17,fontWeight:900,letterSpacing:4,whiteSpace:"nowrap"}}>FOKUS</span>
          </button>

          <div style={{display:"flex",gap:2,marginLeft:"auto"}}>
            <button
              onClick={()=>{
                const next = !searchOpen;
                setSearchOpen(next);
                setSearchQuery("");
                if(next && mainView!=="shop") { setMainView("shop"); setShopFilter("TODO"); }
              }}
              style={S.iconBtn} aria-label="Buscar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
            </button>
            <button onClick={()=>setMainView("cart")} style={{...S.iconBtn,position:"relative"}} aria-label="Carrito">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
              {totalItems>0&&(
                <span style={{position:"absolute",top:2,right:2,background:"#fff",color:"#111",borderRadius:"50%",width:16,height:16,fontSize:9,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Fila 2: tabs swipeables */}
        {!isAdmin && (
          <SwipeTabs
            items={NAV_TABS.map(t=>t.id)}
            active={mainView}
            onSelect={(id)=>{ setMainView(id as MainView); if(id==="shop") setShopFilter("TODO"); }}
            height={TABS_H}
            renderItem={(id,isActive)=>{
              const label = NAV_TABS.find(t=>t.id===id)?.label ?? id;
              return (
                <span style={{
                  display:"flex",alignItems:"center",padding:"0 1.5rem",height:"100%",
                  borderBottom:isActive?"2px solid #fff":"2px solid transparent",
                  fontSize:11,fontWeight:700,letterSpacing:2,
                  color:isActive?"#fff":"#555",whiteSpace:"nowrap",
                  transition:"color 0.15s,border-color 0.15s",
                }}>{label}</span>
              );
            }}
          />
        )}

        {/* Búsqueda */}
        {searchOpen && (
          <div style={{background:"#161616",borderTop:`1px solid ${C.border}`,padding:"0.6rem 1rem"}}>
            <input autoFocus value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
              placeholder="Buscar productos..." aria-label="Búsqueda"
              style={{width:"100%",border:`1px solid ${C.border}`,padding:"0.55rem 1rem",fontSize:14,outline:"none",fontFamily:"inherit",background:"#1c1c1c",color:C.text,boxSizing:"border-box",borderRadius:4}}/>
          </div>
        )}
      </nav>

      {/* ══ MENÚ LATERAL ════════════════════════════════════════════════════ */}
      {menuOpen && (
        <div style={{position:"fixed",inset:0,zIndex:300,display:"flex"}}>
          <div onClick={()=>setMenuOpen(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.75)"}}/>
          <div style={{position:"relative",background:"#111",width:280,height:"100%",padding:"2rem 1.5rem",overflowY:"auto",display:"flex",flexDirection:"column"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"2rem"}}>
              <span style={{fontWeight:900,fontSize:14,letterSpacing:2,color:"#fff"}}>TIENDA</span>
              <button onClick={()=>setMenuOpen(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#888"}} aria-label="Cerrar">✕</button>
            </div>

            {/* LENTES accordion */}
            <div>
              <button onClick={()=>setLentesOpen(o=>!o)}
                style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",background:"none",border:"none",borderBottom:`1px solid ${C.border}`,padding:"0.9rem 0",textAlign:"left",fontSize:15,cursor:"pointer",fontFamily:"inherit",color:"#e0e0e0"}}>
                <span>Lentes</span>
                <span style={{fontSize:10,color:"#555",transition:"transform 0.2s",transform:lentesOpen?"rotate(180deg)":"rotate(0deg)"}}>▼</span>
              </button>
              {lentesOpen && (
                <div style={{paddingLeft:"1rem",borderBottom:`1px solid ${C.border}`}}>
                  {LENTES_SUBCATS.map(sub=>(
                    <button key={sub} className="sub-cat-btn"
                      onClick={()=>{setShopFilter(sub);setMenuOpen(false);setMainView("shop");}}
                      style={{display:"block",width:"100%",background:"none",border:"none",padding:"0.65rem 0",textAlign:"left",fontSize:13,cursor:"pointer",fontFamily:"inherit",color:"#888",borderRadius:4}}>
                      {catLabel(sub)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {SHOP_CATS.filter(c=>c!=="LENTES").map(cat=>(
              <button key={cat}
                onClick={()=>{setShopFilter(cat);setMenuOpen(false);setMainView("shop");}}
                style={{display:"block",width:"100%",background:"none",border:"none",borderBottom:`1px solid ${C.border}`,padding:"0.9rem 0",textAlign:"left",fontSize:15,cursor:"pointer",fontFamily:"inherit",color:"#e0e0e0"}}>
                {catLabel(cat)}
              </button>
            ))}

            <div style={{marginTop:"1.5rem"}}>
              <p style={{fontSize:10,letterSpacing:2,color:"#555",marginBottom:"1rem",fontWeight:700}}>SÍGUENOS</p>
              <div style={{display:"flex",gap:"0.75rem"}}>
                <a href={SOCIAL.whatsapp}  target="_blank" rel="noreferrer" className="social-link" style={S.socialA}><IcWA s={18}/></a>
                <a href={SOCIAL.instagram} target="_blank" rel="noreferrer" className="social-link" style={S.socialA}><IcIG s={18}/></a>
                <a href={SOCIAL.facebook}  target="_blank" rel="noreferrer" className="social-link" style={S.socialA}><IcFB s={18}/></a>
                <a href={SOCIAL.tiktok}    target="_blank" rel="noreferrer" className="social-link" style={S.socialA}><IcTT s={18}/></a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ FOKUS HOME ══════════════════════════════════════════════════════ */}
      {mainView==="fokus" && (
        <main style={{paddingTop:mainPadTop,background:C.bg}}>
          <div style={{maxWidth:800,margin:"0 auto",padding:"3rem 1.5rem 0",textAlign:"center"}}>
            <img src="/favicon.png" alt="Fokus" width={72} height={72} style={{objectFit:"contain",marginBottom:"1.5rem"}}/>
            <h1 style={{fontSize:32,fontWeight:900,letterSpacing:6,marginBottom:"0.75rem",color:C.accent}}>FOKUS</h1>
            <p style={{fontSize:15,color:C.muted,marginBottom:"0.4rem",lineHeight:1.7}}>Cada detalle +</p>
            <p style={{fontSize:14,color:"#444",marginBottom:"2.5rem",lineHeight:1.7}}>Calidad, diseño y actitud.</p>
            <button onClick={()=>{setMainView("shop");setShopFilter("TODO");}} style={{...S.darkBtn,fontSize:13,padding:"1rem 2.5rem",letterSpacing:2,borderRadius:4}}>
              VER TIENDA →
            </button>
            <div style={{display:"flex",justifyContent:"center",gap:"1rem",marginTop:"3rem"}}>
              <a href={SOCIAL.instagram} target="_blank" rel="noreferrer" className="social-link" style={S.socialA}><IcIG s={20}/></a>
              <a href={SOCIAL.tiktok}    target="_blank" rel="noreferrer" className="social-link" style={S.socialA}><IcTT s={20}/></a>
              <a href={SOCIAL.facebook}  target="_blank" rel="noreferrer" className="social-link" style={S.socialA}><IcFB s={20}/></a>
              <a href={SOCIAL.whatsapp}  target="_blank" rel="noreferrer" className="social-link" style={{...S.socialA,background:"#25D366",border:"1px solid #25D366"}}><IcWA s={20}/></a>
            </div>
          </div>

          {/* FOOTER HOME */}
          <Footer setMainView={setMainView} setShopFilter={setShopFilter} />
        </main>
      )}

      {/* ══ TIENDA ══════════════════════════════════════════════════════════ */}
      {isShopView && (
        <main style={{paddingTop:mainPadTop,background:C.bg}}>

          {/* ── Filtro sticky (swipeable en móvil) ───────────────────────── */}
          <div style={{position:"sticky",top:catStickyTop,zIndex:100,background:"#111",borderBottom:`1px solid ${C.border}`}}>

            {/* Fila principal — SWIPEABLE */}
            <SwipeTabs
              items={["TODO","LENTES",...(SHOP_CATS.filter(c=>c!=="LENTES") as string[])]}
              active={shopFilter==="TODO"?"TODO": isLentesActive?"LENTES": (SHOP_CATS.filter(c=>c!=="LENTES") as string[]).includes(shopFilter)?shopFilter:"TODO"}
              onSelect={(item)=>{
                if(item==="LENTES"){
                  const next=!lentesOpen;
                  setLentesOpen(next);
                  if(next) setShopFilter("LENTES");
                } else {
                  setShopFilter(item as ShopFilter);
                  setLentesOpen(false);
                }
              }}
              height={44}
              renderItem={(item,_isActive)=>{
                const isActiveItem =
                  item==="TODO" ? shopFilter==="TODO" :
                  item==="LENTES" ? isLentesActive :
                  shopFilter===item;
                const isLentesBtn = item==="LENTES";
                return (
                  <span style={{
                    display:"flex",alignItems:"center",gap:4,
                    padding:"0 1rem",height:44,
                    borderBottom:isActiveItem?"2.5px solid #fff":"2.5px solid transparent",
                    fontSize:11,fontWeight:700,letterSpacing:1.5,
                    color:isActiveItem?C.catActive:C.catInact,
                    whiteSpace:"nowrap",
                    transition:"color 0.15s,border-color 0.15s",
                  }}>
                    {item}
                    {isLentesBtn&&<span style={{fontSize:9,transition:"transform 0.2s",display:"inline-block",transform:lentesOpen?"rotate(180deg)":"rotate(0deg)"}}>▼</span>}
                  </span>
                );
              }}
            />

            {/* Subcats LENTES — pills swipeables */}
            {lentesOpen && (
              <div style={{background:"#0f0f0f",borderTop:"1px solid #1e1e1e",padding:"0.6rem 1rem",display:"flex",gap:"0.5rem",overflowX:"auto",scrollbarWidth:"none",WebkitOverflowScrolling:"touch"}} className="no-scrollbar">
                <span style={{fontSize:9,color:"#444",letterSpacing:1.5,fontWeight:700,marginRight:"0.25rem",whiteSpace:"nowrap",display:"flex",alignItems:"center"}}>LENTES /</span>
                {LENTES_SUBCATS.map(sub=>(
                  <button key={sub} className="lentes-subcat-pill"
                    onClick={()=>setShopFilter(sub)}
                    style={{
                      background:shopFilter===sub?"#fff":"#1a1a1a",
                      color:shopFilter===sub?"#111":"#666",
                      border:shopFilter===sub?"1px solid #fff":"1px solid #2a2a2a",
                      padding:"0.3rem 0.85rem",borderRadius:20,fontSize:10,fontWeight:700,
                      letterSpacing:1,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",
                      transition:"all 0.15s",flexShrink:0,
                    }}>
                    {catLabel(sub).toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Grid de productos */}
          <div style={{maxWidth:1200,margin:"0 auto",padding:"1.5rem 1rem 4rem"}}>
            {loading ? (
              <div className="products-grid" style={{display:"grid",gap:"1rem"}}>
                {Array.from({length:8}).map((_,i)=><SkeletonCard key={i}/>)}
              </div>
            ) : (
              getVisibleCats().map(cat=>{
                const prods = getProds(cat);
                if(prods.length===0) return null;

                // LENTES: mostra banner de subcategoría + grid
                const isLenteCat = (LENTES_SUBCATS as readonly string[]).includes(cat);

                return (
                  <div key={cat} style={{marginBottom:"3rem"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",borderBottom:`1px solid ${C.border}`,paddingBottom:"0.6rem"}}>
                      <h2 style={{fontSize:15,fontWeight:900,letterSpacing:2,margin:0,color:C.accent}}>
                        {isLenteCat ? `LENTES · ${catLabel(cat).toUpperCase()}` : catLabel(cat).toUpperCase()}
                      </h2>
                      <button
                        onClick={()=>{
                          setShopFilter(cat as ShopFilter);
                          setLentesOpen(isLenteCat);
                        }}
                        style={{background:"none",border:"none",fontSize:12,color:C.muted,cursor:"pointer",fontFamily:"inherit"}}>
                        Ver solo esta
                      </button>
                    </div>
                    <div className="products-grid" style={{display:"grid",gap:"1rem"}}>
                      {prods.map(product=>(
                        <div key={product.id} className="prod-card"
                          onClick={()=>{setSelectedProduct(product);setModalQty(1);}}
                          style={{cursor:"pointer"}}>
                          <div style={{background:C.surface,aspectRatio:"1",overflow:"hidden",marginBottom:"0.5rem",borderRadius:6}}>
                            <div className="prod-img-inner" style={{width:"100%",height:"100%",transition:"transform 0.3s"}}>
                              <LazyImg src={product.img} alt={product.name}/>
                            </div>
                          </div>
                          <p style={{margin:"0 0 3px",fontSize:13,lineHeight:1.3,color:C.text}}>{product.name}</p>
                          <p style={{margin:0,fontSize:14,fontWeight:700,color:C.accent}}>${product.price.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <Footer setMainView={setMainView} setShopFilter={setShopFilter} />
        </main>
      )}

      {/* ══ COMUNIDAD ══════════════════════════════════════════════════════ */}
      {mainView==="comunidad" && (
        <main style={{paddingTop:mainPadTop,background:C.bg}}>
          <div style={{maxWidth:600,margin:"0 auto",padding:"4rem 1.5rem 0",textAlign:"center"}}>
            <p style={{fontSize:40,marginBottom:"1rem"}}>🤝</p>
            <h2 style={{fontSize:22,fontWeight:900,letterSpacing:2,marginBottom:"1rem",color:C.accent}}>COMUNIDAD</h2>
            <p style={{color:C.muted,fontSize:15,lineHeight:1.7}}>Muy pronto podrás ver contenido, reviews y mucho más de la comunidad Fokus.</p>
            <div style={{display:"flex",justifyContent:"center",gap:"1rem",marginTop:"2rem"}}>
              <a href={SOCIAL.instagram} target="_blank" rel="noreferrer" className="social-link" style={S.socialA}><IcIG s={20}/></a>
              <a href={SOCIAL.tiktok}    target="_blank" rel="noreferrer" className="social-link" style={S.socialA}><IcTT s={20}/></a>
            </div>
          </div>
          <Footer setMainView={setMainView} setShopFilter={setShopFilter} />
        </main>
      )}

      {/* ══ CARRITO ══════════════════════════════════════════════════════════ */}
      {isCart && (
        <main style={{paddingTop:mainPadTop,background:C.bg}}>
          <div style={{maxWidth:700,margin:"0 auto",padding:"2rem 1rem 4rem"}}>
            <h1 style={{fontSize:20,fontWeight:900,letterSpacing:2,marginBottom:"1.5rem",color:C.accent}}>CARRITO</h1>

            {cart.length===0 ? (
              <div style={{textAlign:"center",padding:"4rem 0",color:C.muted}}>
                <p style={{marginBottom:"1.5rem"}}>Tu carrito está vacío</p>
                <button onClick={()=>{setMainView("shop");setShopFilter("TODO");}} style={{...S.darkBtn,borderRadius:4}}>IR A LA TIENDA</button>
              </div>
            ) : (
              <>
                {cart.map(item=>(
                  <div key={item.product.id} style={{display:"grid",gridTemplateColumns:"1fr auto auto auto",gap:"0.75rem",padding:"1rem 0",borderBottom:`1px solid ${C.border}`,alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
                      <button onClick={()=>updateQty(item.product.id,-item.qty)} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:14,padding:0}} aria-label="Eliminar">✕</button>
                      <img src={optImg(item.product.img,120)} alt={item.product.name} style={{width:52,height:52,objectFit:"cover",borderRadius:4}}/>
                      <span style={{fontSize:13,color:C.text}}>{item.product.name}</span>
                    </div>
                    <span style={{fontSize:14,color:C.text}}>${item.product.price.toFixed(2)}</span>
                    <div style={{display:"flex",alignItems:"center",border:`1px solid ${C.border}`}}>
                      <button onClick={()=>updateQty(item.product.id,-1)} style={S.qtyBtn}>−</button>
                      <span style={{padding:"0 0.5rem",fontSize:14,color:C.text}}>{item.qty}</span>
                      <button onClick={()=>updateQty(item.product.id,1)} style={S.qtyBtn}>+</button>
                    </div>
                    <span style={{fontSize:14,fontWeight:700,color:C.accent}}>${(item.product.price*item.qty).toFixed(2)}</span>
                  </div>
                ))}

                <div style={{display:"flex",gap:"0.75rem",marginTop:"1.5rem",flexWrap:"wrap"}}>
                  <button onClick={()=>setMainView("shop")} style={{...S.darkBtn,borderRadius:4}}>← SEGUIR COMPRANDO</button>
                  <button onClick={()=>setCart([])} style={{...S.darkBtn,background:"transparent",color:C.text,border:`1px solid ${C.border}`,borderRadius:4}}>Vaciar</button>
                </div>

                {/* ── RESUMEN Y PAGO ──────────────────────────────────── */}
                <div style={{marginTop:"2rem",background:C.surface,padding:"1.5rem",borderRadius:8,border:`1px solid ${C.border}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.75rem",fontSize:14,color:C.text}}>
                    <span>Subtotal</span><span>${totalPrice.toFixed(2)}</span>
                  </div>
                  <div style={{borderTop:`1px solid ${C.border}`,paddingTop:"0.75rem",display:"flex",justifyContent:"space-between",fontSize:16,fontWeight:700,color:C.accent}}>
                    <span>Total</span><span>${totalPrice.toFixed(2)}</span>
                  </div>

                  {/* MÉTODOS DE PAGO */}
                  <div style={{marginTop:"1.5rem"}}>
                    <p style={{fontSize:11,fontWeight:700,letterSpacing:2,color:"#555",marginBottom:"0.75rem"}}>SELECCIONA TU MÉTODO DE PAGO</p>
                    <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
                      {PAYMENT_METHODS.map(pm=>(
                        <button key={pm.id}
                          className="pay-card"
                          onClick={()=>setPayMethod(pm.id)}
                          style={{
                            display:"flex",alignItems:"center",gap:"0.85rem",
                            background:payMethod===pm.id?"#fff":"#1a1a1a",
                            color:payMethod===pm.id?"#111":C.text,
                            border:`1.5px solid ${payMethod===pm.id?"#fff":"#2a2a2a"}`,
                            borderRadius:8,padding:"0.85rem 1rem",
                            textAlign:"left",cursor:"pointer",fontFamily:"inherit",
                            transition:"all 0.18s",
                          }}>
                          <span style={{fontSize:20}}>{pm.icon}</span>
                          <div>
                            <p style={{margin:0,fontSize:13,fontWeight:700}}>{pm.name}</p>
                            <p style={{margin:0,fontSize:11,opacity:0.6,marginTop:2}}>{pm.detail}</p>
                          </div>
                          {payMethod===pm.id && <span style={{marginLeft:"auto",fontSize:16}}>✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Detalles del método seleccionado */}
                  {payMethod && (()=>{
                    const pm = PAYMENT_METHODS.find(m=>m.id===payMethod)!;
                    return (
                      <div style={{marginTop:"1rem",background:"#111",borderRadius:8,padding:"1rem",border:"1px solid #2a2a2a"}}>
                        <p style={{fontSize:11,fontWeight:700,letterSpacing:1.5,color:"#555",marginBottom:"0.5rem"}}>DATOS DE PAGO — {pm.name.toUpperCase()}</p>
                        <p style={{fontSize:14,color:C.text,margin:0,fontWeight:500}}>{pm.detail}</p>
                        <p style={{fontSize:12,color:"#777",marginTop:"0.5rem",lineHeight:1.6}}>
                          Realiza el pago por el monto total y luego notifícanos por WhatsApp adjuntando el comprobante.
                        </p>
                      </div>
                    );
                  })()}

                  <a href={waMsg()} target="_blank" rel="noreferrer"
                    onClick={()=>{ if(!payMethod){ alert("Por favor selecciona un método de pago primero."); } }}
                    style={{
                      display:"flex",alignItems:"center",justifyContent:"center",gap:"0.75rem",
                      marginTop:"1.25rem",background:"#25D366",color:"#fff",
                      padding:"1rem",fontWeight:900,letterSpacing:1.5,fontSize:13,
                      textDecoration:"none",borderRadius:6,
                      opacity:payMethod?1:0.5,
                      pointerEvents:payMethod?"auto":"none",
                    }}>
                    <IcWA s={20}/> NOTIFICAR PAGO AL WHATSAPP
                  </a>
                  {!payMethod && (
                    <p style={{textAlign:"center",fontSize:11,color:"#555",marginTop:"0.5rem"}}>Selecciona un método de pago para continuar</p>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      )}

      {/* ══ ADMIN ══════════════════════════════════════════════════════════ */}
      {isAdmin && (
        <main style={{paddingTop:NAV_H,background:"#0a0a0a",minHeight:"100vh"}}>
          <div style={{maxWidth:680,margin:"0 auto",padding:"2rem 1rem 4rem"}}>

            {!adminLogged && (
              <div style={{background:"#1a1a1a",borderRadius:14,padding:"2.5rem 2rem",maxWidth:400,margin:"2rem auto",boxShadow:"0 8px 40px rgba(0,0,0,0.5)"}}>
                <h1 style={{color:"#fff",fontSize:22,fontWeight:900,marginBottom:"1.5rem",textAlign:"center"}}>Panel de administración</h1>
                <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
                  <input type="email" placeholder="Correo" value={adminEmail} onChange={e=>setAdminEmail(e.target.value)} style={S.input}/>
                  <input type="password" placeholder="Contraseña" value={adminPwd} onChange={e=>setAdminPwd(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()} style={S.input}/>
                  {adminErr && <p style={{color:"#ff5555",fontSize:13,margin:0,background:"#2a1515",padding:"0.6rem 1rem",borderRadius:6}}>{adminErr}</p>}
                  <button onClick={doLogin} style={S.adminBtn}>Entrar</button>
                  <button onClick={doLogout} style={{...S.adminBtn,background:"transparent",color:"#555",marginTop:4}}>← Volver a la tienda</button>
                </div>
              </div>
            )}

            {adminLogged && adminSection==="menu" && (
              <div style={{background:"#1a1a1a",borderRadius:14,padding:"2.5rem 2rem",maxWidth:400,margin:"2rem auto",boxShadow:"0 8px 40px rgba(0,0,0,0.5)"}}>
                <h1 style={{color:"#fff",fontSize:22,fontWeight:900,marginBottom:"0.4rem",textAlign:"center"}}>Panel de administración</h1>
                <p style={{color:"#555",fontSize:13,textAlign:"center",marginBottom:"2rem"}}>Selecciona una opción:</p>
                <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
                  <button onClick={()=>setAdminSection("products")} style={S.adminBtn}>📦 Gestionar productos</button>
                  <button onClick={doLogout} style={{...S.adminBtn,background:"transparent",color:"#ff5555",border:"none",marginTop:8}}>Cerrar sesión</button>
                </div>
              </div>
            )}

            {adminLogged && adminSection==="products" && (
              <>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}>
                  <h1 style={{color:"#fff",fontSize:18,fontWeight:900,margin:0}}>{editing?"✏️ Editar producto":"📦 Administrar productos"}</h1>
                  <button onClick={()=>{setAdminSection("menu");resetForm();}} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>← Menú</button>
                </div>

                <div style={{background:"#1a1a1a",borderRadius:10,padding:"1.5rem",marginBottom:"1.5rem",border:editing?"1px solid #333":"1px solid transparent"}}>
                  <p style={{color:"#555",fontSize:11,fontWeight:700,letterSpacing:1.5,margin:"0 0 1.25rem"}}>{editing?`✏️ EDITANDO: ${editing.name}`:"➕ NUEVO PRODUCTO"}</p>
                  <div style={{display:"flex",flexDirection:"column",gap:"0.9rem"}}>
                    <input placeholder="Nombre del producto *" value={fName} onChange={e=>setFName(e.target.value)} style={S.input}/>
                    <textarea placeholder="Descripción (opcional)" value={fDesc} onChange={e=>setFDesc(e.target.value)} rows={2} style={{...S.input,resize:"vertical",lineHeight:1.6}}/>
                    <input placeholder="Precio en USD *" type="number" min="0" step="0.01" value={fPrice} onChange={e=>setFPrice(e.target.value)} style={S.input}/>
                    <select value={fCat} onChange={e=>setFCat(e.target.value)} style={{...S.input,appearance:"auto"}}>
                      <option value="">Selecciona categoría *</option>
                      <optgroup label="── LENTES">
                        {LENTES_SUBCATS.map(sub=><option key={sub} value={sub}>{catLabel(sub)}</option>)}
                      </optgroup>
                      <optgroup label="── OTROS ACCESORIOS">
                        {SHOP_CATS.filter(c=>c!=="LENTES").map(cat=><option key={cat} value={cat}>{catLabel(cat)}</option>)}
                      </optgroup>
                    </select>
                    <div style={{background:"#151515",borderRadius:8,padding:"1rem",border:"1px dashed #333"}}>
                      <p style={{color:"#555",fontSize:11,letterSpacing:1.5,margin:"0 0 0.75rem",fontWeight:700}}>IMAGEN {!editing&&"*"} — <span style={{color:"#444",fontWeight:400}}>Auto WebP via Cloudinary</span></p>
                      <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} style={{display:"none"}} id="fi"/>
                      <label htmlFor="fi" style={{display:"inline-flex",alignItems:"center",gap:"0.5rem",background:"#2a2a2a",color:"#ccc",padding:"0.6rem 1.2rem",borderRadius:6,cursor:"pointer",fontSize:13,border:"1px solid #333",fontFamily:"inherit"}}>
                        📷 {fFile?"Cambiar foto":"Elegir foto"}
                      </label>
                      {fFile && <span style={{color:"#666",fontSize:12,marginLeft:"0.75rem"}}>{fFile.name}</span>}
                      {fPreview && (
                        <div style={{marginTop:"0.75rem",width:88,height:88,borderRadius:8,overflow:"hidden",border:"2px solid #2a2a2a"}}>
                          <img src={fPreview} alt="preview" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                        </div>
                      )}
                    </div>
                    {fError   && <div style={{color:"#ff5555",fontSize:13,background:"#2a1515",padding:"0.7rem 1rem",borderRadius:6}}>{fError}</div>}
                    {fSuccess && <div style={{color:"#55ff88",fontSize:13,background:"#152a1a",padding:"0.7rem 1rem",borderRadius:6}}>{fSuccess}</div>}
                    <div style={{display:"flex",gap:"0.75rem",flexWrap:"wrap"}}>
                      <button onClick={submitProduct} disabled={fLoading}
                        style={{...S.adminBtn,flex:1,opacity:fLoading?0.5:1,cursor:fLoading?"not-allowed":"pointer"}}>
                        {fLoading?"⏳ Subiendo...":(editing?"💾 Guardar cambios":"➕ Agregar producto")}
                      </button>
                      {editing && (
                        <button onClick={resetForm} style={{...S.adminBtn,flex:"0 0 auto",width:"auto",padding:"0.8rem 1.2rem",background:"transparent",color:"#666",border:"1px solid #2a2a2a"}}>
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{background:"#1a1a1a",borderRadius:10,padding:"1.5rem"}}>
                  <p style={{color:"#555",fontSize:11,fontWeight:700,letterSpacing:1.5,margin:"0 0 1rem"}}>PRODUCTOS ({adminProds.length})</p>
                  <input placeholder="Buscar..." value={adminSearch} onChange={e=>setAdminSearch(e.target.value)} style={{...S.input,marginBottom:"1rem"}}/>
                  <div style={{display:"flex",flexDirection:"column",gap:2}}>
                    {adminProds.map(p=>(
                      <div key={p.id} style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.65rem 0.75rem",borderRadius:8,background:editing?.id===p.id?"#222":"transparent"}}>
                        <img src={optImg(p.img,120)} alt={p.name} style={{width:52,height:52,objectFit:"cover",borderRadius:6,flexShrink:0,background:"#222"}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{color:"#ddd",fontSize:14,fontWeight:600,margin:"0 0 2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</p>
                          <p style={{color:"#555",fontSize:12,margin:0}}>{catLabel(p.category)} · ${p.price.toFixed(2)}</p>
                        </div>
                        <button onClick={()=>startEdit(p)} style={{background:"#252525",color:"#ccc",border:"none",padding:"0.4rem 0.8rem",borderRadius:5,cursor:"pointer",fontSize:12,fontFamily:"inherit",flexShrink:0}}>Editar</button>
                        <button onClick={()=>deleteProduct(p.id)} style={{background:"none",color:"#ff5555",border:"1px solid #3a1515",padding:"0.4rem 0.8rem",borderRadius:5,cursor:"pointer",fontSize:12,fontFamily:"inherit",flexShrink:0}}>Eliminar</button>
                      </div>
                    ))}
                    {adminProds.length===0 && <p style={{color:"#444",textAlign:"center",padding:"1.5rem",fontSize:13}}>Sin resultados</p>}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      )}

      {/* ══ MODAL PRODUCTO ══════════════════════════════════════════════════ */}
      {selectedProduct && (
        <div onClick={()=>setSelectedProduct(null)}
          style={{position:"fixed",inset:0,zIndex:400,background:"rgba(0,0,0,0.82)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:"#161616",width:"100%",maxWidth:560,borderRadius:"16px 16px 0 0",padding:"1.5rem",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"0.25rem"}}>
              <button onClick={()=>setSelectedProduct(null)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#555"}} aria-label="Cerrar">✕</button>
            </div>
            <div style={{background:C.surface,aspectRatio:"4/3",overflow:"hidden",marginBottom:"1rem",borderRadius:10}}>
              <LazyImg src={selectedProduct.img} alt={selectedProduct.name}/>
            </div>
            <h2 style={{fontSize:20,fontWeight:900,margin:"0 0 0.4rem",color:C.accent}}>{selectedProduct.name}</h2>
            {selectedProduct.description && <p style={{fontSize:14,color:C.muted,margin:"0 0 0.75rem",lineHeight:1.6}}>{selectedProduct.description}</p>}
            <p style={{fontSize:22,fontWeight:700,margin:"0 0 1.5rem",color:C.accent}}>${selectedProduct.price.toFixed(2)}</p>
            <div style={{display:"flex",alignItems:"center",border:`1px solid ${C.border}`,width:"fit-content",marginBottom:"1rem",borderRadius:4}}>
              <button onClick={()=>setModalQty(Math.max(1,modalQty-1))} style={S.qtyBtn}>−</button>
              <span style={{padding:"0 1rem",fontSize:16,color:C.text}}>{modalQty}</span>
              <button onClick={()=>setModalQty(modalQty+1)} style={S.qtyBtn}>+</button>
            </div>
            <button onClick={()=>addToCart(selectedProduct,modalQty)}
              style={{...S.darkBtn,width:"100%",justifyContent:"center",fontSize:14,padding:"1rem",borderRadius:6}}>
              Agregar al carrito
            </button>
          </div>
        </div>
      )}

      {/* ══ WA FLOTANTE ARRASTRABLE ═════════════════════════════════════════ */}
      {!isAdmin && <DraggableWA/>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  FOOTER FOKUS
// ═══════════════════════════════════════════════════════════════════════════════
function Footer({
  setMainView,
  setShopFilter,
}:{
  setMainView:(v:MainView)=>void;
  setShopFilter:(v:ShopFilter)=>void;
}) {
  const IcWA2 = ({s=22,c="#fff"}:{s?:number;c?:string}) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
  );
  const IcIG2 = ({s=22,c="#fff"}:{s?:number;c?:string}) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
  );
  const IcFB2 = ({s=22,c="#fff"}:{s?:number;c?:string}) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
  );
  const IcTT2 = ({s=22,c="#fff"}:{s?:number;c?:string}) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
  );

  const sA: React.CSSProperties = {
    display:"flex",alignItems:"center",justifyContent:"center",
    width:42,height:42,borderRadius:"50%",
    background:"rgba(255,255,255,0.07)",textDecoration:"none",
    border:"1px solid rgba(255,255,255,0.1)",
    transition:"all 0.2s",
  };

  const catLinks = [
    {label:"Lentes",  cat:"LENTES" as ShopFilter},
    {label:"Relojes", cat:"RELOJES" as ShopFilter},
    {label:"Collares",cat:"COLLARES" as ShopFilter},
    {label:"Pulseras",cat:"PULSERAS" as ShopFilter},
    {label:"Anillos", cat:"ANILLOS" as ShopFilter},
    {label:"Aretes",  cat:"ARETES" as ShopFilter},
    {label:"Billeteras",cat:"BILLETERAS" as ShopFilter},
  ];

  return (
    <footer style={{
      background:"#0a0a0a",
      borderTop:"1px solid #1a1a1a",
      marginTop:"3rem",
      padding:"3rem 1.5rem 2rem",
    }}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>

        {/* Grid 3 col desktop / stack mobile */}
        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",
          gap:"2.5rem",
          marginBottom:"2.5rem",
        }}>

          {/* Columna 1 — Brand */}
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:"0.9rem"}}>
              <img src="/favicon.png" alt="Fokus" width={26} height={26} style={{objectFit:"contain"}}/>
              <span style={{fontWeight:900,fontSize:15,letterSpacing:4,color:"#fff"}}>FOKUS</span>
            </div>
            <p style={{fontSize:13,color:"#555",lineHeight:1.7,margin:"0 0 1rem",maxWidth:200}}>
              Accesorios con actitud. Cada detalle importa.
            </p>
            <div style={{display:"flex",gap:"0.6rem"}}>
              <a href={SOCIAL.instagram} target="_blank" rel="noreferrer" className="social-link" style={sA}><IcIG2 s={17}/></a>
              <a href={SOCIAL.facebook}  target="_blank" rel="noreferrer" className="social-link" style={sA}><IcFB2 s={17}/></a>
              <a href={SOCIAL.tiktok}    target="_blank" rel="noreferrer" className="social-link" style={sA}><IcTT2 s={17}/></a>
              <a href={SOCIAL.whatsapp}  target="_blank" rel="noreferrer" className="social-link" style={{...sA,background:"rgba(37,211,102,0.15)",borderColor:"rgba(37,211,102,0.3)"}}><IcWA2 s={17}/></a>
            </div>
          </div>

          {/* Columna 2 — Categorías */}
          <div>
            <p style={{fontSize:10,fontWeight:700,letterSpacing:2.5,color:"#444",marginBottom:"1rem"}}>TIENDA</p>
            <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
              {catLinks.map(({label,cat})=>(
                <button key={cat}
                  onClick={()=>{
                    setShopFilter(cat);
                    setMainView("shop");
                    window.scrollTo({top:0,behavior:"smooth"});
                  }}
                  style={{background:"none",border:"none",textAlign:"left",cursor:"pointer",fontFamily:"inherit",fontSize:13,color:"#666",padding:0,transition:"color 0.15s"}}
                  className="footer-cat-link">
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Columna 3 — Contacto */}
          <div>
            <p style={{fontSize:10,fontWeight:700,letterSpacing:2.5,color:"#444",marginBottom:"1rem"}}>CONTACTO</p>
            <a href={SOCIAL.whatsapp} target="_blank" rel="noreferrer"
              style={{display:"inline-flex",alignItems:"center",gap:"0.6rem",background:"#25D366",color:"#fff",padding:"0.7rem 1.2rem",borderRadius:8,fontSize:13,fontWeight:700,textDecoration:"none",marginBottom:"1rem"}}>
              <IcWA2 s={16}/> Escribir por WhatsApp
            </a>
            <div style={{display:"flex",flexDirection:"column",gap:"0.35rem"}}>
              <p style={{fontSize:12,color:"#555",margin:0}}>📧 miltonjavi05@gmail.com</p>
              <p style={{fontSize:12,color:"#555",margin:0}}>📱 +58 424-300-5733</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{borderTop:"1px solid #1a1a1a",paddingTop:"1.5rem",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"0.5rem"}}>
          <p style={{fontSize:11,color:"#333",margin:0}}>© {new Date().getFullYear()} Fokus. Todos los derechos reservados.</p>
          <p style={{fontSize:11,color:"#2a2a2a",margin:0}}>Powered by Fokus</p>
        </div>
      </div>

      <style>{`
        .footer-cat-link:hover { color: #fff !important; }
        .social-link:hover { background: rgba(255,255,255,0.12) !important; border-color: rgba(255,255,255,0.2) !important; }
      `}</style>
    </footer>
  );
}