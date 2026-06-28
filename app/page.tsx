"use client";

import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
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

const META_PIXEL_ID = "840893159040582";

// ─── CACHE CONFIG ─────────────────────────────────────────────────────────────
const PRODUCTS_CACHE_KEY  = "fokus_products_v3";
const PRODUCTS_CACHE_TIME = "fokus_products_time_v3";
const CACHE_TTL_MS        = 2 * 60 * 60 * 1000;

function getCachedProducts(): Product[] | null {
  try {
    const raw  = localStorage.getItem(PRODUCTS_CACHE_KEY);
    const time = localStorage.getItem(PRODUCTS_CACHE_TIME);
    if (!raw || !time) return null;
    if (Date.now() - Number(time) > CACHE_TTL_MS) return null;
    return JSON.parse(raw) as Product[];
  } catch { return null; }
}

function setCachedProducts(products: Product[]): void {
  try {
    localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products));
    localStorage.setItem(PRODUCTS_CACHE_TIME, String(Date.now()));
  } catch { /* storage full — silent */ }
}

function invalidateProductsCache(): void {
  try {
    localStorage.removeItem(PRODUCTS_CACHE_KEY);
    localStorage.removeItem(PRODUCTS_CACHE_TIME);
    sessionStorage.removeItem("fokus_products_v2");
    sessionStorage.removeItem("fokus_products_time_v2");
  } catch { /* silent */ }
}

const SOCIAL = {
  whatsapp:  `https://wa.me/${WHATSAPP_NUMBER}`,
  instagram: "https://www.instagram.com/fokus_accesorios?igsh=eGNiNHZmczUwY3Np",
  facebook:  "https://www.facebook.com/share/14d2kQuHQ3y/?mibextid=wwXIfr",
  tiktok:    "https://www.tiktok.com/@fokus_accesorios?_r=1&_t=ZS-95NNWYzuIxV",
};
const VENEZUELA_STATES = [
  "Amazonas","Anzoátegui","Apure","Aragua","Barinas","Bolívar","Carabobo",
  "Cojedes","Delta Amacuro","Distrito Capital","Falcón","Guárico","Lara",
  "Mérida","Miranda","Monagas","Nueva Esparta","Portuguesa","Sucre","Táchira",
  "Trujillo","Vargas","Yaracuy","Zulia",
];
const PAYMENT_METHODS = [
  { id:"pagomovil_bv", icon:"🏦", name:"Pago Móvil – Banco de Venezuela", detail:"Tlf: 04243005733 · C.I: 28442429" },
  { id:"pagomovil_ba", icon:"🏦", name:"Pago Móvil – Bancamiga",          detail:"Tlf: 04243005733 · C.I: 28442429" },
  { id:"binance",      icon:"🟡", name:"Binance Pay",                     detail:"miltonjavi05@gmail.com" },
  { id:"zinli",        icon:"💳", name:"Zinli",                           detail:"miltonjavi05@gmail.com" },
];
const SHOP_CATS = ["LENTES","RELOJES","COLLARES","PULSERAS","ANILLOS","ARETES","BILLETERAS"] as const;
const LENTES_SUBCATS = ["LENTES·FOTOCROMATICOS","LENTES·ANTI-LUZ-AZUL","LENTES·SOL","LENTES·MOTORIZADOS"] as const;
const ALL_SHOP_CATS = ["LENTES",...LENTES_SUBCATS,"RELOJES","COLLARES","PULSERAS","ANILLOS","ARETES","BILLETERAS"] as const;
const DELIVERY_ZONES = [
  { id:"naguanagua", label:"Naguanagua (Gratis)", price:0 },
  { id:"valencia",   label:"Valencia (3$)",       price:0 },
  { id:"otro",       label:"Otro Estado",         price:0 },
];
const SHIPPING_AGENCIES = ["MRW","Tealca","Zoom","Menssajero"];
const COMMUNITY_POSTS = [
  { id:"c1", img:"/community/photo_1.jpg", caption:"Variedad de aretes enviados a cliente en Caracas ✨", tag:"ARETES",   location:"Caracas"   },
  { id:"c2", img:"/community/photo_2.jpg", caption:"Collar Enviado a Barinas 🖤",                         tag:"COLLARES", location:"Barinas"   },
  { id:"c3", img:"/community/photo_3.jpg", caption:"Collar enviado a Caracas 🖤🖤",                        tag:"COLLARES", location:"Caracas"   },
  { id:"c4", img:"/community/photo_4.jpg", caption:"Clienta Satisfecha 🖤 ya con su collar",              tag:"RESEÑA",   location:"Venezuela" },
  { id:"c5", img:"/community/photo_5.jpg", caption:"Le encantaron sus pulseras 🖤",                       tag:"PULSERAS", location:"Venezuela" },
  { id:"c6", img:"/community/photo_6.jpg", caption:"Satisfacción total 🖤",                               tag:"RESEÑA",   location:"Venezuela" },
];
const DELIVERY_ZONES_MAP = new Map(DELIVERY_ZONES.map(z=>[z.id,z]));

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface DeliveryInfo { zone:string; nombre:string; cedula:string; telefono:string; agencia:string; direccion:string; estado:string; }
interface Product { id:string; name:string; category:string; price:number; img:string; description?:string; createdAt?:number; order?:number; }
interface CartItem { product:Product; qty:number; }
interface UserData { uid:string; email:string; displayName:string; createdAt:number; photoURL?:string; idToken?:string; }
interface OrderSnapshot { items:CartItem[]; total:number; payMethod:string; deliveryInfo:DeliveryInfo; comprobanteUrl:string; waUrl:string; orderId:string; }

type MainView = "fokus"|"shop"|"comunidad"|"grabados"|"cart"|"admin"|"account"|"thankyou";
type ShopFilter = typeof ALL_SHOP_CATS[number]|"TODO"|typeof LENTES_SUBCATS[number];

// ─── META PIXEL ───────────────────────────────────────────────────────────────
function genEventId(): string {
  return `fks_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
}
async function sha256(value: string): Promise<string> {
  if (typeof window === "undefined") return "";
  try {
    const normalized = value.trim().toLowerCase();
    const msgBuffer = new TextEncoder().encode(normalized);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  } catch { return ""; }
}
function initMetaPixel(): void {
  if (typeof window === "undefined") return;
  if ((window as any).fbq) return;
  (function(f:any,b:any,e:any,v:any,n?:any,t?:any,s?:any){
    if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
    t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)
  })(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  (window as any).fbq('init', META_PIXEL_ID);
  (window as any).fbq('track', 'PageView');
}
function fbqTrack(event: string, params?: Record<string, unknown>, options?: { eventID?: string }): void {
  if (typeof window === "undefined") return;
  if (!(window as any).fbq) return;
  if (options?.eventID) {
    (window as any).fbq('track', event, params || {}, { eventID: options.eventID });
  } else {
    (window as any).fbq('track', event, params || {});
  }
}
async function sendCAPI(eventName: string, eventId: string, data: { value?: number; currency?: string; content_ids?: string[]; content_name?: string; content_type?: string; num_items?: number; }, userData?: { email?: string; phone?: string }): Promise<void> {
  try {
    const [hashedEmail, hashedPhone] = await Promise.all([
      userData?.email ? sha256(userData.email) : Promise.resolve(""),
      userData?.phone ? sha256(userData.phone) : Promise.resolve(""),
    ]);
    const payload = {
      event_name: eventName, event_id: eventId,
      event_time: Math.floor(Date.now() / 1000),
      event_source_url: typeof window !== "undefined" ? window.location.href : "",
      action_source: "website",
      user_data: {
        ...(hashedEmail && { em: hashedEmail }),
        ...(hashedPhone && { ph: hashedPhone }),
        client_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        fbp: getCookie("_fbp"), fbc: getCookie("_fbc") || getFbcFromUrl(),
      },
      custom_data: { ...data, currency: data.currency || "USD" },
    };
    await fetch("/api/meta-capi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  } catch { /* silent */ }
}
function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : "";
}
function getFbcFromUrl(): string {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  const fbclid = params.get("fbclid");
  if (!fbclid) return "";
  return `fb.1.${Date.now()}.${fbclid}`;
}
async function trackViewContent(product: Product, userEmail?: string): Promise<void> {
  const eventId = genEventId();
  fbqTrack("ViewContent", { content_ids:[product.id], content_name:product.name, content_type:"product", value:product.price, currency:"USD" }, { eventID: eventId });
  await sendCAPI("ViewContent", eventId, { value:product.price, currency:"USD", content_ids:[product.id], content_name:product.name, content_type:"product" }, { email: userEmail });
}
async function trackAddToCart(product: Product, qty: number, userEmail?: string): Promise<void> {
  const eventId = genEventId();
  fbqTrack("AddToCart", { content_ids:[product.id], content_name:product.name, content_type:"product", value:product.price*qty, currency:"USD" }, { eventID: eventId });
  await sendCAPI("AddToCart", eventId, { value:product.price*qty, currency:"USD", content_ids:[product.id], content_name:product.name, content_type:"product" }, { email: userEmail });
}
async function trackInitiateCheckout(items: CartItem[], total: number, userEmail?: string): Promise<void> {
  const eventId = genEventId();
  fbqTrack("InitiateCheckout", { content_ids:items.map(i=>i.product.id), num_items:items.reduce((s,i)=>s+i.qty,0), value:total, currency:"USD" }, { eventID: eventId });
  await sendCAPI("InitiateCheckout", eventId, { value:total, currency:"USD", content_ids:items.map(i=>i.product.id), num_items:items.reduce((s,i)=>s+i.qty,0) }, { email: userEmail });
}
async function trackPurchase(orderId: string, total: number, items: CartItem[], userEmail?: string, userPhone?: string): Promise<void> {
  const eventId = genEventId();
  const roundedTotal = parseFloat(total.toFixed(2));
  const contents = items.map(i=>({ id: i.product.id, quantity: i.qty, item_price: parseFloat(i.product.price.toFixed(2)) }));
  const contentIds = items.map(i=>i.product.id);
  const numItems = items.reduce((s,i)=>s+i.qty,0);
  fbqTrack("Purchase", {
    value: roundedTotal,
    currency: "USD",
    order_id: orderId,
    content_ids: contentIds,
    content_type: "product",
    num_items: numItems,
    contents: contents,
  }, { eventID: eventId });
  await sendCAPI("Purchase", eventId, {
    value: roundedTotal,
    currency: "USD",
    content_ids: contentIds,
    content_type: "product",
    num_items: numItems,
  }, { email: userEmail, phone: userPhone });
}

// ─── FIREBASE REST ────────────────────────────────────────────────────────────
const fsBase=()=>`https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`;
const AUTH_BASE=`https://identitytoolkit.googleapis.com/v1/accounts`;
type FsVal=|{stringValue:string}|{doubleValue:number}|{integerValue:string}|{booleanValue:boolean}|{nullValue:null}|{arrayValue:{values?:FsVal[]}}|{mapValue:{fields?:Record<string,FsVal>}};
function toFs(v:unknown):FsVal{if(v===null||v===undefined)return{nullValue:null};if(typeof v==="string")return{stringValue:v};if(typeof v==="number")return{doubleValue:v};if(typeof v==="boolean")return{booleanValue:v};if(Array.isArray(v))return{arrayValue:{values:v.map(toFs)}};if(typeof v==="object")return{mapValue:{fields:Object.fromEntries(Object.entries(v as Record<string,unknown>).map(([k,val])=>[k,toFs(val)]))}};return{stringValue:String(v)};}
function fromFs(f:FsVal):unknown{if("stringValue" in f)return f.stringValue;if("doubleValue" in f)return f.doubleValue;if("integerValue" in f)return Number(f.integerValue);if("booleanValue" in f)return f.booleanValue;if("nullValue" in f)return null;if("arrayValue" in f)return((f as{arrayValue:{values?:FsVal[]}}).arrayValue.values||[]).map(fromFs);if("mapValue" in f){const fields=(f as{mapValue:{fields?:Record<string,FsVal>}}).mapValue.fields||{};return Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,fromFs(v)]));}return null;}
interface FsDoc{name:string;fields:Record<string,FsVal>;}
function docToProduct(doc:FsDoc):Product{const f=doc.fields||{};return{id:doc.name.split("/").pop() as string,name:fromFs(f.name??{nullValue:null}) as string||"",category:((fromFs(f.category??{nullValue:null}) as string)||"").toUpperCase(),price:fromFs(f.price??{nullValue:null}) as number||0,img:fromFs(f.img??{nullValue:null}) as string||"",description:fromFs(f.description??{nullValue:null}) as string||"",createdAt:fromFs(f.createdAt??{nullValue:null}) as number||0,order:fromFs(f.order??{nullValue:null}) as number||0};}
async function fsGetAll():Promise<Product[]>{const r=await fetch(`${fsBase()}/products?pageSize=300`);if(!r.ok)throw new Error(await r.text());const d=await r.json() as{documents?:FsDoc[]};return(d.documents||[]).map(docToProduct);}
async function fsAdd(p:Omit<Product,"id">):Promise<void>{const fields=Object.fromEntries(Object.entries({...p,createdAt:Date.now()}).map(([k,v])=>[k,toFs(v)]));const r=await fetch(`${fsBase()}/products`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fields})});if(!r.ok)throw new Error(await r.text());}
async function fsUpdate(id:string,p:Partial<Omit<Product,"id">>):Promise<void>{const fields=Object.fromEntries(Object.entries(p).map(([k,v])=>[k,toFs(v)]));const mask=Object.keys(p).map(k=>`updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");const r=await fetch(`${fsBase()}/products/${id}?${mask}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({fields})});if(!r.ok)throw new Error(await r.text());}
async function fsDelete(id:string):Promise<void>{await fetch(`${fsBase()}/products/${id}`,{method:"DELETE"});}
async function fsSaveUser(uid:string,data:Record<string,unknown>,idToken?:string):Promise<void>{const fields=Object.fromEntries(Object.entries(data).map(([k,v])=>[k,toFs(v as unknown)]));const mask=Object.keys(data).map(k=>`updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");const headers:Record<string,string>={"Content-Type":"application/json"};if(idToken)headers["Authorization"]=`Bearer ${idToken}`;await fetch(`${fsBase()}/users/${uid}?${mask}`,{method:"PATCH",headers,body:JSON.stringify({fields})}).catch(()=>{});}
async function refreshIdToken(refreshToken:string):Promise<{idToken:string;localId:string}|null>{try{const r=await fetch(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE_CONFIG.apiKey}`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:`grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`});const d=await r.json() as{id_token?:string;user_id?:string};if(!r.ok||!d.id_token)return null;return{idToken:d.id_token,localId:d.user_id!};}catch{return null;}}
async function authSignUp(email:string,password:string,displayName:string):Promise<{idToken:string;localId:string;refreshToken:string}>{const r=await fetch(`${AUTH_BASE}:signUp?key=${FIREBASE_CONFIG.apiKey}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password,returnSecureToken:true})});const d=await r.json() as{idToken?:string;localId?:string;refreshToken?:string;error?:{message:string}};if(!r.ok||d.error)throw new Error(d.error?.message||"Error al registrar");await fetch(`${AUTH_BASE}:update?key=${FIREBASE_CONFIG.apiKey}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({idToken:d.idToken,displayName,returnSecureToken:false})});return{idToken:d.idToken!,localId:d.localId!,refreshToken:d.refreshToken!};}
async function authSignIn(email:string,password:string):Promise<{idToken:string;localId:string;displayName:string;refreshToken:string}>{const r=await fetch(`${AUTH_BASE}:signInWithPassword?key=${FIREBASE_CONFIG.apiKey}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password,returnSecureToken:true})});const d=await r.json() as{idToken?:string;localId?:string;displayName?:string;refreshToken?:string;error?:{message:string}};if(!r.ok||d.error)throw new Error(d.error?.message||"Error al iniciar sesión");return{idToken:d.idToken!,localId:d.localId!,displayName:d.displayName||"",refreshToken:d.refreshToken!};}
async function fsGetUser(uid:string):Promise<{photoURL:string}>{try{const r=await fetch(`${fsBase()}/users/${uid}`);if(!r.ok)return{photoURL:""};const d=await r.json() as FsDoc;return{photoURL:(fromFs(d.fields?.photoURL??{nullValue:null}) as string)||""};}catch{return{photoURL:""};}}
async function uploadImg(file:File,preset=CLOUDINARY_PRESET):Promise<string>{const fd=new FormData();fd.append("file",file);fd.append("upload_preset",preset);const r=await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,{method:"POST",body:fd});if(!r.ok)throw new Error("Error subiendo imagen");return((await r.json()) as{secure_url:string}).secure_url;}
function optImg(url:string,w=400):string{if(!url||!url.includes("cloudinary.com"))return url;return url.replace("/upload/",`/upload/w_${w},q_auto,f_webp,dpr_auto/`);}

const DEMO:Product[]=[
  {id:"d1",name:"Lentes Fotocromaticos",category:"LENTES·FOTOCROMATICOS",price:22,img:"https://images.unsplash.com/photo-1577803645773-f96470509666?w=400&q=80",order:0},
  {id:"d2",name:"Lentes Anti Luz Azul",category:"LENTES·ANTI-LUZ-AZUL",price:18,img:"https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&q=80",order:1},
  {id:"d3",name:"Lentes de Sol",category:"LENTES·SOL",price:20,img:"https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&q=80",order:2},
  {id:"d4",name:"Lentes para Motos",category:"LENTES·MOTORIZADOS",price:25,img:"https://images.unsplash.com/photo-1473496169904-658ba7574b0d?w=400&q=80",order:3},
  {id:"d5",name:"Megir NF56",category:"RELOJES",price:40,img:"https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&q=80",order:4},
  {id:"d6",name:"Navigorce NF65",category:"RELOJES",price:40,img:"https://images.unsplash.com/photo-1548171916-c8fd28f7f356?w=400&q=80",order:5},
  {id:"d7",name:"Collar de Cruz",category:"COLLARES",price:25,img:"https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80",order:6},
  {id:"d8",name:"Pulsera Trenzada",category:"PULSERAS",price:15,img:"https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=400&q=80",order:7},
  {id:"d9",name:"Anillo Liso",category:"ANILLOS",price:12,img:"https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&q=80",order:8},
  {id:"d10",name:"Aretes Argolla",category:"ARETES",price:10,img:"https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=400&q=80",order:9},
  {id:"d11",name:"Billetera Cuero",category:"BILLETERAS",price:30,img:"https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&q=80",order:10},
];

const NAV_H=56,TABS_H=40;
const C={bg:"#080808",border:"#1e1e1e",text:"#ececec",accent:"#fff"};
const S={
  iconBtn:{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:8,WebkitTapHighlightColor:"transparent"} as React.CSSProperties,
  darkBtn:{background:C.accent,color:"#080808",border:"none",padding:"0.9rem 1.6rem",fontSize:12,fontWeight:800,letterSpacing:2,cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:"0.5rem",WebkitTapHighlightColor:"transparent",transition:"opacity 0.15s"} as React.CSSProperties,
  qtyBtn:{background:"none",border:"none",width:38,height:38,fontSize:20,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",color:C.text,WebkitTapHighlightColor:"transparent"} as React.CSSProperties,
  socialA:{display:"flex",alignItems:"center",justifyContent:"center",width:40,height:40,borderRadius:"50%",background:"#161616",textDecoration:"none",border:"1px solid #222"} as React.CSSProperties,
  input:{width:"100%",border:`1px solid ${C.border}`,padding:"0.75rem 1rem",fontSize:16,outline:"none",fontFamily:"inherit",background:"#161616",color:C.text,borderRadius:8,boxSizing:"border-box"} as React.CSSProperties,
  adminBtn:{background:C.accent,color:"#080808",border:"none",padding:"0.8rem 1.5rem",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit",borderRadius:8,width:"100%",WebkitTapHighlightColor:"transparent"} as React.CSSProperties,
};

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  html { overflow-y: scroll; scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
  body { background: #080808; margin: 0; overscroll-behavior-y: contain; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  input, select, textarea { font-size: 16px !important; }
  button, a { -webkit-tap-highlight-color: transparent; }
  img { -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; }
  .ts::-webkit-scrollbar, .hr::-webkit-scrollbar { display: none; }
  .ts { -webkit-overflow-scrolling: touch; contain: layout style; }
  .hr { -webkit-overflow-scrolling: touch; scroll-behavior: smooth; }
  .hr * { -webkit-user-select: none; user-select: none; }
  .admin-list { -webkit-user-select: none; user-select: none; }
  select { -webkit-appearance: auto; appearance: auto; }
  .avatar-ring { position: relative; display: inline-flex; align-items: center; justify-content: center; }
  .avatar-ring::after { content:''; position:absolute; inset:-3px; border-radius:50%; border:2px solid rgba(255,255,255,0.15); pointer-events:none; }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes slideUp { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideInLeft { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
  @keyframes scaleIn { from{opacity:0;transform:scale(0.88)} to{opacity:1;transform:scale(1)} }
  @keyframes pulseRing { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(1.5);opacity:0} }
  @keyframes spin { to{transform:rotate(360deg)} }
  @keyframes tyCheck { from{stroke-dashoffset:40} to{stroke-dashoffset:0} }
  @keyframes badgeShimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

  /* ── ADMIN CAT SCROLL — rueda de mouse en desktop ── */
  .admin-cat-scroll {
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
  }
  .admin-cat-scroll::-webkit-scrollbar { height: 3px; }
  .admin-cat-scroll::-webkit-scrollbar-track { background: transparent; }
  .admin-cat-scroll::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
  @media(hover:hover) and (pointer:fine){
    .admin-cat-scroll::-webkit-scrollbar { height: 4px; }
    .admin-cat-scroll::-webkit-scrollbar-thumb { background: #333; }
  }

  @media(hover:hover) and (pointer:fine){
    .pc:hover .iz { transform: scale(1.05) !important; }
    .pc:hover .io { background: rgba(255,255,255,0.04) !important; }
    .hc:hover .iz { transform: scale(1.05) !important; }
    .hc:hover .io { background: rgba(255,255,255,0.04) !important; }
    .sl:hover { border-color:#333 !important; transform:translateY(-1px); }
    .pc2:hover { background:#1a1a1a !important; }
    .ar:hover { background:#161616 !important; }
    .fl:hover { color:#fff !important; }
    .pl:hover { opacity:0.8; }
    .cc:hover { transform:translateY(-4px) scale(1.01) !important; border-color:#2a2a2a !important; box-shadow:0 12px 40px rgba(0,0,0,0.6) !important; }
    .hr-arrow { opacity: 0 !important; pointer-events: none !important; }
    .hr-wrap:hover .hr-arrow.hr-arrow-visible { opacity: 1 !important; pointer-events: auto !important; }
  }

  @media(hover:none){
    .hr-arrow { display: none !important; }
  }

  .cc { transition: transform 0.25s ease, border-color 0.2s ease, box-shadow 0.25s ease; }
  .pc:active { transform: scale(0.97); }
  .hc:active { opacity: 0.85; }
  .nb:active { opacity: 0.6; }

  @media(hover:hover) and (pointer:fine){
    .iz { transition: transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94) !important; }
    .io { transition: background 0.3s ease !important; }
  }
  @media(hover:none){
    .iz { transition: none !important; }
    .io { transition: none !important; }
  }

  @media(max-width:480px){
    .pg { grid-template-columns: repeat(2,1fr) !important; }
    .fg { grid-template-columns: 1fr !important; gap: 1.5rem !important; }
    .cg { grid-template-columns: repeat(2,1fr) !important; }
  }
  @media(min-width:481px) and (max-width:767px){
    .pg { grid-template-columns: repeat(auto-fill,minmax(150px,1fr)) !important; }
    .fg { grid-template-columns: repeat(2,1fr) !important; gap: 1.5rem !important; }
    .cg { grid-template-columns: repeat(3,1fr) !important; }
  }
  @media(min-width:768px){
    .pg { grid-template-columns: repeat(auto-fill,minmax(195px,1fr)) !important; }
    .fg { grid-template-columns: repeat(3,1fr) !important; }
    .cg { grid-template-columns: repeat(3,1fr) !important; }
  }
`;

// ─── SVG ICONS ────────────────────────────────────────────────────────────────
const IcWA=memo(({s=22,c="#fff"}:{s?:number;c?:string})=>(<svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>));IcWA.displayName="IcWA";
const IcIG=memo(({s=22,c="#fff"}:{s?:number;c?:string})=>(<svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>));IcIG.displayName="IcIG";
const IcFB=memo(({s=22,c="#fff"}:{s?:number;c?:string})=>(<svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>));IcFB.displayName="IcFB";
const IcTT=memo(({s=22,c="#fff"}:{s?:number;c?:string})=>(<svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>));IcTT.displayName="IcTT";
const IcTruck=memo(({s=20,c="#fff"}:{s?:number;c?:string})=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>));IcTruck.displayName="IcTruck";
const IcUser=memo(({s=20,c="#fff"}:{s?:number;c?:string})=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>));IcUser.displayName="IcUser";
const IcEye=memo(({s=18,c="#555"}:{s?:number;c?:string})=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>));IcEye.displayName="IcEye";
const IcEyeOff=memo(({s=18,c="#555"}:{s?:number;c?:string})=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>));IcEyeOff.displayName="IcEyeOff";
const IcCamera=memo(({s=16,c="#fff"}:{s?:number;c?:string})=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>));IcCamera.displayName="IcCamera";
const IcEdit=memo(({s=16,c="#fff"}:{s?:number;c?:string})=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>));IcEdit.displayName="IcEdit";
const IcCheck=memo(({s=16,c="#fff"}:{s?:number;c?:string})=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>));IcCheck.displayName="IcCheck";
const IcUpload=memo(({s=18,c="#fff"}:{s?:number;c?:string})=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>));IcUpload.displayName="IcUpload";

function catLabel(cat:string):string{const m:Record<string,string>={"LENTES·FOTOCROMATICOS":"Fotocromaticos","LENTES·ANTI-LUZ-AZUL":"Anti Luz Azul","LENTES·SOL":"De Sol","LENTES·MOTORIZADOS":"Para Motos"};return m[cat]??(cat[0]+cat.slice(1).toLowerCase());}
function scrollTop(){window.scrollTo({top:0,behavior:"instant" as ScrollBehavior});}
function buildConsultUrl(product:Product):string{const msg=`Hola! Quiero más información sobre este producto:\n\n*${product.name}*\nPrecio: $${product.price.toFixed(2)}\n\n¿Podrían ayudarme?`;return`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;}

function PwdInput({value,onChange,placeholder,onKeyDown,autoComplete}:{value:string;onChange:(v:string)=>void;placeholder:string;onKeyDown?:(e:React.KeyboardEvent)=>void;autoComplete?:string;}){
  const[show,setShow]=useState(false);
  return(<div style={{position:"relative",display:"flex",alignItems:"center"}}><input type={show?"text":"password"} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)} onKeyDown={onKeyDown} autoComplete={autoComplete} style={{...S.input,paddingRight:"2.8rem"}}/><button type="button" onClick={()=>setShow(s=>!s)} style={{position:"absolute",right:10,background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",padding:4,WebkitTapHighlightColor:"transparent"}} tabIndex={-1}>{show?<IcEyeOff s={18} c="#666"/>:<IcEye s={18} c="#666"/>}</button></div>);
}

// ─── LAZY IMAGE ───────────────────────────────────────────────────────────────
const LazyImg=memo(function LazyImg({src,alt}:{src:string;alt:string}){
  const[loaded,setLoaded]=useState(false);
  const[inView,setInView]=useState(false);
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const el=ref.current;if(!el)return;
    const obs=new IntersectionObserver(([e])=>{if(e.isIntersecting){setInView(true);obs.disconnect();}},{rootMargin:"800px"});
    obs.observe(el);return()=>obs.disconnect();
  },[]);
  return(
    <div ref={ref} style={{position:"relative",width:"100%",height:"100%",pointerEvents:"none"}}>
      {!loaded&&<div style={{position:"absolute",inset:0,background:"#161616"}}/>}
      {inView&&<img
        src={optImg(src,400)}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={()=>setLoaded(true)}
        style={{
          width:"100%",height:"100%",objectFit:"cover",display:"block",
          opacity:loaded?1:0,
          transition:"opacity 0.2s ease",
          pointerEvents:"none",
          userSelect:"none",
          WebkitUserSelect:"none",
          WebkitTouchCallout:"none",
          touchAction:"auto",
        } as React.CSSProperties}
        draggable={false}
      />}
    </div>
  );
});

function SkeletonCard(){return(<div><div style={{aspectRatio:"1",background:"#141414",marginBottom:"0.6rem",borderRadius:10,overflow:"hidden",position:"relative"}}><div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,#141414 0%,#1e1e1e 50%,#141414 100%)",backgroundSize:"200% 100%",animation:"shimmer 1.4s infinite"}}/></div><div style={{height:11,background:"#141414",borderRadius:4,marginBottom:6,width:"70%"}}/><div style={{height:11,background:"#141414",borderRadius:4,width:"35%"}}/></div>);}

// ─── DRAGGABLE WA BUTTON ──────────────────────────────────────────────────────
function DraggableWA(){
  const BTN=48,MG=14;
  const[ready,setReady]=useState(false);
  const[pos,setPos]=useState({x:0,y:0});
  const[pressed,setPressed]=useState(false);
  const[snapping,setSnapping]=useState(false);
  const dragging=useRef(false),moved=useRef(false),startPtr=useRef({x:0,y:0}),startPos=useRef({x:0,y:0}),live=useRef({x:0,y:0}),raf=useRef(0);
  const clamp=useCallback((x:number,y:number)=>({x:Math.max(MG,Math.min(window.innerWidth-BTN-MG,x)),y:Math.max(MG+80,Math.min(window.innerHeight-BTN-MG*2,y))}),[]);
  const snapToEdge=useCallback((x:number,y:number)=>{const cx=x+BTN/2;const side=cx<window.innerWidth/2?MG:window.innerWidth-BTN-MG;return{x:side,y:clamp(x,y).y};},[clamp]);
  useEffect(()=>{const p={x:window.innerWidth-BTN-MG,y:Math.round(window.innerHeight*0.78-BTN/2)};live.current=p;setPos(p);setReady(true);const onResize=()=>{if(!dragging.current){const np=snapToEdge(live.current.x,live.current.y);live.current=np;setPos({...np});}};window.addEventListener("resize",onResize,{passive:true});return()=>{window.removeEventListener("resize",onResize);};},[snapToEdge]);
  const onDown=useCallback((e:React.PointerEvent)=>{e.preventDefault();(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);dragging.current=true;moved.current=false;startPtr.current={x:e.clientX,y:e.clientY};startPos.current={...live.current};setPressed(true);setSnapping(false);},[]);
  const onMove=useCallback((e:React.PointerEvent)=>{if(!dragging.current)return;e.preventDefault();const dx=e.clientX-startPtr.current.x,dy=e.clientY-startPtr.current.y;if(Math.abs(dx)>4||Math.abs(dy)>4)moved.current=true;const n=clamp(startPos.current.x+dx,startPos.current.y+dy);live.current=n;cancelAnimationFrame(raf.current);raf.current=requestAnimationFrame(()=>setPos({...n}));},[clamp]);
  const finishDrag=useCallback(()=>{if(!dragging.current)return;dragging.current=false;setPressed(false);if(moved.current){const s=snapToEdge(live.current.x,live.current.y);live.current=s;setSnapping(true);setPos({...s});setTimeout(()=>setSnapping(false),420);}},[snapToEdge]);
  const onClick=useCallback((e:React.MouseEvent)=>{if(moved.current){e.preventDefault();return;}window.open(SOCIAL.whatsapp,"_blank","noreferrer");},[]);
  return(<div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={finishDrag} onPointerCancel={finishDrag} onClick={onClick} style={{position:"fixed",left:pos.x,top:pos.y,zIndex:500,width:BTN,height:BTN,borderRadius:"50%",background:pressed?"rgba(255,255,255,0.22)":"rgba(255,255,255,0.10)",backdropFilter:"blur(18px)",WebkitBackdropFilter:"blur(18px)",border:"1px solid rgba(255,255,255,0.20)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"grab",touchAction:"none",userSelect:"none",WebkitUserSelect:"none",visibility:ready?"visible":"hidden",transition:snapping?"left 0.38s cubic-bezier(0.25,0.46,0.45,0.94), top 0.38s cubic-bezier(0.25,0.46,0.45,0.94), background 0.2s":"background 0.2s",willChange:"left,top",boxShadow:pressed?"0 0 0 10px rgba(255,255,255,0.06)":"0 4px 24px rgba(0,0,0,0.6), 0 1px 4px rgba(0,0,0,0.4)"}}><IcWA s={BTN-14} c={pressed?"#080808":"#fff"}/></div>);
}

// ─── NATIVE TABS ──────────────────────────────────────────────────────────────
const NativeTabs=memo(function NativeTabs({items,active,onSelect,renderItem,height=44}:{items:string[];active:string;onSelect:(v:string)=>void;renderItem:(item:string,isActive:boolean)=>React.ReactNode;height?:number;}){
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{const el=ref.current?.querySelector(`[data-active="true"]`) as HTMLElement|null;if(el)el.scrollIntoView({block:"nearest",inline:"center",behavior:"smooth"});},[active]);
  return(<div ref={ref} className="ts" style={{display:"flex",overflowX:"auto",overflowY:"hidden",scrollbarWidth:"none",WebkitOverflowScrolling:"touch",height,touchAction:"pan-x"}}>{items.map(item=>(<button key={item} data-active={item===active} onClick={()=>onSelect(item)} style={{background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",flexShrink:0,padding:0,display:"flex",alignItems:"center",WebkitTapHighlightColor:"transparent"}}>{renderItem(item,item===active)}</button>))}</div>);
});

// ─── PRODUCT CARD (GRID) ──────────────────────────────────────────────────────
const ProductCard=memo(function ProductCard({product,onClick,onBuyNow,fmtPrice}:{product:Product;onClick:()=>void;onBuyNow:()=>void;index:number;fmtPrice:(n:number)=>string}){
  return(
    <div className="pc" style={{WebkitTapHighlightColor:"transparent",touchAction:"manipulation",position:"relative"}}>
      <div onClick={onClick} style={{background:"#111",aspectRatio:"1",overflow:"hidden",borderRadius:10,position:"relative",marginBottom:"0.55rem"}}>
        <div className="iz" style={{width:"100%",height:"100%"}}><LazyImg src={product.img} alt={product.name}/></div>
        <div className="io" style={{position:"absolute",inset:0,background:"rgba(0,0,0,0)",pointerEvents:"none"}}/>
      </div>
      <div onClick={onClick} style={{marginBottom:"0.6rem"}}>
        <p style={{margin:"0 0 3px",fontSize:12,lineHeight:1.35,color:"#bbb",letterSpacing:0.2}}>{product.name}</p>
        <p style={{margin:0,fontSize:14,fontWeight:800,color:C.accent,letterSpacing:0.5}}>{fmtPrice(product.price)}</p>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:"0.35rem"}}>
        <button onClick={e=>{e.stopPropagation();onBuyNow();}} style={{background:"linear-gradient(180deg,#ffffff 0%,#ededed 100%)",color:"#080808",border:"none",padding:"9px 0",fontSize:9,fontWeight:900,letterSpacing:1.5,cursor:"pointer",fontFamily:"inherit",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",gap:4,WebkitTapHighlightColor:"transparent",width:"100%",boxShadow:"0 3px 12px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.6)"}}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          COMPRAR AHORA
        </button>
        <div style={{display:"flex",gap:"0.4rem"}}>
          <button onClick={e=>{e.stopPropagation();onClick();}} style={{background:"rgba(255,255,255,0.03)",color:"#999",border:"1px solid rgba(255,255,255,0.14)",padding:"7px 0",fontSize:9,fontWeight:700,letterSpacing:1,cursor:"pointer",fontFamily:"inherit",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",gap:4,WebkitTapHighlightColor:"transparent",flex:2}}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            + CARRITO
          </button>
          <button onClick={e=>{e.stopPropagation();window.open(buildConsultUrl(product),"_blank","noreferrer");}} aria-label="Finalizar pedido por WhatsApp" title="Finalizar pedido por WhatsApp" style={{position:"relative",overflow:"hidden",background:"linear-gradient(150deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.05) 55%, rgba(255,255,255,0.16) 100%)",border:"1px solid rgba(255,255,255,0.3)",padding:"6px 2px",cursor:"pointer",fontFamily:"inherit",borderRadius:7,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,WebkitTapHighlightColor:"transparent",flex:1,backdropFilter:"blur(6px)",WebkitBackdropFilter:"blur(6px)",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.35), 0 2px 10px rgba(0,0,0,0.4)"}}>
            <span style={{position:"absolute",top:0,left:"-40%",width:"35%",height:"100%",background:"linear-gradient(115deg,transparent,rgba(255,255,255,0.45),transparent)",transform:"skewX(-18deg)",pointerEvents:"none"}}/>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            <span style={{position:"relative",fontSize:6.5,fontWeight:800,letterSpacing:0.2,lineHeight:1.05,color:"#fff",textAlign:"center"}}>FINALIZAR<br/>PEDIDO</span>
          </button>
        </div>
      </div>
    </div>
  );
});

// ─── HORIZONTAL CARD ─────────────────────────────────────────────────────────
const HCard=memo(function HCard({product,onClick,onBuyNow,fmtPrice}:{product:Product;onClick:()=>void;onBuyNow:()=>void;fmtPrice:(n:number)=>string}){
  return(
    <div className="hc" style={{flexShrink:0,width:152,WebkitTapHighlightColor:"transparent",touchAction:"manipulation"}}>
      <div onClick={onClick} style={{background:"#111",width:152,height:152,overflow:"hidden",marginBottom:"0.55rem",borderRadius:10,position:"relative",cursor:"pointer"}}>
        <div className="iz" style={{width:"100%",height:"100%"}}><LazyImg src={product.img} alt={product.name}/></div>
        <div className="io" style={{position:"absolute",inset:0,background:"rgba(0,0,0,0)",pointerEvents:"none"}}/>
      </div>
      <div onClick={onClick} style={{marginBottom:"0.5rem",cursor:"pointer"}}>
        <p style={{margin:"0 0 2px",fontSize:11,lineHeight:1.35,color:"#bbb",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{product.name}</p>
        <p style={{margin:0,fontSize:13,fontWeight:800,color:C.accent}}>{fmtPrice(product.price)}</p>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:"0.3rem"}}>
        <button
          onClick={e=>{e.stopPropagation();onBuyNow();}}
          style={{background:"linear-gradient(180deg,#ffffff 0%,#ededed 100%)",color:"#080808",border:"none",padding:"7px 0",fontSize:8,fontWeight:900,letterSpacing:1,cursor:"pointer",fontFamily:"inherit",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",gap:3,WebkitTapHighlightColor:"transparent",width:"100%",boxShadow:"0 3px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.6)"}}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          COMPRAR
        </button>
        <div style={{display:"flex",gap:"0.3rem"}}>
          <button
            onClick={e=>{e.stopPropagation();onClick();}}
            style={{background:"rgba(255,255,255,0.03)",color:"#777",border:"1px solid rgba(255,255,255,0.12)",padding:"6px 0",fontSize:8,fontWeight:700,letterSpacing:0.8,cursor:"pointer",fontFamily:"inherit",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",gap:3,WebkitTapHighlightColor:"transparent",flex:2}}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            + CARRITO
          </button>
          <button
            onClick={e=>{e.stopPropagation();window.open(buildConsultUrl(product),"_blank","noreferrer");}}
            aria-label="Finalizar pedido por WhatsApp" title="Finalizar pedido por WhatsApp"
            style={{position:"relative",overflow:"hidden",background:"linear-gradient(150deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.05) 55%, rgba(255,255,255,0.16) 100%)",border:"1px solid rgba(255,255,255,0.3)",padding:"5px 1px",cursor:"pointer",fontFamily:"inherit",borderRadius:7,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1,WebkitTapHighlightColor:"transparent",flex:1,backdropFilter:"blur(6px)",WebkitBackdropFilter:"blur(6px)",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.35), 0 2px 8px rgba(0,0,0,0.4)"}}
          >
            <span style={{position:"absolute",top:0,left:"-40%",width:"35%",height:"100%",background:"linear-gradient(115deg,transparent,rgba(255,255,255,0.45),transparent)",transform:"skewX(-18deg)",pointerEvents:"none"}}/>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            <span style={{position:"relative",fontSize:5.5,fontWeight:800,letterSpacing:0.1,lineHeight:1,color:"#fff",textAlign:"center"}}>FINALIZAR<br/>PEDIDO</span>
          </button>
        </div>
      </div>
    </div>
  );
});