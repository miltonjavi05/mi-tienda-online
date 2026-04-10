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
  { id:"zinli",        icon:"💳", name:"Zinli",                           detail:"miltonjavi05@gmail.com" },
  { id:"binance",      icon:"🟡", name:"Binance Pay",                     detail:"miltonjavi05@gmail.com" },
  { id:"pagomovil_bv", icon:"🏦", name:"Pago Móvil – Banco de Venezuela", detail:"Tlf: 04243005733 · C.I: 28442429" },
  { id:"pagomovil_ba", icon:"🏦", name:"Pago Móvil – Bancamiga",          detail:"Tlf: 04243005733 · C.I: 28442429" },
];

const SHOP_CATS = ["LENTES","RELOJES","COLLARES","PULSERAS","ANILLOS","ARETES","BILLETERAS"] as const;
const LENTES_SUBCATS = ["LENTES·FOTOCROMATICOS","LENTES·ANTI-LUZ-AZUL","LENTES·SOL","LENTES·MOTORIZADOS"] as const;

interface Product { id:string; name:string; category:string; price:number; img:string; description?:string; createdAt?:number; }
interface CartItem { product:Product; qty:number; }
type MainView = "fokus"|"shop"|"comunidad"|"cart"|"admin";
type ShopFilter = typeof SHOP_CATS[number]|"TODO"|typeof LENTES_SUBCATS[number]|"LENTES";

// ── Firestore REST ──────────────────────────────────────────────────────────
const fsBase = ()=>`https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`;
type FsVal = {stringValue:string}|{doubleValue:number}|{integerValue:string}|{booleanValue:boolean}|{nullValue:null}|{arrayValue:{values?:FsVal[]}}|{mapValue:{fields?:Record<string,FsVal>}};
function toFs(v:unknown):FsVal{if(v===null||v===undefined)return{nullValue:null};if(typeof v==="string")return{stringValue:v};if(typeof v==="number")return{doubleValue:v};if(typeof v==="boolean")return{booleanValue:v};if(Array.isArray(v))return{arrayValue:{values:v.map(toFs)}};if(typeof v==="object")return{mapValue:{fields:Object.fromEntries(Object.entries(v as Record<string,unknown>).map(([k,val])=>[k,toFs(val)]))}};return{stringValue:String(v)};}
function fromFs(f:FsVal):unknown{if("stringValue" in f)return f.stringValue;if("doubleValue" in f)return f.doubleValue;if("integerValue" in f)return Number(f.integerValue);if("booleanValue" in f)return f.booleanValue;if("nullValue" in f)return null;if("arrayValue" in f)return((f as{arrayValue:{values?:FsVal[]}}).arrayValue.values||[]).map(fromFs);if("mapValue" in f){const fields=(f as{mapValue:{fields?:Record<string,FsVal>}}).mapValue.fields||{};return Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,fromFs(v)]));}return null;}
interface FsDoc{name:string;fields:Record<string,FsVal>;}
function docToProduct(doc:FsDoc):Product{const f=doc.fields||{};return{id:doc.name.split("/").pop() as string,name:fromFs(f.name??{nullValue:null}) as string||"",category:((fromFs(f.category??{nullValue:null}) as string)||"").toUpperCase(),price:fromFs(f.price??{nullValue:null}) as number||0,img:fromFs(f.img??{nullValue:null}) as string||"",description:fromFs(f.description??{nullValue:null}) as string||"",createdAt:fromFs(f.createdAt??{nullValue:null}) as number||0};}
async function fsGetAll():Promise<Product[]>{const r=await fetch(`${fsBase()}/products?pageSize=200`);if(!r.ok)throw new Error(await r.text());const d=await r.json() as{documents?:FsDoc[]};return(d.documents||[]).map(docToProduct);}
async function fsAdd(p:Omit<Product,"id">):Promise<void>{const fields=Object.fromEntries(Object.entries({...p,createdAt:Date.now()}).map(([k,v])=>[k,toFs(v)]));const r=await fetch(`${fsBase()}/products`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fields})});if(!r.ok)throw new Error(await r.text());}
async function fsUpdate(id:string,p:Partial<Omit<Product,"id">>):Promise<void>{const fields=Object.fromEntries(Object.entries(p).map(([k,v])=>[k,toFs(v)]));const mask=Object.keys(p).map(k=>`updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");const r=await fetch(`${fsBase()}/products/${id}?${mask}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({fields})});if(!r.ok)throw new Error(await r.text());}
async function fsDelete(id:string):Promise<void>{await fetch(`${fsBase()}/products/${id}`,{method:"DELETE"});}

// ── Cloudinary ──────────────────────────────────────────────────────────────
async function uploadImg(file:File):Promise<string>{const fd=new FormData();fd.append("file",file);fd.append("upload_preset",CLOUDINARY_PRESET);const r=await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,{method:"POST",body:fd});if(!r.ok)throw new Error("Error subiendo imagen");return((await r.json()) as{secure_url:string}).secure_url;}
function optImg(url:string,w=400):string{if(!url||!url.includes("cloudinary.com"))return url;return url.replace("/upload/",`/upload/w_${w},q_auto,f_webp,dpr_auto/`);}

const DEMO:Product[]=[
  {id:"d1",name:"Lentes Fotocromaticos",category:"LENTES·FOTOCROMATICOS",price:22,img:"https://images.unsplash.com/photo-1577803645773-f96470509666?w=400&q=80"},
  {id:"d2",name:"Lentes Anti Luz Azul",category:"LENTES·ANTI-LUZ-AZUL",price:18,img:"https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&q=80"},
  {id:"d3",name:"Lentes de Sol",category:"LENTES·SOL",price:20,img:"https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&q=80"},
  {id:"d4",name:"Lentes para Motos",category:"LENTES·MOTORIZADOS",price:25,img:"https://images.unsplash.com/photo-1473496169904-658ba7574b0d?w=400&q=80"},
  {id:"d5",name:"Megir NF56",category:"RELOJES",price:40,img:"https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&q=80"},
  {id:"d6",name:"Navigorce NF65",category:"RELOJES",price:40,img:"https://images.unsplash.com/photo-1548171916-c8fd28f7f356?w=400&q=80"},
  {id:"d7",name:"Collar de Cruz",category:"COLLARES",price:25,img:"https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80"},
  {id:"d8",name:"Pulsera Trenzada",category:"PULSERAS",price:15,img:"https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=400&q=80"},
  {id:"d9",name:"Anillo Liso",category:"ANILLOS",price:12,img:"https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&q=80"},
  {id:"d10",name:"Aretes Argolla",category:"ARETES",price:10,img:"https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=400&q=80"},
  {id:"d11",name:"Billetera Cuero",category:"BILLETERAS",price:30,img:"https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&q=80"},
];

// ── SVG Icons ────────────────────────────────────────────────────────────────
const IcWA=({s=22,c="#fff"}:{s?:number;c?:string})=><svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;
const IcIG=({s=22,c="#fff"}:{s?:number;c?:string})=><svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>;
const IcFB=({s=22,c="#fff"}:{s?:number;c?:string})=><svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
const IcTT=({s=22,c="#fff"}:{s?:number;c?:string})=><svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>;

const NAV_H=56, TABS_H=40;
const BG="#080808", BORDER="#1e1e1e", TEXT="#ececec", ACCENT="#fff";

function catLabel(cat:string):string{
  const m:Record<string,string>={"LENTES·FOTOCROMATICOS":"Fotocromaticos","LENTES·ANTI-LUZ-AZUL":"Anti Luz Azul","LENTES·SOL":"De Sol","LENTES·MOTORIZADOS":"Para Motos"};
  return m[cat]??(cat[0]+cat.slice(1).toLowerCase());
}

// ── GLOBAL CSS ───────────────────────────────────────────────────────────────
// La clave del scroll vertical desde imágenes está en el CSS global:
// Todos los elementos del DOM heredan touch-action:pan-y por defecto (via *),
// excepto el botón WA que tiene touch-action:none, y los strips horizontales que tienen pan-x pan-y.
// Así el navegador siempre puede iniciar el scroll vertical desde cualquier punto de la página.
const GLOBAL_CSS = `
  @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes slideUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideInLeft{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
  @keyframes scaleIn{from{opacity:0;transform:scale(0.88)}to{opacity:1;transform:scale(1)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}

  *,*::before,*::after{box-sizing:border-box;-webkit-font-smoothing:antialiased;}

  /* CLAVE PRINCIPAL: todo el documento permite scroll vertical por defecto.
     Ningún elemento bloquea el pan-y a menos que sea explícitamente necesario (botón WA). */
  html,body{
    background:${BG};
    margin:0;
    /* overscroll-behavior-y:none evita el bounce pero NO bloquea el scroll */
    overscroll-behavior-y:none;
    /* touch-action:pan-y en body: el scroll vertical siempre funciona */
    touch-action:pan-y;
  }

  /* Todos los elementos heredan pan-y por defecto */
  * { touch-action:pan-y; }

  /* Los strips de scroll horizontal usan pan-x pan-y para ambas direcciones */
  .sx { touch-action:pan-x pan-y !important; }

  /* El botón WA es el ÚNICO que bloquea el touch del browser (usa Pointer Events propio) */
  .wa-btn { touch-action:none !important; }

  /* Botones interactivos: manipulation = tap rápido sin delay de 300ms */
  button,a { touch-action:manipulation; }

  /* Ocultar scrollbars horizontales */
  .sx { scrollbar-width:none; -webkit-overflow-scrolling:touch; }
  .sx::-webkit-scrollbar { display:none; }

  /* Imágenes: no arrastrables, no bloquean eventos del padre */
  img { pointer-events:none; user-select:none; -webkit-user-select:none; draggable:false; }

  /* Cards de producto */
  .pc:active { opacity:0.88; }
  .pc:hover .pi { transform:scale(1.05); }

  /* Hover effects */
  .sl:hover { border-color:#333 !important; transform:translateY(-1px); }
  .apr:hover { background:#161616 !important; }
  .acp:hover { opacity:0.8; }
  .fcl:hover { color:#fff !important; }
  .sbb:hover { color:#fff !important; }
  .pmc:hover { background:#1a1a1a !important; }

  /* Grids responsive */
  @media(max-width:480px){
    .pg { grid-template-columns:repeat(2,1fr) !important; }
    .fg { grid-template-columns:1fr !important; gap:1.5rem !important; }
  }
  @media(min-width:481px) and (max-width:767px){
    .pg { grid-template-columns:repeat(auto-fill,minmax(150px,1fr)) !important; }
    .fg { grid-template-columns:repeat(2,1fr) !important; gap:1.5rem !important; }
  }
  @media(min-width:768px){
    .pg { grid-template-columns:repeat(auto-fill,minmax(195px,1fr)) !important; }
    .fg { grid-template-columns:repeat(3,1fr) !important; }
  }
`;

// ── LazyImg ──────────────────────────────────────────────────────────────────
function LazyImg({src,alt,w=400}:{src:string;alt:string;w?:number}){
  const[ok,setOk]=useState(false);
  const[iv,setIv]=useState(false);
  const r=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const el=r.current; if(!el) return;
    const o=new IntersectionObserver(([e])=>{if(e.isIntersecting){setIv(true);o.disconnect();}},{rootMargin:"400px"});
    o.observe(el); return()=>o.disconnect();
  },[]);
  return(
    <div ref={r} style={{position:"relative",width:"100%",height:"100%"}}>
      {!ok&&<div style={{position:"absolute",inset:0,background:"#141414"}}/>}
      {iv&&<img src={optImg(src,w)} alt={alt} loading="lazy" decoding="async"
        onLoad={()=>setOk(true)}
        style={{width:"100%",height:"100%",objectFit:"cover",display:"block",opacity:ok?1:0,transition:"opacity 0.2s"}}/>}
    </div>
  );
}

function SkeletonCard(){
  return(
    <div>
      <div style={{aspectRatio:"1",background:"#141414",borderRadius:10,overflow:"hidden",position:"relative",marginBottom:"0.6rem"}}>
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(90deg,#141414 0%,#1e1e1e 50%,#141414 100%)",backgroundSize:"200% 100%",animation:"shimmer 1.4s infinite"}}/>
      </div>
      <div style={{height:11,background:"#141414",borderRadius:4,marginBottom:6,width:"70%"}}/>
      <div style={{height:11,background:"#141414",borderRadius:4,width:"35%"}}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  WA BUTTON — Estilo iPhone AssistiveTouch
//  touch-action:none SOLO en este elemento; el resto de la página usa pan-y
// ═══════════════════════════════════════════════════════════════════════════
function DraggableWA(){
  const BTN=50, MARGIN=10;
  const pos=useRef({x:0,y:0});
  const[xy,setXY]=useState({x:0,y:0});
  const drag=useRef(false);
  const moved=useRef(false);
  const sp=useRef({x:0,y:0}); // start pointer
  const sb=useRef({x:0,y:0}); // start btn position
  const[pressed,setPressed]=useState(false);
  const raf=useRef<number>(0);

  useEffect(()=>{
    const x=window.innerWidth-BTN-MARGIN, y=window.innerHeight*0.75;
    pos.current={x,y}; setXY({x,y});
  },[]);

  const snap=useCallback(()=>{
    const W=window.innerWidth,H=window.innerHeight;
    const tx=(pos.current.x+BTN/2)<W/2?MARGIN:W-BTN-MARGIN;
    const ty=Math.max(MARGIN,Math.min(H-BTN-MARGIN,pos.current.y));
    const sx=pos.current.x,sy=pos.current.y,dx=tx-sx,dy=ty-sy;
    const t0=performance.now();
    cancelAnimationFrame(raf.current);
    const go=(now:number)=>{
      const t=Math.min((now-t0)/300,1);
      const e=1-Math.pow(1-t,3);
      pos.current={x:sx+dx*e,y:sy+dy*e};
      setXY({...pos.current});
      if(t<1) raf.current=requestAnimationFrame(go);
    };
    raf.current=requestAnimationFrame(go);
  },[]);

  const onPD=useCallback((e:React.PointerEvent)=>{
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current=true; moved.current=false;
    sp.current={x:e.clientX,y:e.clientY};
    sb.current={...pos.current};
    setPressed(true);
    cancelAnimationFrame(raf.current);
  },[]);

  const onPM=useCallback((e:React.PointerEvent)=>{
    if(!drag.current) return;
    const dx=e.clientX-sp.current.x, dy=e.clientY-sp.current.y;
    if(Math.abs(dx)>3||Math.abs(dy)>3) moved.current=true;
    const W=window.innerWidth,H=window.innerHeight;
    pos.current={
      x:Math.max(MARGIN,Math.min(W-BTN-MARGIN,sb.current.x+dx)),
      y:Math.max(MARGIN,Math.min(H-BTN-MARGIN,sb.current.y+dy)),
    };
    setXY({...pos.current});
  },[]);

  const onPU=useCallback(()=>{
    if(!drag.current) return;
    drag.current=false; setPressed(false);
    if(moved.current) snap();
    else window.open(SOCIAL.whatsapp,"_blank","noreferrer");
  },[snap]);

  return(
    <div className="wa-btn"
      onPointerDown={onPD} onPointerMove={onPM} onPointerUp={onPU}
      onPointerCancel={()=>{drag.current=false;setPressed(false);snap();}}
      style={{
        position:"fixed",left:xy.x,top:xy.y,zIndex:500,
        width:BTN,height:BTN,borderRadius:"50%",
        background:pressed?"rgba(255,255,255,0.92)":"rgba(18,18,18,0.82)",
        backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",
        border:pressed?"1.5px solid rgba(255,255,255,0.9)":"1.5px solid rgba(255,255,255,0.13)",
        display:"flex",alignItems:"center",justifyContent:"center",
        cursor:"grab",userSelect:"none",WebkitUserSelect:"none",
        willChange:"left,top",
        boxShadow:pressed?"0 0 0 8px rgba(255,255,255,0.06),0 4px 24px rgba(0,0,0,0.5)":"0 2px 20px rgba(0,0,0,0.5)",
        transition:"background 0.15s,border-color 0.15s,box-shadow 0.15s",
      }}>
      <IcWA s={22} c={pressed?"#080808":"#fff"}/>
    </div>
  );
}

// ── NativeTabs ───────────────────────────────────────────────────────────────
function NativeTabs({items,active,onSelect,renderItem,height=44}:{items:string[];active:string;onSelect:(v:string)=>void;renderItem:(i:string,a:boolean)=>React.ReactNode;height?:number;}){
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const el=ref.current?.querySelector(`[data-active="true"]`) as HTMLElement|null;
    if(el) el.scrollIntoView({block:"nearest",inline:"center",behavior:"smooth"});
  },[active]);
  return(
    <div ref={ref} className="sx" style={{display:"flex",overflowX:"auto",overflowY:"hidden",height}}>
      {items.map(item=>(
        <button key={item} data-active={item===active} onClick={()=>onSelect(item)}
          style={{background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",flexShrink:0,padding:0,display:"flex",alignItems:"center",WebkitTapHighlightColor:"transparent"}}>
          {renderItem(item,item===active)}
        </button>
      ))}
    </div>
  );
}

// ── ProductCard — grid ────────────────────────────────────────────────────────
// No necesita touch-action explícito porque hereda pan-y del CSS global (*)
function ProductCard({product,onClick,index}:{product:Product;onClick:()=>void;index:number}){
  const[vis,setVis]=useState(false);
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const el=ref.current; if(!el) return;
    const o=new IntersectionObserver(([e])=>{if(e.isIntersecting){setVis(true);o.disconnect();}},{rootMargin:"100px"});
    o.observe(el); return()=>o.disconnect();
  },[]);
  return(
    <div ref={ref} className="pc" onClick={onClick} style={{
      cursor:"pointer",
      opacity:vis?1:0,
      transform:vis?"translateY(0)":"translateY(12px)",
      transition:`opacity 0.3s ease ${Math.min(index*30,150)}ms,transform 0.3s ease ${Math.min(index*30,150)}ms`,
      willChange:"transform,opacity",
    }}>
      <div style={{background:"#111",aspectRatio:"1",overflow:"hidden",borderRadius:10,marginBottom:"0.55rem",position:"relative"}}>
        <div className="pi" style={{width:"100%",height:"100%",transition:"transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94)"}}>
          <LazyImg src={product.img} alt={product.name}/>
        </div>
      </div>
      <p style={{margin:"0 0 3px",fontSize:12,lineHeight:1.35,color:"#bbb",letterSpacing:0.2}}>{product.name}</p>
      <p style={{margin:0,fontSize:14,fontWeight:800,color:ACCENT,letterSpacing:0.5}}>${product.price.toFixed(2)}</p>
    </div>
  );
}

// ── ProductCardH — scroll horizontal ─────────────────────────────────────────
// Hereda pan-y del CSS global. El contenedor .sx tiene pan-x pan-y → ambos funcionan.
function ProductCardH({product,onClick}:{product:Product;onClick:()=>void}){
  const[ok,setOk]=useState(false);
  return(
    <div onClick={onClick} style={{flexShrink:0,width:142,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
      <div style={{width:142,height:142,background:"#111",borderRadius:10,overflow:"hidden",marginBottom:"0.5rem",position:"relative"}}>
        {!ok&&<div style={{position:"absolute",inset:0,background:"#161616"}}/>}
        <img src={optImg(product.img,284)} alt={product.name} loading="lazy" decoding="async"
          onLoad={()=>setOk(true)}
          style={{width:"100%",height:"100%",objectFit:"cover",opacity:ok?1:0,transition:"opacity 0.2s"}}/>
      </div>
      <p style={{margin:"0 0 2px",fontSize:11,color:"#bbb",lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:142}}>{product.name}</p>
      <p style={{margin:0,fontSize:13,fontWeight:800,color:ACCENT}}>${product.price.toFixed(2)}</p>
    </div>
  );
}

// ── HorizontalRow — vista TODO ────────────────────────────────────────────────
function HorizontalRow({cat,products,onProductClick,onViewAll,isLenteCat}:{cat:string;products:Product[];onProductClick:(p:Product)=>void;onViewAll:()=>void;isLenteCat:boolean;}){
  if(!products.length) return null;
  return(
    <div style={{marginBottom:"2.5rem"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.85rem",borderBottom:`1px solid ${BORDER}`,paddingBottom:"0.65rem"}}>
        <h2 style={{fontSize:11,fontWeight:800,letterSpacing:3,margin:0,color:"#555"}}>
          {isLenteCat?`LENTES · ${catLabel(cat).toUpperCase()}`:catLabel(cat).toUpperCase()}
        </h2>
        <button onClick={onViewAll} style={{background:"none",border:"none",fontSize:10,color:"#333",cursor:"pointer",fontFamily:"inherit",WebkitTapHighlightColor:"transparent",letterSpacing:1,fontWeight:700}}>
          VER TODOS
        </button>
      </div>
      {/* strip horizontal: sx = pan-x pan-y → scroll horizontal del strip + scroll vertical de página */}
      <div className="sx" style={{display:"flex",gap:"0.75rem",overflowX:"auto",overflowY:"hidden",paddingBottom:"0.5rem"}}>
        {products.map(p=><ProductCardH key={p.id} product={p} onClick={()=>onProductClick(p)}/>)}
      </div>
    </div>
  );
}

// ── AddedToCartModal ──────────────────────────────────────────────────────────
function AddedModal({product,onClose,onGoCart}:{product:Product;onClose:()=>void;onGoCart:()=>void;}){
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,0.72)",display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadeIn 0.18s ease"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#161616",width:"100%",maxWidth:520,borderRadius:"18px 18px 0 0",padding:"1.25rem 1.25rem 2rem",animation:"slideUp 0.28s cubic-bezier(0.34,1.3,0.64,1)",border:"1px solid #222",borderBottom:"none"}}>
        <div style={{width:36,height:3,background:"#333",borderRadius:2,margin:"0 auto 1.25rem"}}/>
        <div style={{display:"flex",gap:"0.85rem",alignItems:"center",marginBottom:"1.25rem"}}>
          <div style={{width:58,height:58,borderRadius:8,overflow:"hidden",flexShrink:0,background:"#111"}}>
            <img src={optImg(product.img,120)} alt={product.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          </div>
          <div style={{flex:1}}>
            <p style={{margin:"0 0 2px",fontSize:11,color:"#555",letterSpacing:1.5,fontWeight:700}}>AÑADIDO AL CARRITO</p>
            <p style={{margin:"0 0 2px",fontSize:14,color:TEXT,fontWeight:600,lineHeight:1.3}}>{product.name}</p>
            <p style={{margin:0,fontSize:13,color:"#888"}}>Añadir más <span style={{color:ACCENT,fontWeight:700}}>${product.price.toFixed(2)}</span></p>
          </div>
          <div style={{width:32,height:32,borderRadius:"50%",background:"#1a2e1a",border:"1.5px solid #2a4a2a",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,animation:"scaleIn 0.3s cubic-bezier(0.34,1.4,0.64,1)"}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.65rem"}}>
          <button onClick={onClose} style={{background:"transparent",color:"#aaa",border:"1px solid #2a2a2a",padding:"0.85rem 1rem",fontSize:12,fontWeight:700,letterSpacing:1.2,cursor:"pointer",fontFamily:"inherit",borderRadius:10,WebkitTapHighlightColor:"transparent"}}>SEGUIR COMPRANDO</button>
          <button onClick={onGoCart} style={{background:ACCENT,color:BG,border:"none",padding:"0.85rem 1rem",fontSize:12,fontWeight:800,letterSpacing:1.2,cursor:"pointer",fontFamily:"inherit",borderRadius:10,WebkitTapHighlightColor:"transparent"}}>IR AL CARRITO →</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  HOME
// ═══════════════════════════════════════════════════════════════════════════
export default function Home(){
  const[view,setView]=useState<MainView>("fokus");
  const[filter,setFilter]=useState<ShopFilter>("TODO");
  const[lentesOpen,setLentesOpen]=useState(false);
  const[cart,setCart]=useState<CartItem[]>([]);
  const[sel,setSel]=useState<Product|null>(null);
  const[qty,setQty]=useState(1);
  const[menuOpen,setMenuOpen]=useState(false);
  const[searchOpen,setSearchOpen]=useState(false);
  const[sq,setSq]=useState("");
  const[payMethod,setPayMethod]=useState<string|null>(null);
  const[products,setProducts]=useState<Product[]>([]);
  const[loading,setLoading]=useState(true);
  const[fbReady,setFbReady]=useState(false);
  const[added,setAdded]=useState<Product|null>(null);

  const navRef=useRef<HTMLElement>(null);
  const[navH,setNavH]=useState(NAV_H+TABS_H);
  useEffect(()=>{
    const upd=()=>{if(navRef.current)setNavH(navRef.current.offsetHeight);};
    upd();
    const ro=new ResizeObserver(upd);
    if(navRef.current)ro.observe(navRef.current);
    return()=>ro.disconnect();
  },[view,lentesOpen,searchOpen]);

  // Admin
  const[aLogged,setALogged]=useState(false);
  const[aEmail,setAEmail]=useState(""); const[aPwd,setAPwd]=useState(""); const[aErr,setAErr]=useState("");
  const[aSection,setASection]=useState<"menu"|"products">("menu");
  const[aCatF,setACatF]=useState("ALL");
  const[editing,setEditing]=useState<Product|null>(null);
  const[fName,setFName]=useState(""); const[fDesc,setFDesc]=useState(""); const[fPrice,setFPrice]=useState("");
  const[fCat,setFCat]=useState(""); const[fFile,setFFile]=useState<File|null>(null);
  const[fPrev,setFPrev]=useState(""); const[fLoad,setFLoad]=useState(false);
  const[fErr,setFErr]=useState(""); const[fOk,setFOk]=useState("");
  const[aSearch,setASearch]=useState("");
  const fileRef=useRef<HTMLInputElement>(null);
  const formRef=useRef<HTMLDivElement>(null);

  const loadProds=useCallback(async()=>{
    setLoading(true);
    try{const d=await fsGetAll();setProducts(d.length>0?d:DEMO);}
    catch{setProducts(DEMO);}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{
    const ready=FIREBASE_CONFIG.projectId!=="TU_PROJECT_ID";
    setFbReady(ready);
    if(ready)loadProds();else{setProducts(DEMO);setLoading(false);}
    if(typeof window!=="undefined"&&window.location.pathname==="/admin")setView("admin");
  },[loadProds]);

  const isLSub=useMemo(()=>(LENTES_SUBCATS as readonly string[]).includes(filter),[filter]);
  const isLActive=useMemo(()=>filter==="LENTES"||isLSub,[filter,isLSub]);

  const visCats=useCallback(():string[]=>{
    if(filter==="TODO")return[...LENTES_SUBCATS,...SHOP_CATS.filter(c=>c!=="LENTES")];
    if(filter==="LENTES")return[...LENTES_SUBCATS];
    return[filter];
  },[filter]);

  const getP=useCallback((cat:string)=>products.filter(p=>p.category===cat&&(sq===""||p.name.toLowerCase().includes(sq.toLowerCase()))),[products,sq]);

  const totalItems=useMemo(()=>cart.reduce((s,i)=>s+i.qty,0),[cart]);
  const totalPrice=useMemo(()=>cart.reduce((s,i)=>s+i.product.price*i.qty,0),[cart]);

  const addToCart=useCallback((product:Product,q:number)=>{
    setCart(prev=>{const ex=prev.find(i=>i.product.id===product.id);return ex?prev.map(i=>i.product.id===product.id?{...i,qty:i.qty+q}:i):[...prev,{product,qty:q}];});
    setSel(null);setAdded(product);
  },[]);

  const updQty=useCallback((id:string,d:number)=>setCart(prev=>prev.map(i=>i.product.id===id?{...i,qty:i.qty+d}:i).filter(i=>i.qty>0)),[]);

  const waMsg=useCallback(()=>{
    const lines=cart.map(i=>`• ${i.product.name} x${i.qty} — $${(i.product.price*i.qty).toFixed(2)}`);
    const pm=PAYMENT_METHODS.find(m=>m.id===payMethod);
    const pmL=pm?`\n\nMétodo de pago: ${pm.name} (${pm.detail})`:"";
    return`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hola! Quiero hacer un pedido:\n\n${lines.join("\n")}\n\nTotal: $${totalPrice.toFixed(2)}${pmL}\n\n¡Adjunto comprobante de pago!`)}`;
  },[cart,totalPrice,payMethod]);

  const doLogin=()=>{if(aEmail===ADMIN_EMAIL&&aPwd===ADMIN_PASSWORD){setALogged(true);setAErr("");setASection("menu");}else setAErr("Credenciales incorrectas");};
  const doLogout=()=>{setALogged(false);setAEmail("");setAPwd("");setView("fokus");if(typeof window!=="undefined")window.history.pushState("","","/");};
  const resetForm=()=>{setEditing(null);setFName("");setFDesc("");setFPrice("");setFCat("");setFFile(null);setFPrev("");setFErr("");setFOk("");if(fileRef.current)fileRef.current.value="";};
  const startEdit=(p:Product)=>{setEditing(p);setFName(p.name);setFDesc(p.description||"");setFPrice(String(p.price));setFCat(p.category);setFPrev(p.img);setFFile(null);setFErr("");setFOk("");if(fileRef.current)fileRef.current.value="";setTimeout(()=>formRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),50);};
  const onFC=(e:React.ChangeEvent<HTMLInputElement>)=>{const f=e.target.files?.[0];if(!f)return;setFFile(f);const r=new FileReader();r.onload=ev=>setFPrev(ev.target?.result as string);r.readAsDataURL(f);};
  const submitProd=async()=>{
    setFErr("");setFOk("");
    if(!fName.trim()||!fPrice||!fCat){setFErr("Nombre, precio y categoría son obligatorios.");return;}
    if(!editing&&!fFile){setFErr("Selecciona una imagen.");return;}
    if(!fbReady){setFErr("Firebase no configurado.");return;}
    setFLoad(true);
    try{
      let img=fPrev;if(fFile)img=await uploadImg(fFile);
      const data={name:fName.trim(),description:fDesc.trim(),price:parseFloat(fPrice),category:fCat.toUpperCase(),img};
      if(editing){await fsUpdate(editing.id,data);setFOk("✓ Producto actualizado");}
      else{await fsAdd(data);setFOk("✓ Producto agregado");}
      await loadProds();setTimeout(resetForm,1800);
    }catch(e){setFErr("Error: "+(e instanceof Error?e.message:"desconocido"));}
    finally{setFLoad(false);}
  };
  const delProd=async(id:string)=>{if(!confirm("¿Eliminar?"))return;await fsDelete(id);await loadProds();};

  const aProds=useMemo(()=>{let l=products;if(aCatF!=="ALL")l=l.filter(p=>p.category===aCatF);if(aSearch!=="")l=l.filter(p=>p.name.toLowerCase().includes(aSearch.toLowerCase())||p.category.toLowerCase().includes(aSearch.toLowerCase()));return l;},[products,aCatF,aSearch]);
  const usedCats=useMemo(()=>[...new Set(products.map(p=>p.category))].sort(),[products]);

  const isShop=view==="shop", isAdmin=view==="admin", isCart=view==="cart";
  const isTodo=isShop&&filter==="TODO";
  const stickyTop=navH-1;

  const NAV_TABS=[{id:"fokus" as MainView,l:"FOKUS"},{id:"shop" as MainView,l:"TIENDA"},{id:"comunidad" as MainView,l:"COMUNIDAD"}];

  // Shared styles
  const inp:React.CSSProperties={width:"100%",border:`1px solid ${BORDER}`,padding:"0.75rem 1rem",fontSize:14,outline:"none",fontFamily:"inherit",background:"#161616",color:TEXT,borderRadius:8,boxSizing:"border-box"};
  const darkBtn:React.CSSProperties={background:ACCENT,color:BG,border:"none",padding:"0.9rem 1.6rem",fontSize:12,fontWeight:800,letterSpacing:2,cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:"0.5rem",WebkitTapHighlightColor:"transparent",transition:"opacity 0.15s"};
  const iBtn:React.CSSProperties={background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:8,WebkitTapHighlightColor:"transparent"};
  const aBtn:React.CSSProperties={background:ACCENT,color:BG,border:"none",padding:"0.8rem 1.5rem",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit",borderRadius:8,width:"100%",WebkitTapHighlightColor:"transparent"};
  const qBtn:React.CSSProperties={background:"none",border:"none",width:38,height:38,fontSize:20,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",color:TEXT,WebkitTapHighlightColor:"transparent"};
  const sA:React.CSSProperties={display:"flex",alignItems:"center",justifyContent:"center",width:40,height:40,borderRadius:"50%",background:"#161616",textDecoration:"none",border:"1px solid #222"};

  return(
    <div style={{fontFamily:"'Helvetica Neue',Arial,sans-serif",background:BG,minHeight:"100vh",color:TEXT}}>
      <style>{GLOBAL_CSS}</style>

      {/* ══ NAVBAR ═══════════════════════════════════════════════════════ */}
      <nav ref={navRef} style={{position:"fixed",top:0,left:0,right:0,zIndex:200,background:"rgba(8,8,8,0.96)",borderBottom:"1px solid #161616",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 1rem",height:NAV_H,position:"relative"}}>
          <button onClick={()=>setMenuOpen(true)} style={iBtn} aria-label="Menú">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></svg>
          </button>
          <button onClick={()=>setView("fokus")} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:7,position:"absolute",left:"50%",transform:"translateX(-50%)",padding:"0 8px",WebkitTapHighlightColor:"transparent"}} aria-label="Inicio">
            <img src="/favicon.png" alt="Fokus" width={26} height={26} style={{objectFit:"contain"}}/>
            <span style={{color:"#fff",fontSize:16,fontWeight:900,letterSpacing:5}}>FOKUS</span>
          </button>
          <div style={{display:"flex",marginLeft:"auto"}}>
            <button onClick={()=>{const n=!searchOpen;setSearchOpen(n);setSq("");if(n&&view!=="shop"){setView("shop");setFilter("TODO");}}} style={iBtn} aria-label="Buscar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            </button>
            <button onClick={()=>setView("cart")} style={{...iBtn,position:"relative"}} aria-label="Carrito">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
              {totalItems>0&&<span style={{position:"absolute",top:4,right:4,background:"#fff",color:BG,borderRadius:"50%",width:15,height:15,fontSize:8,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",animation:"scaleIn 0.2s ease"}}>{totalItems}</span>}
            </button>
          </div>
        </div>

        {!isAdmin&&(
          <NativeTabs items={NAV_TABS.map(t=>t.id)} active={view}
            onSelect={id=>{setView(id as MainView);if(id==="shop")setFilter("TODO");}}
            height={TABS_H}
            renderItem={(id,ia)=>{
              const l=NAV_TABS.find(t=>t.id===id)?.l??id;
              return<span style={{display:"flex",alignItems:"center",padding:"0 1.4rem",height:"100%",borderBottom:ia?"2px solid #fff":"2px solid transparent",fontSize:10,fontWeight:800,letterSpacing:2.5,color:ia?"#fff":"#444",whiteSpace:"nowrap",transition:"color 0.15s,border-color 0.15s"}}>{l}</span>;
            }}/>
        )}

        {searchOpen&&(
          <div style={{background:"#111",borderTop:`1px solid ${BORDER}`,padding:"0.55rem 1rem",animation:"fadeIn 0.15s ease"}}>
            <input autoFocus value={sq} onChange={e=>setSq(e.target.value)} placeholder="Buscar productos…" style={{...inp,borderRadius:8}}/>
          </div>
        )}
      </nav>

      {/* ══ MENÚ LATERAL ═════════════════════════════════════════════════ */}
      {menuOpen&&(
        <div style={{position:"fixed",inset:0,zIndex:300,display:"flex"}}>
          <div onClick={()=>setMenuOpen(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.8)",animation:"fadeIn 0.2s ease"}}/>
          <div style={{position:"relative",background:"#0e0e0e",width:272,height:"100%",padding:"2rem 1.5rem",overflowY:"auto",display:"flex",flexDirection:"column",animation:"slideInLeft 0.22s cubic-bezier(0.25,0.46,0.45,0.94)",borderRight:"1px solid #1a1a1a"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"2rem"}}>
              <span style={{fontWeight:900,fontSize:11,letterSpacing:3,color:"#555"}}>CATEGORÍAS</span>
              <button onClick={()=>setMenuOpen(false)} style={{...iBtn,padding:4}} aria-label="Cerrar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <button onClick={()=>setLentesOpen(o=>!o)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",background:"none",border:"none",borderBottom:`1px solid ${BORDER}`,padding:"0.85rem 0",textAlign:"left",fontSize:14,cursor:"pointer",fontFamily:"inherit",color:"#d0d0d0",WebkitTapHighlightColor:"transparent"}}>
              <span>Lentes</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" style={{transition:"transform 0.22s",transform:lentesOpen?"rotate(180deg)":"rotate(0deg)"}}><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {lentesOpen&&(
              <div style={{paddingLeft:"1rem",borderBottom:`1px solid ${BORDER}`,animation:"fadeIn 0.15s ease"}}>
                {LENTES_SUBCATS.map(sub=>(
                  <button key={sub} className="sbb" onClick={()=>{setFilter(sub);setMenuOpen(false);setView("shop");}} style={{display:"block",width:"100%",background:"none",border:"none",padding:"0.6rem 0",textAlign:"left",fontSize:13,cursor:"pointer",fontFamily:"inherit",color:"#555",WebkitTapHighlightColor:"transparent"}}>
                    {catLabel(sub)}
                  </button>
                ))}
              </div>
            )}
            {SHOP_CATS.filter(c=>c!=="LENTES").map(cat=>(
              <button key={cat} onClick={()=>{setFilter(cat as ShopFilter);setMenuOpen(false);setView("shop");}} style={{display:"block",width:"100%",background:"none",border:"none",borderBottom:`1px solid ${BORDER}`,padding:"0.85rem 0",textAlign:"left",fontSize:14,cursor:"pointer",fontFamily:"inherit",color:"#d0d0d0",WebkitTapHighlightColor:"transparent"}}>
                {catLabel(cat)}
              </button>
            ))}
            <div style={{marginTop:"auto",paddingTop:"2rem"}}>
              <p style={{fontSize:9,letterSpacing:3,color:"#333",marginBottom:"0.85rem",fontWeight:700}}>SÍGUENOS</p>
              <div style={{display:"flex",gap:"0.6rem"}}>
                {[{h:SOCIAL.whatsapp,i:<IcWA s={16}/>},{h:SOCIAL.instagram,i:<IcIG s={16}/>},{h:SOCIAL.facebook,i:<IcFB s={16}/>},{h:SOCIAL.tiktok,i:<IcTT s={16}/>}].map(({h,i},k)=>(
                  <a key={k} href={h} target="_blank" rel="noreferrer" className="sl" style={sA}>{i}</a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ FOKUS HOME ═══════════════════════════════════════════════════ */}
      {view==="fokus"&&(
        <main style={{paddingTop:navH,background:BG}}>
          <div style={{maxWidth:760,margin:"0 auto",padding:"4rem 1.5rem 0",textAlign:"center",animation:"slideUp 0.5s ease"}}>
            <div style={{marginBottom:"2rem"}}>
              <img src="/favicon.png" alt="Fokus" width={64} height={64} style={{objectFit:"contain",filter:"brightness(1.1)"}}/>
            </div>
            <p style={{fontSize:10,letterSpacing:6,color:"#333",fontWeight:700,marginBottom:"1rem"}}>ACCESORIOS</p>
            <h1 style={{fontSize:40,fontWeight:900,letterSpacing:8,marginBottom:"0.85rem",color:ACCENT,lineHeight:1}}>FOKUS</h1>
            <p style={{fontSize:14,color:"#444",lineHeight:1.7,maxWidth:300,margin:"0 auto 1.5rem"}}>Cada detalle +<br/>Calidad, diseño y actitud.</p>

            {/* ── Banner envíos Venezuela — SOLO en FOKUS ── */}
            <div style={{display:"inline-flex",alignItems:"center",gap:"0.55rem",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:100,padding:"0.5rem 1.25rem",marginBottom:"2rem",animation:"fadeIn 0.6s ease 0.3s both"}}>
              <span style={{fontSize:14}}>🇻🇪</span>
              <span style={{fontSize:10,fontWeight:800,letterSpacing:2,color:"#777"}}>ENVÍOS A TODA VENEZUELA</span>
              <span style={{width:6,height:6,borderRadius:"50%",background:"#4caf50",animation:"pulse 2s infinite",display:"inline-block",flexShrink:0}}/>
            </div>

            <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:"3rem"}}>
              <button onClick={()=>{setView("shop");setFilter("TODO");}}
                style={{...darkBtn,fontSize:11,padding:"1.1rem 2.8rem",letterSpacing:3,borderRadius:3}}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.opacity="0.88"}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.opacity="1"}}>
                VER COLECCIÓN →
              </button>
            </div>
            <div style={{display:"flex",justifyContent:"center",gap:"0.75rem"}}>
              {[{h:SOCIAL.instagram,i:<IcIG s={18}/>},{h:SOCIAL.tiktok,i:<IcTT s={18}/>},{h:SOCIAL.facebook,i:<IcFB s={18}/>}].map(({h,i},k)=>(
                <a key={k} href={h} target="_blank" rel="noreferrer" className="sl" style={sA}>{i}</a>
              ))}
              <a href={SOCIAL.whatsapp} target="_blank" rel="noreferrer" className="sl" style={{...sA,border:"1px solid #1e2e1e",background:"#0e1e0e"}}><IcWA s={18}/></a>
            </div>
          </div>
          <Footer setView={setView} setFilter={setFilter}/>
        </main>
      )}

      {/* ══ TIENDA ═══════════════════════════════════════════════════════ */}
      {isShop&&(
        <main style={{paddingTop:navH,background:BG}}>
          <div style={{position:"sticky",top:stickyTop,zIndex:100,background:"rgba(8,8,8,0.97)",borderBottom:`1px solid ${BORDER}`,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)"}}>
            <NativeTabs
              items={["TODO","LENTES",...SHOP_CATS.filter(c=>c!=="LENTES")]}
              active={filter==="TODO"?"TODO":isLActive?"LENTES":SHOP_CATS.filter(c=>c!=="LENTES").includes(filter as any)?filter:"TODO"}
              onSelect={item=>{if(item==="LENTES"){const n=!lentesOpen;setLentesOpen(n);if(n)setFilter("LENTES");}else{setFilter(item as ShopFilter);setLentesOpen(false);}}}
              height={44}
              renderItem={(item)=>{
                const ia=item==="TODO"?filter==="TODO":item==="LENTES"?isLActive:filter===item;
                return(
                  <span style={{display:"flex",alignItems:"center",gap:4,padding:"0 1rem",height:44,borderBottom:ia?"2px solid #fff":"2px solid transparent",fontSize:10,fontWeight:800,letterSpacing:2,color:ia?"#fff":"#3e3e3e",whiteSpace:"nowrap",transition:"color 0.15s,border-color 0.15s"}}>
                    {item}
                    {item==="LENTES"&&<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{transition:"transform 0.2s",transform:lentesOpen?"rotate(180deg)":"rotate(0deg)"}}><polyline points="6 9 12 15 18 9"/></svg>}
                  </span>
                );
              }}/>
            {lentesOpen&&(
              <div className="sx" style={{background:"#0a0a0a",borderTop:"1px solid #1a1a1a",padding:"0.55rem 1rem",display:"flex",gap:"0.45rem",overflowX:"auto",animation:"fadeIn 0.15s ease"}}>
                {LENTES_SUBCATS.map(sub=>(
                  <button key={sub} onClick={()=>setFilter(sub)} style={{background:filter===sub?"#fff":"transparent",color:filter===sub?BG:"#444",border:`1px solid ${filter===sub?"#fff":"#252525"}`,padding:"0.28rem 0.85rem",borderRadius:20,fontSize:9,fontWeight:800,letterSpacing:1.2,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0,WebkitTapHighlightColor:"transparent",transition:"all 0.15s ease"}}>
                    {catLabel(sub).toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{maxWidth:1200,margin:"0 auto",padding:"1.5rem 1rem 5rem"}}>
            {loading?(
              <div className="pg" style={{display:"grid",gap:"1rem"}}>
                {Array.from({length:8}).map((_,i)=><SkeletonCard key={i}/>)}
              </div>
            ):(
              visCats().map(cat=>{
                const prods=getP(cat);
                if(!prods.length) return null;
                const isLC=(LENTES_SUBCATS as readonly string[]).includes(cat);
                if(isTodo) return(
                  <HorizontalRow key={cat} cat={cat} products={prods} isLenteCat={isLC}
                    onProductClick={p=>{setSel(p);setQty(1);}}
                    onViewAll={()=>{setFilter(cat as ShopFilter);setLentesOpen(isLC);}}/>
                );
                return(
                  <div key={cat} style={{marginBottom:"3rem",animation:"fadeIn 0.3s ease"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",borderBottom:`1px solid ${BORDER}`,paddingBottom:"0.65rem"}}>
                      <h2 style={{fontSize:11,fontWeight:800,letterSpacing:3,margin:0,color:"#555"}}>
                        {isLC?`LENTES · ${catLabel(cat).toUpperCase()}`:catLabel(cat).toUpperCase()}
                      </h2>
                      <button onClick={()=>{setFilter(cat as ShopFilter);setLentesOpen(isLC);}} style={{background:"none",border:"none",fontSize:10,color:"#333",cursor:"pointer",fontFamily:"inherit",WebkitTapHighlightColor:"transparent",letterSpacing:1,fontWeight:700}}>VER TODOS</button>
                    </div>
                    <div className="pg" style={{display:"grid",gap:"1rem"}}>
                      {prods.map((p,i)=><ProductCard key={p.id} product={p} index={i} onClick={()=>{setSel(p);setQty(1);}}/>)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <Footer setView={setView} setFilter={setFilter}/>
        </main>
      )}

      {/* ══ COMUNIDAD ════════════════════════════════════════════════════ */}
      {view==="comunidad"&&(
        <main style={{paddingTop:navH,background:BG}}>
          <div style={{maxWidth:560,margin:"0 auto",padding:"5rem 1.5rem 0",textAlign:"center",animation:"slideUp 0.4s ease"}}>
            <p style={{fontSize:36,marginBottom:"1rem"}}>🤝</p>
            <h2 style={{fontSize:20,fontWeight:900,letterSpacing:3,marginBottom:"1rem",color:ACCENT}}>COMUNIDAD</h2>
            <p style={{color:"#444",fontSize:14,lineHeight:1.8}}>Muy pronto podrás ver contenido, reviews y mucho más de la comunidad Fokus.</p>
            <div style={{display:"flex",justifyContent:"center",gap:"0.75rem",marginTop:"2rem"}}>
              <a href={SOCIAL.instagram} target="_blank" rel="noreferrer" className="sl" style={sA}><IcIG s={18}/></a>
              <a href={SOCIAL.tiktok}    target="_blank" rel="noreferrer" className="sl" style={sA}><IcTT s={18}/></a>
            </div>
          </div>
          <Footer setView={setView} setFilter={setFilter}/>
        </main>
      )}

      {/* ══ CARRITO ══════════════════════════════════════════════════════ */}
      {isCart&&(
        <main style={{paddingTop:navH,background:BG}}>
          <div style={{maxWidth:680,margin:"0 auto",padding:"2rem 1rem 5rem",animation:"fadeIn 0.25s ease"}}>
            <h1 style={{fontSize:11,fontWeight:800,letterSpacing:3,marginBottom:"1.75rem",color:"#444"}}>CARRITO DE COMPRAS</h1>
            {cart.length===0?(
              <div style={{textAlign:"center",padding:"5rem 0",color:"#333",animation:"slideUp 0.4s ease"}}>
                <p style={{marginBottom:"1.5rem",fontSize:14}}>Tu carrito está vacío</p>
                <button onClick={()=>{setView("shop");setFilter("TODO");}} style={{...darkBtn,borderRadius:4,fontSize:11}}>IR A LA TIENDA</button>
              </div>
            ):(
              <>
                {cart.map(item=>(
                  <div key={item.product.id} style={{display:"grid",gridTemplateColumns:"1fr auto auto auto",gap:"0.75rem",padding:"1rem 0",borderBottom:`1px solid ${BORDER}`,alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
                      <button onClick={()=>updQty(item.product.id,-item.qty)} style={{background:"none",border:"none",cursor:"pointer",color:"#333",fontSize:12,padding:0,WebkitTapHighlightColor:"transparent"}} aria-label="Eliminar">✕</button>
                      <img src={optImg(item.product.img,120)} alt={item.product.name} style={{width:52,height:52,objectFit:"cover",borderRadius:6}}/>
                      <span style={{fontSize:13,color:"#bbb"}}>{item.product.name}</span>
                    </div>
                    <span style={{fontSize:13,color:"#555"}}>${item.product.price.toFixed(2)}</span>
                    <div style={{display:"flex",alignItems:"center",border:`1px solid ${BORDER}`,borderRadius:6}}>
                      <button onClick={()=>updQty(item.product.id,-1)} style={qBtn}>−</button>
                      <span style={{padding:"0 0.5rem",fontSize:14,color:TEXT,minWidth:24,textAlign:"center"}}>{item.qty}</span>
                      <button onClick={()=>updQty(item.product.id,1)} style={qBtn}>+</button>
                    </div>
                    <span style={{fontSize:14,fontWeight:800,color:ACCENT}}>${(item.product.price*item.qty).toFixed(2)}</span>
                  </div>
                ))}
                <div style={{display:"flex",gap:"0.6rem",marginTop:"1.25rem",flexWrap:"wrap"}}>
                  <button onClick={()=>setView("shop")} style={{...darkBtn,borderRadius:4,fontSize:10,padding:"0.8rem 1.4rem"}}>← SEGUIR COMPRANDO</button>
                  <button onClick={()=>setCart([])} style={{...darkBtn,background:"transparent",color:"#444",border:`1px solid ${BORDER}`,borderRadius:4,fontSize:10,padding:"0.8rem 1.2rem"}}>Vaciar</button>
                </div>
                <div style={{marginTop:"2rem",background:"#0e0e0e",padding:"1.5rem",borderRadius:12,border:`1px solid ${BORDER}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.6rem",fontSize:13,color:"#555"}}><span>Subtotal</span><span>${totalPrice.toFixed(2)}</span></div>
                  <div style={{borderTop:`1px solid ${BORDER}`,paddingTop:"0.75rem",display:"flex",justifyContent:"space-between",fontSize:18,fontWeight:900,color:ACCENT}}><span>Total</span><span>${totalPrice.toFixed(2)}</span></div>
                  <div style={{marginTop:"1.75rem"}}>
                    <p style={{fontSize:9,fontWeight:800,letterSpacing:2.5,color:"#333",marginBottom:"0.75rem"}}>MÉTODO DE PAGO</p>
                    <div style={{display:"flex",flexDirection:"column",gap:"0.45rem"}}>
                      {PAYMENT_METHODS.map(pm=>(
                        <button key={pm.id} className="pmc" onClick={()=>setPayMethod(pm.id)}
                          style={{display:"flex",alignItems:"center",gap:"0.85rem",background:payMethod===pm.id?"#fff":"#111",color:payMethod===pm.id?BG:TEXT,border:`1px solid ${payMethod===pm.id?"#fff":"#1e1e1e"}`,borderRadius:10,padding:"0.8rem 1rem",textAlign:"left",cursor:"pointer",fontFamily:"inherit",WebkitTapHighlightColor:"transparent",transition:"all 0.15s"}}>
                          <span style={{fontSize:18}}>{pm.icon}</span>
                          <div><p style={{margin:0,fontSize:13,fontWeight:700}}>{pm.name}</p><p style={{margin:0,fontSize:10,opacity:0.5,marginTop:1}}>{pm.detail}</p></div>
                          {payMethod===pm.id&&<span style={{marginLeft:"auto",fontSize:14,fontWeight:700}}>✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                  {payMethod&&(()=>{
                    const pm=PAYMENT_METHODS.find(m=>m.id===payMethod)!;
                    return(
                      <div style={{marginTop:"1rem",background:BG,borderRadius:10,padding:"1rem",border:"1px solid #1a1a1a",animation:"fadeIn 0.2s ease"}}>
                        <p style={{fontSize:9,fontWeight:800,letterSpacing:2,color:"#333",marginBottom:"0.5rem"}}>DATOS — {pm.name.toUpperCase()}</p>
                        <p style={{fontSize:14,color:TEXT,margin:0,fontWeight:600}}>{pm.detail}</p>
                        <p style={{fontSize:11,color:"#444",marginTop:"0.4rem",lineHeight:1.6}}>Realiza el pago y notifícanos por WhatsApp adjuntando el comprobante.</p>
                      </div>
                    );
                  })()}
                  <a href={waMsg()} target="_blank" rel="noreferrer"
                    onClick={e=>{if(!payMethod){e.preventDefault();alert("Por favor selecciona un método de pago primero.");}}}
                    style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"0.75rem",marginTop:"1.25rem",background:"#25D366",color:"#fff",padding:"1rem",fontWeight:900,letterSpacing:2,fontSize:11,textDecoration:"none",borderRadius:10,opacity:payMethod?1:0.35,transition:"opacity 0.2s"}}>
                    <IcWA s={18}/> NOTIFICAR PAGO
                  </a>
                  {!payMethod&&<p style={{textAlign:"center",fontSize:10,color:"#333",marginTop:"0.5rem"}}>Selecciona un método de pago para continuar</p>}
                </div>
              </>
            )}
          </div>
        </main>
      )}

      {/* ══ ADMIN ════════════════════════════════════════════════════════ */}
      {isAdmin&&(
        <main style={{paddingTop:NAV_H,background:"#060606",minHeight:"100vh"}}>
          <div style={{maxWidth:720,margin:"0 auto",padding:"2rem 1rem 4rem"}}>
            {!aLogged&&(
              <div style={{background:"#111",borderRadius:14,padding:"2.5rem 2rem",maxWidth:380,margin:"2rem auto",border:"1px solid #1a1a1a",animation:"slideUp 0.3s ease"}}>
                <h1 style={{color:"#fff",fontSize:20,fontWeight:900,marginBottom:"1.5rem",textAlign:"center",letterSpacing:2}}>ADMIN</h1>
                <div style={{display:"flex",flexDirection:"column",gap:"0.85rem"}}>
                  <input type="email" placeholder="Correo" value={aEmail} onChange={e=>setAEmail(e.target.value)} style={inp}/>
                  <input type="password" placeholder="Contraseña" value={aPwd} onChange={e=>setAPwd(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()} style={inp}/>
                  {aErr&&<p style={{color:"#ff5555",fontSize:12,margin:0,background:"#1e0a0a",padding:"0.6rem 1rem",borderRadius:8}}>{aErr}</p>}
                  <button onClick={doLogin} style={aBtn}>Entrar</button>
                  <button onClick={doLogout} style={{...aBtn,background:"transparent",color:"#333",marginTop:4}}>← Volver</button>
                </div>
              </div>
            )}
            {aLogged&&aSection==="menu"&&(
              <div style={{background:"#111",borderRadius:14,padding:"2.5rem 2rem",maxWidth:380,margin:"2rem auto",border:"1px solid #1a1a1a",animation:"slideUp 0.3s ease"}}>
                <h1 style={{color:"#fff",fontSize:18,fontWeight:900,marginBottom:"0.4rem",textAlign:"center",letterSpacing:2}}>PANEL</h1>
                <p style={{color:"#333",fontSize:12,textAlign:"center",marginBottom:"2rem",letterSpacing:1}}>Selecciona una opción</p>
                <div style={{display:"flex",flexDirection:"column",gap:"0.65rem"}}>
                  <button onClick={()=>setASection("products")} style={aBtn}>📦 Gestionar productos</button>
                  <button onClick={doLogout} style={{...aBtn,background:"transparent",color:"#ff5555",border:"none",marginTop:8}}>Cerrar sesión</button>
                </div>
              </div>
            )}
            {aLogged&&aSection==="products"&&(
              <>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}>
                  <h1 style={{color:"#fff",fontSize:16,fontWeight:900,margin:0,letterSpacing:2}}>{editing?"EDITAR":"PRODUCTOS"}</h1>
                  <button onClick={()=>{setASection("menu");resetForm();}} style={{background:"none",border:"none",color:"#333",cursor:"pointer",fontSize:12,fontFamily:"inherit",WebkitTapHighlightColor:"transparent"}}>← MENÚ</button>
                </div>
                <div ref={formRef} style={{background:"#111",borderRadius:12,padding:"1.5rem",marginBottom:"1.25rem",border:editing?"1px solid #2a2a2a":"1px solid #1a1a1a"}}>
                  <p style={{color:"#333",fontSize:9,fontWeight:800,letterSpacing:2,margin:"0 0 1.25rem"}}>{editing?`EDITANDO: ${editing.name}`:"NUEVO PRODUCTO"}</p>
                  <div style={{display:"flex",flexDirection:"column",gap:"0.8rem"}}>
                    <input placeholder="Nombre *" value={fName} onChange={e=>setFName(e.target.value)} style={inp}/>
                    <textarea placeholder="Descripción" value={fDesc} onChange={e=>setFDesc(e.target.value)} rows={2} style={{...inp,resize:"vertical",lineHeight:1.6}}/>
                    <input placeholder="Precio USD *" type="number" min="0" step="0.01" value={fPrice} onChange={e=>setFPrice(e.target.value)} style={inp}/>
                    <select value={fCat} onChange={e=>setFCat(e.target.value)} style={{...inp,appearance:"auto"}}>
                      <option value="">Categoría *</option>
                      <optgroup label="── LENTES">{LENTES_SUBCATS.map(s=><option key={s} value={s}>{catLabel(s)}</option>)}</optgroup>
                      <optgroup label="── OTROS">{SHOP_CATS.filter(c=>c!=="LENTES").map(c=><option key={c} value={c}>{catLabel(c)}</option>)}</optgroup>
                    </select>
                    <div style={{background:"#0e0e0e",borderRadius:8,padding:"1rem",border:"1px dashed #1e1e1e"}}>
                      <p style={{color:"#333",fontSize:9,letterSpacing:2,margin:"0 0 0.65rem",fontWeight:800}}>IMAGEN{!editing&&" *"}</p>
                      <input ref={fileRef} type="file" accept="image/*" onChange={onFC} style={{display:"none"}} id="fi"/>
                      <label htmlFor="fi" style={{display:"inline-flex",alignItems:"center",gap:"0.45rem",background:"#1a1a1a",color:"#888",padding:"0.55rem 1rem",borderRadius:8,cursor:"pointer",fontSize:12,border:"1px solid #222",fontFamily:"inherit"}}>📷 {fFile?"Cambiar":"Elegir"}</label>
                      {fFile&&<span style={{color:"#444",fontSize:11,marginLeft:"0.65rem"}}>{fFile.name}</span>}
                      {fPrev&&<div style={{marginTop:"0.65rem",width:80,height:80,borderRadius:8,overflow:"hidden",border:"1px solid #222"}}><img src={fPrev} alt="preview" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>}
                    </div>
                    {fErr&&<div style={{color:"#ff5555",fontSize:12,background:"#1e0808",padding:"0.65rem 1rem",borderRadius:8}}>{fErr}</div>}
                    {fOk&&<div style={{color:"#55cc77",fontSize:12,background:"#081e0e",padding:"0.65rem 1rem",borderRadius:8}}>{fOk}</div>}
                    <div style={{display:"flex",gap:"0.65rem",flexWrap:"wrap"}}>
                      <button onClick={submitProd} disabled={fLoad} style={{...aBtn,flex:1,opacity:fLoad?0.4:1,cursor:fLoad?"not-allowed":"pointer"}}>{fLoad?"Subiendo...":(editing?"Guardar":"Agregar")}</button>
                      {editing&&<button onClick={resetForm} style={{...aBtn,flex:"0 0 auto",width:"auto",padding:"0.8rem 1.1rem",background:"transparent",color:"#444",border:"1px solid #1e1e1e"}}>Cancelar</button>}
                    </div>
                  </div>
                </div>
                <div style={{background:"#111",borderRadius:12,padding:"1.5rem",border:"1px solid #1a1a1a"}}>
                  <p style={{color:"#333",fontSize:9,fontWeight:800,letterSpacing:2,margin:"0 0 0.85rem"}}>PRODUCTOS ({aProds.length})</p>
                  <input placeholder="Buscar…" value={aSearch} onChange={e=>setASearch(e.target.value)} style={{...inp,marginBottom:"0.75rem"}}/>
                  <div className="sx" style={{display:"flex",gap:"0.35rem",overflowX:"auto",paddingBottom:"0.75rem",marginBottom:"0.5rem"}}>
                    {["ALL",...usedCats].map(cat=>{
                      const ia=aCatF===cat;
                      const n=cat==="ALL"?products.length:products.filter(p=>p.category===cat).length;
                      return(
                        <button key={cat} className="acp" onClick={()=>setACatF(cat)}
                          style={{background:ia?"#fff":"#161616",color:ia?BG:"#555",border:`1px solid ${ia?"#fff":"#222"}`,padding:"0.3rem 0.7rem",borderRadius:20,fontSize:9,fontWeight:800,letterSpacing:1,fontFamily:"inherit",flexShrink:0,WebkitTapHighlightColor:"transparent",cursor:"pointer",whiteSpace:"nowrap",transition:"all 0.12s"}}>
                          {cat==="ALL"?"TODOS":catLabel(cat).toUpperCase()} · {n}
                        </button>
                      );
                    })}
                  </div>
                  {aCatF==="ALL"?(
                    usedCats.map(cat=>{
                      const cp=products.filter(p=>p.category===cat&&(aSearch===""||p.name.toLowerCase().includes(aSearch.toLowerCase())));
                      if(!cp.length) return null;
                      return(
                        <div key={cat} style={{marginBottom:"1.1rem"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.4rem 0",marginBottom:"0.35rem",borderBottom:"1px solid #1a1a1a"}}>
                            <span style={{fontSize:9,fontWeight:800,letterSpacing:2,color:"#333"}}>{catLabel(cat).toUpperCase()}</span>
                            <span style={{fontSize:9,color:"#2a2a2a",background:"#1a1a1a",padding:"1px 6px",borderRadius:10}}>{cp.length}</span>
                          </div>
                          {cp.map(p=><ARow key={p.id} p={p} editing={editing} onEdit={startEdit} onDel={delProd}/>)}
                        </div>
                      );
                    })
                  ):(
                    <div style={{display:"flex",flexDirection:"column",gap:2}}>
                      {aProds.map(p=><ARow key={p.id} p={p} editing={editing} onEdit={startEdit} onDel={delProd}/>)}
                      {!aProds.length&&<p style={{color:"#333",textAlign:"center",padding:"1.5rem",fontSize:12}}>Sin resultados</p>}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      )}

      {/* ══ MODAL PRODUCTO ══════════════════════════════════════════════ */}
      {sel&&(
        <div onClick={()=>setSel(null)} style={{position:"fixed",inset:0,zIndex:400,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadeIn 0.18s ease"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#111",width:"100%",maxWidth:520,borderRadius:"18px 18px 0 0",padding:"1.5rem 1.5rem 2rem",maxHeight:"92vh",overflowY:"auto",animation:"slideUp 0.28s cubic-bezier(0.25,0.46,0.45,0.94)",border:"1px solid #1e1e1e",borderBottom:"none"}}>
            <div style={{width:36,height:3,background:"#222",borderRadius:2,margin:"0 auto 1rem"}}/>
            <div style={{background:"#0a0a0a",aspectRatio:"4/3",overflow:"hidden",borderRadius:12,marginBottom:"1.1rem"}}>
              <LazyImg src={sel.img} alt={sel.name}/>
            </div>
            <h2 style={{fontSize:18,fontWeight:900,margin:"0 0 0.35rem",color:ACCENT,letterSpacing:0.5}}>{sel.name}</h2>
            {sel.description&&<p style={{fontSize:13,color:"#555",margin:"0 0 0.65rem",lineHeight:1.6}}>{sel.description}</p>}
            <p style={{fontSize:24,fontWeight:900,margin:"0 0 1.5rem",color:ACCENT}}>${sel.price.toFixed(2)}</p>
            <div style={{display:"flex",alignItems:"center",border:`1px solid ${BORDER}`,width:"fit-content",marginBottom:"1rem",borderRadius:8}}>
              <button onClick={()=>setQty(Math.max(1,qty-1))} style={qBtn}>−</button>
              <span style={{padding:"0 1rem",fontSize:16,color:TEXT,fontWeight:700}}>{qty}</span>
              <button onClick={()=>setQty(qty+1)} style={qBtn}>+</button>
            </div>
            <button onClick={()=>addToCart(sel,qty)} style={{...darkBtn,width:"100%",justifyContent:"center",fontSize:12,padding:"1.05rem",borderRadius:10}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.opacity="0.88"}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.opacity="1"}}>
              AGREGAR AL CARRITO
            </button>
          </div>
        </div>
      )}

      {added&&<AddedModal product={added} onClose={()=>setAdded(null)} onGoCart={()=>{setAdded(null);setView("cart");}}/>}
      {!isAdmin&&<DraggableWA/>}
    </div>
  );
}

// ── Admin Product Row ─────────────────────────────────────────────────────────
function ARow({p,editing,onEdit,onDel}:{p:Product;editing:Product|null;onEdit:(p:Product)=>void;onDel:(id:string)=>void;}){
  return(
    <div className="apr" style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.6rem 0.65rem",borderRadius:8,background:editing?.id===p.id?"#1a1a1a":"transparent",transition:"background 0.15s"}}>
      <img src={optImg(p.img,120)} alt={p.name} style={{width:44,height:44,objectFit:"cover",borderRadius:6,flexShrink:0,background:"#1a1a1a"}}/>
      <div style={{flex:1,minWidth:0}}>
        <p style={{color:"#ccc",fontSize:12,fontWeight:700,margin:"0 0 1px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</p>
        <p style={{color:"#333",fontSize:10,margin:0}}>${p.price.toFixed(2)}</p>
      </div>
      <div style={{display:"flex",gap:"0.35rem",flexShrink:0}}>
        <button onClick={()=>onEdit(p)} style={{background:"#1a1a1a",color:"#888",border:"1px solid #222",padding:"0.3rem 0.65rem",borderRadius:6,cursor:"pointer",fontSize:10,fontFamily:"inherit",fontWeight:700,WebkitTapHighlightColor:"transparent"}}>Editar</button>
        <button onClick={()=>onDel(p.id)} style={{background:"none",color:"#cc3333",border:"1px solid #2a1515",padding:"0.3rem 0.65rem",borderRadius:6,cursor:"pointer",fontSize:10,fontFamily:"inherit",WebkitTapHighlightColor:"transparent"}}>✕</button>
      </div>
    </div>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer({setView,setFilter}:{setView:(v:MainView)=>void;setFilter:(f:ShopFilter)=>void;}){
  const sA:React.CSSProperties={display:"flex",alignItems:"center",justifyContent:"center",width:36,height:36,borderRadius:"50%",background:"rgba(255,255,255,0.04)",textDecoration:"none",border:"1px solid rgba(255,255,255,0.07)",flexShrink:0};
  const cats=[{l:"Lentes",c:"LENTES"as ShopFilter},{l:"Relojes",c:"RELOJES"as ShopFilter},{l:"Collares",c:"COLLARES"as ShopFilter},{l:"Pulseras",c:"PULSERAS"as ShopFilter},{l:"Anillos",c:"ANILLOS"as ShopFilter},{l:"Aretes",c:"ARETES"as ShopFilter},{l:"Billeteras",c:"BILLETERAS"as ShopFilter}];
  return(
    <footer style={{background:"#060606",borderTop:"1px solid #111",marginTop:"2rem",padding:"2.5rem 1.5rem 2rem"}}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>
        <div className="fg" style={{display:"grid",gap:"2rem",marginBottom:"2rem"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:"0.65rem"}}>
              <img src="/favicon.png" alt="Fokus" width={20} height={20} style={{objectFit:"contain"}}/>
              <span style={{fontWeight:900,fontSize:12,letterSpacing:5,color:"#fff"}}>FOKUS</span>
            </div>
            <p style={{fontSize:11,color:"#333",lineHeight:1.7,margin:"0 0 0.85rem",maxWidth:180}}>Accesorios con actitud.<br/>Cada detalle importa.</p>
            <div style={{display:"flex",gap:"0.45rem"}}>
              <a href={SOCIAL.instagram} target="_blank" rel="noreferrer" className="sl" style={sA}><IcIG s={14}/></a>
              <a href={SOCIAL.facebook}  target="_blank" rel="noreferrer" className="sl" style={sA}><IcFB s={14}/></a>
              <a href={SOCIAL.tiktok}    target="_blank" rel="noreferrer" className="sl" style={sA}><IcTT s={14}/></a>
              <a href={SOCIAL.whatsapp}  target="_blank" rel="noreferrer" className="sl" style={{...sA,background:"rgba(37,211,102,0.08)",borderColor:"rgba(37,211,102,0.15)"}}><IcWA s={14}/></a>
            </div>
          </div>
          <div>
            <p style={{fontSize:9,fontWeight:800,letterSpacing:3,color:"#2a2a2a",marginBottom:"0.75rem"}}>TIENDA</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.35rem 1rem"}}>
              {cats.map(({l,c})=>(
                <button key={c} className="fcl" onClick={()=>{setFilter(c);setView("shop");typeof window!=="undefined"&&window.scrollTo({top:0,behavior:"smooth"});}} style={{background:"none",border:"none",textAlign:"left",cursor:"pointer",fontFamily:"inherit",fontSize:11,color:"#333",padding:0,WebkitTapHighlightColor:"transparent",transition:"color 0.15s"}}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p style={{fontSize:9,fontWeight:800,letterSpacing:3,color:"#2a2a2a",marginBottom:"0.75rem"}}>CONTACTO</p>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:"0.45rem",background:"#0d1e0d",color:"#4caf50",padding:"0.55rem 0.9rem",borderRadius:8,fontSize:11,fontWeight:700,textDecoration:"none",marginBottom:"0.75rem",border:"1px solid #162516"}}>
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