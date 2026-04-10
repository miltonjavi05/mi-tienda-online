"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAyZI3aj5JBfRaIT875ydXeFiaHmtECoXI",
  authDomain:        "fokus-16a0c.firebaseapp.com",
  projectId:         "fokus-16a0c",
  storageBucket:     "fokus-16a0c.firebasestorage.app",
  messagingSenderId: "714751929631",
  appId:             "1:714751929631:web:2b0e898ebee51f4c67942a",
};

const CLOUDINARY_CLOUD  = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "drgafle8o";
const CLOUDINARY_PRESET = "fokus_products";
const ADMIN_EMAIL    = process.env.NEXT_PUBLIC_ADMIN_EMAIL    || "miltonjavi05@gmail.com";
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "2844242900";
const WHATSAPP_NUMBER = "584243005733";
const SOCIAL = {
  whatsapp:  `https://wa.me/${WHATSAPP_NUMBER}`,
  instagram: "https://www.instagram.com/fokus_accesorios?igsh=eGNiNHZmczUwY3Np",
  facebook:  "https://www.facebook.com/share/14d2kQuHQ3y/?mibextid=wwXIfr",
  tiktok:    "https://www.tiktok.com/@fokus_accesorios?_r=1&_t=ZS-95NNWYzuIxV",
};

const PAYMENT_METHODS = [
  { id:"zinli",        icon:"💳", name:"Zinli",                              detail:"miltonjavi05@gmail.com" },
  { id:"binance",      icon:"🟡", name:"Binance Pay",                        detail:"miltonjavi05@gmail.com" },
  { id:"pagomovil_bv", icon:"🏦", name:"Pago Móvil – Banco de Venezuela",    detail:"Tlf: 04243005733 · C.I: 28442429" },
  { id:"pagomovil_ba", icon:"🏦", name:"Pago Móvil – Bancamiga",             detail:"Tlf: 04243005733 · C.I: 28442429" },
];

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

// ── Firestore REST ──────────────────────────────────────────────────────────
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

// ── Cloudinary ──────────────────────────────────────────────────────────────
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

// ── Íconos SVG ──────────────────────────────────────────────────────────────
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

const NAV_H  = 56;
const TABS_H = 40;

const C = {
  bg:      "#080808",
  surface: "#111",
  border:  "#1e1e1e",
  text:    "#ececec",
  muted:   "#555",
  accent:  "#fff",
  catActive:"#fff",
  catInact: "#444",
};

const S = {
  iconBtn:  {background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:8,WebkitTapHighlightColor:"transparent"} as React.CSSProperties,
  darkBtn:  {background:C.accent,color:"#080808",border:"none",padding:"0.9rem 1.6rem",fontSize:12,fontWeight:800,letterSpacing:2,cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:"0.5rem",WebkitTapHighlightColor:"transparent",transition:"opacity 0.15s"} as React.CSSProperties,
  qtyBtn:   {background:"none",border:"none",width:38,height:38,fontSize:20,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",color:C.text,WebkitTapHighlightColor:"transparent"} as React.CSSProperties,
  socialA:  {display:"flex",alignItems:"center",justifyContent:"center",width:40,height:40,borderRadius:"50%",background:"#161616",textDecoration:"none",border:"1px solid #222"} as React.CSSProperties,
  input:    {width:"100%",border:`1px solid ${C.border}`,padding:"0.75rem 1rem",fontSize:14,outline:"none",fontFamily:"inherit",background:"#161616",color:C.text,borderRadius:8,boxSizing:"border-box"} as React.CSSProperties,
  adminBtn: {background:C.accent,color:"#080808",border:"none",padding:"0.8rem 1.5rem",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit",borderRadius:8,width:"100%",WebkitTapHighlightColor:"transparent"} as React.CSSProperties,
};

// ── LazyImg ─────────────────────────────────────────────────────────────────
function LazyImg({src,alt}:{src:string;alt:string}) {
  const [loaded,setLoaded] = useState(false);
  const [inView,setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    const el = ref.current; if(!el) return;
    const obs = new IntersectionObserver(([e])=>{ if(e.isIntersecting){ setInView(true); obs.disconnect(); } },{rootMargin:"300px"});
    obs.observe(el);
    return ()=>obs.disconnect();
  },[]);

  return (
    <div ref={ref} style={{position:"relative",width:"100%",height:"100%"}}>
      {!loaded && <div style={{position:"absolute",inset:0,background:"#161616"}}/>}
      {inView && <img src={optImg(src,400)} alt={alt} loading="lazy" decoding="async" onLoad={()=>setLoaded(true)}
        style={{width:"100%",height:"100%",objectFit:"cover",display:"block",opacity:loaded?1:0,transition:"opacity 0.25s ease"}}/>}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div>
      <div style={{aspectRatio:"1",background:"#141414",marginBottom:"0.6rem",borderRadius:10,overflow:"hidden",position:"relative"}}>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,#141414 0%,#1e1e1e 50%,#141414 100%)",backgroundSize:"200% 100%",animation:"shimmer 1.4s infinite"}}/>
      </div>
      <div style={{height:11,background:"#141414",borderRadius:4,marginBottom:6,width:"70%"}}/>
      <div style={{height:11,background:"#141414",borderRadius:4,width:"35%"}}/>
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

// ═══════════════════════════════════════════════════════════════════════════
//  BOTÓN WA FLOTANTE — Solo en los bordes, translúcido blanco/negro, sin errores
// ═══════════════════════════════════════════════════════════════════════════
function DraggableWA() {
  // side: "left" | "right", pct: porcentaje vertical 0-100
  const [side, setSide]   = useState<"left"|"right">("right");
  const [pct,  setPct]    = useState(75); // % desde arriba
  const btnRef   = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const moved    = useRef(false);
  const startY   = useRef(0);
  const startPct = useRef(75);
  const [pressed, setPressed] = useState(false);

  const BTN = 52;
  const MARGIN = 10;

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    moved.current    = false;
    startY.current   = e.clientY;
    startPct.current = pct;
    setPressed(true);
  }, [pct]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dy = e.clientY - startY.current;
    if (Math.abs(dy) > 4) moved.current = true;
    const H = window.innerHeight;
    const newY = Math.max(MARGIN, Math.min(H - BTN - MARGIN, (startPct.current / 100) * H + dy));
    setPct((newY / H) * 100);
    // detectar lado según posición horizontal del pointer
    const W = window.innerWidth;
    setSide(e.clientX < W / 2 ? "left" : "right");
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
    setPressed(false);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (moved.current) { e.preventDefault(); return; }
    window.open(SOCIAL.whatsapp, "_blank", "noreferrer");
  }, []);

  const top = `${pct}%`;
  const left  = side === "left"  ? MARGIN : undefined;
  const right = side === "right" ? MARGIN : undefined;

  return (
    <div
      ref={btnRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={handleClick}
      style={{
        position:"fixed",
        top,
        left,
        right,
        transform:"translateY(-50%)",
        zIndex:500,
        width: BTN,
        height: BTN,
        borderRadius:"50%",
        background: pressed
          ? "rgba(255,255,255,0.85)"
          : "rgba(255,255,255,0.12)",
        backdropFilter:"blur(16px)",
        WebkitBackdropFilter:"blur(16px)",
        border:"1px solid rgba(255,255,255,0.18)",
        display:"flex",
        alignItems:"center",
        justifyContent:"center",
        cursor:"grab",
        touchAction:"none",
        userSelect:"none",
        WebkitUserSelect:"none",
        transition:"background 0.2s, border-color 0.2s, transform 0.15s",
        willChange:"top,transform",
        boxShadow: pressed
          ? "0 0 0 6px rgba(255,255,255,0.08)"
          : "0 2px 16px rgba(0,0,0,0.4)",
      }}>
      <IcWA s={24} c={pressed ? "#080808" : "#fff"}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  TABS — scroll nativo sin JS de drag, funciona perfecto en iOS y Android
// ═══════════════════════════════════════════════════════════════════════════
function NativeTabs({
  items,
  active,
  onSelect,
  renderItem,
  height=44,
}: {
  items: string[];
  active: string;
  onSelect: (v:string)=>void;
  renderItem: (item:string,isActive:boolean)=>React.ReactNode;
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // scroll al activo
  useEffect(()=>{
    const el = ref.current?.querySelector(`[data-active="true"]`) as HTMLElement|null;
    if (el) el.scrollIntoView({block:"nearest",inline:"center",behavior:"smooth"});
  },[active]);

  return (
    <div
      ref={ref}
      style={{
        display:"flex",
        overflowX:"auto",
        overflowY:"hidden",
        scrollbarWidth:"none",
        WebkitOverflowScrolling:"touch",
        height,
        // cursor normal, scroll nativo del browser
        touchAction:"pan-x",
      }}
      className="native-tabs-strip">
      {items.map(item => {
        const isActive = item === active;
        return (
          <button
            key={item}
            data-active={isActive}
            onClick={() => onSelect(item)}
            style={{
              background:"none",
              border:"none",
              cursor:"pointer",
              fontFamily:"inherit",
              flexShrink:0,
              padding:0,
              display:"flex",
              alignItems:"center",
              WebkitTapHighlightColor:"transparent",
            }}>
            {renderItem(item, isActive)}
          </button>
        );
      })}
    </div>
  );
}

// ── ProductCard ─────────────────────────────────────────────────────────────
function ProductCard({product,onClick,index}:{product:Product;onClick:()=>void;index:number}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    const el = ref.current; if(!el) return;
    const obs = new IntersectionObserver(([e])=>{
      if(e.isIntersecting){ setVisible(true); obs.disconnect(); }
    },{rootMargin:"80px"});
    obs.observe(el);
    return ()=>obs.disconnect();
  },[]);

  return (
    <div
      ref={ref}
      className="prod-card"
      onClick={onClick}
      style={{
        cursor:"pointer",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(14px)",
        transition:`opacity 0.35s ease ${Math.min(index*35,160)}ms, transform 0.35s ease ${Math.min(index*35,160)}ms`,
        willChange:"transform,opacity",
      }}>
      <div style={{background:"#111",aspectRatio:"1",overflow:"hidden",marginBottom:"0.55rem",borderRadius:10,position:"relative"}}>
        <div className="prod-img-inner" style={{width:"100%",height:"100%",transition:"transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94)"}}>
          <LazyImg src={product.img} alt={product.name}/>
        </div>
        {/* overlay sutil al hover */}
        <div className="prod-overlay" style={{position:"absolute",inset:0,background:"rgba(0,0,0,0)",transition:"background 0.3s ease"}}/>
      </div>
      <p style={{margin:"0 0 3px",fontSize:12,lineHeight:1.35,color:"#bbb",letterSpacing:0.2}}>{product.name}</p>
      <p style={{margin:0,fontSize:14,fontWeight:800,color:C.accent,letterSpacing:0.5}}>${product.price.toFixed(2)}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  MODAL POST-CARRITO — aparece al añadir, ofrece ir al carrito o seguir
// ═══════════════════════════════════════════════════════════════════════════
function AddedToCartModal({
  product,
  onClose,
  onGoCart,
}: {
  product: Product;
  onClose: ()=>void;
  onGoCart: ()=>void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position:"fixed",inset:0,zIndex:600,
        background:"rgba(0,0,0,0.72)",
        display:"flex",alignItems:"flex-end",justifyContent:"center",
        animation:"fadeIn 0.18s ease",
      }}>
      <div
        onClick={e=>e.stopPropagation()}
        style={{
          background:"#161616",
          width:"100%",maxWidth:520,
          borderRadius:"18px 18px 0 0",
          padding:"1.25rem 1.25rem 2rem",
          animation:"slideUp 0.28s cubic-bezier(0.34,1.3,0.64,1)",
          border:"1px solid #222",
          borderBottom:"none",
        }}>
        {/* Handle */}
        <div style={{width:36,height:3,background:"#333",borderRadius:2,margin:"0 auto 1.25rem"}}/>

        <div style={{display:"flex",gap:"0.85rem",alignItems:"center",marginBottom:"1.25rem"}}>
          <div style={{width:58,height:58,borderRadius:8,overflow:"hidden",flexShrink:0,background:"#111"}}>
            <img src={optImg(product.img,120)} alt={product.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          </div>
          <div style={{flex:1}}>
            <p style={{margin:"0 0 2px",fontSize:11,color:"#555",letterSpacing:1.5,fontWeight:700}}>AÑADIDO AL CARRITO</p>
            <p style={{margin:"0 0 2px",fontSize:14,color:C.text,fontWeight:600,lineHeight:1.3}}>{product.name}</p>
            <p style={{margin:0,fontSize:13,color:"#888"}}>Añadir mas <span style={{color:C.accent,fontWeight:700}}>${product.price.toFixed(2)}</span></p>
          </div>
          {/* checkmark animado */}
          <div style={{
            width:32,height:32,borderRadius:"50%",
            background:"#1a2e1a",border:"1.5px solid #2a4a2a",
            display:"flex",alignItems:"center",justifyContent:"center",
            flexShrink:0,animation:"scaleIn 0.3s cubic-bezier(0.34,1.4,0.64,1)",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.65rem"}}>
          <button
            onClick={onClose}
            style={{
              background:"transparent",
              color:"#aaa",
              border:"1px solid #2a2a2a",
              padding:"0.85rem 1rem",
              fontSize:12,fontWeight:700,letterSpacing:1.2,
              cursor:"pointer",fontFamily:"inherit",
              borderRadius:10,
              WebkitTapHighlightColor:"transparent",
              transition:"background 0.15s, color 0.15s",
            }}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="#1e1e1e";(e.currentTarget as HTMLElement).style.color="#fff"}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="transparent";(e.currentTarget as HTMLElement).style.color="#aaa"}}>
            SEGUIR COMPRANDO
          </button>
          <button
            onClick={onGoCart}
            style={{
              background:C.accent,
              color:"#080808",
              border:"none",
              padding:"0.85rem 1rem",
              fontSize:12,fontWeight:800,letterSpacing:1.2,
              cursor:"pointer",fontFamily:"inherit",
              borderRadius:10,
              WebkitTapHighlightColor:"transparent",
              transition:"opacity 0.15s",
            }}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.opacity="0.9"}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.opacity="1"}}>
            IR AL CARRITO →
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════
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
  const [payMethod,setPayMethod]       = useState<string|null>(null);
  const [products,setProducts]         = useState<Product[]>([]);
  const [loading,setLoading]           = useState(true);
  const [fbReady,setFbReady]           = useState(false);
  // modal post-carrito
  const [addedProduct,setAddedProduct] = useState<Product|null>(null);

  const navRef = useRef<HTMLElement>(null);
  const [navHeight, setNavHeight] = useState(NAV_H + TABS_H);

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
  const [adminCatFilter,setAdminCatFilter] = useState<string>("ALL");
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
  const formRef = useRef<HTMLDivElement>(null);

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
    setAddedProduct(product); // mostrar mini-modal
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

  const doLogin=()=>{
    if(adminEmail===ADMIN_EMAIL&&adminPwd===ADMIN_PASSWORD){setAdminLogged(true);setAdminErr("");setAdminSection("menu");}
    else setAdminErr("Credenciales incorrectas");
  };
  const doLogout=()=>{
    setAdminLogged(false);setAdminEmail("");setAdminPwd("");
    setMainView("fokus");
    if (typeof window !== "undefined") window.history.pushState("","","/");
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
    setTimeout(()=>formRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),50);
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

  const adminProds = useMemo(()=>{
    let list = products;
    if(adminCatFilter!=="ALL") list = list.filter(p=>p.category===adminCatFilter);
    if(adminSearch!=="") list = list.filter(p=>p.name.toLowerCase().includes(adminSearch.toLowerCase())||p.category.toLowerCase().includes(adminSearch.toLowerCase()));
    return list;
  },[products,adminCatFilter,adminSearch]);

  const usedCats = useMemo(()=>[...new Set(products.map(p=>p.category))].sort(),[products]);

  const isShopView = mainView==="shop";
  const isAdmin    = mainView==="admin";
  const isCart     = mainView==="cart";
  const catStickyTop = navHeight - 1;

  const NAV_TABS = [
    {id:"fokus" as MainView, label:"FOKUS"},
    {id:"shop"  as MainView, label:"TIENDA"},
    {id:"comunidad" as MainView, label:"COMUNIDAD"},
  ];

  return (
    <div style={{fontFamily:"'Helvetica Neue',Arial,sans-serif",background:C.bg,minHeight:"100vh",color:C.text}}>
      <style>{`
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideInLeft{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes scaleIn{from{opacity:0;transform:scale(0.88)}to{opacity:1;transform:scale(1)}}

        *{box-sizing:border-box;-webkit-font-smoothing:antialiased;}
        body{background:${C.bg};overscroll-behavior:none;margin:0}

        .native-tabs-strip::-webkit-scrollbar{display:none}
        .native-tabs-strip{-webkit-overflow-scrolling:touch;scroll-behavior:smooth}

        .prod-card:active{transform:scale(0.97)}
        .prod-card:hover .prod-img-inner{transform:scale(1.05)!important}
        .prod-card:hover .prod-overlay{background:rgba(255,255,255,0.04)!important}

        .sub-cat-btn:hover{color:#fff!important}
        .social-link:hover{border-color:#333!important;transform:translateY(-1px)}
        .pay-card{transition:all 0.15s ease}
        .pay-card:hover{background:#1a1a1a!important}
        .nav-tab-btn:active{opacity:0.6}
        .admin-prod-row:hover{background:#161616!important}
        .footer-cat-link:hover{color:#fff!important}
        .admin-cat-pill:hover{opacity:0.8}

        @media(max-width:480px){
          .products-grid{grid-template-columns:repeat(2,1fr)!important}
          .footer-grid{grid-template-columns:1fr!important;gap:1.5rem!important}
        }
        @media(min-width:481px) and (max-width:767px){
          .products-grid{grid-template-columns:repeat(auto-fill,minmax(150px,1fr))!important}
          .footer-grid{grid-template-columns:repeat(2,1fr)!important;gap:1.5rem!important}
        }
        @media(min-width:768px){
          .products-grid{grid-template-columns:repeat(auto-fill,minmax(195px,1fr))!important}
          .footer-grid{grid-template-columns:repeat(3,1fr)!important}
        }
      `}</style>

      {/* ══ NAVBAR ═════════════════════════════════════════════════════════ */}
      <nav ref={navRef} style={{
        position:"fixed",top:0,left:0,right:0,zIndex:200,
        background:"rgba(8,8,8,0.96)",
        borderBottom:"1px solid #161616",
        backdropFilter:"blur(20px)",
        WebkitBackdropFilter:"blur(20px)",
      }}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 1rem",height:NAV_H,position:"relative"}}>
          <button onClick={()=>setMenuOpen(true)} style={S.iconBtn} aria-label="Menú">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/>
            </svg>
          </button>

          <button onClick={()=>setMainView("fokus")} aria-label="Inicio"
            style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:7,position:"absolute",left:"50%",transform:"translateX(-50%)",padding:"0 8px",WebkitTapHighlightColor:"transparent"}}>
            <img src="/favicon.png" alt="Fokus" width={26} height={26} style={{objectFit:"contain"}}/>
            <span style={{color:"#fff",fontSize:16,fontWeight:900,letterSpacing:5}}>FOKUS</span>
          </button>

          <div style={{display:"flex",gap:0,marginLeft:"auto"}}>
            <button
              onClick={()=>{
                const next = !searchOpen;
                setSearchOpen(next);
                setSearchQuery("");
                if(next && mainView!=="shop") { setMainView("shop"); setShopFilter("TODO"); }
              }}
              style={S.iconBtn} aria-label="Buscar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
            </button>
            <button onClick={()=>setMainView("cart")} style={{...S.iconBtn,position:"relative"}} aria-label="Carrito">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
              {totalItems>0&&(
                <span style={{
                  position:"absolute",top:4,right:4,
                  background:"#fff",color:"#080808",
                  borderRadius:"50%",width:15,height:15,fontSize:8,fontWeight:900,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  animation:"scaleIn 0.2s ease",
                }}>
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tabs con scroll nativo */}
        {!isAdmin && (
          <NativeTabs
            items={NAV_TABS.map(t=>t.id)}
            active={mainView}
            onSelect={(id)=>{ setMainView(id as MainView); if(id==="shop") setShopFilter("TODO"); }}
            height={TABS_H}
            renderItem={(id,isActive)=>{
              const label = NAV_TABS.find(t=>t.id===id)?.label ?? id;
              return (
                <span className="nav-tab-btn" style={{
                  display:"flex",alignItems:"center",padding:"0 1.4rem",height:"100%",
                  borderBottom:isActive?"2px solid #fff":"2px solid transparent",
                  fontSize:10,fontWeight:800,letterSpacing:2.5,
                  color:isActive?"#fff":"#444",whiteSpace:"nowrap",
                  transition:"color 0.15s, border-color 0.15s",
                }}>{label}</span>
              );
            }}
          />
        )}

        {searchOpen && (
          <div style={{background:"#111",borderTop:`1px solid ${C.border}`,padding:"0.55rem 1rem",animation:"fadeIn 0.15s ease"}}>
            <input autoFocus value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
              placeholder="Buscar productos…" aria-label="Búsqueda"
              style={{...S.input,borderRadius:8}}/>
          </div>
        )}
      </nav>

      {/* ══ MENÚ LATERAL ═══════════════════════════════════════════════════ */}
      {menuOpen && (
        <div style={{position:"fixed",inset:0,zIndex:300,display:"flex"}}>
          <div onClick={()=>setMenuOpen(false)}
            style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.8)",animation:"fadeIn 0.2s ease"}}/>
          <div style={{
            position:"relative",background:"#0e0e0e",width:272,height:"100%",
            padding:"2rem 1.5rem",overflowY:"auto",display:"flex",flexDirection:"column",
            animation:"slideInLeft 0.22s cubic-bezier(0.25,0.46,0.45,0.94)",
            borderRight:"1px solid #1a1a1a",
          }}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"2rem"}}>
              <span style={{fontWeight:900,fontSize:11,letterSpacing:3,color:"#555"}}>CATEGORÍAS</span>
              <button onClick={()=>setMenuOpen(false)} style={{...S.iconBtn,padding:4}} aria-label="Cerrar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div>
              <button onClick={()=>setLentesOpen(o=>!o)}
                style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",background:"none",border:"none",borderBottom:`1px solid ${C.border}`,padding:"0.85rem 0",textAlign:"left",fontSize:14,cursor:"pointer",fontFamily:"inherit",color:"#d0d0d0",WebkitTapHighlightColor:"transparent",letterSpacing:0.3}}>
                <span>Lentes</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2"
                  style={{transition:"transform 0.22s",transform:lentesOpen?"rotate(180deg)":"rotate(0deg)"}}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {lentesOpen && (
                <div style={{paddingLeft:"1rem",borderBottom:`1px solid ${C.border}`,animation:"fadeIn 0.15s ease"}}>
                  {LENTES_SUBCATS.map(sub=>(
                    <button key={sub} className="sub-cat-btn"
                      onClick={()=>{setShopFilter(sub);setMenuOpen(false);setMainView("shop");}}
                      style={{display:"block",width:"100%",background:"none",border:"none",padding:"0.6rem 0",textAlign:"left",fontSize:13,cursor:"pointer",fontFamily:"inherit",color:"#555",WebkitTapHighlightColor:"transparent",letterSpacing:0.2}}>
                      {catLabel(sub)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {SHOP_CATS.filter(c=>c!=="LENTES").map(cat=>(
              <button key={cat}
                onClick={()=>{setShopFilter(cat);setMenuOpen(false);setMainView("shop");}}
                style={{display:"block",width:"100%",background:"none",border:"none",borderBottom:`1px solid ${C.border}`,padding:"0.85rem 0",textAlign:"left",fontSize:14,cursor:"pointer",fontFamily:"inherit",color:"#d0d0d0",WebkitTapHighlightColor:"transparent",letterSpacing:0.3}}>
                {catLabel(cat)}
              </button>
            ))}

            <div style={{marginTop:"auto",paddingTop:"2rem"}}>
              <p style={{fontSize:9,letterSpacing:3,color:"#333",marginBottom:"0.85rem",fontWeight:700}}>SÍGUENOS</p>
              <div style={{display:"flex",gap:"0.6rem"}}>
                <a href={SOCIAL.whatsapp}  target="_blank" rel="noreferrer" className="social-link" style={S.socialA}><IcWA s={16}/></a>
                <a href={SOCIAL.instagram} target="_blank" rel="noreferrer" className="social-link" style={S.socialA}><IcIG s={16}/></a>
                <a href={SOCIAL.facebook}  target="_blank" rel="noreferrer" className="social-link" style={S.socialA}><IcFB s={16}/></a>
                <a href={SOCIAL.tiktok}    target="_blank" rel="noreferrer" className="social-link" style={S.socialA}><IcTT s={16}/></a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ FOKUS HOME ═════════════════════════════════════════════════════ */}
      {mainView==="fokus" && (
        <main style={{paddingTop:navHeight,background:C.bg}}>
          <div style={{maxWidth:760,margin:"0 auto",padding:"4rem 1.5rem 0",textAlign:"center",animation:"slideUp 0.5s ease"}}>
            <div style={{marginBottom:"2rem"}}>
              <img src="/favicon.png" alt="Fokus" width={64} height={64}
                style={{objectFit:"contain",filter:"brightness(1.1)"}}/>
            </div>
            <p style={{fontSize:10,letterSpacing:6,color:"#333",fontWeight:700,marginBottom:"1rem"}}>ACCESORIOS</p>
            <h1 style={{fontSize:40,fontWeight:900,letterSpacing:8,marginBottom:"0.85rem",color:C.accent,lineHeight:1}}>FOKUS</h1>
            <p style={{fontSize:14,color:"#444",marginBottom:"3rem",lineHeight:1.7,maxWidth:300,margin:"0 auto 3rem"}}>Cada detalle +<br/>Calidad, diseño y actitud.</p>
            <button
              onClick={()=>{setMainView("shop");setShopFilter("TODO");}}
              style={{...S.darkBtn,fontSize:11,padding:"1.1rem 2.8rem",letterSpacing:3,borderRadius:3}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.opacity="0.88"}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.opacity="1"}}>
              VER COLECCIÓN →
            </button>
            <div style={{display:"flex",justifyContent:"center",gap:"0.75rem",marginTop:"3rem"}}>
              <a href={SOCIAL.instagram} target="_blank" rel="noreferrer" className="social-link" style={S.socialA}><IcIG s={18}/></a>
              <a href={SOCIAL.tiktok}    target="_blank" rel="noreferrer" className="social-link" style={S.socialA}><IcTT s={18}/></a>
              <a href={SOCIAL.facebook}  target="_blank" rel="noreferrer" className="social-link" style={S.socialA}><IcFB s={18}/></a>
              <a href={SOCIAL.whatsapp}  target="_blank" rel="noreferrer" className="social-link" style={{...S.socialA,border:"1px solid #1e2e1e",background:"#0e1e0e"}}><IcWA s={18}/></a>
            </div>
          </div>
          <Footer setMainView={setMainView} setShopFilter={setShopFilter} />
        </main>
      )}

      {/* ══ TIENDA ═════════════════════════════════════════════════════════ */}
      {isShopView && (
        <main style={{paddingTop:navHeight,background:C.bg}}>

          {/* Filtro sticky con NativeTabs */}
          <div style={{
            position:"sticky",top:catStickyTop,zIndex:100,
            background:"rgba(8,8,8,0.97)",
            borderBottom:`1px solid ${C.border}`,
            backdropFilter:"blur(20px)",
            WebkitBackdropFilter:"blur(20px)",
          }}>
            <NativeTabs
              items={["TODO","LENTES",...(SHOP_CATS.filter(c=>c!=="LENTES") as string[])]}
              active={
                shopFilter==="TODO"?"TODO":
                isLentesActive?"LENTES":
                (SHOP_CATS.filter(c=>c!=="LENTES") as string[]).includes(shopFilter)?shopFilter:"TODO"
              }
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
              renderItem={(item,_)=>{
                const isActiveItem =
                  item==="TODO" ? shopFilter==="TODO" :
                  item==="LENTES" ? isLentesActive :
                  shopFilter===item;
                return (
                  <span className="nav-tab-btn" style={{
                    display:"flex",alignItems:"center",gap:4,
                    padding:"0 1rem",height:44,
                    borderBottom:isActiveItem?"2px solid #fff":"2px solid transparent",
                    fontSize:10,fontWeight:800,letterSpacing:2,
                    color:isActiveItem?"#fff":"#3e3e3e",
                    whiteSpace:"nowrap",
                    transition:"color 0.15s, border-color 0.15s",
                  }}>
                    {item}
                    {item==="LENTES"&&(
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                        style={{transition:"transform 0.2s",transform:lentesOpen?"rotate(180deg)":"rotate(0deg)"}}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    )}
                  </span>
                );
              }}
            />

            {lentesOpen && (
              <div style={{
                background:"#0a0a0a",borderTop:"1px solid #1a1a1a",
                padding:"0.55rem 1rem",display:"flex",gap:"0.45rem",
                overflowX:"auto",scrollbarWidth:"none",WebkitOverflowScrolling:"touch",
                animation:"fadeIn 0.15s ease",
              }} className="native-tabs-strip">
                {LENTES_SUBCATS.map(sub=>(
                  <button key={sub}
                    onClick={()=>setShopFilter(sub)}
                    style={{
                      background:shopFilter===sub?"#fff":"transparent",
                      color:shopFilter===sub?"#080808":"#444",
                      border:`1px solid ${shopFilter===sub?"#fff":"#252525"}`,
                      padding:"0.28rem 0.85rem",borderRadius:20,fontSize:9,fontWeight:800,
                      letterSpacing:1.2,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",
                      flexShrink:0,WebkitTapHighlightColor:"transparent",
                      transition:"all 0.15s ease",
                    }}>
                    {catLabel(sub).toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{maxWidth:1200,margin:"0 auto",padding:"1.5rem 1rem 5rem"}}>
            {loading ? (
              <div className="products-grid" style={{display:"grid",gap:"1rem"}}>
                {Array.from({length:8}).map((_,i)=><SkeletonCard key={i}/>)}
              </div>
            ) : (
              getVisibleCats().map(cat=>{
                const prods = getProds(cat);
                if(prods.length===0) return null;
                const isLenteCat = (LENTES_SUBCATS as readonly string[]).includes(cat);
                return (
                  <div key={cat} style={{marginBottom:"3rem",animation:"fadeIn 0.3s ease"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",borderBottom:`1px solid ${C.border}`,paddingBottom:"0.65rem"}}>
                      <h2 style={{fontSize:11,fontWeight:800,letterSpacing:3,margin:0,color:"#555"}}>
                        {isLenteCat ? `LENTES · ${catLabel(cat).toUpperCase()}` : catLabel(cat).toUpperCase()}
                      </h2>
                      <button
                        onClick={()=>{setShopFilter(cat as ShopFilter);setLentesOpen(isLenteCat);}}
                        style={{background:"none",border:"none",fontSize:10,color:"#333",cursor:"pointer",fontFamily:"inherit",WebkitTapHighlightColor:"transparent",letterSpacing:1,fontWeight:700}}>
                        VER TODOS
                      </button>
                    </div>
                    <div className="products-grid" style={{display:"grid",gap:"1rem"}}>
                      {prods.map((product,i)=>(
                        <ProductCard key={product.id} product={product} index={i}
                          onClick={()=>{setSelectedProduct(product);setModalQty(1);}}/>
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
        <main style={{paddingTop:navHeight,background:C.bg}}>
          <div style={{maxWidth:560,margin:"0 auto",padding:"5rem 1.5rem 0",textAlign:"center",animation:"slideUp 0.4s ease"}}>
            <p style={{fontSize:36,marginBottom:"1rem"}}>🤝</p>
            <h2 style={{fontSize:20,fontWeight:900,letterSpacing:3,marginBottom:"1rem",color:C.accent}}>COMUNIDAD</h2>
            <p style={{color:"#444",fontSize:14,lineHeight:1.8}}>Muy pronto podrás ver contenido, reviews y mucho más de la comunidad Fokus.</p>
            <div style={{display:"flex",justifyContent:"center",gap:"0.75rem",marginTop:"2rem"}}>
              <a href={SOCIAL.instagram} target="_blank" rel="noreferrer" className="social-link" style={S.socialA}><IcIG s={18}/></a>
              <a href={SOCIAL.tiktok}    target="_blank" rel="noreferrer" className="social-link" style={S.socialA}><IcTT s={18}/></a>
            </div>
          </div>
          <Footer setMainView={setMainView} setShopFilter={setShopFilter} />
        </main>
      )}

      {/* ══ CARRITO ════════════════════════════════════════════════════════ */}
      {isCart && (
        <main style={{paddingTop:navHeight,background:C.bg}}>
          <div style={{maxWidth:680,margin:"0 auto",padding:"2rem 1rem 5rem",animation:"fadeIn 0.25s ease"}}>
            <h1 style={{fontSize:11,fontWeight:800,letterSpacing:3,marginBottom:"1.75rem",color:"#444"}}>CARRITO DE COMPRAS</h1>

            {cart.length===0 ? (
              <div style={{textAlign:"center",padding:"5rem 0",color:"#333",animation:"slideUp 0.4s ease"}}>
                <p style={{marginBottom:"1.5rem",fontSize:14}}>Tu carrito está vacío</p>
                <button onClick={()=>{setMainView("shop");setShopFilter("TODO");}}
                  style={{...S.darkBtn,borderRadius:4,fontSize:11}}>IR A LA TIENDA</button>
              </div>
            ) : (
              <>
                {cart.map(item=>(
                  <div key={item.product.id} style={{
                    display:"grid",gridTemplateColumns:"1fr auto auto auto",gap:"0.75rem",
                    padding:"1rem 0",borderBottom:`1px solid ${C.border}`,alignItems:"center",
                  }}>
                    <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
                      <button onClick={()=>updateQty(item.product.id,-item.qty)}
                        style={{background:"none",border:"none",cursor:"pointer",color:"#333",fontSize:12,padding:0,WebkitTapHighlightColor:"transparent"}} aria-label="Eliminar">✕</button>
                      <img src={optImg(item.product.img,120)} alt={item.product.name}
                        style={{width:52,height:52,objectFit:"cover",borderRadius:6}}/>
                      <span style={{fontSize:13,color:"#bbb"}}>{item.product.name}</span>
                    </div>
                    <span style={{fontSize:13,color:"#555"}}>${item.product.price.toFixed(2)}</span>
                    <div style={{display:"flex",alignItems:"center",border:`1px solid ${C.border}`,borderRadius:6}}>
                      <button onClick={()=>updateQty(item.product.id,-1)} style={S.qtyBtn}>−</button>
                      <span style={{padding:"0 0.5rem",fontSize:14,color:C.text,minWidth:24,textAlign:"center"}}>{item.qty}</span>
                      <button onClick={()=>updateQty(item.product.id,1)} style={S.qtyBtn}>+</button>
                    </div>
                    <span style={{fontSize:14,fontWeight:800,color:C.accent}}>${(item.product.price*item.qty).toFixed(2)}</span>
                  </div>
                ))}

                <div style={{display:"flex",gap:"0.6rem",marginTop:"1.25rem",flexWrap:"wrap"}}>
                  <button onClick={()=>setMainView("shop")} style={{...S.darkBtn,borderRadius:4,fontSize:10,padding:"0.8rem 1.4rem"}}>← SEGUIR COMPRANDO</button>
                  <button onClick={()=>setCart([])} style={{...S.darkBtn,background:"transparent",color:"#444",border:`1px solid ${C.border}`,borderRadius:4,fontSize:10,padding:"0.8rem 1.2rem"}}>Vaciar</button>
                </div>

                <div style={{marginTop:"2rem",background:"#0e0e0e",padding:"1.5rem",borderRadius:12,border:`1px solid ${C.border}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.6rem",fontSize:13,color:"#555"}}>
                    <span>Subtotal</span><span>${totalPrice.toFixed(2)}</span>
                  </div>
                  <div style={{borderTop:`1px solid ${C.border}`,paddingTop:"0.75rem",display:"flex",justifyContent:"space-between",fontSize:18,fontWeight:900,color:C.accent}}>
                    <span>Total</span><span>${totalPrice.toFixed(2)}</span>
                  </div>

                  <div style={{marginTop:"1.75rem"}}>
                    <p style={{fontSize:9,fontWeight:800,letterSpacing:2.5,color:"#333",marginBottom:"0.75rem"}}>MÉTODO DE PAGO</p>
                    <div style={{display:"flex",flexDirection:"column",gap:"0.45rem"}}>
                      {PAYMENT_METHODS.map(pm=>(
                        <button key={pm.id} className="pay-card"
                          onClick={()=>setPayMethod(pm.id)}
                          style={{
                            display:"flex",alignItems:"center",gap:"0.85rem",
                            background:payMethod===pm.id?"#fff":"#111",
                            color:payMethod===pm.id?"#080808":C.text,
                            border:`1px solid ${payMethod===pm.id?"#fff":"#1e1e1e"}`,
                            borderRadius:10,padding:"0.8rem 1rem",
                            textAlign:"left",cursor:"pointer",fontFamily:"inherit",
                            WebkitTapHighlightColor:"transparent",
                          }}>
                          <span style={{fontSize:18}}>{pm.icon}</span>
                          <div>
                            <p style={{margin:0,fontSize:13,fontWeight:700}}>{pm.name}</p>
                            <p style={{margin:0,fontSize:10,opacity:0.5,marginTop:1}}>{pm.detail}</p>
                          </div>
                          {payMethod===pm.id && <span style={{marginLeft:"auto",fontSize:14,fontWeight:700}}>✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {payMethod && (()=>{
                    const pm = PAYMENT_METHODS.find(m=>m.id===payMethod)!;
                    return (
                      <div style={{marginTop:"1rem",background:"#080808",borderRadius:10,padding:"1rem",border:"1px solid #1a1a1a",animation:"fadeIn 0.2s ease"}}>
                        <p style={{fontSize:9,fontWeight:800,letterSpacing:2,color:"#333",marginBottom:"0.5rem"}}>DATOS — {pm.name.toUpperCase()}</p>
                        <p style={{fontSize:14,color:C.text,margin:0,fontWeight:600}}>{pm.detail}</p>
                        <p style={{fontSize:11,color:"#444",marginTop:"0.4rem",lineHeight:1.6}}>
                          Realiza el pago y notifícanos por WhatsApp adjuntando el comprobante.
                        </p>
                      </div>
                    );
                  })()}

                  <a href={waMsg()} target="_blank" rel="noreferrer"
                    onClick={(e)=>{ if(!payMethod){ e.preventDefault(); alert("Por favor selecciona un método de pago primero."); } }}
                    style={{
                      display:"flex",alignItems:"center",justifyContent:"center",gap:"0.75rem",
                      marginTop:"1.25rem",background:"#25D366",color:"#fff",
                      padding:"1rem",fontWeight:900,letterSpacing:2,fontSize:11,
                      textDecoration:"none",borderRadius:10,
                      opacity:payMethod?1:0.35,
                      transition:"opacity 0.2s",
                    }}>
                    <IcWA s={18}/> NOTIFICAR PAGO
                  </a>
                  {!payMethod && (
                    <p style={{textAlign:"center",fontSize:10,color:"#333",marginTop:"0.5rem"}}>Selecciona un método de pago para continuar</p>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      )}

      {/* ══ ADMIN ══════════════════════════════════════════════════════════ */}
      {isAdmin && (
        <main style={{paddingTop:NAV_H,background:"#060606",minHeight:"100vh"}}>
          <div style={{maxWidth:720,margin:"0 auto",padding:"2rem 1rem 4rem"}}>

            {!adminLogged && (
              <div style={{background:"#111",borderRadius:14,padding:"2.5rem 2rem",maxWidth:380,margin:"2rem auto",border:"1px solid #1a1a1a",animation:"slideUp 0.3s ease"}}>
                <h1 style={{color:"#fff",fontSize:20,fontWeight:900,marginBottom:"1.5rem",textAlign:"center",letterSpacing:2}}>ADMIN</h1>
                <div style={{display:"flex",flexDirection:"column",gap:"0.85rem"}}>
                  <input type="email" placeholder="Correo" value={adminEmail} onChange={e=>setAdminEmail(e.target.value)} style={S.input}/>
                  <input type="password" placeholder="Contraseña" value={adminPwd} onChange={e=>setAdminPwd(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()} style={S.input}/>
                  {adminErr && <p style={{color:"#ff5555",fontSize:12,margin:0,background:"#1e0a0a",padding:"0.6rem 1rem",borderRadius:8}}>{adminErr}</p>}
                  <button onClick={doLogin} style={S.adminBtn}>Entrar</button>
                  <button onClick={doLogout} style={{...S.adminBtn,background:"transparent",color:"#333",marginTop:4}}>← Volver</button>
                </div>
              </div>
            )}

            {adminLogged && adminSection==="menu" && (
              <div style={{background:"#111",borderRadius:14,padding:"2.5rem 2rem",maxWidth:380,margin:"2rem auto",border:"1px solid #1a1a1a",animation:"slideUp 0.3s ease"}}>
                <h1 style={{color:"#fff",fontSize:18,fontWeight:900,marginBottom:"0.4rem",textAlign:"center",letterSpacing:2}}>PANEL</h1>
                <p style={{color:"#333",fontSize:12,textAlign:"center",marginBottom:"2rem",letterSpacing:1}}>Selecciona una opción</p>
                <div style={{display:"flex",flexDirection:"column",gap:"0.65rem"}}>
                  <button onClick={()=>setAdminSection("products")} style={S.adminBtn}>📦 Gestionar productos</button>
                  <button onClick={doLogout} style={{...S.adminBtn,background:"transparent",color:"#ff5555",border:"none",marginTop:8,letterSpacing:1}}>Cerrar sesión</button>
                </div>
              </div>
            )}

            {adminLogged && adminSection==="products" && (
              <>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}>
                  <h1 style={{color:"#fff",fontSize:16,fontWeight:900,margin:0,letterSpacing:2}}>{editing?"EDITAR PRODUCTO":"PRODUCTOS"}</h1>
                  <button onClick={()=>{setAdminSection("menu");resetForm();}} style={{background:"none",border:"none",color:"#333",cursor:"pointer",fontSize:12,fontFamily:"inherit",WebkitTapHighlightColor:"transparent",letterSpacing:1}}>← MENÚ</button>
                </div>

                <div ref={formRef} style={{
                  background:"#111",borderRadius:12,padding:"1.5rem",marginBottom:"1.25rem",
                  border:editing?"1px solid #2a2a2a":"1px solid #1a1a1a",
                }}>
                  <p style={{color:"#333",fontSize:9,fontWeight:800,letterSpacing:2,margin:"0 0 1.25rem"}}>
                    {editing?`EDITANDO: ${editing.name}`:"NUEVO PRODUCTO"}
                  </p>
                  <div style={{display:"flex",flexDirection:"column",gap:"0.8rem"}}>
                    <input placeholder="Nombre del producto *" value={fName} onChange={e=>setFName(e.target.value)} style={S.input}/>
                    <textarea placeholder="Descripción (opcional)" value={fDesc} onChange={e=>setFDesc(e.target.value)} rows={2} style={{...S.input,resize:"vertical",lineHeight:1.6}}/>
                    <input placeholder="Precio en USD *" type="number" min="0" step="0.01" value={fPrice} onChange={e=>setFPrice(e.target.value)} style={S.input}/>
                    <select value={fCat} onChange={e=>setFCat(e.target.value)} style={{...S.input,appearance:"auto"}}>
                      <option value="">Selecciona categoría *</option>
                      <optgroup label="── LENTES">
                        {LENTES_SUBCATS.map(sub=><option key={sub} value={sub}>{catLabel(sub)}</option>)}
                      </optgroup>
                      <optgroup label="── OTROS">
                        {SHOP_CATS.filter(c=>c!=="LENTES").map(cat=><option key={cat} value={cat}>{catLabel(cat)}</option>)}
                      </optgroup>
                    </select>
                    <div style={{background:"#0e0e0e",borderRadius:8,padding:"1rem",border:"1px dashed #1e1e1e"}}>
                      <p style={{color:"#333",fontSize:9,letterSpacing:2,margin:"0 0 0.65rem",fontWeight:800}}>IMAGEN {!editing&&"*"}</p>
                      <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} style={{display:"none"}} id="fi"/>
                      <label htmlFor="fi" style={{display:"inline-flex",alignItems:"center",gap:"0.45rem",background:"#1a1a1a",color:"#888",padding:"0.55rem 1rem",borderRadius:8,cursor:"pointer",fontSize:12,border:"1px solid #222",fontFamily:"inherit"}}>
                        📷 {fFile?"Cambiar":"Elegir foto"}
                      </label>
                      {fFile && <span style={{color:"#444",fontSize:11,marginLeft:"0.65rem"}}>{fFile.name}</span>}
                      {fPreview && (
                        <div style={{marginTop:"0.65rem",width:80,height:80,borderRadius:8,overflow:"hidden",border:"1px solid #222"}}>
                          <img src={fPreview} alt="preview" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                        </div>
                      )}
                    </div>
                    {fError   && <div style={{color:"#ff5555",fontSize:12,background:"#1e0808",padding:"0.65rem 1rem",borderRadius:8}}>{fError}</div>}
                    {fSuccess && <div style={{color:"#55cc77",fontSize:12,background:"#081e0e",padding:"0.65rem 1rem",borderRadius:8}}>{fSuccess}</div>}
                    <div style={{display:"flex",gap:"0.65rem",flexWrap:"wrap"}}>
                      <button onClick={submitProduct} disabled={fLoading}
                        style={{...S.adminBtn,flex:1,opacity:fLoading?0.4:1,cursor:fLoading?"not-allowed":"pointer"}}>
                        {fLoading?"Subiendo...":(editing?"Guardar cambios":"Agregar producto")}
                      </button>
                      {editing && (
                        <button onClick={resetForm} style={{...S.adminBtn,flex:"0 0 auto",width:"auto",padding:"0.8rem 1.1rem",background:"transparent",color:"#444",border:"1px solid #1e1e1e"}}>
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lista admin con scroll nativo en los pills */}
                <div style={{background:"#111",borderRadius:12,padding:"1.5rem",border:"1px solid #1a1a1a"}}>
                  <p style={{color:"#333",fontSize:9,fontWeight:800,letterSpacing:2,margin:"0 0 0.85rem"}}>
                    PRODUCTOS ({adminProds.length})
                  </p>

                  <input
                    placeholder="Buscar…"
                    value={adminSearch}
                    onChange={e=>setAdminSearch(e.target.value)}
                    style={{...S.input,marginBottom:"0.75rem"}}/>

                  {/* Pills — usa scroll nativo igual que los tabs */}
                  <div
                    className="native-tabs-strip"
                    style={{
                      display:"flex",gap:"0.35rem",
                      overflowX:"auto",
                      paddingBottom:"0.75rem",
                      marginBottom:"0.5rem",
                      WebkitOverflowScrolling:"touch",
                    }}>
                    {["ALL",...usedCats].map(cat=>{
                      const isActive = adminCatFilter===cat;
                      const count = cat==="ALL" ? products.length : products.filter(p=>p.category===cat).length;
                      return (
                        <button key={cat}
                          className="admin-cat-pill"
                          onClick={()=>setAdminCatFilter(cat)}
                          style={{
                            background:isActive?"#fff":"#161616",
                            color:isActive?"#080808":"#555",
                            border:`1px solid ${isActive?"#fff":"#222"}`,
                            padding:"0.3rem 0.7rem",borderRadius:20,
                            fontSize:9,fontWeight:800,letterSpacing:1,
                            fontFamily:"inherit",flexShrink:0,
                            WebkitTapHighlightColor:"transparent",
                            cursor:"pointer",whiteSpace:"nowrap",
                            transition:"all 0.12s ease",
                          }}>
                          {cat==="ALL"?"TODOS":catLabel(cat).toUpperCase()} · {count}
                        </button>
                      );
                    })}
                  </div>

                  {adminCatFilter==="ALL" ? (
                    usedCats.map(cat=>{
                      const catProds = products.filter(p=>
                        p.category===cat &&
                        (adminSearch===""||p.name.toLowerCase().includes(adminSearch.toLowerCase()))
                      );
                      if(catProds.length===0) return null;
                      return (
                        <div key={cat} style={{marginBottom:"1.1rem"}}>
                          <div style={{
                            display:"flex",alignItems:"center",gap:"0.5rem",
                            padding:"0.4rem 0",marginBottom:"0.35rem",
                            borderBottom:"1px solid #1a1a1a",
                          }}>
                            <span style={{fontSize:9,fontWeight:800,letterSpacing:2,color:"#333"}}>
                              {catLabel(cat).toUpperCase()}
                            </span>
                            <span style={{fontSize:9,color:"#2a2a2a",background:"#1a1a1a",padding:"1px 6px",borderRadius:10}}>
                              {catProds.length}
                            </span>
                          </div>
                          {catProds.map(p=>(<AdminProductRow key={p.id} p={p} editing={editing} onEdit={startEdit} onDelete={deleteProduct}/>))}
                        </div>
                      );
                    })
                  ) : (
                    <div style={{display:"flex",flexDirection:"column",gap:2}}>
                      {adminProds.map(p=>(<AdminProductRow key={p.id} p={p} editing={editing} onEdit={startEdit} onDelete={deleteProduct}/>))}
                      {adminProds.length===0 && <p style={{color:"#333",textAlign:"center",padding:"1.5rem",fontSize:12}}>Sin resultados</p>}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      )}

      {/* ══ MODAL PRODUCTO ═════════════════════════════════════════════════ */}
      {selectedProduct && (
        <div onClick={()=>setSelectedProduct(null)}
          style={{position:"fixed",inset:0,zIndex:400,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadeIn 0.18s ease"}}>
          <div onClick={e=>e.stopPropagation()}
            style={{
              background:"#111",width:"100%",maxWidth:520,
              borderRadius:"18px 18px 0 0",padding:"1.5rem 1.5rem 2rem",
              maxHeight:"92vh",overflowY:"auto",
              animation:"slideUp 0.28s cubic-bezier(0.25,0.46,0.45,0.94)",
              border:"1px solid #1e1e1e",borderBottom:"none",
            }}>
            {/* Handle */}
            <div style={{width:36,height:3,background:"#222",borderRadius:2,margin:"0 auto 1rem"}}/>
            <div style={{background:"#0a0a0a",aspectRatio:"4/3",overflow:"hidden",marginBottom:"1.1rem",borderRadius:12}}>
              <LazyImg src={selectedProduct.img} alt={selectedProduct.name}/>
            </div>
            <h2 style={{fontSize:18,fontWeight:900,margin:"0 0 0.35rem",color:C.accent,letterSpacing:0.5}}>{selectedProduct.name}</h2>
            {selectedProduct.description && <p style={{fontSize:13,color:"#555",margin:"0 0 0.65rem",lineHeight:1.6}}>{selectedProduct.description}</p>}
            <p style={{fontSize:24,fontWeight:900,margin:"0 0 1.5rem",color:C.accent}}>${selectedProduct.price.toFixed(2)}</p>
            <div style={{display:"flex",alignItems:"center",border:`1px solid ${C.border}`,width:"fit-content",marginBottom:"1rem",borderRadius:8}}>
              <button onClick={()=>setModalQty(Math.max(1,modalQty-1))} style={S.qtyBtn}>−</button>
              <span style={{padding:"0 1rem",fontSize:16,color:C.text,fontWeight:700}}>{modalQty}</span>
              <button onClick={()=>setModalQty(modalQty+1)} style={S.qtyBtn}>+</button>
            </div>
            <button onClick={()=>addToCart(selectedProduct,modalQty)}
              style={{...S.darkBtn,width:"100%",justifyContent:"center",fontSize:12,padding:"1.05rem",borderRadius:10}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.opacity="0.88"}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.opacity="1"}}>
              AGREGAR AL CARRITO
            </button>
          </div>
        </div>
      )}

      {/* ══ MINI-MODAL POST-CARRITO ═════════════════════════════════════════ */}
      {addedProduct && (
        <AddedToCartModal
          product={addedProduct}
          onClose={()=>setAddedProduct(null)}
          onGoCart={()=>{ setAddedProduct(null); setMainView("cart"); }}
        />
      )}

      {/* ══ WA FLOTANTE ════════════════════════════════════════════════════ */}
      {!isAdmin && <DraggableWA/>}
    </div>
  );
}

// ── AdminProductRow ──────────────────────────────────────────────────────────
function AdminProductRow({p,editing,onEdit,onDelete}:{
  p:Product; editing:Product|null;
  onEdit:(p:Product)=>void;
  onDelete:(id:string)=>void;
}) {
  return (
    <div className="admin-prod-row" style={{
      display:"flex",alignItems:"center",gap:"0.75rem",
      padding:"0.6rem 0.65rem",borderRadius:8,
      background:editing?.id===p.id?"#1a1a1a":"transparent",
    }}>
      <img src={optImg(p.img,120)} alt={p.name}
        style={{width:44,height:44,objectFit:"cover",borderRadius:6,flexShrink:0,background:"#1a1a1a"}}/>
      <div style={{flex:1,minWidth:0}}>
        <p style={{color:"#ccc",fontSize:12,fontWeight:700,margin:"0 0 1px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</p>
        <p style={{color:"#333",fontSize:10,margin:0}}>${p.price.toFixed(2)}</p>
      </div>
      <div style={{display:"flex",gap:"0.35rem",flexShrink:0}}>
        <button onClick={()=>onEdit(p)} style={{
          background:"#1a1a1a",color:"#888",border:"1px solid #222",
          padding:"0.3rem 0.65rem",borderRadius:6,cursor:"pointer",
          fontSize:10,fontFamily:"inherit",fontWeight:700,
          WebkitTapHighlightColor:"transparent",
        }}>Editar</button>
        <button onClick={()=>onDelete(p.id)} style={{
          background:"none",color:"#cc3333",border:"1px solid #2a1515",
          padding:"0.3rem 0.65rem",borderRadius:6,cursor:"pointer",
          fontSize:10,fontFamily:"inherit",
          WebkitTapHighlightColor:"transparent",
        }}>✕</button>
      </div>
    </div>
  );
}

// ── Footer ───────────────────────────────────────────────────────────────────
function Footer({setMainView,setShopFilter}:{setMainView:(v:MainView)=>void;setShopFilter:(v:ShopFilter)=>void}) {
  const sA: React.CSSProperties = {
    display:"flex",alignItems:"center",justifyContent:"center",
    width:36,height:36,borderRadius:"50%",
    background:"rgba(255,255,255,0.04)",textDecoration:"none",
    border:"1px solid rgba(255,255,255,0.07)",
    flexShrink:0,
  };

  const catLinks = [
    {label:"Lentes",    cat:"LENTES" as ShopFilter},
    {label:"Relojes",   cat:"RELOJES" as ShopFilter},
    {label:"Collares",  cat:"COLLARES" as ShopFilter},
    {label:"Pulseras",  cat:"PULSERAS" as ShopFilter},
    {label:"Anillos",   cat:"ANILLOS" as ShopFilter},
    {label:"Aretes",    cat:"ARETES" as ShopFilter},
    {label:"Billeteras",cat:"BILLETERAS" as ShopFilter},
  ];

  return (
    <footer style={{
      background:"#060606",
      borderTop:"1px solid #111",
      marginTop:"2rem",
      padding:"2.5rem 1.5rem 2rem",
    }}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>
        <div className="footer-grid" style={{display:"grid",gap:"2rem",marginBottom:"2rem"}}>

          <div>
            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:"0.65rem"}}>
              <img src="/favicon.png" alt="Fokus" width={20} height={20} style={{objectFit:"contain"}}/>
              <span style={{fontWeight:900,fontSize:12,letterSpacing:5,color:"#fff"}}>FOKUS</span>
            </div>
            <p style={{fontSize:11,color:"#333",lineHeight:1.7,margin:"0 0 0.85rem",maxWidth:180}}>
              Accesorios con actitud.<br/>Cada detalle importa.
            </p>
            <div style={{display:"flex",gap:"0.45rem"}}>
              <a href={SOCIAL.instagram} target="_blank" rel="noreferrer" className="social-link" style={sA}><IcIG s={14}/></a>
              <a href={SOCIAL.facebook}  target="_blank" rel="noreferrer" className="social-link" style={sA}><IcFB s={14}/></a>
              <a href={SOCIAL.tiktok}    target="_blank" rel="noreferrer" className="social-link" style={sA}><IcTT s={14}/></a>
              <a href={SOCIAL.whatsapp}  target="_blank" rel="noreferrer" className="social-link" style={{...sA,background:"rgba(37,211,102,0.08)",borderColor:"rgba(37,211,102,0.15)"}}><IcWA s={14}/></a>
            </div>
          </div>

          <div>
            <p style={{fontSize:9,fontWeight:800,letterSpacing:3,color:"#2a2a2a",marginBottom:"0.75rem"}}>TIENDA</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.35rem 1rem"}}>
              {catLinks.map(({label,cat})=>(
                <button key={cat}
                  onClick={()=>{setShopFilter(cat);setMainView("shop");typeof window!=="undefined"&&window.scrollTo({top:0,behavior:"smooth"});}}
                  style={{background:"none",border:"none",textAlign:"left",cursor:"pointer",fontFamily:"inherit",fontSize:11,color:"#333",padding:0,WebkitTapHighlightColor:"transparent",transition:"color 0.15s"}}
                  className="footer-cat-link">
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p style={{fontSize:9,fontWeight:800,letterSpacing:3,color:"#2a2a2a",marginBottom:"0.75rem"}}>CONTACTO</p>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer"
              style={{display:"inline-flex",alignItems:"center",gap:"0.45rem",background:"#0d1e0d",color:"#4caf50",padding:"0.55rem 0.9rem",borderRadius:8,fontSize:11,fontWeight:700,textDecoration:"none",marginBottom:"0.75rem",border:"1px solid #162516"}}>
              <IcWA s={12} c="#4caf50"/> WhatsApp
            </a>
            <div style={{display:"flex",flexDirection:"column",gap:"0.2rem"}}>
              <p style={{fontSize:10,color:"#2a2a2a",margin:0}}>miltonjavi05@gmail.com</p>
              <p style={{fontSize:10,color:"#2a2a2a",margin:0}}>+58 424-300-5733</p>
            </div>
          </div>
        </div>

        <div style={{borderTop:"1px solid #111",paddingTop:"1rem",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"0.4rem"}}>
          <p style={{fontSize:9,color:"#222",margin:0,letterSpacing:1}}>© {new Date().getFullYear()} FOKUS. TODOS LOS DERECHOS RESERVADOS.</p>
          <p style={{fontSize:9,color:"#1a1a1a",margin:0,letterSpacing:1}}>FOKUS ®</p>
        </div>
      </div>
    </footer>
  );
}