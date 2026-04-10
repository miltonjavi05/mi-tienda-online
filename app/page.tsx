"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ── Config ──────────────────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:"AIzaSyAyZI3aj5JBfRaIT875ydXeFiaHmtECoXI",
  authDomain:"fokus-16a0c.firebaseapp.com",
  projectId:"fokus-16a0c",
  storageBucket:"fokus-16a0c.firebasestorage.app",
  messagingSenderId:"714751929631",
  appId:"1:714751929631:web:2b0e898ebee51f4c67942a",
};
const CLOUDINARY_CLOUD  = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "drgafle8o";
const CLOUDINARY_PRESET = "fokus_products";
const ADMIN_EMAIL    = process.env.NEXT_PUBLIC_ADMIN_EMAIL    || "miltonjavi05@gmail.com";
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "2844242900";
const WHATSAPP_NUMBER = "584243005733";
const SOCIAL = {
  whatsapp: `https://wa.me/${WHATSAPP_NUMBER}`,
  instagram:"https://www.instagram.com/fokus_accesorios?igsh=eGNiNHZmczUwY3Np",
  facebook: "https://www.facebook.com/share/14d2kQuHQ3y/?mibextid=wwXIfr",
  tiktok:   "https://www.tiktok.com/@fokus_accesorios?_r=1&_t=ZS-95NNWYzuIxV",
};
const PAYMENT_METHODS = [
  {id:"zinli",        icon:"💳",name:"Zinli",                           detail:"miltonjavi05@gmail.com"},
  {id:"binance",      icon:"🟡",name:"Binance Pay",                     detail:"miltonjavi05@gmail.com"},
  {id:"pagomovil_bv", icon:"🏦",name:"Pago Móvil – Banco de Venezuela", detail:"Tlf: 04243005733 · C.I: 28442429"},
  {id:"pagomovil_ba", icon:"🏦",name:"Pago Móvil – Bancamiga",          detail:"Tlf: 04243005733 · C.I: 28442429"},
];
const SHOP_CATS = ["LENTES","RELOJES","COLLARES","PULSERAS","ANILLOS","ARETES","BILLETERAS"] as const;
const LENTES_SUBCATS = ["LENTES·FOTOCROMATICOS","LENTES·ANTI-LUZ-AZUL","LENTES·SOL","LENTES·MOTORIZADOS"] as const;

// ── Types ───────────────────────────────────────────────────────────────────
interface Product { id:string; name:string; category:string; price:number; img:string; description?:string; createdAt?:number; }
interface CartItem { product:Product; qty:number; }
type MainView = "fokus"|"shop"|"comunidad"|"cart"|"admin";
type ShopFilter = typeof SHOP_CATS[number]|typeof LENTES_SUBCATS[number]|"TODO";

// ── Firestore REST ──────────────────────────────────────────────────────────
const fsBase = ()=>`https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`;
type FsVal = {stringValue:string}|{doubleValue:number}|{integerValue:string}|{booleanValue:boolean}|{nullValue:null}|{arrayValue:{values?:FsVal[]}}|{mapValue:{fields?:Record<string,FsVal>}};
function toFs(v:unknown):FsVal{if(v===null||v===undefined)return{nullValue:null};if(typeof v==="string")return{stringValue:v};if(typeof v==="number")return{doubleValue:v};if(typeof v==="boolean")return{booleanValue:v};if(Array.isArray(v))return{arrayValue:{values:v.map(toFs)}};if(typeof v==="object")return{mapValue:{fields:Object.fromEntries(Object.entries(v as Record<string,unknown>).map(([k,val])=>[k,toFs(val)]))}};return{stringValue:String(v)};}
function fromFs(f:FsVal):unknown{if("stringValue" in f)return f.stringValue;if("doubleValue" in f)return f.doubleValue;if("integerValue" in f)return Number(f.integerValue);if("booleanValue" in f)return f.booleanValue;if("nullValue" in f)return null;if("arrayValue" in f)return((f as {arrayValue:{values?:FsVal[]}}).arrayValue.values||[]).map(fromFs);if("mapValue" in f){const fields=(f as {mapValue:{fields?:Record<string,FsVal>}}).mapValue.fields||{};return Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,fromFs(v)]));}return null;}
interface FsDoc{name:string;fields:Record<string,FsVal>;}
function docToProduct(doc:FsDoc):Product{const f=doc.fields||{};return{id:doc.name.split("/").pop() as string,name:fromFs(f.name??{nullValue:null}) as string||"",category:((fromFs(f.category??{nullValue:null}) as string)||"").toUpperCase(),price:fromFs(f.price??{nullValue:null}) as number||0,img:fromFs(f.img??{nullValue:null}) as string||"",description:fromFs(f.description??{nullValue:null}) as string||"",createdAt:fromFs(f.createdAt??{nullValue:null}) as number||0};}
async function fsGetAll():Promise<Product[]>{const r=await fetch(`${fsBase()}/products?pageSize=200`);if(!r.ok)throw new Error(await r.text());const d=await r.json() as{documents?:FsDoc[]};return(d.documents||[]).map(docToProduct);}
async function fsAdd(p:Omit<Product,"id">):Promise<void>{const fields=Object.fromEntries(Object.entries({...p,createdAt:Date.now()}).map(([k,v])=>[k,toFs(v)]));const r=await fetch(`${fsBase()}/products`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fields})});if(!r.ok)throw new Error(await r.text());}
async function fsUpdate(id:string,p:Partial<Omit<Product,"id">>):Promise<void>{const fields=Object.fromEntries(Object.entries(p).map(([k,v])=>[k,toFs(v)]));const mask=Object.keys(p).map(k=>`updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");const r=await fetch(`${fsBase()}/products/${id}?${mask}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({fields})});if(!r.ok)throw new Error(await r.text());}
async function fsDelete(id:string):Promise<void>{await fetch(`${fsBase()}/products/${id}`,{method:"DELETE"});}

// ── Cloudinary ──────────────────────────────────────────────────────────────
async function uploadImg(file:File):Promise<string>{const fd=new FormData();fd.append("file",file);fd.append("upload_preset",CLOUDINARY_PRESET);const r=await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,{method:"POST",body:fd});if(!r.ok)throw new Error("Error subiendo imagen");return((await r.json()) as {secure_url:string}).secure_url;}
function optImg(url:string,w=400):string{if(!url||!url.includes("cloudinary.com"))return url;return url.replace("/upload/",`/upload/w_${w},q_auto,f_webp,dpr_auto/`);}

// ── Demo data ───────────────────────────────────────────────────────────────
const DEMO:Product[]=[
  {id:"d1",name:"Lentes Fotocromaticos",category:"LENTES·FOTOCROMATICOS",price:22,img:"https://images.unsplash.com/photo-1577803645773-f96470509666?w=400&q=80"},
  {id:"d2",name:"Lentes Anti Luz Azul", category:"LENTES·ANTI-LUZ-AZUL", price:18,img:"https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&q=80"},
  {id:"d3",name:"Lentes de Sol",        category:"LENTES·SOL",           price:20,img:"https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&q=80"},
  {id:"d4",name:"Lentes para Motos",    category:"LENTES·MOTORIZADOS",   price:25,img:"https://images.unsplash.com/photo-1473496169904-658ba7574b0d?w=400&q=80"},
  {id:"d5",name:"Megir NF56",           category:"RELOJES",              price:40,img:"https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&q=80"},
  {id:"d6",name:"Navigorce NF65",       category:"RELOJES",              price:40,img:"https://images.unsplash.com/photo-1548171916-c8fd28f7f356?w=400&q=80"},
  {id:"d7",name:"Collar de Cruz",       category:"COLLARES",             price:25,img:"https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80"},
  {id:"d8",name:"Pulsera Trenzada",     category:"PULSERAS",             price:15,img:"https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=400&q=80"},
  {id:"d9",name:"Anillo Liso",          category:"ANILLOS",              price:12,img:"https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&q=80"},
  {id:"d10",name:"Aretes Argolla",      category:"ARETES",               price:10,img:"https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=400&q=80"},
  {id:"d11",name:"Billetera Cuero",     category:"BILLETERAS",           price:30,img:"https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&q=80"},
];

// ── Icons ───────────────────────────────────────────────────────────────────
const IcWA=({s=22,c="#fff"}:{s?:number;c?:string})=>(<svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>);
const IcIG=({s=22,c="#fff"}:{s?:number;c?:string})=>(<svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>);
const IcFB=({s=22,c="#fff"}:{s?:number;c?:string})=>(<svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>);
const IcTT=({s=22,c="#fff"}:{s?:number;c?:string})=>(<svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>);

// ── Constants ───────────────────────────────────────────────────────────────
const NAV_H=56, TABS_H=40;
const C={bg:"#080808",surface:"#0f0f0f",border:"#191919",text:"#e8e8e8",muted:"#4a4a4a",accent:"#fff"};
const S={
  iconBtn:{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:8,WebkitTapHighlightColor:"transparent"} as React.CSSProperties,
  darkBtn:{background:C.accent,color:"#080808",border:"none",padding:"0.9rem 1.8rem",fontSize:11,fontWeight:800,letterSpacing:2.5,cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:"0.5rem",WebkitTapHighlightColor:"transparent"} as React.CSSProperties,
  qtyBtn:{background:"none",border:"none",width:40,height:40,fontSize:20,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",color:C.text,WebkitTapHighlightColor:"transparent"} as React.CSSProperties,
  socialA:{display:"flex",alignItems:"center",justifyContent:"center",width:38,height:38,borderRadius:"50%",background:"#141414",textDecoration:"none",border:"1px solid #1e1e1e"} as React.CSSProperties,
  input:{width:"100%",border:"1px solid #1e1e1e",padding:"0.75rem 1rem",fontSize:14,outline:"none",fontFamily:"inherit",background:"#141414",color:C.text,borderRadius:8,boxSizing:"border-box"} as React.CSSProperties,
  adminBtn:{background:C.accent,color:"#080808",border:"none",padding:"0.8rem 1.5rem",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit",borderRadius:8,width:"100%",WebkitTapHighlightColor:"transparent"} as React.CSSProperties,
};

function catLabel(cat:string):string{const m:Record<string,string>={"LENTES·FOTOCROMATICOS":"Fotocromaticos","LENTES·ANTI-LUZ-AZUL":"Anti Luz Azul","LENTES·SOL":"De Sol","LENTES·MOTORIZADOS":"Para Motos"};return m[cat]??(cat[0]+cat.slice(1).toLowerCase());}

// ── LazyImg ─────────────────────────────────────────────────────────────────
function LazyImg({src,alt,w=400}:{src:string;alt:string;w?:number}){
  const [loaded,setLoaded]=useState(false);
  const [inView,setInView]=useState(false);
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const el=ref.current;if(!el)return;
    const obs=new IntersectionObserver(([e])=>{if(e.isIntersecting){setInView(true);obs.disconnect();}},{rootMargin:"400px"});
    obs.observe(el);return()=>obs.disconnect();
  },[]);
  return(
    <div ref={ref} style={{position:"relative",width:"100%",height:"100%",background:"#111"}}>
      {!loaded&&<div style={{position:"absolute",inset:0,background:"linear-gradient(110deg,#111 25%,#1a1a1a 50%,#111 75%)",backgroundSize:"200% 100%",animation:"sk 1.4s linear infinite"}}/>}
      {inView&&<img src={optImg(src,w)} alt={alt} loading="lazy" decoding="async" onLoad={()=>setLoaded(true)}
        style={{width:"100%",height:"100%",objectFit:"cover",display:"block",opacity:loaded?1:0,transition:"opacity 0.3s"}}/>}
    </div>
  );
}

// ── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonHRow(){
  return(
    <div style={{display:"flex",gap:"0.75rem",padding:"0 1rem",overflowX:"hidden"}}>
      {[0,1].map(i=>(
        <div key={i} style={{flexShrink:0,width:"42vw",maxWidth:175}}>
          <div style={{aspectRatio:"1",borderRadius:12,background:"linear-gradient(110deg,#111 25%,#1a1a1a 50%,#111 75%)",backgroundSize:"200% 100%",animation:"sk 1.4s linear infinite",marginBottom:8}}/>
          <div style={{height:10,borderRadius:4,background:"#141414",width:"70%",marginBottom:5}}/>
          <div style={{height:10,borderRadius:4,background:"#141414",width:"40%"}}/>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  WA BUTTON — free drag, snaps to nearest vertical edge on release
// ══════════════════════════════════════════════════════════════════════════
function DraggableWA(){
  const BTN=52, MARGIN=14;
  const [cx,setCx]=useState(-1);
  const [cy,setCy]=useState(-1);
  const [isSnapped,setIsSnapped]=useState(false);
  const [pressed,setPressed]=useState(false);
  const drag=useRef({active:false,moved:false,ox:0,oy:0,sx:0,sy:0});
  const divRef=useRef<HTMLDivElement>(null);

  // initialize
  useEffect(()=>{
    const x=window.innerWidth-MARGIN-BTN/2;
    const y=window.innerHeight*0.75;
    setCx(x);setCy(y);setIsSnapped(true);
  },[]);

  const getSnapped=(px:number,py:number):{x:number,y:number}=>{
    const W=window.innerWidth,H=window.innerHeight;
    const clampY=Math.max(BTN/2+MARGIN,Math.min(H-BTN/2-MARGIN,py));
    const snapX=px<W/2?BTN/2+MARGIN:W-BTN/2-MARGIN;
    return{x:snapX,y:clampY};
  };

  const onPD=useCallback((e:React.PointerEvent)=>{
    e.currentTarget.setPointerCapture(e.pointerId);
    const d=drag.current;
    d.active=true;d.moved=false;
    d.ox=e.clientX;d.oy=e.clientY;
    d.sx=cx;d.sy=cy;
    setPressed(true);setIsSnapped(false);
  },[cx,cy]);

  const onPM=useCallback((e:React.PointerEvent)=>{
    const d=drag.current;if(!d.active)return;
    const dx=e.clientX-d.ox,dy=e.clientY-d.oy;
    if(!d.moved&&Math.hypot(dx,dy)<5)return;
    d.moved=true;
    const W=window.innerWidth,H=window.innerHeight;
    setCx(Math.max(BTN/2,Math.min(W-BTN/2,d.sx+dx)));
    setCy(Math.max(BTN/2,Math.min(H-BTN/2,d.sy+dy)));
  },[]);

  const onPU=useCallback(()=>{
    const d=drag.current;d.active=false;setPressed(false);
    // snap to nearest edge
    setCx(p=>{setCy(q=>{const s=getSnapped(p,q);setCx(s.x);setCy(s.y);setIsSnapped(true);return s.y;});return p;});
  },[]);

  const onClick=useCallback((e:React.MouseEvent)=>{
    if(drag.current.moved){e.preventDefault();return;}
    window.open(SOCIAL.whatsapp,"_blank","noreferrer");
  },[]);

  if(cx<0)return null;

  return(
    <div ref={divRef}
      onPointerDown={onPD} onPointerMove={onPM} onPointerUp={onPU} onPointerCancel={onPU} onClick={onClick}
      style={{
        position:"fixed",
        left:cx-BTN/2,
        top:cy-BTN/2,
        zIndex:800,
        width:BTN,height:BTN,
        borderRadius:"50%",
        background:pressed?"rgba(255,255,255,0.92)":"rgba(255,255,255,0.13)",
        backdropFilter:"blur(20px)",
        WebkitBackdropFilter:"blur(20px)",
        border:"1px solid rgba(255,255,255,0.2)",
        display:"flex",alignItems:"center",justifyContent:"center",
        cursor:"grab",
        touchAction:"none",
        userSelect:"none",WebkitUserSelect:"none",
        // spring animation ONLY when snapping, instant while dragging
        transition:isSnapped
          ?"left 0.4s cubic-bezier(0.34,1.2,0.64,1),top 0.4s cubic-bezier(0.34,1.2,0.64,1),background 0.18s,box-shadow 0.18s"
          :"background 0.18s",
        boxShadow:pressed?"0 0 0 8px rgba(255,255,255,0.05)":"0 4px 24px rgba(0,0,0,0.55)",
        willChange:"left,top",
      }}>
      <IcWA s={24} c={pressed?"#080808":"#fff"}/>
    </div>
  );
}

// ── NativeTabs ───────────────────────────────────────────────────────────────
function NativeTabs({items,active,onSelect,renderItem,height=44,className=""}:{
  items:string[];active:string;onSelect:(v:string)=>void;
  renderItem:(item:string,isActive:boolean)=>React.ReactNode;
  height?:number;className?:string;
}){
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const el=ref.current?.querySelector(`[data-active="true"]`) as HTMLElement|null;
    el?.scrollIntoView({block:"nearest",inline:"center",behavior:"smooth"});
  },[active]);
  return(
    <div ref={ref} className={`ntabs ${className}`} style={{display:"flex",overflowX:"auto",overflowY:"hidden",height,touchAction:"pan-x",WebkitOverflowScrolling:"touch"}}>
      {items.map(item=>(
        <button key={item} data-active={item===active} onClick={()=>onSelect(item)}
          style={{background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",flexShrink:0,padding:0,WebkitTapHighlightColor:"transparent"}}>
          {renderItem(item,item===active)}
        </button>
      ))}
    </div>
  );
}

// ── Horizontal category row ──────────────────────────────────────────────────
function HCatRow({cat,prods,onProdClick,onViewAll}:{cat:string;prods:Product[];onProdClick:(p:Product)=>void;onViewAll:()=>void;}){
  const isLente=(LENTES_SUBCATS as readonly string[]).includes(cat);
  const label=isLente?`LENTES · ${catLabel(cat).toUpperCase()}`:catLabel(cat).toUpperCase();
  return(
    <div style={{marginBottom:"2.25rem"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0 1rem",marginBottom:"0.75rem"}}>
        <span style={{fontSize:9,fontWeight:800,letterSpacing:2.5,color:"#404040"}}>{label}</span>
        <button onClick={onViewAll} style={{background:"none",border:"none",fontSize:8,letterSpacing:1.5,fontWeight:800,color:"#282828",cursor:"pointer",fontFamily:"inherit",WebkitTapHighlightColor:"transparent",display:"flex",alignItems:"center",gap:3}}>
          VER TODOS <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <div className="hstrip" style={{display:"flex",gap:"0.6rem",overflowX:"auto",padding:"0 1rem 0.5rem",WebkitOverflowScrolling:"touch",touchAction:"pan-x"}}>
        {prods.map((p,i)=>(
          <div key={p.id} className="hcard" onClick={()=>onProdClick(p)}
            style={{flexShrink:0,width:"42vw",maxWidth:172,minWidth:128,cursor:"pointer",animation:`fadeUp 0.38s ease ${Math.min(i*45,180)}ms both`}}>
            <div style={{aspectRatio:"1",borderRadius:11,overflow:"hidden",background:"#111",marginBottom:"0.48rem",position:"relative"}}>
              <div className="hcard-img" style={{width:"100%",height:"100%",transition:"transform 0.55s cubic-bezier(0.25,0.46,0.45,0.94)"}}>
                <LazyImg src={p.img} alt={p.name} w={280}/>
              </div>
            </div>
            <p style={{margin:"0 0 2px",fontSize:11,color:"#999",lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</p>
            <p style={{margin:0,fontSize:13,fontWeight:800,color:"#fff"}}>${p.price.toFixed(2)}</p>
          </div>
        ))}
        {/* see-all card */}
        <div className="see-all-card" onClick={onViewAll}
          style={{flexShrink:0,width:"22vw",maxWidth:90,minWidth:68,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:5,borderRadius:11,border:"1px solid #161616",cursor:"pointer",aspectRatio:"1",transition:"border-color 0.15s"}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#282828" strokeWidth="1.5"><polyline points="9 18 15 12 9 6"/></svg>
          <span style={{fontSize:7,letterSpacing:1.5,color:"#242424",fontWeight:800}}>VER TODOS</span>
        </div>
      </div>
    </div>
  );
}

// ── AddedToCartModal ─────────────────────────────────────────────────────────
function AddedToCartModal({product,onClose,onGoCart}:{product:Product;onClose:()=>void;onGoCart:()=>void;}){
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:700,background:"rgba(0,0,0,0.78)",display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadeIn 0.15s ease"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#111",width:"100%",maxWidth:500,borderRadius:"20px 20px 0 0",padding:"1.25rem 1.25rem 2.25rem",animation:"slideUp 0.3s cubic-bezier(0.34,1.2,0.64,1)",border:"1px solid #1a1a1a",borderBottom:"none"}}>
        <div style={{width:30,height:3,background:"#222",borderRadius:2,margin:"0 auto 1.25rem"}}/>
        <div style={{display:"flex",gap:"0.85rem",alignItems:"center",marginBottom:"1.25rem"}}>
          <div style={{width:54,height:54,borderRadius:10,overflow:"hidden",flexShrink:0}}>
            <img src={optImg(product.img,120)} alt={product.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          </div>
          <div style={{flex:1}}>
            <p style={{margin:"0 0 2px",fontSize:9,color:"#3a3a3a",letterSpacing:2,fontWeight:800}}>AÑADIDO AL CARRITO</p>
            <p style={{margin:"0 0 2px",fontSize:13,color:C.text,fontWeight:700,lineHeight:1.3}}>{product.name}</p>
            <p style={{margin:0,fontSize:12,color:"#484848"}}>${product.price.toFixed(2)}</p>
          </div>
          <div style={{width:28,height:28,borderRadius:"50%",background:"#0a180a",border:"1px solid #162816",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,animation:"scaleIn 0.3s cubic-bezier(0.34,1.4,0.64,1)"}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.6rem"}}>
          <button onClick={onClose} className="sec-btn"
            style={{background:"transparent",color:"#777",border:"1px solid #1e1e1e",padding:"0.9rem 1rem",fontSize:9,fontWeight:800,letterSpacing:1.5,cursor:"pointer",fontFamily:"inherit",borderRadius:12,WebkitTapHighlightColor:"transparent",transition:"all 0.15s"}}>
            SEGUIR
          </button>
          <button onClick={onGoCart}
            style={{background:C.accent,color:"#080808",border:"none",padding:"0.9rem 1rem",fontSize:9,fontWeight:800,letterSpacing:1.5,cursor:"pointer",fontFamily:"inherit",borderRadius:12,WebkitTapHighlightColor:"transparent"}}>
            IR AL CARRITO →
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════════════════════
export default function Home(){
  const [mainView,setMainView]=useState<MainView>("fokus");
  const [shopFilter,setShopFilter]=useState<ShopFilter>("TODO");
  const [lentesOpen,setLentesOpen]=useState(false);
  const [cart,setCart]=useState<CartItem[]>([]);
  const [selProd,setSelProd]=useState<Product|null>(null);
  const [modalQty,setModalQty]=useState(1);
  const [menuOpen,setMenuOpen]=useState(false);
  const [searchOpen,setSearchOpen]=useState(false);
  const [searchQ,setSearchQ]=useState("");
  const [payMethod,setPayMethod]=useState<string|null>(null);
  const [products,setProducts]=useState<Product[]>([]);
  const [loading,setLoading]=useState(true);
  const [fbReady,setFbReady]=useState(false);
  const [addedProd,setAddedProd]=useState<Product|null>(null);

  const navRef=useRef<HTMLElement>(null);
  const [navH,setNavH]=useState(NAV_H+TABS_H+24); // +24 for ticker inside nav
  useEffect(()=>{
    const upd=()=>{if(navRef.current)setNavH(navRef.current.offsetHeight);};
    upd();
    const ro=new ResizeObserver(upd);
    if(navRef.current)ro.observe(navRef.current);
    return()=>ro.disconnect();
  },[mainView,lentesOpen,searchOpen]);

  // Admin
  const [adminLogged,setAdminLogged]=useState(false);
  const [adminEmail,setAdminEmail]=useState("");
  const [adminPwd,setAdminPwd]=useState("");
  const [adminErr,setAdminErr]=useState("");
  const [adminSection,setAdminSection]=useState<"menu"|"products">("menu");
  const [adminCatFilter,setAdminCatFilter]=useState("ALL");
  const [editing,setEditing]=useState<Product|null>(null);
  const [fName,setFName]=useState(""); const [fDesc,setFDesc]=useState(""); const [fPrice,setFPrice]=useState(""); const [fCat,setFCat]=useState("");
  const [fFile,setFFile]=useState<File|null>(null); const [fPreview,setFPreview]=useState(""); const [fLoading,setFLoading]=useState(false);
  const [fError,setFError]=useState(""); const [fSuccess,setFSuccess]=useState(""); const [adminSearch,setAdminSearch]=useState("");
  const fileRef=useRef<HTMLInputElement>(null); const formRef=useRef<HTMLDivElement>(null);

  const loadProducts=useCallback(async()=>{
    setLoading(true);
    try{const d=await fsGetAll();setProducts(d.length>0?d:DEMO);}
    catch{setProducts(DEMO);}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{
    const ready=FIREBASE_CONFIG.projectId!=="TU_PROJECT_ID";
    setFbReady(ready);
    if(ready)loadProducts();else{setProducts(DEMO);setLoading(false);}
    if(typeof window!=="undefined"&&window.location.pathname==="/admin")setMainView("admin");
  },[loadProducts]);

  const isLentesSubcat=useMemo(()=>(LENTES_SUBCATS as readonly string[]).includes(shopFilter),[shopFilter]);
  const isLentesActive=useMemo(()=>shopFilter==="LENTES"||isLentesSubcat,[shopFilter,isLentesSubcat]);

  const getVisibleCats=useCallback(():string[]=>{
    if(shopFilter==="TODO")return[...LENTES_SUBCATS,...SHOP_CATS.filter(c=>c!=="LENTES")];
    if(shopFilter==="LENTES")return[...LENTES_SUBCATS];
    return[shopFilter];
  },[shopFilter]);

  const getProds=useCallback((cat:string)=>products.filter(p=>p.category===cat&&(searchQ===""||p.name.toLowerCase().includes(searchQ.toLowerCase()))),[products,searchQ]);

  const totalItems=useMemo(()=>cart.reduce((s,i)=>s+i.qty,0),[cart]);
  const totalPrice=useMemo(()=>cart.reduce((s,i)=>s+i.product.price*i.qty,0),[cart]);

  const addToCart=useCallback((product:Product,qty:number)=>{
    setCart(prev=>{const ex=prev.find(i=>i.product.id===product.id);return ex?prev.map(i=>i.product.id===product.id?{...i,qty:i.qty+qty}:i):[...prev,{product,qty}];});
    setSelProd(null);setAddedProd(product);
  },[]);

  const updateQty=useCallback((id:string,delta:number)=>setCart(prev=>prev.map(i=>i.product.id===id?{...i,qty:i.qty+delta}:i).filter(i=>i.qty>0)),[]);

  const waMsg=useCallback(()=>{
    const lines=cart.map(i=>`• ${i.product.name} x${i.qty} — $${(i.product.price*i.qty).toFixed(2)}`);
    const pm=PAYMENT_METHODS.find(m=>m.id===payMethod);
    return`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hola! Quiero hacer un pedido:\n\n${lines.join("\n")}\n\nTotal: $${totalPrice.toFixed(2)}${pm?`\n\nMétodo de pago: ${pm.name} (${pm.detail})`:""}  \n\n¡Adjunto comprobante!`)}`;
  },[cart,totalPrice,payMethod]);

  const doLogin=()=>{if(adminEmail===ADMIN_EMAIL&&adminPwd===ADMIN_PASSWORD){setAdminLogged(true);setAdminErr("");setAdminSection("menu");}else setAdminErr("Credenciales incorrectas");};
  const doLogout=()=>{setAdminLogged(false);setAdminEmail("");setAdminPwd("");setMainView("fokus");if(typeof window!=="undefined")window.history.pushState("","","/");};
  const resetForm=()=>{setEditing(null);setFName("");setFDesc("");setFPrice("");setFCat("");setFFile(null);setFPreview("");setFError("");setFSuccess("");if(fileRef.current)fileRef.current.value="";};
  const startEdit=(p:Product)=>{setEditing(p);setFName(p.name);setFDesc(p.description||"");setFPrice(String(p.price));setFCat(p.category);setFPreview(p.img);setFFile(null);setFError("");setFSuccess("");if(fileRef.current)fileRef.current.value="";setTimeout(()=>formRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),50);};
  const onFileChange=(e:React.ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(!file)return;setFFile(file);const r=new FileReader();r.onload=ev=>setFPreview(ev.target?.result as string);r.readAsDataURL(file);};
  const submitProduct=async()=>{
    setFError("");setFSuccess("");
    if(!fName.trim()||!fPrice||!fCat){setFError("Nombre, precio y categoría son obligatorios.");return;}
    if(!editing&&!fFile){setFError("Selecciona una imagen.");return;}
    if(!fbReady){setFError("Firebase no configurado.");return;}
    setFLoading(true);
    try{
      let imgUrl=fPreview;
      if(fFile)imgUrl=await uploadImg(fFile);
      const data={name:fName.trim(),description:fDesc.trim(),price:parseFloat(fPrice),category:fCat.toUpperCase(),img:imgUrl};
      if(editing){await fsUpdate(editing.id,data);setFSuccess("✓ Actualizado");}
      else{await fsAdd(data);setFSuccess("✓ Agregado");}
      await loadProducts();setTimeout(resetForm,1800);
    }catch(err){setFError("Error: "+(err instanceof Error?err.message:"desconocido"));}
    finally{setFLoading(false);}
  };
  const deleteProduct=async(id:string)=>{if(!confirm("¿Eliminar?"))return;await fsDelete(id);await loadProducts();};

  const adminProds=useMemo(()=>{
    let list=products;
    if(adminCatFilter!=="ALL")list=list.filter(p=>p.category===adminCatFilter);
    if(adminSearch!=="")list=list.filter(p=>p.name.toLowerCase().includes(adminSearch.toLowerCase())||p.category.toLowerCase().includes(adminSearch.toLowerCase()));
    return list;
  },[products,adminCatFilter,adminSearch]);
  const usedCats=useMemo(()=>[...new Set(products.map(p=>p.category))].sort(),[products]);

  const isShop=mainView==="shop", isAdmin=mainView==="admin", isCart=mainView==="cart";
  const catTop=navH-1;
  const TABS=[{id:"fokus" as MainView,label:"FOKUS"},{id:"shop" as MainView,label:"TIENDA"},{id:"comunidad" as MainView,label:"COMUNIDAD"}];

  return(
    <div style={{fontFamily:"'Helvetica Neue',Arial,sans-serif",background:C.bg,minHeight:"100vh",color:C.text}}>
      <style>{`
        @keyframes sk{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideL{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:translateX(0)}}
        @keyframes scaleIn{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}
        @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        *{box-sizing:border-box;-webkit-font-smoothing:antialiased;}
        body{background:#080808;overscroll-behavior:none;margin:0}
        .ntabs::-webkit-scrollbar,.hstrip::-webkit-scrollbar,.pills::-webkit-scrollbar{display:none}
        .ntabs,.hstrip,.pills{scrollbar-width:none;-webkit-overflow-scrolling:touch;}
        .hcard:active{transform:scale(0.96)!important}
        .hcard:hover .hcard-img{transform:scale(1.06)!important}
        .see-all-card:hover{border-color:#252525!important}
        .sec-btn:hover{background:#161616!important;color:#ccc!important}
        .social-link:hover{border-color:#252525!important;transform:translateY(-1px)}
        .pay-card:hover{background:#141414!important}
        .footer-link:hover{color:#888!important}
        .admin-row:hover{background:#111!important}
        .admin-pill:hover{opacity:0.72}
      `}</style>

      {/* ══ TICKER STRIP (top of page, outside nav) ══════════════════════ */}
      <div style={{background:"#040404",borderBottom:"1px solid #0e0e0e",height:24,overflow:"hidden",display:"flex",alignItems:"center",position:"sticky",top:0,zIndex:201}}>
        <div style={{display:"flex",animation:"ticker 20s linear infinite",whiteSpace:"nowrap",willChange:"transform"}}>
          {Array.from({length:8}).map((_,i)=>(
            <span key={i} style={{fontSize:8,letterSpacing:2.5,color:"#303030",fontWeight:800,padding:"0 2.5rem"}}>
              ✦ ENVÍOS A TODA VENEZUELA &nbsp; ✦ PAGO SEGURO &nbsp; ✦ ACCESORIOS PREMIUM &nbsp; ✦ ENTREGA RÁPIDA
            </span>
          ))}
        </div>
      </div>

      {/* ══ NAVBAR ═════════════════════════════════════════════════════════ */}
      <nav ref={navRef} style={{position:"sticky",top:24,zIndex:200,background:"rgba(8,8,8,0.97)",borderBottom:"1px solid #131313",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 1rem",height:NAV_H,position:"relative"}}>
          <button onClick={()=>setMenuOpen(true)} style={S.iconBtn} aria-label="Menú">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/>
            </svg>
          </button>
          <button onClick={()=>setMainView("fokus")} aria-label="Inicio"
            style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:7,position:"absolute",left:"50%",transform:"translateX(-50%)",padding:"0 8px",WebkitTapHighlightColor:"transparent"}}>
            <img src="/favicon.png" alt="Fokus" width={24} height={24} style={{objectFit:"contain"}}/>
            <span style={{color:"#fff",fontSize:15,fontWeight:900,letterSpacing:5}}>FOKUS</span>
          </button>
          <div style={{display:"flex",gap:0,marginLeft:"auto"}}>
            <button onClick={()=>{const n=!searchOpen;setSearchOpen(n);setSearchQ("");if(n&&mainView!=="shop"){setMainView("shop");setShopFilter("TODO");}}} style={S.iconBtn}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            </button>
            <button onClick={()=>setMainView("cart")} style={{...S.iconBtn,position:"relative"}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
              </svg>
              {totalItems>0&&<span style={{position:"absolute",top:4,right:4,background:"#fff",color:"#080808",borderRadius:"50%",width:14,height:14,fontSize:7,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",animation:"scaleIn 0.2s ease"}}>{totalItems}</span>}
            </button>
          </div>
        </div>

        {!isAdmin&&(
          <NativeTabs items={TABS.map(t=>t.id)} active={mainView}
            onSelect={(id)=>{setMainView(id as MainView);if(id==="shop")setShopFilter("TODO");}} height={TABS_H}
            renderItem={(id,isA)=>{
              const label=TABS.find(t=>t.id===id)?.label??id;
              return<span style={{display:"flex",alignItems:"center",padding:"0 1.4rem",height:"100%",borderBottom:isA?"2px solid #fff":"2px solid transparent",fontSize:9,fontWeight:800,letterSpacing:2.5,color:isA?"#fff":"#303030",whiteSpace:"nowrap",transition:"color 0.12s,border-color 0.12s"}}>{label}</span>;
            }}/>
        )}

        {searchOpen&&(
          <div style={{background:"#0d0d0d",borderTop:"1px solid #141414",padding:"0.5rem 1rem",animation:"fadeIn 0.15s ease"}}>
            <input autoFocus value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Buscar productos…" style={{...S.input,borderRadius:8}}/>
          </div>
        )}
      </nav>

      {/* ══ SIDE MENU ══════════════════════════════════════════════════════ */}
      {menuOpen&&(
        <div style={{position:"fixed",inset:0,zIndex:300,display:"flex"}}>
          <div onClick={()=>setMenuOpen(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.82)",animation:"fadeIn 0.18s ease"}}/>
          <div style={{position:"relative",background:"#090909",width:265,height:"100%",padding:"2rem 1.5rem",overflowY:"auto",display:"flex",flexDirection:"column",animation:"slideL 0.2s cubic-bezier(0.25,0.46,0.45,0.94)",borderRight:"1px solid #141414"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"2rem"}}>
              <span style={{fontWeight:800,fontSize:8,letterSpacing:3,color:"#303030"}}>CATEGORÍAS</span>
              <button onClick={()=>setMenuOpen(false)} style={{...S.iconBtn,padding:4}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#383838" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <button onClick={()=>setLentesOpen(o=>!o)}
              style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",background:"none",border:"none",borderBottom:"1px solid #141414",padding:"0.85rem 0",fontSize:13,cursor:"pointer",fontFamily:"inherit",color:"#ccc",WebkitTapHighlightColor:"transparent"}}>
              <span>Lentes</span>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#303030" strokeWidth="2" style={{transition:"transform 0.2s",transform:lentesOpen?"rotate(180deg)":"rotate(0deg)"}}><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {lentesOpen&&(
              <div style={{paddingLeft:"1rem",borderBottom:"1px solid #141414",animation:"fadeIn 0.15s ease"}}>
                {LENTES_SUBCATS.map(sub=>(
                  <button key={sub} onClick={()=>{setShopFilter(sub);setMenuOpen(false);setMainView("shop");}}
                    className="footer-link"
                    style={{display:"block",width:"100%",background:"none",border:"none",padding:"0.55rem 0",textAlign:"left",fontSize:12,cursor:"pointer",fontFamily:"inherit",color:"#424242",WebkitTapHighlightColor:"transparent",transition:"color 0.15s"}}>
                    {catLabel(sub)}
                  </button>
                ))}
              </div>
            )}
            {SHOP_CATS.filter(c=>c!=="LENTES").map(cat=>(
              <button key={cat} onClick={()=>{setShopFilter(cat);setMenuOpen(false);setMainView("shop");}}
                style={{display:"block",width:"100%",background:"none",border:"none",borderBottom:"1px solid #141414",padding:"0.85rem 0",textAlign:"left",fontSize:13,cursor:"pointer",fontFamily:"inherit",color:"#ccc",WebkitTapHighlightColor:"transparent"}}>
                {catLabel(cat)}
              </button>
            ))}
            {/* Shipping note */}
            <div style={{margin:"1.5rem 0",padding:"0.75rem",background:"#0a0a0a",borderRadius:8,border:"1px solid #141414"}}>
              <p style={{margin:0,fontSize:9,letterSpacing:1.5,color:"#555",fontWeight:800}}>📦 ENVÍOS A TODA VENEZUELA</p>
            </div>
            <div style={{marginTop:"auto",paddingTop:"1.5rem"}}>
              <p style={{fontSize:7,letterSpacing:3,color:"#1e1e1e",marginBottom:"0.7rem",fontWeight:800}}>SÍGUENOS</p>
              <div style={{display:"flex",gap:"0.45rem"}}>
                {[{href:SOCIAL.whatsapp,ic:<IcWA s={13}/>},{href:SOCIAL.instagram,ic:<IcIG s={13}/>},{href:SOCIAL.facebook,ic:<IcFB s={13}/>},{href:SOCIAL.tiktok,ic:<IcTT s={13}/>}].map(({href,ic},i)=>(
                  <a key={i} href={href} target="_blank" rel="noreferrer" className="social-link" style={S.socialA}>{ic}</a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ HOME ═══════════════════════════════════════════════════════════ */}
      {mainView==="fokus"&&(
        <main style={{background:C.bg}}>
          <div style={{maxWidth:680,margin:"0 auto",padding:"5rem 1.5rem 0",textAlign:"center",animation:"fadeUp 0.45s ease"}}>
            <img src="/favicon.png" alt="Fokus" width={52} height={52} style={{objectFit:"contain",marginBottom:"1.75rem"}}/>
            <p style={{fontSize:8,letterSpacing:5,color:"#242424",fontWeight:800,marginBottom:"0.75rem"}}>ACCESORIOS PREMIUM</p>
            <h1 style={{fontSize:40,fontWeight:900,letterSpacing:8,marginBottom:"0.85rem",color:C.accent,lineHeight:1}}>FOKUS</h1>
            <p style={{fontSize:12,color:"#323232",lineHeight:1.85,maxWidth:240,margin:"0 auto 2.5rem"}}>Cada detalle cuenta.<br/>Calidad, diseño y actitud.</p>
            {/* Shipping badge */}
            <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"#0a0a0a",border:"1px solid #141414",borderRadius:20,padding:"0.38rem 0.95rem",marginBottom:"2.5rem"}}>
              <span style={{fontSize:12}}>📦</span>
              <span style={{fontSize:8,letterSpacing:1.5,color:"#404040",fontWeight:800}}>ENVÍOS A TODA VENEZUELA</span>
            </div>
            <br/>
            <button onClick={()=>{setMainView("shop");setShopFilter("TODO");}}
              style={{...S.darkBtn,fontSize:10,padding:"1.05rem 2.6rem",letterSpacing:3,borderRadius:2}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.opacity="0.82"}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.opacity="1"}}>
              VER COLECCIÓN →
            </button>
            <div style={{display:"flex",justifyContent:"center",gap:"0.55rem",marginTop:"2.5rem"}}>
              {[{href:SOCIAL.instagram,ic:<IcIG s={15}/>},{href:SOCIAL.tiktok,ic:<IcTT s={15}/>},{href:SOCIAL.facebook,ic:<IcFB s={15}/>},{href:SOCIAL.whatsapp,ic:<IcWA s={15}/>}].map(({href,ic},i)=>(
                <a key={i} href={href} target="_blank" rel="noreferrer" className="social-link" style={S.socialA}>{ic}</a>
              ))}
            </div>
          </div>
          <Footer setMainView={setMainView} setShopFilter={setShopFilter}/>
        </main>
      )}

      {/* ══ SHOP ═══════════════════════════════════════════════════════════ */}
      {isShop&&(
        <main style={{background:C.bg}}>
          {/* Sticky filter */}
          <div style={{position:"sticky",top:catTop,zIndex:100,background:"rgba(8,8,8,0.98)",borderBottom:"1px solid #131313",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)"}}>
            <NativeTabs
              items={["TODO","LENTES",...(SHOP_CATS.filter(c=>c!=="LENTES") as string[])]}
              active={shopFilter==="TODO"?"TODO":isLentesActive?"LENTES":(SHOP_CATS.filter(c=>c!=="LENTES") as string[]).includes(shopFilter)?shopFilter:"TODO"}
              onSelect={(item)=>{
                if(item==="LENTES"){const n=!lentesOpen;setLentesOpen(n);if(n)setShopFilter("LENTES");}
                else{setShopFilter(item as ShopFilter);setLentesOpen(false);}
              }}
              height={44}
              renderItem={(item,_)=>{
                const a=item==="TODO"?shopFilter==="TODO":item==="LENTES"?isLentesActive:shopFilter===item;
                return(
                  <span style={{display:"flex",alignItems:"center",gap:3,padding:"0 0.95rem",height:44,borderBottom:a?"2px solid #fff":"2px solid transparent",fontSize:9,fontWeight:800,letterSpacing:1.8,color:a?"#fff":"#2a2a2a",whiteSpace:"nowrap",transition:"color 0.12s,border-color 0.12s"}}>
                    {item}
                    {item==="LENTES"&&<svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{transition:"transform 0.2s",transform:lentesOpen?"rotate(180deg)":"rotate(0deg)"}}><polyline points="6 9 12 15 18 9"/></svg>}
                  </span>
                );
              }}/>
            {lentesOpen&&(
              <div className="ntabs" style={{background:"#060606",borderTop:"1px solid #0e0e0e",padding:"0.45rem 1rem",display:"flex",gap:"0.4rem",overflowX:"auto",WebkitOverflowScrolling:"touch",animation:"fadeIn 0.15s ease"}}>
                {LENTES_SUBCATS.map(sub=>(
                  <button key={sub} onClick={()=>setShopFilter(sub)}
                    style={{background:shopFilter===sub?"#fff":"transparent",color:shopFilter===sub?"#080808":"#303030",border:`1px solid ${shopFilter===sub?"#fff":"#1a1a1a"}`,padding:"0.25rem 0.8rem",borderRadius:20,fontSize:8,fontWeight:800,letterSpacing:1.2,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0,WebkitTapHighlightColor:"transparent",transition:"all 0.12s"}}>
                    {catLabel(sub).toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product rows */}
          <div style={{paddingTop:"1.5rem",paddingBottom:"5rem"}}>
            {loading?(
              [0,1,2].map(i=>(
                <div key={i} style={{marginBottom:"2.25rem"}}>
                  <div style={{display:"flex",justifyContent:"space-between",padding:"0 1rem",marginBottom:"0.75rem"}}>
                    <div style={{width:80,height:7,background:"#141414",borderRadius:4}}/>
                    <div style={{width:48,height:7,background:"#141414",borderRadius:4}}/>
                  </div>
                  <SkeletonHRow/>
                </div>
              ))
            ):(
              getVisibleCats().map(cat=>{
                const prods=getProds(cat);
                if(prods.length===0)return null;
                const isLenteCat=(LENTES_SUBCATS as readonly string[]).includes(cat);
                return(
                  <HCatRow key={cat} cat={cat} prods={prods}
                    onProdClick={(p)=>{setSelProd(p);setModalQty(1);}}
                    onViewAll={()=>{setShopFilter(cat as ShopFilter);setLentesOpen(isLenteCat);}}/>
                );
              })
            )}
          </div>
          <Footer setMainView={setMainView} setShopFilter={setShopFilter}/>
        </main>
      )}

      {/* ══ COMUNIDAD ══════════════════════════════════════════════════════ */}
      {mainView==="comunidad"&&(
        <main style={{background:C.bg}}>
          <div style={{maxWidth:480,margin:"0 auto",padding:"5rem 1.5rem",textAlign:"center",animation:"fadeUp 0.4s ease"}}>
            <h2 style={{fontSize:16,fontWeight:900,letterSpacing:3,marginBottom:"1rem",color:C.accent}}>COMUNIDAD</h2>
            <p style={{color:"#303030",fontSize:12,lineHeight:1.8}}>Muy pronto: contenido, reviews y más de la comunidad Fokus.</p>
            <div style={{display:"flex",justifyContent:"center",gap:"0.55rem",marginTop:"2rem"}}>
              <a href={SOCIAL.instagram} target="_blank" rel="noreferrer" className="social-link" style={S.socialA}><IcIG s={15}/></a>
              <a href={SOCIAL.tiktok} target="_blank" rel="noreferrer" className="social-link" style={S.socialA}><IcTT s={15}/></a>
            </div>
          </div>
          <Footer setMainView={setMainView} setShopFilter={setShopFilter}/>
        </main>
      )}

      {/* ══ CART ═══════════════════════════════════════════════════════════ */}
      {isCart&&(
        <main style={{background:C.bg}}>
          <div style={{maxWidth:620,margin:"0 auto",padding:"2rem 1rem 5rem",animation:"fadeIn 0.2s ease"}}>
            <h1 style={{fontSize:8,fontWeight:800,letterSpacing:3,marginBottom:"1.75rem",color:"#303030"}}>CARRITO</h1>
            {cart.length===0?(
              <div style={{textAlign:"center",padding:"5rem 0",color:"#242424",animation:"fadeUp 0.4s ease"}}>
                <p style={{marginBottom:"1.5rem",fontSize:12}}>Tu carrito está vacío</p>
                <button onClick={()=>{setMainView("shop");setShopFilter("TODO");}} style={{...S.darkBtn,borderRadius:2,fontSize:9}}>IR A LA TIENDA</button>
              </div>
            ):(
              <>
                {cart.map(item=>(
                  <div key={item.product.id} style={{display:"grid",gridTemplateColumns:"1fr auto auto auto",gap:"0.7rem",padding:"1rem 0",borderBottom:"1px solid #111",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"0.65rem"}}>
                      <button onClick={()=>updateQty(item.product.id,-item.qty)} style={{background:"none",border:"none",cursor:"pointer",color:"#242424",fontSize:10,padding:0,WebkitTapHighlightColor:"transparent"}}>✕</button>
                      <img src={optImg(item.product.img,100)} alt={item.product.name} style={{width:46,height:46,objectFit:"cover",borderRadius:6}}/>
                      <span style={{fontSize:11,color:"#999"}}>{item.product.name}</span>
                    </div>
                    <span style={{fontSize:11,color:"#404040"}}>${item.product.price.toFixed(2)}</span>
                    <div style={{display:"flex",alignItems:"center",border:"1px solid #161616",borderRadius:8}}>
                      <button onClick={()=>updateQty(item.product.id,-1)} style={S.qtyBtn}>−</button>
                      <span style={{padding:"0 0.5rem",fontSize:13,color:C.text,fontWeight:700,minWidth:20,textAlign:"center"}}>{item.qty}</span>
                      <button onClick={()=>updateQty(item.product.id,1)} style={S.qtyBtn}>+</button>
                    </div>
                    <span style={{fontSize:12,fontWeight:800,color:C.accent}}>${(item.product.price*item.qty).toFixed(2)}</span>
                  </div>
                ))}
                <div style={{display:"flex",gap:"0.55rem",marginTop:"1.25rem",flexWrap:"wrap"}}>
                  <button onClick={()=>setMainView("shop")} style={{...S.darkBtn,borderRadius:2,fontSize:8,padding:"0.75rem 1.3rem"}}>← SEGUIR COMPRANDO</button>
                  <button onClick={()=>setCart([])} style={{...S.darkBtn,background:"transparent",color:"#303030",border:"1px solid #161616",borderRadius:2,fontSize:8,padding:"0.75rem 1.1rem"}}>Vaciar</button>
                </div>
                <div style={{marginTop:"2rem",background:"#090909",padding:"1.5rem",borderRadius:14,border:"1px solid #111"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.6rem",fontSize:11,color:"#404040"}}><span>Subtotal</span><span>${totalPrice.toFixed(2)}</span></div>
                  <div style={{borderTop:"1px solid #111",paddingTop:"0.75rem",display:"flex",justifyContent:"space-between",fontSize:17,fontWeight:900,color:C.accent}}><span>Total</span><span>${totalPrice.toFixed(2)}</span></div>
                  <div style={{marginTop:"1.75rem"}}>
                    <p style={{fontSize:7,fontWeight:800,letterSpacing:2.5,color:"#242424",marginBottom:"0.65rem"}}>MÉTODO DE PAGO</p>
                    <div style={{display:"flex",flexDirection:"column",gap:"0.4rem"}}>
                      {PAYMENT_METHODS.map(pm=>(
                        <button key={pm.id} className="pay-card"
                          onClick={()=>setPayMethod(pm.id)}
                          style={{display:"flex",alignItems:"center",gap:"0.75rem",background:payMethod===pm.id?"#fff":"#0d0d0d",color:payMethod===pm.id?"#080808":C.text,border:`1px solid ${payMethod===pm.id?"#fff":"#141414"}`,borderRadius:11,padding:"0.75rem 0.9rem",textAlign:"left",cursor:"pointer",fontFamily:"inherit",WebkitTapHighlightColor:"transparent",transition:"all 0.12s"}}>
                          <span style={{fontSize:16}}>{pm.icon}</span>
                          <div><p style={{margin:0,fontSize:11,fontWeight:700}}>{pm.name}</p><p style={{margin:0,fontSize:8,opacity:0.4,marginTop:1}}>{pm.detail}</p></div>
                          {payMethod===pm.id&&<span style={{marginLeft:"auto",fontSize:12,fontWeight:700}}>✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                  {payMethod&&(()=>{
                    const pm=PAYMENT_METHODS.find(m=>m.id===payMethod)!;
                    return(
                      <div style={{marginTop:"0.85rem",background:"#070707",borderRadius:10,padding:"0.9rem",border:"1px solid #111",animation:"fadeIn 0.2s ease"}}>
                        <p style={{fontSize:7,fontWeight:800,letterSpacing:2,color:"#242424",marginBottom:"0.4rem"}}>DATOS — {pm.name.toUpperCase()}</p>
                        <p style={{fontSize:12,color:C.text,margin:0,fontWeight:600}}>{pm.detail}</p>
                        <p style={{fontSize:9,color:"#323232",marginTop:"0.35rem",lineHeight:1.6}}>Realiza el pago y envíanos el comprobante por WhatsApp.</p>
                      </div>
                    );
                  })()}
                  <a href={waMsg()} target="_blank" rel="noreferrer"
                    onClick={(e)=>{if(!payMethod){e.preventDefault();alert("Por favor selecciona un método de pago.");}}}
                    style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"0.6rem",marginTop:"1.1rem",background:"#25D366",color:"#fff",padding:"0.95rem",fontWeight:900,letterSpacing:2,fontSize:9,textDecoration:"none",borderRadius:11,opacity:payMethod?1:0.28,transition:"opacity 0.2s"}}>
                    <IcWA s={16}/> NOTIFICAR PAGO
                  </a>
                  {!payMethod&&<p style={{textAlign:"center",fontSize:8,color:"#222",marginTop:"0.45rem"}}>Selecciona un método de pago para continuar</p>}
                </div>
              </>
            )}
          </div>
        </main>
      )}

      {/* ══ ADMIN ══════════════════════════════════════════════════════════ */}
      {isAdmin&&(
        <main style={{background:"#050505",minHeight:"100vh"}}>
          <div style={{maxWidth:680,margin:"0 auto",padding:"2rem 1rem 4rem"}}>
            {!adminLogged&&(
              <div style={{background:"#0d0d0d",borderRadius:14,padding:"2.5rem 2rem",maxWidth:360,margin:"2rem auto",border:"1px solid #141414",animation:"fadeUp 0.3s ease"}}>
                <h1 style={{color:"#fff",fontSize:16,fontWeight:900,marginBottom:"1.5rem",textAlign:"center",letterSpacing:3}}>ADMIN</h1>
                <div style={{display:"flex",flexDirection:"column",gap:"0.8rem"}}>
                  <input type="email" placeholder="Correo" value={adminEmail} onChange={e=>setAdminEmail(e.target.value)} style={S.input}/>
                  <input type="password" placeholder="Contraseña" value={adminPwd} onChange={e=>setAdminPwd(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()} style={S.input}/>
                  {adminErr&&<p style={{color:"#cc3333",fontSize:11,margin:0,background:"#160808",padding:"0.55rem 0.9rem",borderRadius:7}}>{adminErr}</p>}
                  <button onClick={doLogin} style={S.adminBtn}>Entrar</button>
                  <button onClick={doLogout} style={{...S.adminBtn,background:"transparent",color:"#282828",marginTop:4}}>← Volver</button>
                </div>
              </div>
            )}
            {adminLogged&&adminSection==="menu"&&(
              <div style={{background:"#0d0d0d",borderRadius:14,padding:"2.5rem 2rem",maxWidth:360,margin:"2rem auto",border:"1px solid #141414",animation:"fadeUp 0.3s ease"}}>
                <h1 style={{color:"#fff",fontSize:14,fontWeight:900,marginBottom:"2rem",textAlign:"center",letterSpacing:3}}>PANEL</h1>
                <div style={{display:"flex",flexDirection:"column",gap:"0.65rem"}}>
                  <button onClick={()=>setAdminSection("products")} style={S.adminBtn}>📦 Gestionar productos</button>
                  <button onClick={doLogout} style={{...S.adminBtn,background:"transparent",color:"#cc3333",border:"none",marginTop:8}}>Cerrar sesión</button>
                </div>
              </div>
            )}
            {adminLogged&&adminSection==="products"&&(
              <>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}>
                  <h1 style={{color:"#fff",fontSize:12,fontWeight:900,margin:0,letterSpacing:2}}>{editing?"EDITAR":"PRODUCTOS"}</h1>
                  <button onClick={()=>{setAdminSection("menu");resetForm();}} style={{background:"none",border:"none",color:"#242424",cursor:"pointer",fontSize:10,fontFamily:"inherit",WebkitTapHighlightColor:"transparent",letterSpacing:1}}>← MENÚ</button>
                </div>
                <div ref={formRef} style={{background:"#0d0d0d",borderRadius:12,padding:"1.5rem",marginBottom:"1.1rem",border:editing?"1px solid #1e1e1e":"1px solid #141414"}}>
                  <p style={{color:"#242424",fontSize:7,fontWeight:800,letterSpacing:2,margin:"0 0 1.1rem"}}>{editing?`EDITANDO: ${editing.name}`:"NUEVO PRODUCTO"}</p>
                  <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
                    <input placeholder="Nombre *" value={fName} onChange={e=>setFName(e.target.value)} style={S.input}/>
                    <textarea placeholder="Descripción" value={fDesc} onChange={e=>setFDesc(e.target.value)} rows={2} style={{...S.input,resize:"vertical"}}/>
                    <input placeholder="Precio USD *" type="number" min="0" step="0.01" value={fPrice} onChange={e=>setFPrice(e.target.value)} style={S.input}/>
                    <select value={fCat} onChange={e=>setFCat(e.target.value)} style={{...S.input,appearance:"auto"}}>
                      <option value="">Categoría *</option>
                      <optgroup label="── LENTES">{LENTES_SUBCATS.map(s=><option key={s} value={s}>{catLabel(s)}</option>)}</optgroup>
                      <optgroup label="── OTROS">{SHOP_CATS.filter(c=>c!=="LENTES").map(c=><option key={c} value={c}>{catLabel(c)}</option>)}</optgroup>
                    </select>
                    <div style={{background:"#080808",borderRadius:8,padding:"0.9rem",border:"1px dashed #141414"}}>
                      <p style={{color:"#242424",fontSize:7,letterSpacing:2,margin:"0 0 0.6rem",fontWeight:800}}>IMAGEN {!editing&&"*"}</p>
                      <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} style={{display:"none"}} id="fi"/>
                      <label htmlFor="fi" style={{display:"inline-flex",alignItems:"center",gap:"0.4rem",background:"#131313",color:"#555",padding:"0.45rem 0.85rem",borderRadius:7,cursor:"pointer",fontSize:11,border:"1px solid #1a1a1a",fontFamily:"inherit"}}>
                        📷 {fFile?"Cambiar":"Elegir"}
                      </label>
                      {fFile&&<span style={{color:"#303030",fontSize:9,marginLeft:"0.55rem"}}>{fFile.name}</span>}
                      {fPreview&&<div style={{marginTop:"0.55rem",width:72,height:72,borderRadius:8,overflow:"hidden",border:"1px solid #1a1a1a"}}><img src={fPreview} alt="preview" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>}
                    </div>
                    {fError&&<div style={{color:"#cc3333",fontSize:11,background:"#150808",padding:"0.55rem 0.9rem",borderRadius:7}}>{fError}</div>}
                    {fSuccess&&<div style={{color:"#55cc77",fontSize:11,background:"#081508",padding:"0.55rem 0.9rem",borderRadius:7}}>{fSuccess}</div>}
                    <div style={{display:"flex",gap:"0.55rem",flexWrap:"wrap"}}>
                      <button onClick={submitProduct} disabled={fLoading} style={{...S.adminBtn,flex:1,opacity:fLoading?0.4:1,cursor:fLoading?"not-allowed":"pointer"}}>{fLoading?"Subiendo...":(editing?"Guardar":"Agregar")}</button>
                      {editing&&<button onClick={resetForm} style={{...S.adminBtn,flex:"0 0 auto",width:"auto",padding:"0.8rem 1rem",background:"transparent",color:"#303030",border:"1px solid #1a1a1a"}}>Cancelar</button>}
                    </div>
                  </div>
                </div>
                <div style={{background:"#0d0d0d",borderRadius:12,padding:"1.5rem",border:"1px solid #141414"}}>
                  <p style={{color:"#242424",fontSize:7,fontWeight:800,letterSpacing:2,margin:"0 0 0.75rem"}}>PRODUCTOS ({adminProds.length})</p>
                  <input placeholder="Buscar…" value={adminSearch} onChange={e=>setAdminSearch(e.target.value)} style={{...S.input,marginBottom:"0.65rem"}}/>
                  <div className="pills ntabs" style={{display:"flex",gap:"0.3rem",overflowX:"auto",paddingBottom:"0.65rem",marginBottom:"0.4rem"}}>
                    {["ALL",...usedCats].map(cat=>{
                      const a=adminCatFilter===cat;
                      const count=cat==="ALL"?products.length:products.filter(p=>p.category===cat).length;
                      return(
                        <button key={cat} className="admin-pill" onClick={()=>setAdminCatFilter(cat)}
                          style={{background:a?"#fff":"#131313",color:a?"#080808":"#404040",border:`1px solid ${a?"#fff":"#1a1a1a"}`,padding:"0.25rem 0.65rem",borderRadius:20,fontSize:7,fontWeight:800,letterSpacing:1,fontFamily:"inherit",flexShrink:0,WebkitTapHighlightColor:"transparent",cursor:"pointer",whiteSpace:"nowrap",transition:"all 0.1s"}}>
                          {cat==="ALL"?"TODOS":catLabel(cat).toUpperCase()} · {count}
                        </button>
                      );
                    })}
                  </div>
                  {adminCatFilter==="ALL"?(
                    usedCats.map(cat=>{
                      const cp=products.filter(p=>p.category===cat&&(adminSearch===""||p.name.toLowerCase().includes(adminSearch.toLowerCase())));
                      if(cp.length===0)return null;
                      return(
                        <div key={cat} style={{marginBottom:"0.9rem"}}>
                          <div style={{display:"flex",alignItems:"center",gap:5,padding:"0.3rem 0",marginBottom:"0.25rem",borderBottom:"1px solid #111"}}>
                            <span style={{fontSize:7,fontWeight:800,letterSpacing:2,color:"#242424"}}>{catLabel(cat).toUpperCase()}</span>
                            <span style={{fontSize:7,color:"#181818",background:"#111",padding:"1px 5px",borderRadius:8}}>{cp.length}</span>
                          </div>
                          {cp.map(p=><AdminRow key={p.id} p={p} editing={editing} onEdit={startEdit} onDelete={deleteProduct}/>)}
                        </div>
                      );
                    })
                  ):(
                    <div style={{display:"flex",flexDirection:"column",gap:2}}>
                      {adminProds.map(p=><AdminRow key={p.id} p={p} editing={editing} onEdit={startEdit} onDelete={deleteProduct}/>)}
                      {adminProds.length===0&&<p style={{color:"#222",textAlign:"center",padding:"1.5rem",fontSize:10}}>Sin resultados</p>}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      )}

      {/* ══ PRODUCT MODAL ══════════════════════════════════════════════════ */}
      {selProd&&(
        <div onClick={()=>setSelProd(null)} style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadeIn 0.15s ease"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#0d0d0d",width:"100%",maxWidth:480,borderRadius:"20px 20px 0 0",padding:"1.5rem 1.5rem 2.5rem",maxHeight:"92vh",overflowY:"auto",animation:"slideUp 0.28s cubic-bezier(0.25,0.46,0.45,0.94)",border:"1px solid #141414",borderBottom:"none"}}>
            <div style={{width:28,height:3,background:"#1a1a1a",borderRadius:2,margin:"0 auto 1rem"}}/>
            <div style={{background:"#080808",aspectRatio:"1",overflow:"hidden",marginBottom:"1.1rem",borderRadius:14}}>
              <LazyImg src={selProd.img} alt={selProd.name} w={560}/>
            </div>
            <h2 style={{fontSize:16,fontWeight:900,margin:"0 0 0.3rem",color:C.accent}}>{selProd.name}</h2>
            {selProd.description&&<p style={{fontSize:11,color:"#404040",margin:"0 0 0.65rem",lineHeight:1.6}}>{selProd.description}</p>}
            <p style={{fontSize:21,fontWeight:900,margin:"0 0 1.5rem",color:C.accent}}>${selProd.price.toFixed(2)}</p>
            <div style={{display:"flex",alignItems:"center",border:"1px solid #161616",width:"fit-content",marginBottom:"1rem",borderRadius:10}}>
              <button onClick={()=>setModalQty(Math.max(1,modalQty-1))} style={S.qtyBtn}>−</button>
              <span style={{padding:"0 1rem",fontSize:14,color:C.text,fontWeight:800}}>{modalQty}</span>
              <button onClick={()=>setModalQty(modalQty+1)} style={S.qtyBtn}>+</button>
            </div>
            <button onClick={()=>addToCart(selProd,modalQty)}
              style={{...S.darkBtn,width:"100%",justifyContent:"center",fontSize:10,padding:"1.05rem",borderRadius:12}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.opacity="0.84"}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.opacity="1"}}>
              AGREGAR AL CARRITO
            </button>
          </div>
        </div>
      )}

      {/* ══ POST-CART MODAL ════════════════════════════════════════════════ */}
      {addedProd&&<AddedToCartModal product={addedProd} onClose={()=>setAddedProd(null)} onGoCart={()=>{setAddedProd(null);setMainView("cart");}}/>}

      {/* ══ WA FLOAT BUTTON ════════════════════════════════════════════════ */}
      {!isAdmin&&<DraggableWA/>}
    </div>
  );
}

// ── AdminRow ─────────────────────────────────────────────────────────────────
function AdminRow({p,editing,onEdit,onDelete}:{p:Product;editing:Product|null;onEdit:(p:Product)=>void;onDelete:(id:string)=>void;}){
  return(
    <div className="admin-row" style={{display:"flex",alignItems:"center",gap:"0.6rem",padding:"0.5rem 0.55rem",borderRadius:7,background:editing?.id===p.id?"#111":"transparent",transition:"background 0.1s"}}>
      <img src={optImg(p.img,80)} alt={p.name} style={{width:38,height:38,objectFit:"cover",borderRadius:6,flexShrink:0,background:"#141414"}}/>
      <div style={{flex:1,minWidth:0}}>
        <p style={{color:"#b0b0b0",fontSize:10,fontWeight:700,margin:"0 0 1px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</p>
        <p style={{color:"#282828",fontSize:8,margin:0}}>${p.price.toFixed(2)}</p>
      </div>
      <div style={{display:"flex",gap:"0.3rem",flexShrink:0}}>
        <button onClick={()=>onEdit(p)} style={{background:"#131313",color:"#555",border:"1px solid #1a1a1a",padding:"0.25rem 0.55rem",borderRadius:5,cursor:"pointer",fontSize:8,fontFamily:"inherit",fontWeight:700,WebkitTapHighlightColor:"transparent"}}>Editar</button>
        <button onClick={()=>onDelete(p.id)} style={{background:"none",color:"#773333",border:"1px solid #1e0e0e",padding:"0.25rem 0.55rem",borderRadius:5,cursor:"pointer",fontSize:8,fontFamily:"inherit",WebkitTapHighlightColor:"transparent"}}>✕</button>
      </div>
    </div>
  );
}

// ── Footer ───────────────────────────────────────────────────────────────────
function Footer({setMainView,setShopFilter}:{setMainView:(v:MainView)=>void;setShopFilter:(v:ShopFilter)=>void}){
  const sA:React.CSSProperties={display:"flex",alignItems:"center",justifyContent:"center",width:33,height:33,borderRadius:"50%",background:"rgba(255,255,255,0.03)",textDecoration:"none",border:"1px solid rgba(255,255,255,0.05)",flexShrink:0};
  const cats=[{l:"Lentes",c:"LENTES"},{l:"Relojes",c:"RELOJES"},{l:"Collares",c:"COLLARES"},{l:"Pulseras",c:"PULSERAS"},{l:"Anillos",c:"ANILLOS"},{l:"Aretes",c:"ARETES"},{l:"Billeteras",c:"BILLETERAS"}];
  return(
    <footer style={{background:"#040404",borderTop:"1px solid #0d0d0d",marginTop:"2rem",padding:"2.5rem 1.5rem 2rem"}}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>
        {/* Shipping block */}
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"0.9rem 1.1rem",background:"#080808",border:"1px solid #0e0e0e",borderRadius:12,marginBottom:"2rem"}}>
          <span style={{fontSize:18}}>📦</span>
          <div>
            <p style={{margin:0,fontSize:9,fontWeight:800,letterSpacing:2,color:"#bbb"}}>ENVÍOS A TODA VENEZUELA</p>
            <p style={{margin:0,fontSize:9,color:"#303030",marginTop:2}}>Hacemos envíos a domicilio en todo el territorio nacional</p>
          </div>
        </div>

        <div className="footer-grid" style={{display:"grid",gap:"2rem",marginBottom:"2rem"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:"0.55rem"}}>
              <img src="/favicon.png" alt="Fokus" width={17} height={17} style={{objectFit:"contain"}}/>
              <span style={{fontWeight:900,fontSize:10,letterSpacing:5,color:"#fff"}}>FOKUS</span>
            </div>
            <p style={{fontSize:9,color:"#242424",lineHeight:1.75,margin:"0 0 0.75rem",maxWidth:160}}>Accesorios con actitud.<br/>Cada detalle importa.</p>
            <div style={{display:"flex",gap:"0.35rem"}}>
              {[{href:SOCIAL.instagram,ic:<IcIG s={12}/>},{href:SOCIAL.facebook,ic:<IcFB s={12}/>},{href:SOCIAL.tiktok,ic:<IcTT s={12}/>},{href:SOCIAL.whatsapp,ic:<IcWA s={12}/>}].map(({href,ic},i)=>(
                <a key={i} href={href} target="_blank" rel="noreferrer" className="social-link" style={sA}>{ic}</a>
              ))}
            </div>
          </div>
          <div>
            <p style={{fontSize:7,fontWeight:800,letterSpacing:3,color:"#181818",marginBottom:"0.65rem"}}>TIENDA</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.3rem 0.9rem"}}>
              {cats.map(({l,c})=>(
                <button key={c} className="footer-link" onClick={()=>{setShopFilter(c as ShopFilter);setMainView("shop");typeof window!=="undefined"&&window.scrollTo({top:0,behavior:"smooth"});}}
                  style={{background:"none",border:"none",textAlign:"left",cursor:"pointer",fontFamily:"inherit",fontSize:9,color:"#222",padding:0,WebkitTapHighlightColor:"transparent",transition:"color 0.12s"}}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p style={{fontSize:7,fontWeight:800,letterSpacing:3,color:"#181818",marginBottom:"0.65rem"}}>CONTACTO</p>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer"
              style={{display:"inline-flex",alignItems:"center",gap:"0.4rem",background:"#081208",color:"#3a8a3a",padding:"0.45rem 0.8rem",borderRadius:7,fontSize:9,fontWeight:700,textDecoration:"none",marginBottom:"0.65rem",border:"1px solid #0e1e0e"}}>
              <IcWA s={10} c="#3a8a3a"/> WhatsApp
            </a>
            <p style={{fontSize:8,color:"#1e1e1e",margin:0}}>miltonjavi05@gmail.com</p>
            <p style={{fontSize:8,color:"#1e1e1e",margin:"2px 0 0"}}>+58 424-300-5733</p>
          </div>
        </div>
        <div style={{borderTop:"1px solid #0d0d0d",paddingTop:"1rem",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:"0.35rem"}}>
          <p style={{fontSize:7,color:"#181818",margin:0,letterSpacing:1}}>© {new Date().getFullYear()} FOKUS. TODOS LOS DERECHOS RESERVADOS.</p>
          <p style={{fontSize:7,color:"#111",margin:0,letterSpacing:1}}>FOKUS ®</p>
        </div>
      </div>
      <style>{`
        .footer-link:hover{color:#777!important}
        .social-link:hover{border-color:#1e1e1e!important;transform:translateY(-1px)}
        @media(max-width:480px){.footer-grid{grid-template-columns:1fr!important;gap:1.5rem!important}}
        @media(min-width:481px) and (max-width:767px){.footer-grid{grid-template-columns:repeat(2,1fr)!important}}
        @media(min-width:768px){.footer-grid{grid-template-columns:repeat(3,1fr)!important}}
      `}</style>
    </footer>
  );
}