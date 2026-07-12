"use client";

import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { usePathname } from "next/navigation";

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
if (typeof document !== "undefined") {
  document.addEventListener("click", (e:MouseEvent) => {
    const el = (e.target as HTMLElement).closest?.("a[href*='wa.me']");
    if (el && !el.getAttribute("data-fokus-tracked")) {
      // @ts-ignore
      trackLeadWhatsApp("meta_wa_plugin");
    }
  }, true);
}

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
  whatsapp:  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hola! Vi su tienda Fokus y quiero más información 🖤")}`,
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
  { id:"pagomovil_bv", icon:"🏦", name:"Pago Móvil – Banco de Venezuela", bank:"Banco de Venezuela", ci:"C.I: 28442429", phone:"Tlf: 04243005733", detail:"Tlf: 04243005733 · C.I: 28442429" },
  { id:"pagomovil_ba", icon:"🏦", name:"Pago Móvil – Bancamiga",          bank:"Bancamiga",          ci:"C.I: 28442429", phone:"Tlf: 04243005733", detail:"Tlf: 04243005733 · C.I: 28442429" },
  { id:"binance",      icon:"🟡", name:"Binance Pay",                     detail:"miltonjavi05@gmail.com" },
  { id:"zinli",        icon:"💳", name:"Zinli",                           detail:"miltonjavi05@gmail.com" },
];
const SHOP_CATS = ["LENTES","RELOJES","COLLARES","PULSERAS","ANILLOS","ARETES","BILLETERAS"] as const;
const LENTES_SUBCATS = ["LENTES·ANTI-LUZ-AZUL","LENTES·FOTOCROMATICOS","LENTES·SOL","LENTES·MOTORIZADOS"] as const;
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
interface Product { id:string; name:string; category:string; price:number; img:string; description?:string; createdAt?:number; order?:number; active?:boolean; discount?:number; images?:string[]; code?:string; bestseller?:boolean; }
interface CartItem { product:Product; qty:number; }
interface UserData { uid:string; email:string; displayName:string; createdAt:number; photoURL?:string; idToken?:string; }
interface Coupon { id:string; code:string; type:"general"|"product"|"category"; productId?:string; productName?:string; category?:string; discountPercent:number; durationHours:number; createdAt:number; expiresAt:number; active:boolean; }
interface OrderSnapshot { items:CartItem[]; total:number; payMethod:string; deliveryInfo:DeliveryInfo; comprobanteUrl:string; waUrl:string; orderId:string; couponCode?:string; couponDiscount?:number; }

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
function normalizeVEPhone(phone: string): string {
  let digits = phone.trim().replace(/[^0-9]/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (!digits.startsWith("58")) digits = "58" + digits;
  return digits;
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
async function sendCAPI(eventName: string, eventId: string, data: { value?: number; currency?: string; content_ids?: string[]; content_name?: string; content_type?: string; num_items?: number; }, userData?: { email?: string; phone?: string; state?: string }, actionSource: string = "website"): Promise<void> {
  try {
    const normalizeState=(s:string)=>s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z]/g,"");
    const [hashedEmail, hashedPhone, hashedState] = await Promise.all([
      userData?.email ? sha256(userData.email) : Promise.resolve(""),
      userData?.phone ? sha256(userData.phone) : Promise.resolve(""),
      userData?.state ? sha256(normalizeState(userData.state)) : Promise.resolve(""),
    ]);
    const payload = {
      event_name: eventName, event_id: eventId,
      event_time: Math.floor(Date.now() / 1000),
      event_source_url: actionSource === "website" && typeof window !== "undefined" ? window.location.href : undefined,
      action_source: actionSource,
      user_data: {
        ...(hashedEmail && { em: hashedEmail }),
        ...(hashedPhone && { ph: hashedPhone }),
        ...(hashedState && { st: hashedState }),
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
  const val=getFinalPrice(product);
  fbqTrack("ViewContent", { content_ids:[product.id], content_name:product.name, content_type:"product", value:val, currency:"USD" }, { eventID: eventId });
  await sendCAPI("ViewContent", eventId, { value:val, currency:"USD", content_ids:[product.id], content_name:product.name, content_type:"product" }, { email: userEmail });
}
async function trackAddToCart(product: Product, qty: number, userEmail?: string): Promise<void> {
  const eventId = genEventId();
  const val=getFinalPrice(product)*qty;
  fbqTrack("AddToCart", { content_ids:[product.id], content_name:product.name, content_type:"product", value:val, currency:"USD" }, { eventID: eventId });
  await sendCAPI("AddToCart", eventId, { value:val, currency:"USD", content_ids:[product.id], content_name:product.name, content_type:"product" }, { email: userEmail });
}
async function trackInitiateCheckout(items: CartItem[], total: number, userEmail?: string): Promise<void> {
  const eventId = genEventId();
  fbqTrack("InitiateCheckout", { content_ids:items.map(i=>i.product.id), num_items:items.reduce((s,i)=>s+i.qty,0), value:total, currency:"USD" }, { eventID: eventId });
  await sendCAPI("InitiateCheckout", eventId, { value:total, currency:"USD", content_ids:items.map(i=>i.product.id), num_items:items.reduce((s,i)=>s+i.qty,0) }, { email: userEmail });
}
async function trackPurchase(orderId: string, total: number, items: CartItem[], userEmail?: string, userPhone?: string, userState?: string): Promise<void> {
  const eventId = genEventId();
  const roundedTotal = parseFloat(total.toFixed(2));
  if (userPhone) userPhone = normalizeVEPhone(userPhone);
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
  }, { email: userEmail, phone: userPhone, state: userState });
}
async function trackLeadWhatsApp(source: string): Promise<void> {
  const eventId = genEventId();
  fbqTrack("Lead", { content_name: source, content_category: "whatsapp_click" }, { eventID: eventId });
  await sendCAPI("Lead", eventId, { content_name: source });
  fsAddToCollection("leads", { source, createdAt: Date.now() }).catch(() => {});
}

// ─── FIREBASE REST ────────────────────────────────────────────────────────────
const fsBase=()=>`https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`;
const AUTH_BASE=`https://identitytoolkit.googleapis.com/v1/accounts`;
type FsVal=|{stringValue:string}|{doubleValue:number}|{integerValue:string}|{booleanValue:boolean}|{nullValue:null}|{arrayValue:{values?:FsVal[]}}|{mapValue:{fields?:Record<string,FsVal>}};
function toFs(v:unknown):FsVal{if(v===null||v===undefined)return{nullValue:null};if(typeof v==="string")return{stringValue:v};if(typeof v==="number")return{doubleValue:v};if(typeof v==="boolean")return{booleanValue:v};if(Array.isArray(v))return{arrayValue:{values:v.map(toFs)}};if(typeof v==="object")return{mapValue:{fields:Object.fromEntries(Object.entries(v as Record<string,unknown>).map(([k,val])=>[k,toFs(val)]))}};return{stringValue:String(v)};}
function fromFs(f:FsVal):unknown{if("stringValue" in f)return f.stringValue;if("doubleValue" in f)return f.doubleValue;if("integerValue" in f)return Number(f.integerValue);if("booleanValue" in f)return f.booleanValue;if("nullValue" in f)return null;if("arrayValue" in f)return((f as{arrayValue:{values?:FsVal[]}}).arrayValue.values||[]).map(fromFs);if("mapValue" in f){const fields=(f as{mapValue:{fields?:Record<string,FsVal>}}).mapValue.fields||{};return Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,fromFs(v)]));}return null;}
interface FsDoc{name:string;fields:Record<string,FsVal>;}
function docToProduct(doc:FsDoc):Product{const f=doc.fields||{};const rawImages=fromFs(f.images??{nullValue:null}) as string[]|null;const id=doc.name.split("/").pop() as string;return{id,name:fromFs(f.name??{nullValue:null}) as string||"",category:((fromFs(f.category??{nullValue:null}) as string)||"").toUpperCase(),price:fromFs(f.price??{nullValue:null}) as number||0,img:fromFs(f.img??{nullValue:null}) as string||"",description:fromFs(f.description??{nullValue:null}) as string||"",createdAt:fromFs(f.createdAt??{nullValue:null}) as number||0,order:fromFs(f.order??{nullValue:null}) as number||0,active:f.active!==undefined?(fromFs(f.active) as boolean):true,discount:fromFs(f.discount??{nullValue:null}) as number||0,images:Array.isArray(rawImages)?rawImages:[],code:(fromFs(f.code??{nullValue:null}) as string)||("FK-"+id.slice(-6).toUpperCase()),bestseller:f.bestseller!==undefined?(fromFs(f.bestseller) as boolean):false};}
async function fsGetAll():Promise<Product[]>{const r=await fetch(`${fsBase()}/products?pageSize=300`);if(!r.ok)throw new Error(await r.text());const d=await r.json() as{documents?:FsDoc[]};return(d.documents||[]).map(docToProduct);}
async function fsAdd(p:Omit<Product,"id">):Promise<void>{const fields=Object.fromEntries(Object.entries({...p,createdAt:Date.now()}).map(([k,v])=>[k,toFs(v)]));const r=await fetch(`${fsBase()}/products`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fields})});if(!r.ok)throw new Error(await r.text());}
async function fsUpdate(id:string,p:Partial<Omit<Product,"id">>):Promise<void>{const fields=Object.fromEntries(Object.entries(p).map(([k,v])=>[k,toFs(v)]));const mask=Object.keys(p).map(k=>`updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");const r=await fetch(`${fsBase()}/products/${id}?${mask}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({fields})});if(!r.ok)throw new Error(await r.text());}
async function fsDelete(id:string):Promise<void>{await fetch(`${fsBase()}/products/${id}`,{method:"DELETE"});}
async function fsUpdateDoc(collection:string,id:string,p:Record<string,unknown>):Promise<void>{const fields=Object.fromEntries(Object.entries(p).map(([k,v])=>[k,toFs(v)]));const mask=Object.keys(p).map(k=>`updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");const r=await fetch(`${fsBase()}/${collection}/${id}?${mask}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({fields})});if(!r.ok)throw new Error(await r.text());}
async function fsDeleteDoc(collection:string,id:string):Promise<void>{await fetch(`${fsBase()}/${collection}/${id}`,{method:"DELETE"});}
async function fsAddToCollection(collection:string,data:Record<string,unknown>):Promise<void>{const fields=Object.fromEntries(Object.entries(data).map(([k,v])=>[k,toFs(v as unknown)]));const r=await fetch(`${fsBase()}/${collection}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fields})});if(!r.ok)throw new Error(await r.text());}
async function fsGetCollection(collection:string,pageSize=300):Promise<Array<Record<string,unknown>&{id:string}>>{const r=await fetch(`${fsBase()}/${collection}?pageSize=${pageSize}`);if(!r.ok)throw new Error(await r.text());const d=await r.json() as{documents?:FsDoc[]};return(d.documents||[]).map(doc=>{const fields=doc.fields||{};const obj:Record<string,unknown>={};Object.entries(fields).forEach(([k,v])=>{obj[k]=fromFs(v);});return{...obj,id:doc.name.split("/").pop() as string};});}
async function fsSaveUser(uid:string,data:Record<string,unknown>,idToken?:string):Promise<void>{const fields=Object.fromEntries(Object.entries(data).map(([k,v])=>[k,toFs(v as unknown)]));const mask=Object.keys(data).map(k=>`updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");const headers:Record<string,string>={"Content-Type":"application/json"};if(idToken)headers["Authorization"]=`Bearer ${idToken}`;await fetch(`${fsBase()}/users/${uid}?${mask}`,{method:"PATCH",headers,body:JSON.stringify({fields})}).catch(()=>{});}
async function refreshIdToken(refreshToken:string):Promise<{idToken:string;localId:string}|null>{try{const r=await fetch(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE_CONFIG.apiKey}`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:`grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`});const d=await r.json() as{id_token?:string;user_id?:string};if(!r.ok||!d.id_token)return null;return{idToken:d.id_token,localId:d.user_id!};}catch{return null;}}
async function authSignUp(email:string,password:string,displayName:string):Promise<{idToken:string;localId:string;refreshToken:string}>{const r=await fetch(`${AUTH_BASE}:signUp?key=${FIREBASE_CONFIG.apiKey}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password,returnSecureToken:true})});const d=await r.json() as{idToken?:string;localId?:string;refreshToken?:string;error?:{message:string}};if(!r.ok||d.error)throw new Error(d.error?.message||"Error al registrar");await fetch(`${AUTH_BASE}:update?key=${FIREBASE_CONFIG.apiKey}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({idToken:d.idToken,displayName,returnSecureToken:false})});return{idToken:d.idToken!,localId:d.localId!,refreshToken:d.refreshToken!};}
async function authSignIn(email:string,password:string):Promise<{idToken:string;localId:string;displayName:string;refreshToken:string}>{const r=await fetch(`${AUTH_BASE}:signInWithPassword?key=${FIREBASE_CONFIG.apiKey}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password,returnSecureToken:true})});const d=await r.json() as{idToken?:string;localId?:string;displayName?:string;refreshToken?:string;error?:{message:string}};if(!r.ok||d.error)throw new Error(d.error?.message||"Error al iniciar sesión");return{idToken:d.idToken!,localId:d.localId!,displayName:d.displayName||"",refreshToken:d.refreshToken!};}
async function fsGetUser(uid:string):Promise<{photoURL:string}>{try{const r=await fetch(`${fsBase()}/users/${uid}`);if(!r.ok)return{photoURL:""};const d=await r.json() as FsDoc;return{photoURL:(fromFs(d.fields?.photoURL??{nullValue:null}) as string)||""};}catch{return{photoURL:""};}}
async function uploadImg(file:File,preset=CLOUDINARY_PRESET):Promise<string>{const fd=new FormData();fd.append("file",file);fd.append("upload_preset",preset);const r=await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,{method:"POST",body:fd});if(!r.ok)throw new Error("Error subiendo imagen");return((await r.json()) as{secure_url:string}).secure_url;}
function optImg(url:string,w=400):string{if(!url||!url.includes("cloudinary.com"))return url;return url.replace("/upload/",`/upload/w_${w},q_auto,f_webp,dpr_auto/`);}
function getAllImages(p:Product):string[]{const extra=(p.images||[]).filter(u=>u&&u!==p.img);return[p.img,...extra].filter(Boolean);}
function getFinalPrice(p:Product):number{if(p.discount&&p.discount>0)return p.price*(1-p.discount/100);return p.price;}
const SUPER_OFFER_THRESHOLD=40;
function isSuperOffer(discount?:number):boolean{return!!discount&&discount>=SUPER_OFFER_THRESHOLD;}
const DiscountBadge=memo(function DiscountBadge({percent,issuper}:{percent:number;issuper?:boolean}){
  if(issuper){
    return(
      <div style={{position:"absolute",top:8,left:8,zIndex:2,display:"flex",alignItems:"center",gap:5,background:"linear-gradient(135deg,#ff3b3b 0%,#c0392b 55%,#7a0000 100%)",color:"#fff",padding:"5px 10px 5px 8px",borderRadius:20,fontSize:9,fontWeight:900,letterSpacing:1,boxShadow:"0 4px 18px rgba(255,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.35)",border:"1px solid rgba(255,255,255,0.5)",animation:"superPulse 1.6s ease infinite"}}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><path d="M12 2l2.4 7.4H22l-6 4.4 2.3 7.2L12 16.6l-6.3 4.4L8 13.8 2 9.4h7.6z"/></svg>
        SUPER -{percent}%
      </div>
    );
  }
  return(
    <div style={{position:"absolute",top:8,left:8,zIndex:2,display:"flex",alignItems:"center",gap:4,background:"linear-gradient(135deg,#fff 0%,#e2e2e2 45%,#8f8f8f 100%)",color:"#080808",padding:"4px 9px 4px 7px",borderRadius:20,fontSize:10,fontWeight:900,letterSpacing:0.5,boxShadow:"0 4px 14px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.7)",border:"1px solid rgba(255,255,255,0.85)"}}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="#080808"><path d="M12 2l2.4 7.4H22l-6 4.4 2.3 7.2L12 16.6l-6.3 4.4L8 13.8 2 9.4h7.6z"/></svg>
      -{percent}%
    </div>
  );
});
const GalleryBadge=memo(function GalleryBadge(){
  return(
    <div style={{position:"absolute",top:8,right:8,zIndex:2,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(6px)",WebkitBackdropFilter:"blur(6px)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:20,padding:"3px 8px",display:"flex",alignItems:"center",gap:4}}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="3" width="18" height="14" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
      <span style={{fontSize:9,color:"#fff",fontWeight:800}}>FOTOS</span>
    </div>
  );
});
const BestsellerBadge=memo(function BestsellerBadge(){
  return(
    <div style={{position:"absolute",bottom:8,left:8,zIndex:3,display:"flex",alignItems:"center",gap:4,background:"linear-gradient(140deg,#2a2a2a 0%,#0a0a0a 55%,#000 100%)",color:"#fff",padding:"4px 9px 4px 7px",borderRadius:20,fontSize:9,fontWeight:900,letterSpacing:0.8,boxShadow:"0 4px 18px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.28), 0 0 0 1px rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.55)"}}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff"><path d="M5 16L3 5l5.5 4L12 3l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z"/></svg>
      MÁS VENDIDO
    </div>
  );
});

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
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@700;800&display=swap');
  .fokus-logo { font-family:'Rajdhani',Arial,sans-serif; font-weight:800; letter-spacing:2px; transform:skewX(-10deg); display:inline-block; }
  @keyframes superPulse { 0%{box-shadow:0 4px 18px rgba(255,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.35);} 50%{box-shadow:0 4px 30px rgba(255,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.5);} 100%{box-shadow:0 4px 18px rgba(255,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.35);} }
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
  @keyframes viewIn { 0%{opacity:0; transform:translateY(10px) scale(0.99); filter:blur(4px);} 60%{filter:blur(0px);} 100%{opacity:1; transform:translateY(0) scale(1); filter:blur(0);} }
  .pv { animation: viewIn 0.5s cubic-bezier(0.16,1,0.3,1) both; will-change: transform, opacity; }

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
function buildConsultUrl(product:Product):string{const msg=`Hola! Quiero más información sobre este producto:\n\n*${product.name}*${product.code?`\nCódigo: ${product.code}`:""}\nPrecio: $${product.price.toFixed(2)}\n\n¿Podrían ayudarme?`;return`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;}

// ─── ROUTING: apartado ↔ URL ──────────────────────────────────────────────────
const BASE_PATHS: Partial<Record<MainView,string>> = { fokus:"/", comunidad:"/comunidad", grabados:"/grabados", cart:"/carrito", account:"/cuenta", admin:"/admin" };
function shopFilterToPath(filter: ShopFilter): string {
  const map: Record<string,string> = {
    "TODO":"/tienda",
    "LENTES":"/tienda/lentes",
    "LENTES·FOTOCROMATICOS":"/tienda/lentes/fotocromaticos",
    "LENTES·ANTI-LUZ-AZUL":"/tienda/lentes/anti-luz-azul",
    "LENTES·SOL":"/tienda/lentes/sol",
    "LENTES·MOTORIZADOS":"/tienda/lentes/motorizados",
    "RELOJES":"/tienda/relojes",
    "COLLARES":"/tienda/collares",
    "PULSERAS":"/tienda/pulseras",
    "ANILLOS":"/tienda/anillos",
    "ARETES":"/tienda/aretes",
    "BILLETERAS":"/tienda/billeteras",
  };
  return map[filter] || "/tienda";
}
function pathToShopState(path: string): { view: MainView; filter: ShopFilter } {
  if (path === "/admin") return { view:"admin", filter:"TODO" };
  if (path.startsWith("/tienda/lentes/fotocromaticos")) return { view:"shop", filter:"LENTES·FOTOCROMATICOS" };
  if (path.startsWith("/tienda/lentes/anti-luz-azul")) return { view:"shop", filter:"LENTES·ANTI-LUZ-AZUL" };
  if (path.startsWith("/tienda/lentes/sol")) return { view:"shop", filter:"LENTES·SOL" };
  if (path.startsWith("/tienda/lentes/motorizados")) return { view:"shop", filter:"LENTES·MOTORIZADOS" };
  if (path.startsWith("/tienda/lentes")) return { view:"shop", filter:"LENTES" };
  if (path.startsWith("/tienda/relojes")) return { view:"shop", filter:"RELOJES" };
  if (path.startsWith("/tienda/collares")) return { view:"shop", filter:"COLLARES" };
  if (path.startsWith("/tienda/pulseras")) return { view:"shop", filter:"PULSERAS" };
  if (path.startsWith("/tienda/anillos")) return { view:"shop", filter:"ANILLOS" };
  if (path.startsWith("/tienda/aretes")) return { view:"shop", filter:"ARETES" };
  if (path.startsWith("/tienda/billeteras")) return { view:"shop", filter:"BILLETERAS" };
  if (path.startsWith("/tienda")) return { view:"shop", filter:"TODO" };
  if (path.startsWith("/comunidad")) return { view:"comunidad", filter:"TODO" };
  if (path.startsWith("/grabados")) return { view:"grabados", filter:"TODO" };
  if (path.startsWith("/carrito")) return { view:"cart", filter:"TODO" };
  if (path.startsWith("/cuenta")) return { view:"account", filter:"TODO" };
  return { view:"fokus", filter:"TODO" };
}

function slugify(text:string):string{
  return text.toString().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
}
function productPath(p:Product):string{
  const slug=slugify(p.name);
  return `/producto/${slug?slug+"-":""}${p.id}`;
}
function productIdFromPath(path:string):string|null{
  if(!path.startsWith("/producto/"))return null;
  const rest=path.slice("/producto/".length);
  if(!rest)return null;
  const parts=rest.split("-");
  return parts[parts.length-1]||null;
}
function generateCouponCode():string{const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";let s="FOKUS-";for(let i=0;i<5;i++)s+=chars[Math.floor(Math.random()*chars.length)];return s;}
function formatTimeLeft(expiresAt:number):string{
  const ms=expiresAt-Date.now();
  if(ms<=0)return"Expirado";
  const h=Math.floor(ms/3600000);
  const m=Math.floor((ms%3600000)/60000);
  if(h>=24){const d=Math.floor(h/24);const rh=h%24;return`${d}d ${rh}h`;}
  return`${h}h ${m}m`;
}

function PwdInput({value,onChange,placeholder,onKeyDown,autoComplete}:{value:string;onChange:(v:string)=>void;placeholder:string;onKeyDown?:(e:React.KeyboardEvent)=>void;autoComplete?:string;}){
  const[show,setShow]=useState(false);
  return(<div style={{position:"relative",display:"flex",alignItems:"center"}}><input type={show?"text":"password"} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)} onKeyDown={onKeyDown} autoComplete={autoComplete} style={{...S.input,paddingRight:"2.8rem"}}/><button type="button" onClick={()=>setShow(s=>!s)} style={{position:"absolute",right:10,background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",padding:4,WebkitTapHighlightColor:"transparent"}} tabIndex={-1}>{show?<IcEyeOff s={18} c="#666"/>:<IcEye s={18} c="#666"/>}</button></div>);
}

// ─── LAZY IMAGE ───────────────────────────────────────────────────────────────
const LazyImg=memo(function LazyImg({src,alt,fit="cover"}:{src:string;alt:string;fit?:"cover"|"contain"}){
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
        src={optImg(src,600)}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={()=>setLoaded(true)}
        style={{
          width:"100%",height:"100%",objectFit:fit,display:"block",
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
  const BTN=60,MG=14;
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
  const onClick=useCallback((e:React.MouseEvent)=>{if(moved.current){e.preventDefault();return;}trackLeadWhatsApp("boton_flotante");const msg=encodeURIComponent("Hola! Vi su tienda Fokus y quiero más información 🖤");window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`,"_blank","noreferrer");},[]);
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
    <div className="pc" style={{WebkitTapHighlightColor:"transparent",touchAction:"manipulation",position:"relative",display:"flex",flexDirection:"column"}}>
      <div onClick={onClick} style={{background:"#111",aspectRatio:"1",overflow:"hidden",borderRadius:10,position:"relative",marginBottom:"0.55rem"}}>
        <div className="iz" style={{width:"100%",height:"100%"}}><LazyImg src={product.img} alt={product.name}/></div>
        <div className="io" style={{position:"absolute",inset:0,background:"rgba(0,0,0,0)",pointerEvents:"none"}}/>
        {!!product.discount&&product.discount>0&&<DiscountBadge percent={product.discount} issuper={isSuperOffer(product.discount)}/>}
        {product.bestseller&&<BestsellerBadge/>}
        {getAllImages(product).length>1&&<GalleryBadge/>}
      </div>
      <div onClick={onClick} style={{marginBottom:"0.5rem",flex:1}}>
        <p style={{margin:"0 0 3px",fontSize:12,lineHeight:1.35,color:"#bbb",letterSpacing:0.2}}>{product.name}</p>
        {product.discount&&product.discount>0?(
          <div style={{display:"flex",alignItems:"baseline",gap:6,flexWrap:"wrap"}}>
            <p style={{margin:0,fontSize:14,fontWeight:800,color:isSuperOffer(product.discount)?"#ff5555":"#ffd43b",letterSpacing:0.5}}>{fmtPrice(getFinalPrice(product))}</p>
            <p style={{margin:0,fontSize:11,color:"#555",textDecoration:"line-through"}}>{fmtPrice(product.price)}</p>
          </div>
        ):(
          <p style={{margin:0,fontSize:14,fontWeight:800,color:C.accent,letterSpacing:0.5}}>{fmtPrice(product.price)}</p>
        )}
      </div>
      <button onClick={e=>{e.stopPropagation();onBuyNow();}} style={{background:"linear-gradient(180deg,#ffffff 0%,#ededed 100%)",color:"#080808",border:"none",height:34,padding:"0",fontSize:9,fontWeight:900,letterSpacing:1.5,cursor:"pointer",fontFamily:"inherit",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",gap:4,WebkitTapHighlightColor:"transparent",width:"100%",boxShadow:"0 3px 12px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.6)",marginBottom:"0.3rem"}}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          COMPRAR AHORA
        </button>
        <button onClick={e=>{e.stopPropagation();trackLeadWhatsApp("finalizar_pedido");window.open(buildConsultUrl(product),"_blank","noreferrer");}} aria-label="Finalizar pedido por WhatsApp" style={{position:"relative",overflow:"hidden",background:"linear-gradient(155deg,rgba(255,255,255,0.14) 0%,rgba(20,20,20,0.92) 45%,rgba(10,10,10,0.97) 100%)",border:"1px solid rgba(255,255,255,0.22)",height:34,padding:"0",cursor:"pointer",fontFamily:"inherit",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",gap:7,WebkitTapHighlightColor:"transparent",width:"100%",backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.15), inset 0 0 0 1px rgba(255,255,255,0.06), 0 4px 16px rgba(0,0,0,0.45)"}}>
          <span style={{position:"absolute",inset:0,background:"linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.08) 50%,transparent 100%)",backgroundSize:"200% 100%",animation:"badgeShimmer 3.2s ease infinite",pointerEvents:"none"}}/>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff" style={{position:"relative",flexShrink:0}}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          <span style={{fontSize:9,fontWeight:900,letterSpacing:1.8,color:"#fff",position:"relative"}}>PEDIR POR WHATSAPP</span>
        </button>
    </div>
  );
});

// ─── HORIZONTAL CARD ─────────────────────────────────────────────────────────
const HCard=memo(function HCard({product,onClick,onBuyNow,fmtPrice}:{product:Product;onClick:()=>void;onBuyNow:()=>void;fmtPrice:(n:number)=>string}){
  return(
    <div className="hc" style={{flexShrink:0,width:152,WebkitTapHighlightColor:"transparent",touchAction:"manipulation",display:"flex",flexDirection:"column"}}>
      <div onClick={onClick} style={{background:"#111",width:152,height:152,overflow:"hidden",marginBottom:"0.55rem",borderRadius:10,position:"relative",cursor:"pointer"}}>
        <div className="iz" style={{width:"100%",height:"100%"}}><LazyImg src={product.img} alt={product.name}/></div>
        <div className="io" style={{position:"absolute",inset:0,background:"rgba(0,0,0,0)",pointerEvents:"none"}}/>
        {!!product.discount&&product.discount>0&&<DiscountBadge percent={product.discount} issuper={isSuperOffer(product.discount)}/>}
        {product.bestseller&&<BestsellerBadge/>}
        {getAllImages(product).length>1&&<GalleryBadge/>}
      </div>
      <div onClick={onClick} style={{marginBottom:"0.5rem",cursor:"pointer",flex:1}}>
        <p style={{margin:"0 0 2px",fontSize:11,lineHeight:1.35,color:"#bbb",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{product.name}</p>
        {product.discount&&product.discount>0?(
          <div style={{display:"flex",alignItems:"baseline",gap:5,flexWrap:"wrap"}}>
            <p style={{margin:0,fontSize:13,fontWeight:800,color:isSuperOffer(product.discount)?"#ff5555":"#ffd43b"}}>{fmtPrice(getFinalPrice(product))}</p>
            <p style={{margin:0,fontSize:10,color:"#555",textDecoration:"line-through"}}>{fmtPrice(product.price)}</p>
          </div>
        ):(
          <p style={{margin:0,fontSize:13,fontWeight:800,color:C.accent}}>{fmtPrice(product.price)}</p>
        )}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:"0.3rem"}}>
        <button
          onClick={e=>{e.stopPropagation();onBuyNow();}}
          style={{background:"linear-gradient(180deg,#ffffff 0%,#ededed 100%)",color:"#080808",border:"none",height:30,padding:"0",fontSize:8,fontWeight:900,letterSpacing:1,cursor:"pointer",fontFamily:"inherit",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",gap:3,WebkitTapHighlightColor:"transparent",width:"100%",boxShadow:"0 3px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.6)",marginBottom:"0.3rem"}}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          COMPRAR AHORA
        </button>
        <button
          onClick={e=>{e.stopPropagation();trackLeadWhatsApp("finalizar_pedido");window.open(buildConsultUrl(product),"_blank","noreferrer");}}
          aria-label="Finalizar pedido por WhatsApp"
          style={{position:"relative",overflow:"hidden",background:"linear-gradient(155deg,rgba(255,255,255,0.14) 0%,rgba(20,20,20,0.92) 45%,rgba(10,10,10,0.97) 100%)",border:"1px solid rgba(255,255,255,0.22)",height:30,padding:"0",cursor:"pointer",fontFamily:"inherit",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",gap:6,WebkitTapHighlightColor:"transparent",width:"100%",backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.15), inset 0 0 0 1px rgba(255,255,255,0.06), 0 4px 14px rgba(0,0,0,0.45)"}}
        >
          <span style={{position:"absolute",inset:0,background:"linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.08) 50%,transparent 100%)",backgroundSize:"200% 100%",animation:"badgeShimmer 3.2s ease infinite",pointerEvents:"none"}}/>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff" style={{position:"relative",flexShrink:0}}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          <span style={{fontSize:8,fontWeight:900,letterSpacing:1.5,color:"#fff",position:"relative"}}>PEDIR POR WHATSAPP</span>
        </button>
      </div>
    </div>
  );
});

// ─── HORIZONTAL ROW ───────────────────────────────────────────────────────────
const HRow=memo(function HRow({products,onSelect,onBuyNow,fmtPrice}:{products:Product[];onSelect:(p:Product)=>void;onBuyNow:(p:Product)=>void;fmtPrice:(n:number)=>string}){
  const rowRef=useRef<HTMLDivElement>(null);
  const[showLeft,setShowLeft]=useState(false);
  const[showRight,setShowRight]=useState(false);
  const updateArrows=useCallback(()=>{const el=rowRef.current;if(!el)return;setShowLeft(el.scrollLeft>8);setShowRight(el.scrollLeft<el.scrollWidth-el.clientWidth-8);},[]);
  useEffect(()=>{const el=rowRef.current;if(!el)return;updateArrows();el.addEventListener("scroll",updateArrows,{passive:true});const ro=new ResizeObserver(updateArrows);ro.observe(el);return()=>{el.removeEventListener("scroll",updateArrows);ro.disconnect();};},[updateArrows,products]);
  const scrollBy=useCallback((dir:number)=>{rowRef.current?.scrollBy({left:dir*320,behavior:"smooth"});},[]);
  const arrowBase:React.CSSProperties={position:"absolute",top:"50%",transform:"translateY(-50%)",zIndex:10,width:34,height:34,borderRadius:"50%",background:"rgba(20,20,20,0.92)",border:"1px solid #2a2a2a",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",backdropFilter:"blur(8px)",boxShadow:"0 2px 12px rgba(0,0,0,0.5)"};
  return(
    <div className="hr-wrap" style={{position:"relative"}}>
      <button onClick={()=>scrollBy(-1)} className={`hr-arrow${showLeft?" hr-arrow-visible":""}`} style={{...arrowBase,left:-4}} aria-label="Anterior"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg></button>
      <button onClick={()=>scrollBy(1)} className={`hr-arrow${showRight?" hr-arrow-visible":""}`} style={{...arrowBase,right:-4}} aria-label="Siguiente"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>
      <div ref={rowRef} className="hr" style={{display:"flex",gap:"0.75rem",overflowX:"scroll",overflowY:"hidden",paddingBottom:"0.5rem",paddingLeft:"0.25rem",paddingRight:"1rem",scrollbarWidth:"none",WebkitOverflowScrolling:"touch",touchAction:"pan-x pan-y",userSelect:"none",WebkitUserSelect:"none",scrollSnapType:"x proximity"} as React.CSSProperties}>
        {products.map(p=>(<div key={p.id} style={{scrollSnapAlign:"start",flexShrink:0}}><HCard product={p} onClick={()=>onSelect(p)} onBuyNow={()=>onBuyNow(p)} fmtPrice={fmtPrice}/></div>))}
      </div>
    </div>
  );
});

// ─── ADDED MODAL ─────────────────────────────────────────────────────────────
const AddedModal=memo(function AddedModal({product,onClose,onGoCart,fmtPrice}:{product:Product;onClose:()=>void;onGoCart:()=>void;fmtPrice:(n:number)=>string}){
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,0.72)",display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadeIn 0.18s ease"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#161616",width:"100%",maxWidth:520,borderRadius:"18px 18px 0 0",padding:"1.25rem 1.25rem 2rem",animation:"slideUp 0.28s cubic-bezier(0.34,1.3,0.64,1)",border:"1px solid #222",borderBottom:"none"}}>
        <div style={{width:36,height:3,background:"#333",borderRadius:2,margin:"0 auto 1.25rem"}}/>
        <div style={{display:"flex",gap:"0.85rem",alignItems:"center",marginBottom:"1.25rem"}}>
          <div style={{width:58,height:58,borderRadius:8,overflow:"hidden",flexShrink:0,background:"#111"}}><img src={optImg(product.img,120)} alt={product.name} style={{width:"100%",height:"100%",objectFit:"cover",pointerEvents:"none"}} draggable={false}/></div>
          <div style={{flex:1}}><p style={{margin:"0 0 2px",fontSize:11,color:"#555",letterSpacing:1.5,fontWeight:700}}>AÑADIDO AL CARRITO</p><p style={{margin:"0 0 2px",fontSize:14,color:C.text,fontWeight:600,lineHeight:1.3}}>{product.name}</p><p style={{margin:0,fontSize:13,color:"#888"}}><span style={{color:C.accent,fontWeight:700}}>{fmtPrice(product.price)}</span></p></div>
          <div style={{width:32,height:32,borderRadius:"50%",background:"#1a2e1a",border:"1.5px solid #2a4a2a",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,animation:"scaleIn 0.3s cubic-bezier(0.34,1.4,0.64,1)"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.65rem"}}>
          <button onClick={onClose} style={{background:"transparent",color:"#aaa",border:"1px solid #2a2a2a",padding:"0.85rem 1rem",fontSize:12,fontWeight:700,letterSpacing:1.2,cursor:"pointer",fontFamily:"inherit",borderRadius:10,WebkitTapHighlightColor:"transparent"}}>SEGUIR COMPRANDO</button>
          <button onClick={onGoCart} style={{background:C.accent,color:"#080808",border:"none",padding:"0.85rem 1rem",fontSize:12,fontWeight:800,letterSpacing:1.2,cursor:"pointer",fontFamily:"inherit",borderRadius:10,WebkitTapHighlightColor:"transparent"}}>IR AL CARRITO →</button>
        </div>
      </div>
    </div>
  );
});

// ─── DELIVERY FORM ────────────────────────────────────────────────────────────
function DeliveryForm({info,onChange}:{info:DeliveryInfo;onChange:(i:DeliveryInfo)=>void}){
  const upd=(field:keyof DeliveryInfo,val:string)=>onChange({...info,[field]:val});
  return(
    <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
      <p style={{fontSize:9,fontWeight:800,letterSpacing:2.5,color:"#333",margin:"0 0 0.25rem"}}>TIPO DE ENVIO</p>
      {DELIVERY_ZONES.map(z=>(<button key={z.id} onClick={()=>upd("zone",z.id)} style={{display:"flex",alignItems:"center",gap:"0.75rem",background:info.zone===z.id?"#fff":"#111",color:info.zone===z.id?"#080808":C.text,border:`1px solid ${info.zone===z.id?"#fff":"#1e1e1e"}`,borderRadius:10,padding:"0.75rem 1rem",cursor:"pointer",fontFamily:"inherit",WebkitTapHighlightColor:"transparent",transition:"all 0.15s",textAlign:"left"}}>{z.id==="naguanagua"&&<span style={{fontSize:16}}>🏙️</span>}{z.id==="valencia"&&<span style={{fontSize:16}}>🌆</span>}{z.id==="otro"&&<IcTruck s={20} c={info.zone==="otro"?"#080808":"#fff"}/>}<span style={{fontSize:13,fontWeight:700}}>{z.label}</span>{info.zone===z.id&&<span style={{marginLeft:"auto",fontSize:14,fontWeight:700}}>✓</span>}</button>))}
      {info.zone==="otro"&&(
        <div style={{background:"#0a0a0a",borderRadius:10,padding:"1rem",border:"1px solid #1a1a1a",marginTop:"0.25rem",display:"flex",flexDirection:"column",gap:"0.65rem",animation:"slideUp 0.2s ease"}}>
          <p style={{fontSize:9,fontWeight:800,letterSpacing:2,color:"#333",margin:"0 0 0.25rem"}}>DATOS DE ENVÍO</p>
          <input placeholder="Nombre y Apellido *" value={info.nombre} onChange={e=>upd("nombre",e.target.value)} style={S.input}/>
          <input placeholder="Cédula de Identidad *" value={info.cedula} onChange={e=>upd("cedula",e.target.value)} style={S.input}/>
          <input placeholder="Número de Teléfono *" value={info.telefono} onChange={e=>upd("telefono",e.target.value)} style={S.input}/>
          <select value={info.agencia} onChange={e=>upd("agencia",e.target.value)} style={{...S.input,appearance:"auto" as any}}><option value="">Agencia de Envíos *</option>{SHIPPING_AGENCIES.map(a=><option key={a} value={a}>{a}</option>)}</select>
          <select value={info.estado} onChange={e=>upd("estado",e.target.value)} style={{...S.input,appearance:"auto" as any}}><option value="">Estado de Venezuela *</option>{VENEZUELA_STATES.map(s=><option key={s} value={s}>{s}</option>)}</select>
          <input placeholder="Dirección / Punto de referencia *" value={info.direccion} onChange={e=>upd("direccion",e.target.value)} style={S.input}/>
        </div>
      )}
    </div>
  );
}

// ─── COMPROBANTE UPLOAD ───────────────────────────────────────────────────────
function ComprobanteUpload({onUrl,url}:{onUrl:(u:string)=>void;url:string}){
  const[loading,setLoading]=useState(false);
  const[err,setErr]=useState("");
  const[preview,setPreview]=useState("");
  const inputRef=useRef<HTMLInputElement>(null);
  const processFile=useCallback(async(file:File)=>{setErr("");setLoading(true);const reader=new FileReader();reader.onload=ev=>setPreview(ev.target?.result as string);reader.readAsDataURL(file);try{const uploaded=await uploadImg(file,"fokus_products");onUrl(uploaded);}catch{setErr("Error al subir. Intenta de nuevo.");setPreview("");onUrl("");}finally{setLoading(false);if(inputRef.current)inputRef.current.value="";};},[onUrl]);
  const handleChange=useCallback((e:React.ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(file)processFile(file);},[processFile]);
  const reset=useCallback(()=>{onUrl("");setPreview("");setErr("");},[onUrl]);
  const displayImg=url||preview;const isReady=!!url;const isUploading=loading||(!url&&!!preview);
  return(
    <div style={{marginTop:"1rem"}}>
      <p style={{fontSize:9,fontWeight:800,letterSpacing:2.5,color:"#333",marginBottom:"0.6rem"}}>COMPROBANTE DE PAGO <span style={{color:"#cc3333"}}>*</span></p>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} disabled={loading} style={{display:"none"}} id="comprobante-input"/>
      {displayImg?(
        <div style={{background:"#0a0a0a",borderRadius:10,border:`1px solid ${isReady?"#2a5a2a":"#2a3a2a"}`,padding:"0.85rem",transition:"border-color 0.2s"}}>
          <div style={{position:"relative",display:"inline-block",width:"100%"}}>
            <img src={displayImg} alt="Comprobante" style={{width:"100%",maxHeight:200,objectFit:"contain",borderRadius:8,display:"block",background:"#111"}} draggable={false}/>
            <div style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,0.82)",borderRadius:20,padding:"4px 12px",display:"flex",alignItems:"center",gap:5}}>{isReady?<><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg><span style={{fontSize:10,color:"#4caf50",fontWeight:700}}>Listo</span></>:<><div style={{width:10,height:10,border:"1.5px solid #444",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/><span style={{fontSize:10,color:"#888"}}>{isUploading?"Subiendo…":"Procesando…"}</span></>}</div>
            <button onClick={reset} style={{position:"absolute",top:8,left:8,background:"rgba(0,0,0,0.82)",border:"none",color:"#aaa",cursor:"pointer",borderRadius:20,padding:"4px 12px",fontSize:10,fontFamily:"inherit",WebkitTapHighlightColor:"transparent"}}>Cambiar</button>
          </div>
        </div>
      ):(
        <label htmlFor="comprobante-input" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"0.65rem",width:"100%",padding:"0.95rem 1rem",background:loading?"#161616":"#111",border:`1px solid ${loading?"#252525":"#2a2a2a"}`,borderRadius:10,cursor:loading?"not-allowed":"pointer",fontSize:13,fontWeight:800,letterSpacing:1.5,color:loading?"#444":"#ccc",fontFamily:"inherit",transition:"all 0.15s",WebkitTapHighlightColor:"transparent",boxSizing:"border-box"} as React.CSSProperties}>{loading?<><div style={{width:14,height:14,border:"2px solid #333",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/> Subiendo…</>:<><IcUpload s={18} c="#888"/> SUBIR COMPROBANTE</>}</label>
      )}
      {err&&(<p style={{margin:"0.5rem 0 0",fontSize:11,color:"#ff5555",background:"#1e0808",borderRadius:8,padding:"0.5rem 0.75rem"}}>{err}</p>)}
    </div>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────
const MiniCartBar=memo(function MiniCartBar({totalItems,totalPrice,fmtPrice,onClick}:{totalItems:number;totalPrice:number;fmtPrice:(n:number)=>string;onClick:()=>void}){
  return(
    <button onClick={onClick} style={{position:"fixed",left:"50%",transform:"translateX(-50%)",bottom:16,zIndex:550,display:"flex",alignItems:"center",gap:"0.75rem",background:"#fff",color:"#080808",border:"none",borderRadius:50,padding:"0.75rem 1.25rem",boxShadow:"0 8px 30px rgba(0,0,0,0.5)",cursor:"pointer",fontFamily:"inherit",WebkitTapHighlightColor:"transparent",animation:"slideUp 0.3s ease"}}>
      <span style={{width:22,height:22,borderRadius:"50%",background:"#080808",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,flexShrink:0}}>{totalItems}</span>
      <span style={{fontSize:12,fontWeight:800,letterSpacing:0.5}}>Ver carrito · {fmtPrice(totalPrice)}</span>
      <span style={{fontSize:13}}>→</span>
    </button>
  );
});

const Footer=memo(function Footer({setMainView,setShopFilter}:{setMainView:(v:MainView)=>void;setShopFilter:(v:ShopFilter)=>void}){
  const sA:React.CSSProperties={display:"flex",alignItems:"center",justifyContent:"center",width:36,height:36,borderRadius:"50%",background:"rgba(255,255,255,0.04)",textDecoration:"none",border:"1px solid rgba(255,255,255,0.07)",flexShrink:0};
  const cats=[{l:"Lentes",c:"LENTES"},{l:"Relojes",c:"RELOJES"},{l:"Collares",c:"COLLARES"},{l:"Pulseras",c:"PULSERAS"},{l:"Anillos",c:"ANILLOS"},{l:"Aretes",c:"ARETES"},{l:"Billeteras",c:"BILLETERAS"}];
  return(
    <footer style={{background:"#060606",borderTop:"1px solid #111",marginTop:"2rem",padding:"2.5rem 1.5rem 2rem"}}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>
        <div className="fg" style={{display:"grid",gap:"2rem",marginBottom:"2rem"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:"0.65rem"}}><img src="/favicon.png" alt="Fokus" width={20} height={20} style={{objectFit:"contain",pointerEvents:"none"}} draggable={false}/><span style={{fontWeight:900,fontSize:12,letterSpacing:5,color:"#fff"}}>FOKUS</span></div>
            <p style={{fontSize:11,color:"#333",lineHeight:1.7,margin:"0 0 0.85rem",maxWidth:180}}>Accesorios con actitud.<br/>Cada detalle +</p>
            <div style={{display:"flex",gap:"0.45rem"}}><a href={SOCIAL.instagram} target="_blank" rel="noreferrer" className="sl" style={sA}><IcIG s={14}/></a><a href={SOCIAL.facebook} target="_blank" rel="noreferrer" className="sl" style={sA}><IcFB s={14}/></a><a href={SOCIAL.tiktok} target="_blank" rel="noreferrer" className="sl" style={sA}><IcTT s={14}/></a><a href={SOCIAL.whatsapp} target="_blank" rel="noreferrer" className="sl" style={{...sA,background:"rgba(37,211,102,0.08)",borderColor:"rgba(37,211,102,0.15)"}}><IcWA s={14}/></a></div>
          </div>
          <div>
            <p style={{fontSize:9,fontWeight:800,letterSpacing:3,color:"#2a2a2a",marginBottom:"0.75rem"}}>TIENDA</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.35rem 1rem"}}>{cats.map(({l,c})=>(<button key={c} onClick={()=>{setShopFilter(c as ShopFilter);setMainView("shop");window.scrollTo({top:0,behavior:"instant" as ScrollBehavior});}} style={{background:"none",border:"none",textAlign:"left",cursor:"pointer",fontFamily:"inherit",fontSize:11,color:"#333",padding:0,WebkitTapHighlightColor:"transparent",transition:"color 0.15s"}} className="fl">{l}</button>))}</div>
          </div>
          <div>
            <p style={{fontSize:9,fontWeight:800,letterSpacing:3,color:"#2a2a2a",marginBottom:"0.75rem"}}>CONTACTO</p>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hola! Quiero más información sobre los productos de Fokus 🖤")}`} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:"0.45rem",background:"#0d1e0d",color:"#4caf50",padding:"0.55rem 0.9rem",borderRadius:8,fontSize:11,fontWeight:700,textDecoration:"none",marginBottom:"0.75rem",border:"1px solid #162516"}} data-fokus-tracked="true" onClick={()=>trackLeadWhatsApp("footer_contacto")}><IcWA s={12} c="#4caf50"/> WhatsApp</a>
            <div style={{display:"flex",flexDirection:"column",gap:"0.2rem"}}><p style={{fontSize:10,color:"#2a2a2a",margin:0}}>miltonjavi05@gmail.com</p><p style={{fontSize:10,color:"#2a2a2a",margin:0}}>+58 424-300-5733</p></div>
          </div>
        </div>
        <div style={{borderTop:"1px solid #111",paddingTop:"1rem",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"0.4rem"}}><p style={{fontSize:9,color:"#222",margin:0,letterSpacing:1}}>© {new Date().getFullYear()} FOKUS. TODOS LOS DERECHOS RESERVADOS.</p><p style={{fontSize:9,color:"#1a1a1a",margin:0,letterSpacing:1}}>FOKUS ®</p></div>
      </div>
    </footer>
  );
});

// ─── AUTH MODAL ───────────────────────────────────────────────────────────────
function AuthModal({onClose,onSuccess}:{onClose:()=>void;onSuccess:(u:UserData)=>void}){
  const[mode,setMode]=useState<"login"|"register">("login");
  const[name,setName]=useState(""),[email,setEmail]=useState(""),[pwd,setPwd]=useState(""),[err,setErr]=useState(""),[loading,setLoading]=useState(false);
  const authErrMap:Record<string,string>={"EMAIL_EXISTS":"Este correo ya está registrado.","INVALID_EMAIL":"Correo inválido.","WEAK_PASSWORD : Password should be at least 6 characters":"La contraseña debe tener al menos 6 caracteres.","WEAK_PASSWORD":"La contraseña debe tener al menos 6 caracteres.","INVALID_LOGIN_CREDENTIALS":"Correo o contraseña incorrectos.","EMAIL_NOT_FOUND":"No existe una cuenta con este correo.","INVALID_PASSWORD":"Contraseña incorrecta.","USER_DISABLED":"Esta cuenta ha sido deshabilitada.","TOO_MANY_ATTEMPTS_TRY_LATER":"Demasiados intentos. Intenta más tarde.","CONFIGURATION_NOT_FOUND":"El inicio de sesión con correo no está activado.","OPERATION_NOT_ALLOWED":"Registro con email/contraseña no habilitado."};
  const handle=async()=>{setErr("");setLoading(true);try{if(mode==="register"){if(!name.trim()){setErr("Ingresa tu nombre.");setLoading(false);return;}if(!email.trim()){setErr("Ingresa tu correo.");setLoading(false);return;}if(pwd.length<6){setErr("La contraseña debe tener al menos 6 caracteres.");setLoading(false);return;}const{idToken,localId,refreshToken}=await authSignUp(email.trim(),pwd,name.trim());const ud:UserData={uid:localId,email:email.trim(),displayName:name.trim(),createdAt:Date.now(),photoURL:"",idToken};await fsSaveUser(localId,{email:email.trim(),displayName:name.trim(),createdAt:ud.createdAt,photoURL:""},idToken).catch(()=>{});localStorage.setItem("fokus_refresh",refreshToken);localStorage.setItem("fokus_user",JSON.stringify(ud));onSuccess(ud);}else{const{idToken,localId,displayName,refreshToken}=await authSignIn(email.trim(),pwd);const fsData=await fsGetUser(localId);const ud:UserData={uid:localId,email:email.trim(),displayName:displayName||email.split("@")[0],createdAt:Date.now(),photoURL:fsData.photoURL,idToken};localStorage.setItem("fokus_refresh",refreshToken);localStorage.setItem("fokus_user",JSON.stringify(ud));onSuccess(ud);}}catch(e:unknown){const raw=e instanceof Error?e.message:"Error desconocido";const matched=Object.keys(authErrMap).find(k=>raw.includes(k));setErr(matched?authErrMap[matched]:raw);}finally{setLoading(false);}};
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:700,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadeIn 0.18s ease"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#111",width:"100%",maxWidth:460,borderRadius:"18px 18px 0 0",padding:"1.5rem 1.5rem 2.5rem",animation:"slideUp 0.28s cubic-bezier(0.34,1.3,0.64,1)",border:"1px solid #1e1e1e",borderBottom:"none"}}>
        <div style={{width:36,height:3,background:"#222",borderRadius:2,margin:"0 auto 1.5rem"}}/>
        <div style={{display:"flex",gap:0,marginBottom:"1.5rem",background:"#0e0e0e",borderRadius:10,padding:3,border:"1px solid #1a1a1a"}}>{(["login","register"] as const).map(m=>(<button key={m} onClick={()=>{setMode(m);setErr("");}} style={{flex:1,padding:"0.6rem",border:"none",borderRadius:8,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:800,letterSpacing:1.5,transition:"all 0.15s",WebkitTapHighlightColor:"transparent",background:mode===m?"#fff":"transparent",color:mode===m?"#080808":"#444"}}>{m==="login"?"ENTRAR":"REGISTRARSE"}</button>))}</div>
        <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
          {mode==="register"&&<input placeholder="Nombre *" value={name} onChange={e=>setName(e.target.value)} style={S.input} autoComplete="name"/>}
          <input placeholder="Correo electrónico *" type="email" value={email} onChange={e=>setEmail(e.target.value)} style={S.input} autoComplete="email"/>
          <PwdInput placeholder="Contraseña *" value={pwd} onChange={setPwd} onKeyDown={e=>e.key==="Enter"&&handle()} autoComplete={mode==="login"?"current-password":"new-password"}/>
          {err&&<div style={{color:"#ff5555",fontSize:12,background:"#1e0808",padding:"0.65rem 1rem",borderRadius:8,lineHeight:1.5}}>{err}</div>}
          <button onClick={handle} disabled={loading} style={{...S.darkBtn,width:"100%",justifyContent:"center",borderRadius:10,padding:"1rem",fontSize:12,opacity:loading?0.5:1,cursor:loading?"not-allowed":"pointer"}}>{loading?"Cargando...":(mode==="login"?"ENTRAR →":"CREAR CUENTA →")}</button>
        </div>
        <p style={{textAlign:"center",fontSize:11,color:"#333",marginTop:"1rem",lineHeight:1.6}}>{mode==="login"?"¿No tienes cuenta?":"¿Ya tienes cuenta?"}{" "}<button onClick={()=>{setMode(mode==="login"?"register":"login");setErr("");}} style={{background:"none",border:"none",color:"#888",cursor:"pointer",fontFamily:"inherit",fontSize:11,textDecoration:"underline",WebkitTapHighlightColor:"transparent"}}>{mode==="login"?"Regístrate":"Inicia sesión"}</button></p>
      </div>
    </div>
  );
}

// ─── COMMUNITY CARD ───────────────────────────────────────────────────────────
const CommunityCard=memo(function CommunityCard({post,onClick,index}:{post:typeof COMMUNITY_POSTS[0];onClick:()=>void;index:number}){
  const[vis,setVis]=useState(false),[loaded,setLoaded]=useState(false);
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{const el=ref.current;if(!el)return;const obs=new IntersectionObserver(([e])=>{if(e.isIntersecting){setVis(true);obs.disconnect();}},{rootMargin:"100px"});obs.observe(el);return()=>obs.disconnect();},[]);
  const tagColors:Record<string,{bg:string;color:string}>={"ARETES":{bg:"rgba(168,85,247,0.15)",color:"#c084fc"},"COLLARES":{bg:"rgba(251,191,36,0.12)",color:"#fbbf24"},"PULSERAS":{bg:"rgba(34,211,238,0.12)",color:"#22d3ee"},"RESEÑA":{bg:"rgba(74,222,128,0.12)",color:"#4ade80"},"RELOJES":{bg:"rgba(251,113,133,0.12)",color:"#fb7185"}};
  const tc=tagColors[post.tag]||{bg:"rgba(255,255,255,0.08)",color:"#aaa"};
  return(
    <div ref={ref} onClick={onClick} style={{cursor:"pointer",opacity:vis?1:0,transform:vis?"translateY(0) scale(1)":"translateY(20px) scale(0.97)",transition:`opacity 0.45s ease ${Math.min(index*60,300)}ms, transform 0.45s ease ${Math.min(index*60,300)}ms`,borderRadius:16,overflow:"hidden",background:"#0d0d0d",border:"1px solid #1a1a1a",position:"relative"}} className="cc">
      <div style={{position:"relative",aspectRatio:"9/16",overflow:"hidden",background:"#111"}}>
        {!loaded&&<div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,#141414 0%,#1e1e1e 50%,#141414 100%)",backgroundSize:"200% 100%",animation:"shimmer 1.4s infinite"}}/>}
        {vis&&<img src={post.img} alt={post.caption} loading="lazy" decoding="async" onLoad={()=>setLoaded(true)} style={{width:"100%",height:"100%",objectFit:"cover",display:"block",opacity:loaded?1:0,transition:"opacity 0.3s ease",pointerEvents:"none",userSelect:"none",WebkitUserSelect:"none",WebkitTouchCallout:"none"} as React.CSSProperties} draggable={false}/>}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",top:10,left:10}}><span style={{background:tc.bg,color:tc.color,fontSize:9,fontWeight:800,letterSpacing:1.5,padding:"3px 9px",borderRadius:20,backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",border:`1px solid ${tc.color}30`}}>{post.tag}</span></div>
        <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"0.85rem"}}>
          <p style={{margin:"0 0 3px",fontSize:12,fontWeight:700,color:"#fff",lineHeight:1.35,textShadow:"0 1px 4px rgba(0,0,0,0.8)"}}>{post.caption}</p>
          <div style={{display:"flex",alignItems:"center",gap:4}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg><span style={{fontSize:10,color:"#888"}}>{post.location}</span></div>
        </div>
      </div>
    </div>
  );
});

// ─── COMMUNITY LIGHTBOX ───────────────────────────────────────────────────────
function CommunityLightbox({post,onClose,onPrev,onNext,hasPrev,hasNext}:{post:typeof COMMUNITY_POSTS[0];onClose:()=>void;onPrev:()=>void;onNext:()=>void;hasPrev:boolean;hasNext:boolean}){
  useEffect(()=>{const h=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose();if(e.key==="ArrowLeft"&&hasPrev)onPrev();if(e.key==="ArrowRight"&&hasNext)onNext();};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[onClose,onPrev,onNext,hasPrev,hasNext]);
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:800,background:"rgba(0,0,0,0.95)",display:"flex",alignItems:"center",justifyContent:"center",animation:"fadeIn 0.18s ease",padding:"1rem"}}>
      <div onClick={e=>e.stopPropagation()} style={{position:"relative",maxWidth:420,width:"100%",maxHeight:"90vh",display:"flex",flexDirection:"column",alignItems:"center"}}>
        <button onClick={onClose} style={{position:"absolute",top:-40,right:0,background:"none",border:"none",color:"#fff",cursor:"pointer",fontSize:24,WebkitTapHighlightColor:"transparent",zIndex:10}}>✕</button>
        <div style={{borderRadius:16,overflow:"hidden",width:"100%",maxHeight:"80vh",position:"relative"}}><img src={post.img} alt={post.caption} style={{width:"100%",height:"auto",maxHeight:"80vh",objectFit:"contain",display:"block",userSelect:"none",WebkitUserSelect:"none"} as React.CSSProperties} draggable={false}/></div>
        <p style={{color:"#ccc",fontSize:13,textAlign:"center",marginTop:"0.75rem",lineHeight:1.5}}>{post.caption}</p>
        <div style={{display:"flex",gap:"0.75rem",marginTop:"0.5rem"}}>
          <button onClick={e=>{e.stopPropagation();onPrev();}} disabled={!hasPrev} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)",color:hasPrev?"#fff":"#333",width:40,height:40,borderRadius:"50%",cursor:hasPrev?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",WebkitTapHighlightColor:"transparent"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg></button>
          <button onClick={e=>{e.stopPropagation();onNext();}} disabled={!hasNext} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)",color:hasNext?"#fff":"#333",width:40,height:40,borderRadius:"50%",cursor:hasNext?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",WebkitTapHighlightColor:"transparent"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg></button>
        </div>
      </div>
    </div>
  );
}

// ─── REVIEW MODAL ─────────────────────────────────────────────────────────────
function ReviewModal({onClose}:{onClose:()=>void}){
  const[name,setName]         = useState("");
  const[comment,setComment]   = useState("");
  const[stars,setStars]       = useState(5);
  const[product,setProduct]   = useState("");
  const[photoUrl,setPhotoUrl] = useState("");
  const[photoPreview,setPhotoPreview] = useState("");
  const[uploading,setUploading] = useState(false);
  const[uploadErr,setUploadErr] = useState("");
  const[sending,setSending]   = useState(false);
  const[done,setDone]         = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = useCallback(async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file = e.target.files?.[0];
    if(!file) return;
    setUploadErr("");
    setUploading(true);
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    try {
      const url = await uploadImg(file, "fokus_products");
      setPhotoUrl(url);
    } catch {
      setUploadErr("Error al subir la foto. Intenta de nuevo.");
      setPhotoPreview("");
    } finally {
      setUploading(false);
      if(photoRef.current) photoRef.current.value = "";
    }
  },[]);

  const resetPhoto = useCallback(()=>{
    setPhotoUrl("");
    setPhotoPreview("");
    setUploadErr("");
  },[]);

  const canSend = name.trim().length > 0 && comment.trim().length > 0 && !uploading;

  const handleSend = useCallback(()=>{
    if(!canSend) return;
    setSending(true);
    const starsStr = "⭐".repeat(stars);
    const parts: string[] = [
      `🌟 *NUEVA RESEÑA DE CLIENTE*`,
      ``,
      `👤 *Nombre:* ${name.trim()}`,
      `${starsStr} *(${stars}/5)*`,
    ];
    if(product.trim()) parts.push(`🛍️ *Producto:* ${product.trim()}`);
    parts.push(``, `💬 *Comentario:*`, comment.trim());
    if(photoUrl) parts.push(``, `📸 *Foto del cliente:*`, photoUrl);
    const msg = parts.join("\n");
    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank", "noreferrer");
    setSending(false);
    setDone(true);
  },[canSend, name, stars, product, comment, photoUrl]);

  const displayImg   = photoUrl || photoPreview;
  const isPhotoReady = !!photoUrl;

  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:700,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadeIn 0.18s ease"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#111",width:"100%",maxWidth:520,borderRadius:"18px 18px 0 0",padding:"1.5rem 1.5rem 2.5rem",maxHeight:"92vh",overflowY:"auto",animation:"slideUp 0.28s cubic-bezier(0.25,0.46,0.45,0.94)",border:"1px solid #1e1e1e",borderBottom:"none"}}>
        <div style={{width:36,height:3,background:"#222",borderRadius:2,margin:"0 auto 1.25rem"}}/>
        {done ? (
          <div style={{textAlign:"center",padding:"2rem 0",animation:"slideUp 0.3s ease"}}>
            <div style={{width:64,height:64,borderRadius:"50%",background:"#0d1e0d",border:"1.5px solid #2a4a2a",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1rem"}}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h3 style={{fontSize:16,fontWeight:900,color:C.accent,marginBottom:"0.5rem"}}>¡Gracias por tu reseña!</h3>
            <p style={{fontSize:13,color:"#555",lineHeight:1.7,marginBottom:"1.5rem"}}>Tu opinión fue enviada. La compartiremos con la comunidad Fokus 🖤</p>
            <button onClick={onClose} style={{...S.darkBtn,borderRadius:10,fontSize:11,width:"100%",justifyContent:"center"}}>CERRAR</button>
          </div>
        ) : (
          <>
            <div style={{marginBottom:"1.5rem"}}>
              <p style={{fontSize:9,fontWeight:800,letterSpacing:3,color:"#333",margin:"0 0 0.3rem"}}>COMPARTE TU EXPERIENCIA</p>
              <h2 style={{fontSize:18,fontWeight:900,color:C.accent,margin:0}}>Deja tu reseña 🖤</h2>
            </div>
            <div style={{marginBottom:"1.25rem"}}>
              <p style={{fontSize:9,fontWeight:800,letterSpacing:2,color:"#333",marginBottom:"0.5rem"}}>CALIFICACIÓN</p>
              <div style={{display:"flex",gap:"0.35rem"}}>
                {[1,2,3,4,5].map(n=>(<button key={n} onClick={()=>setStars(n)} style={{background:"none",border:"none",cursor:"pointer",fontSize:28,padding:"2px",WebkitTapHighlightColor:"transparent",filter:n<=stars?"brightness(1)":"brightness(0.25)",transition:"filter 0.15s"}}>⭐</button>))}
              </div>
            </div>
            <div style={{marginBottom:"0.75rem"}}><input placeholder="Tu nombre *" value={name} onChange={e=>setName(e.target.value)} style={S.input} autoComplete="name"/></div>
            <div style={{marginBottom:"0.75rem"}}><input placeholder="¿Qué producto compraste? (opcional)" value={product} onChange={e=>setProduct(e.target.value)} style={S.input}/></div>
            <div style={{marginBottom:"1rem"}}><textarea placeholder="Cuéntanos tu experiencia con Fokus... *" value={comment} onChange={e=>setComment(e.target.value)} rows={3} style={{...S.input,resize:"vertical" as const,lineHeight:1.6,minHeight:80}}/></div>
            <div style={{marginBottom:"1.25rem"}}>
              <p style={{fontSize:9,fontWeight:800,letterSpacing:2,color:"#333",marginBottom:"0.5rem"}}>FOTO CON TU ACCESORIO <span style={{color:"#444",fontWeight:500,letterSpacing:0}}>(opcional)</span></p>
              <input ref={photoRef} type="file" accept="image/*" onChange={handlePhotoChange} disabled={uploading} style={{display:"none"}} id="review-photo-input"/>
              {displayImg ? (
                <div style={{background:"#0a0a0a",borderRadius:10,border:`1px solid ${isPhotoReady?"#2a5a2a":"#222"}`,padding:"0.75rem",position:"relative"}}>
                  <img src={displayImg} alt="Tu foto" style={{width:"100%",maxHeight:220,objectFit:"cover",borderRadius:8,display:"block",background:"#111"}} draggable={false}/>
                  <div style={{position:"absolute",top:18,right:18,background:"rgba(0,0,0,0.82)",borderRadius:20,padding:"4px 10px",display:"flex",alignItems:"center",gap:5}}>
                    {isPhotoReady?<><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg><span style={{fontSize:10,color:"#4caf50",fontWeight:700}}>Lista</span></>:<><div style={{width:10,height:10,border:"1.5px solid #444",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/><span style={{fontSize:10,color:"#888"}}>Subiendo…</span></>}
                  </div>
                  <button onClick={resetPhoto} style={{position:"absolute",top:18,left:8,background:"rgba(0,0,0,0.82)",border:"none",color:"#aaa",cursor:"pointer",borderRadius:20,padding:"4px 10px",fontSize:10,fontFamily:"inherit",WebkitTapHighlightColor:"transparent"}}>Cambiar</button>
                </div>
              ) : (
                <label htmlFor="review-photo-input" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"0.6rem",width:"100%",padding:"0.9rem 1rem",background:"#111",border:"1px dashed #2a2a2a",borderRadius:10,cursor:uploading?"not-allowed":"pointer",fontSize:13,fontWeight:700,letterSpacing:1,color:"#555",fontFamily:"inherit",WebkitTapHighlightColor:"transparent",boxSizing:"border-box"} as React.CSSProperties}>
                  {uploading?<><div style={{width:14,height:14,border:"2px solid #333",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/> Subiendo…</>:<><IcCamera s={16} c="#555"/> Subir foto con tu accesorio</>}
                </label>
              )}
              {uploadErr && <p style={{margin:"0.5rem 0 0",fontSize:11,color:"#ff5555",background:"#1e0808",borderRadius:8,padding:"0.4rem 0.75rem"}}>{uploadErr}</p>}
            </div>
            <button onClick={handleSend} disabled={!canSend || sending} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"0.65rem",width:"100%",background:canSend?"#25D366":"#1a1a1a",color:canSend?"#fff":"#444",padding:"1rem",fontWeight:900,letterSpacing:2,fontSize:11,border:`1px solid ${canSend?"transparent":"#2a2a2a"}`,borderRadius:10,cursor:canSend?"pointer":"not-allowed",fontFamily:"inherit",transition:"background 0.2s, color 0.2s"}}>
              <IcWA s={18} c={canSend?"#fff":"#444"}/>
              {sending ? "ENVIANDO…" : "ENVIAR RESEÑA POR WHATSAPP"}
            </button>
            <p style={{textAlign:"center",fontSize:10,color:"#2e2e2e",marginTop:"0.65rem",lineHeight:1.5}}>Se abrirá WhatsApp con tu reseña lista para enviar</p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── USER AVATAR ──────────────────────────────────────────────────────────────
function UserAvatar({user,size=26}:{user:UserData;size?:number}){
  if(user.photoURL){return<img key={user.photoURL} src={user.photoURL} alt={user.displayName} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",flexShrink:0,border:"1.5px solid #333",display:"block"}} draggable={false}/>;}
  return(<div style={{width:size,height:size,borderRadius:"50%",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:size*0.42,fontWeight:900,color:"#080808",letterSpacing:0,lineHeight:1}}>{user.displayName[0]?.toUpperCase()||"?"}</span></div>);
}

// ─── ADMIN ROW ────────────────────────────────────────────────────────────────
interface ARowProps{p:Product;editing:Product|null;onEdit:(p:Product)=>void;onDel:(id:string)=>void;onDragStart:(id:string)=>void;onDragOver:(id:string)=>void;onDragEnd:()=>void;isDragging:boolean;isOver:boolean;onTouchStart:(id:string,y:number)=>void;onTouchMove:(y:number,x:number)=>void;onTouchEnd:()=>void;onToggleActive:(p:Product)=>void;onToggleDiscount:(p:Product)=>void;onToggleBestseller:(p:Product)=>void;}
const ARow=memo(function ARow({p,editing,onEdit,onDel,onDragStart,onDragOver,onDragEnd,isDragging,isOver,onTouchStart,onTouchMove,onTouchEnd,onToggleActive,onToggleDiscount,onToggleBestseller}:ARowProps){
  return(
    <div draggable onDragStart={()=>onDragStart(p.id)} onDragOver={e=>{e.preventDefault();onDragOver(p.id);}} onDragEnd={onDragEnd} data-rowid={p.id} className="ar" style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.6rem 0.65rem",borderRadius:8,background:isOver?"#1e1e1e":editing?.id===p.id?"#1a1a1a":"transparent",opacity:isDragging?0.4:1,border:isOver?"1px dashed #3a3a3a":"1px solid transparent",transition:"opacity 0.15s, background 0.15s, border 0.15s",cursor:"default",userSelect:"none",WebkitUserSelect:"none"}}>
      <div onTouchStart={e=>{e.stopPropagation();const t=e.touches[0];onTouchStart(p.id,t.clientY);}} onTouchMove={e=>{e.stopPropagation();e.preventDefault();const t=e.touches[0];onTouchMove(t.clientY,t.clientX);}} onTouchEnd={e=>{e.stopPropagation();onTouchEnd();}} style={{cursor:"grab",flexShrink:0,padding:"6px 8px",color:"#444",display:"flex",alignItems:"center",touchAction:"none",WebkitTapHighlightColor:"transparent",userSelect:"none",WebkitUserSelect:"none",WebkitTouchCallout:"none"} as React.CSSProperties}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="6" r="1.2" fill="currentColor"/><circle cx="16" cy="6" r="1.2" fill="currentColor"/><circle cx="8" cy="12" r="1.2" fill="currentColor"/><circle cx="16" cy="12" r="1.2" fill="currentColor"/><circle cx="8" cy="18" r="1.2" fill="currentColor"/><circle cx="16" cy="18" r="1.2" fill="currentColor"/></svg></div>
      <div style={{position:"relative",width:44,height:44,flexShrink:0}}>
        <img src={optImg(p.img,120)} alt={p.name} style={{width:44,height:44,objectFit:"cover",borderRadius:6,background:"#1a1a1a",pointerEvents:"none",userSelect:"none",WebkitUserSelect:"none",WebkitTouchCallout:"none",opacity:p.active===false?0.35:1} as React.CSSProperties} draggable={false}/>
        {!!p.discount&&p.discount>0&&<span style={{position:"absolute",top:-4,left:-4,background:isSuperOffer(p.discount)?"linear-gradient(135deg,#ff3b3b,#7a0000)":"linear-gradient(135deg,#fff,#999)",color:isSuperOffer(p.discount)?"#fff":"#080808",fontSize:8,fontWeight:900,padding:"1px 4px",borderRadius:6,border:isSuperOffer(p.discount)?"1px solid #ff8888":"1px solid #fff"}}>-{p.discount}%</span>}
      </div>
      <div style={{flex:1,minWidth:0,userSelect:"none",WebkitUserSelect:"none"} as React.CSSProperties}><p style={{color:p.active===false?"#666":"#ccc",fontSize:12,fontWeight:700,margin:"0 0 1px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}{p.active===false&&<span style={{color:"#ff6666",fontSize:9,marginLeft:6,fontWeight:800}}>OCULTO</span>}</p><p style={{color:"#333",fontSize:10,margin:0}}>${p.price.toFixed(2)} {p.code&&<span style={{color:"#555",fontFamily:"monospace",marginLeft:6}}>· {p.code}</span>}</p></div>
      <div style={{display:"flex",gap:"0.3rem",flexShrink:0,flexWrap:"wrap",justifyContent:"flex-end",maxWidth:170}}>
        <button onClick={()=>onToggleActive(p)} title={p.active===false?"Mostrar en tienda":"Ocultar (agotado)"} style={{background:p.active===false?"#1e0d0d":"#0d1e0d",color:p.active===false?"#ff8888":"#4caf50",border:`1px solid ${p.active===false?"#3a1515":"#1a3a1a"}`,padding:"0.3rem 0.5rem",borderRadius:6,cursor:"pointer",fontSize:10,fontFamily:"inherit",WebkitTapHighlightColor:"transparent"}}>{p.active===false?"👁️‍🗨️":"👁️"}</button>
        <button onClick={()=>onToggleDiscount(p)} title="Configurar oferta" style={{background:p.discount?"#1a1608":"#1a1a1a",color:p.discount?"#ffd43b":"#888",border:`1px solid ${p.discount?"#3a2f10":"#222"}`,padding:"0.3rem 0.55rem",borderRadius:6,cursor:"pointer",fontSize:10,fontFamily:"inherit",fontWeight:700,WebkitTapHighlightColor:"transparent"}}>🏷️{p.discount?` -${p.discount}%`:""}</button>
        <button onClick={()=>onToggleBestseller(p)} title="Marcar como más vendido" style={{background:p.bestseller?"linear-gradient(135deg,#ffd43b,#c99a1f)":"#1a1a1a",color:p.bestseller?"#3a2a00":"#888",border:`1px solid ${p.bestseller?"#c99a1f":"#222"}`,padding:"0.3rem 0.55rem",borderRadius:6,cursor:"pointer",fontSize:10,fontFamily:"inherit",fontWeight:800,WebkitTapHighlightColor:"transparent"}}>🏆</button>
        <button onClick={()=>onEdit(p)} style={{background:"#1a1a1a",color:"#888",border:"1px solid #222",padding:"0.3rem 0.65rem",borderRadius:6,cursor:"pointer",fontSize:10,fontFamily:"inherit",fontWeight:700,WebkitTapHighlightColor:"transparent"}}>Editar</button>
        <button onClick={()=>onDel(p.id)} style={{background:"none",color:"#cc3333",border:"1px solid #2a1515",padding:"0.3rem 0.65rem",borderRadius:6,cursor:"pointer",fontSize:10,fontFamily:"inherit",WebkitTapHighlightColor:"transparent"}}>✕</button>
      </div>
    </div>
  );
});

// ─── THANK YOU VIEW ───────────────────────────────────────────────────────────
const ThankYouView=memo(function ThankYouView({order,onBack,currentUser,getRealUsdValue}:{order:OrderSnapshot;onBack:()=>void;currentUser:UserData|null|undefined;getRealUsdValue:(nominalUsd:number,payMethodId?:string)=>number;}){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const fired=useRef(false);
  const[phase,setPhase]=useState(0);
  useEffect(()=>{const t1=setTimeout(()=>setPhase(1),60);const t2=setTimeout(()=>setPhase(2),420);const t3=setTimeout(()=>setPhase(3),700);return()=>{clearTimeout(t1);clearTimeout(t2);clearTimeout(t3);};},[]);
  
  useEffect(()=>{const canvas=canvasRef.current;if(!canvas)return;const ctx=canvas.getContext("2d");if(!ctx)return;canvas.width=window.innerWidth;canvas.height=window.innerHeight;const pieces=Array.from({length:70},()=>({x:canvas.width/2+(Math.random()-0.5)*60,y:canvas.height*0.35,vx:(Math.random()-0.5)*8,vy:-(Math.random()*11+4),sz:Math.random()*4+2,color:["#fff","#ddd","#aaa","#777","#444"][Math.floor(Math.random()*5)],rot:Math.random()*Math.PI*2,rv:(Math.random()-0.5)*0.16,alpha:1}));let raf:number;const draw=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);let alive=false;for(const p of pieces){p.x+=p.vx;p.y+=p.vy;p.vy+=0.26;p.vx*=0.996;p.rot+=p.rv;p.alpha-=0.011;if(p.alpha<=0)continue;alive=true;ctx.save();ctx.globalAlpha=Math.max(0,p.alpha);ctx.fillStyle=p.color;ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillRect(-p.sz/2,-p.sz/2,p.sz,p.sz*0.5);ctx.restore();}if(alive)raf=requestAnimationFrame(draw);};const t=setTimeout(()=>{raf=requestAnimationFrame(draw);},400);return()=>{clearTimeout(t);cancelAnimationFrame(raf);};},[]);
  const pm=PAYMENT_METHODS.find(m=>m.id===order.payMethod);
  const fade=(delay=0):React.CSSProperties=>({opacity:phase>=3?1:0,transform:phase>=3?"translateY(0)":"translateY(12px)",transition:`opacity 0.4s ${delay}s ease, transform 0.4s ${delay}s ease`});
  return(
    <div style={{fontFamily:"'Helvetica Neue',Arial,sans-serif",background:"#080808",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",padding:"2rem 1rem 4rem",WebkitFontSmoothing:"antialiased",position:"relative",overflow:"hidden"}}>
      <canvas ref={canvasRef} style={{position:"fixed",inset:0,zIndex:1,pointerEvents:"none",width:"100%",height:"100%"}}/>
      <div style={{position:"fixed",top:"15%",left:"50%",transform:"translateX(-50%)",width:360,height:360,pointerEvents:"none",zIndex:0,background:"radial-gradient(circle, rgba(255,255,255,0.035) 0%, transparent 70%)"}}/>
      <div style={{position:"relative",zIndex:2,width:"100%",maxWidth:460,background:"linear-gradient(160deg,#0f0f0f 0%,#0a0a0a 100%)",border:"1px solid #1c1c1c",borderRadius:20,padding:"2rem 1.75rem 2rem",boxShadow:"0 40px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.025)",marginTop:"1rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.75rem"}}><div style={{display:"flex",alignItems:"center",gap:7}}><img src="/favicon.png" alt="Fokus" width={18} height={18} style={{objectFit:"contain"}} draggable={false}/><span style={{fontWeight:900,fontSize:10,letterSpacing:5,color:"#fff"}}>FOKUS</span></div><span style={{fontSize:8,fontWeight:700,letterSpacing:1.5,color:"#222"}}>{order.orderId}</span></div>
        <div style={{display:"flex",justifyContent:"center",marginBottom:"1.6rem"}}><div style={{width:76,height:76,borderRadius:"50%",background:"linear-gradient(145deg,#161616,#0d0d0d)",border:"1.5px solid #222",display:"flex",alignItems:"center",justifyContent:"center",opacity:phase>=1?1:0,transform:phase>=1?"scale(1)":"scale(0.55)",transition:"opacity 0.45s cubic-bezier(0.34,1.4,0.64,1), transform 0.45s cubic-bezier(0.34,1.4,0.64,1)",boxShadow:"0 0 0 12px rgba(255,255,255,0.025)"}}>{phase>=1&&(<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><polyline points="4 12 9 17 20 7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="40" strokeDashoffset="0" style={{animation:"tyCheck 0.5s 0.1s cubic-bezier(0.65,0,0.35,1) both"}}/></svg>)}</div></div>
        <div style={{textAlign:"center",marginBottom:"1.6rem",opacity:phase>=2?1:0,transform:phase>=2?"translateY(0)":"translateY(14px)",transition:"opacity 0.4s ease, transform 0.4s ease"}}>
          <p style={{margin:"0 0 0.4rem",fontSize:9,fontWeight:800,letterSpacing:3.5,color:"#282828"}}>PEDIDO CONFIRMADO</p>
          <h1 style={{margin:"0 0 0.55rem",fontSize:26,fontWeight:900,letterSpacing:1.5,color:"#fff",lineHeight:1.1}}>¡Gracias por<br/>tu compra! 🖤</h1>
          <p style={{margin:0,fontSize:13,color:"#3a3a3a",lineHeight:1.7,maxWidth:300,marginLeft:"auto",marginRight:"auto"}}>Tu comprobante fue recibido. Ahora solo<br/>envía tu pedido por WhatsApp para confirmarlo.</p>
        </div>
        <div style={{...fade(0),background:"#0c0c0c",border:"1px solid #1a1a1a",borderRadius:14,padding:"1.1rem 1.35rem",marginBottom:"0.85rem",display:"flex",justifyContent:"space-between",alignItems:"center",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)"}}/>
          <div><p style={{margin:"0 0 2px",fontSize:8,fontWeight:800,letterSpacing:2.5,color:"#252525"}}>TOTAL</p><p style={{margin:0,fontSize:28,fontWeight:900,color:"#fff",letterSpacing:0.5,fontVariantNumeric:"tabular-nums"}}>${order.total.toFixed(2)}<span style={{fontSize:11,color:"#2a2a2a",marginLeft:4}}>USD</span></p></div>
          {pm&&(<div style={{textAlign:"right"}}><p style={{margin:"0 0 2px",fontSize:8,letterSpacing:2,color:"#252525",fontWeight:700}}>MÉTODO</p><p style={{margin:0,fontSize:13,fontWeight:700,color:"#4a4a4a"}}>{pm.name}</p></div>)}
        </div>
        {!!order.couponCode&&(<div style={{...fade(0.03),display:"flex",alignItems:"center",gap:"0.5rem",background:"rgba(255,212,59,0.06)",border:"1px solid rgba(255,212,59,0.18)",borderRadius:10,padding:"0.6rem 1rem",marginBottom:"0.85rem"}}><span style={{fontSize:13}}>🎟️</span><p style={{margin:0,fontSize:11,color:"#ffd43b",fontWeight:700}}>Cupón {order.couponCode} aplicado{order.couponDiscount?` · -$${order.couponDiscount.toFixed(2)}`:""}</p></div>)}
        {order.items.length>0&&(<div style={{...fade(0.06),border:"1px solid #151515",borderRadius:12,overflow:"hidden",marginBottom:"0.85rem"}}><div style={{padding:"0.5rem 1rem",borderBottom:"1px solid #111",display:"flex",justifyContent:"space-between"}}><span style={{fontSize:8,fontWeight:800,letterSpacing:2.5,color:"#222"}}>PRODUCTOS ({order.items.reduce((s,i)=>s+i.qty,0)})</span><span style={{fontSize:8,color:"#1c1c1c",fontWeight:700}}>PRECIO</span></div>{order.items.map((item,idx)=>(<div key={idx} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.7rem 1rem",borderBottom:idx<order.items.length-1?"1px solid #0f0f0f":"none"}}><div style={{display:"flex",alignItems:"center",gap:"0.6rem"}}><div style={{width:5,height:5,borderRadius:"50%",background:"#1e1e1e",flexShrink:0}}/><div><p style={{margin:"0 0 1px",fontSize:12,fontWeight:700,color:"#aaa"}}>{item.product.name}</p>{item.qty>1&&<p style={{margin:0,fontSize:10,color:"#2e2e2e"}}>× {item.qty}</p>}</div></div><span style={{fontSize:12,fontWeight:800,color:"#555",fontVariantNumeric:"tabular-nums"}}>${(getFinalPrice(item.product)*item.qty).toFixed(2)}</span></div>))}</div>)}
        {order.comprobanteUrl&&(<div style={{...fade(0.1),display:"flex",alignItems:"center",gap:"0.6rem",background:"rgba(76,175,80,0.05)",border:"1px solid rgba(76,175,80,0.12)",borderRadius:10,padding:"0.7rem 1rem",marginBottom:"0.85rem"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg><p style={{margin:0,fontSize:12,color:"#3a7a3a",fontWeight:700}}>Comprobante de pago recibido ✓</p></div>)}
        <div style={{...fade(0.12),height:1,background:"linear-gradient(90deg,transparent,#191919,transparent)",margin:"1.1rem 0"}}/>
        <div style={{...fade(0.15)}}>
          <a href={order.waUrl} target="_blank" rel="noreferrer" data-fokus-tracked="true" onClick={()=>{if(fired.current)return;fired.current=true;const nominalTotal=parseFloat(order.total.toFixed(2));const realTotal=parseFloat(getRealUsdValue(nominalTotal,order.payMethod).toFixed(2));const orderState=order.deliveryInfo.estado||(order.deliveryInfo.zone==="naguanagua"||order.deliveryInfo.zone==="valencia"?"Carabobo":undefined);if(realTotal>0){trackPurchase(order.orderId,realTotal,order.items,currentUser?.email,order.deliveryInfo.telefono||undefined,orderState);const orderCategory=[...new Set(order.items.map(i=>i.product.category))].join(", ");fsAddToCollection("manual_sales",{orderId:order.orderId,source:"web",name:currentUser?.displayName||order.deliveryInfo.nombre||"Cliente Web",email:currentUser?.email||"",phone:order.deliveryInfo.telefono||"",product:order.items.map(i=>`${i.product.name} x${i.qty}`).join(", "),category:orderCategory,amount:realTotal,payMethod:PAYMENT_METHODS.find(m=>m.id===order.payMethod)?.name||order.payMethod||"",state:orderState||"",notes:"Compra desde la web",createdAt:Date.now()}).catch(()=>{});}}} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"0.65rem",background:"#25D366",color:"#fff",padding:"1rem 1.25rem",borderRadius:12,textDecoration:"none",fontSize:12,fontWeight:900,letterSpacing:1.5,marginBottom:"0.65rem",boxShadow:"0 8px 24px rgba(37,211,102,0.18)",WebkitTapHighlightColor:"transparent"}}><IcWA s={18} c="#fff"/>ENVIAR PEDIDO POR WHATSAPP →</a>
          <p style={{textAlign:"center",fontSize:10,color:"#2a2a2a",margin:"0 0 1rem",lineHeight:1.6}}>Toca para abrir WhatsApp con tu pedido listo para enviar</p>
          <button onClick={onBack} style={{display:"flex",alignItems:"center",justifyContent:"center",width:"100%",background:"transparent",color:"#333",border:"1px solid #1a1a1a",padding:"0.8rem 1rem",borderRadius:12,fontSize:10,fontWeight:800,letterSpacing:2,cursor:"pointer",fontFamily:"inherit",WebkitTapHighlightColor:"transparent"}}>SEGUIR COMPRANDO</button>
        </div>
        <div style={{marginTop:"1.5rem",display:"flex",justifyContent:"center",alignItems:"center",gap:"0.45rem",opacity:phase>=3?0.4:0,transition:"opacity 0.5s 0.5s ease"}}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#2a2a2a" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><span style={{fontSize:8,color:"#222",letterSpacing:1.5,fontWeight:700}}>COMPRA VERIFICADA · FOKUS ® VENEZUELA</span></div>
      </div>
      <div style={{position:"relative",zIndex:2,marginTop:"1.5rem",display:"flex",gap:"0.5rem",opacity:phase>=3?1:0,transition:"opacity 0.5s 0.5s ease"}}>{[{href:SOCIAL.instagram,icon:<IcIG s={14}/>},{href:SOCIAL.tiktok,icon:<IcTT s={14}/>},{href:SOCIAL.facebook,icon:<IcFB s={14}/>}].map(({href,icon})=>(<a key={href} href={href} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"center",width:34,height:34,borderRadius:"50%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",textDecoration:"none"}}>{icon}</a>))}</div>
    </div>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN APP
// ══════════════════════════════════════════════════════════════════════════════
export default function Home() {
  const pathname = usePathname();
  const isProductDeepLink = useMemo(()=>!!pathname&&pathname.startsWith("/producto/"),[]); // se calcula igual en servidor y cliente
  const initialRoute = useMemo(()=>{
    if(isProductDeepLink)return{view:"shop" as MainView,filter:"TODO" as ShopFilter};
    return pathToShopState(pathname||"/");
  },[]); // solo la primera vez, evita el flash de "FOKUS"
  const[mainView,setMainViewRaw]   = useState<MainView>(initialRoute.view);
  const[shopFilter,setShopFilter]  = useState<ShopFilter>(initialRoute.filter);
  const[lentesOpen,setLentesOpen]  = useState(initialRoute.filter==="LENTES"||(LENTES_SUBCATS as readonly string[]).includes(initialRoute.filter));
  const[cart,setCart]              = useState<CartItem[]>([]);
  const[selectedProduct,setSel]    = useState<Product|null>(null);
  const[modalQty,setModalQty]      = useState(1);
  const[modalImgIdx,setModalImgIdx]= useState(0);
  const[menuOpen,setMenuOpen]      = useState(false);
  const[searchOpen,setSearchOpen]  = useState(false);
  const[searchQuery,setSearchQuery]= useState("");
const[payMethod,setPayMethod]    = useState<string|null>(null);
const[comprobanteUrl,setComprobante]=useState("");
const[couponInput,setCouponInput]=useState("");
const[appliedCoupon,setAppliedCoupon]=useState<Coupon|null>(null);
const[couponCheckLoading,setCouponCheckLoading]=useState(false);
const[couponCheckErr,setCouponCheckErr]=useState("");  const[products,setProducts]      = useState<Product[]>([]);
  const[loading,setLoading]        = useState(true);
  const[fbReady,setFbReady]        = useState(false);
  const[addedProduct,setAddedProduct]=useState<Product|null>(null);
  const[showAuth,setShowAuth]      = useState(false);
  const[currentUser,setCurrentUser]= useState<UserData|null|undefined>(undefined);
  const[lightboxIdx,setLightboxIdx]= useState<number|null>(null);
  const[orderSnap,setOrderSnap]    = useState<OrderSnapshot|null>(null);
  const[editingName,setEditingName]= useState(false);
  const[newName,setNewName]        = useState("");
  const[nameLoading,setNameLoading]= useState(false);
  const[photoLoading,setPhotoLoading]=useState(false);
  const[showReviewModal,setShowReviewModal]=useState(false);
const[copiedPay,setCopiedPay]=useState(false);
const photoInputRef              = useRef<HTMLInputElement>(null);
const[bcvRate,setBcvRate]        = useState<number|null>(null);
const[binanceRate,setBinanceRate]= useState<number|null>(null);
const[showBs,setShowBs]          = useState(true);
const[rateLoading,setRateLoading]= useState(false);
const BCV_CACHE_KEY = "fokus_bcv_rate";
const BCV_CACHE_TIME = "fokus_bcv_time";
const BCV_TTL = 6 * 60 * 60 * 1000; // 6 horas en ms
const BINANCE_CACHE_KEY = "fokus_binance_rate";
const BINANCE_CACHE_TIME = "fokus_binance_time";

const fetchBinanceRate = useCallback(async (force = false) => {
  if (!force) {
    try {
      const cached = localStorage.getItem(BINANCE_CACHE_KEY);
      const cachedTime = localStorage.getItem(BINANCE_CACHE_TIME);
      if (cached && cachedTime && Date.now() - Number(cachedTime) < BCV_TTL) {
        const parsed = parseFloat(cached);
        if (parsed > 0) { setBinanceRate(parsed); return; }
      }
    } catch { /* silent */ }
  }
  try {
    const r = await fetch("/api/binance");
    const d = await r.json();
    const parsed = parseFloat(d.rate ?? 0);
    if (parsed > 0) {
      setBinanceRate(parsed);
      try {
        localStorage.setItem(BINANCE_CACHE_KEY, String(parsed));
        localStorage.setItem(BINANCE_CACHE_TIME, String(Date.now()));
      } catch { /* silent */ }
    }
  } catch { /* silencioso */ }
}, []);

const fetchBcvRate = useCallback(async (force = false) => {
  if (!force) {
    try {
      const cached = localStorage.getItem(BCV_CACHE_KEY);
      const cachedTime = localStorage.getItem(BCV_CACHE_TIME);
      if (cached && cachedTime && Date.now() - Number(cachedTime) < BCV_TTL) {
        const parsed = parseFloat(cached);
        if (parsed > 0) {
          setBcvRate(parsed);
          return;
        }
      }
    } catch { /* silent */ }
  }

  setRateLoading(true);
  try {
    const r = await fetch("/api/bcv");
    const d = await r.json();
    const parsed = parseFloat(d.rate ?? 0);
    if (parsed > 0) {
      setBcvRate(parsed);
      try {
        localStorage.setItem(BCV_CACHE_KEY, String(parsed));
        localStorage.setItem(BCV_CACHE_TIME, String(Date.now()));
      } catch { /* silent */ }
      return;
    }
    throw new Error("sin tasa");
  } catch {
    try {
      const r2 = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
      const d2 = await r2.json();
      const parsed2 = parseFloat(d2.rates?.VES ?? 0);
      if (parsed2 > 0) {
        setBcvRate(parsed2);
        try {
          localStorage.setItem(BCV_CACHE_KEY, String(parsed2));
          localStorage.setItem(BCV_CACHE_TIME, String(Date.now()));
        } catch { /* silent */ }
      }
    } catch { /* silencioso */ }
  } finally {
    setRateLoading(false);
  }
}, []);
const fmtPrice=useCallback((usd:number)=>{if(showBs&&bcvRate){const bs=usd*bcvRate;return"Bs. "+Math.round(bs).toLocaleString("es-VE");}return"$"+usd.toFixed(2);},[showBs,bcvRate]);
  const BS_PAY_METHODS=useMemo(()=>new Set(["pagomovil_bv","pagomovil_ba"]),[]);
  const getRealUsdValue=useCallback((nominalUsd:number,payMethodId?:string)=>{
    if(!payMethodId||!BS_PAY_METHODS.has(payMethodId)||!bcvRate||!binanceRate)return nominalUsd;
    const bsAmount=nominalUsd*bcvRate;
    return bsAmount/binanceRate;
  },[bcvRate,binanceRate,BS_PAY_METHODS]);
  const setMainView=useCallback((v:MainView)=>{setMainViewRaw(v);scrollTop();},[]);
  const payMethodRef=useRef<HTMLDivElement>(null);
const comprobanteRef=useRef<HTMLDivElement>(null);
const payDetailsRef=useRef<HTMLDivElement>(null);
const otroAutoScrolled=useRef(false);
const[deliveryInfo,setDeliveryInfo]=useState<DeliveryInfo>({zone:"",nombre:"",cedula:"",telefono:"",agencia:"",direccion:"",estado:""});

  const navRef=useRef<HTMLElement>(null);
  const[navH,setNavH]=useState(NAV_H+TABS_H);
  useEffect(()=>{const upd=()=>{if(navRef.current)setNavH(navRef.current.offsetHeight);};upd();const ro=new ResizeObserver(upd);if(navRef.current)ro.observe(navRef.current);return()=>ro.disconnect();},[mainView,lentesOpen,searchOpen]);

  useEffect(()=>{initMetaPixel();},[]);
  useEffect(()=>{if(typeof window!=="undefined"&&(window as any).fbq)(window as any).fbq("track","PageView");},[mainView]);
  useEffect(()=>{setModalImgIdx(0);},[selectedProduct?.id]);

  // ─── URL ↔ ESTADO: cada apartado con su propio link + back/forward sin trabarse ──
  const isPoppingRef = useRef(false);
  const selectedProductRef = useRef<Product|null>(null);
  const modalPushedRef = useRef(false);
  const pendingProductDeepLinkRef = useRef(isProductDeepLink);
  const[deepLinkPending,setDeepLinkPending]=useState(isProductDeepLink);
  useEffect(()=>{selectedProductRef.current=selectedProduct;},[selectedProduct]);
  useEffect(()=>{
    if(typeof window==="undefined")return;
    if(isPoppingRef.current){isPoppingRef.current=false;return;}
    if(pendingProductDeepLinkRef.current)return;
    if(mainView==="thankyou")return;
    const path = mainView==="shop" ? shopFilterToPath(shopFilter) : (BASE_PATHS[mainView] || "/");
    if(window.location.pathname!==path)window.history.pushState({},"",path);
  },[mainView,shopFilter]);
  useEffect(()=>{
    if(typeof window==="undefined")return;
    const onPopState=(e:PopStateEvent)=>{
      if(window.location.pathname==="/admin"&&adminSecRef.current!=="menu"&&!(e.state&&(e.state as any).adminSec)){
        setAdminSec("menu");
        return;
      }
      isPoppingRef.current=true;
      if(selectedProductRef.current){
        modalPushedRef.current=false;
        setSel(null);
        setTimeout(()=>{isPoppingRef.current=false;},0);
        return;
      }
      const{view,filter}=pathToShopState(window.location.pathname);
      setMenuOpen(false);
      setSearchOpen(false);
      setSel(null);
      setShowAuth(false);
      setLightboxIdx(null);
      setShowReviewModal(false);
      setAddedProduct(null);
      setLentesOpen(filter==="LENTES"||(LENTES_SUBCATS as readonly string[]).includes(filter));
      setShopFilter(filter);
      setMainViewRaw(view);
      scrollTop();
      setTimeout(()=>{isPoppingRef.current=false;},0);
    };
    window.addEventListener("popstate",onPopState);
    return()=>window.removeEventListener("popstate",onPopState);
  },[]);

  const checkoutTracked=useRef(false);
  useEffect(()=>{
    if(mainView==="cart"&&cart.length>0&&!checkoutTracked.current){checkoutTracked.current=true;trackInitiateCheckout(cart,totalPrice,currentUser?.email);}
    if(mainView!=="cart")checkoutTracked.current=false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[mainView,cart.length]);

  const[adminLogged,setAdminLogged]=useState(false);
  const[adminEmail,setAdminEmail]  =useState("");
  const[adminPwd,setAdminPwd]      =useState("");
  const[adminErr,setAdminErr]      =useState("");
  const[adminSec,setAdminSec]=useState<"menu"|"products"|"sales"|"stats"|"coupons"|"lookup">("menu");
  const adminSecRef=useRef(adminSec);
  useEffect(()=>{adminSecRef.current=adminSec;},[adminSec]);
  const enterAdminSec=useCallback((sec:"products"|"sales"|"stats"|"coupons"|"lookup")=>{
    try{window.history.pushState({adminSec:sec},"","/admin");}catch{}
    setAdminSec(sec);
  },[]);
  const exitAdminSec=useCallback(()=>{
    if(typeof window!=="undefined"&&window.history.state&&(window.history.state as any).adminSec){
      window.history.back();
    }else{
      setAdminSec("menu");
    }
  },[]);
  const[adminCat,setAdminCat]      =useState("ALL");
  const[editing,setEditing]        =useState<Product|null>(null);
  const[fName,setFName]            =useState("");
  const[fDesc,setFDesc]            =useState("");
  const[fPrice,setFPrice]          =useState("");
  const[fCat,setFCat]              =useState("");
  const[fFile,setFFile]            =useState<File|null>(null);
  const[fPrev,setFPrev]            =useState("");
  const[fLoad,setFLoad]            =useState(false);
  const[fErr,setFErr]              =useState("");
  const[fOk,setFOk]                =useState("");
  const[fGallery,setFGallery]      =useState<string[]>([]);
  const[fGalleryUploading,setFGalleryUploading]=useState(false);
  const[fActive,setFActive]        =useState(true);
  const[fDiscount,setFDiscount]    =useState("");
  const[fCode,setFCode]            =useState("");
const[couponCode,setCouponCode]  =useState("");
const[couponType,setCouponType]  =useState<"general"|"product"|"category">("general");
const[couponProductId,setCouponProductId]=useState("");
const[couponProductSearch,setCouponProductSearch]=useState("");
const[couponProductCatFilter,setCouponProductCatFilter]=useState("ALL");
const[couponCategory,setCouponCategory]=useState("");
const[couponDiscount,setCouponDiscount]=useState("");
const[couponHours,setCouponHours]=useState("24");
const[couponLoading,setCouponLoading]=useState(false);
const[couponErr,setCouponErr]=useState("");
const[couponOk,setCouponOk]=useState("");
const[couponsList,setCouponsList]=useState<Coupon[]>([]);
const[couponsLoading,setCouponsLoading]=useState(false);
  const[adminSearch,setAdminSearch]=useState("");
  const[lookupCode,setLookupCode]=useState("");
  const[saleName,setSaleName]=useState("");
  const[saleEmail,setSaleEmail]=useState("");
  const[salePhone,setSalePhone]=useState("");
  const[saleProduct,setSaleProduct]=useState("");
  const[saleCategory,setSaleCategory]=useState("");
  const[saleAmount,setSaleAmount]=useState("");
  const[salePayMethod,setSalePayMethod]=useState("");
  const[saleState,setSaleState]=useState("");
  const[saleNotes,setSaleNotes]=useState("");
  const[saleSendMeta,setSaleSendMeta]=useState(true);
  const[saleIsBs,setSaleIsBs]=useState(false);
  const[saleLoading,setSaleLoading]=useState(false);
  const[saleErr,setSaleErr]=useState("");
  const[saleOk,setSaleOk]=useState("");
  const[salesList,setSalesList]=useState<Array<Record<string,unknown>&{id:string}>>([]);
  const[leadsList,setLeadsList]=useState<Array<Record<string,unknown>&{id:string}>>([]);
  const[statsLoading,setStatsLoading]=useState(false);
  const[statsErr,setStatsErr]=useState("");
  const[statsPeriod,setStatsPeriod]=useState<"7d"|"30d"|"90d"|"all">("30d");
  const[statsCategory,setStatsCategory]=useState("ALL");
  const statsLoaded=useRef(false);
const couponsLoaded=useRef(false);
  const fileRef =useRef<HTMLInputElement>(null);
  const galleryFileRef =useRef<HTMLInputElement>(null);
  const formRef =useRef<HTMLDivElement>(null);
  const[dragId,setDragId]  =useState<string|null>(null);
  const[overId,setOverId]  =useState<string|null>(null);
  const touchDragId    =useRef<string|null>(null);
  const touchDragActive=useRef(false);

  // ── Ref para el scroll horizontal del filtro de admin ──
  const adminCatRef = useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const el = adminCatRef.current;
    if(!el) return;
    const onWheel = (e: WheelEvent) => {
      if(Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // ya es scroll horizontal nativo
      e.preventDefault();
      el.scrollLeft += e.deltaY * 1.2;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(()=>{
    try{const stored=localStorage.getItem("fokus_user");if(stored){const parsed=JSON.parse(stored) as UserData;setCurrentUser(parsed);const rt=localStorage.getItem("fokus_refresh");if(rt&&parsed.uid){refreshIdToken(rt).then(async result=>{if(result){const fsData=await fsGetUser(parsed.uid).catch(()=>({photoURL:""}));setCurrentUser(prev=>{if(!prev)return prev;const updated={...prev,idToken:result.idToken,photoURL:fsData.photoURL||prev.photoURL||""};localStorage.setItem("fokus_user",JSON.stringify(updated));return updated;});}}).catch(()=>{});}}else{setCurrentUser(null);}}catch{setCurrentUser(null);}
  }, []);

  useEffect(() => {
  fetchBcvRate();
  fetchBinanceRate();

  // Actualiza cada 6 horas mientras la pestaña está abierta
  const interval = setInterval(() => {
    fetchBcvRate(true); // force = true para ignorar caché
    fetchBinanceRate(true);
  }, 6 * 60 * 60 * 1000);

  // También actualiza cuando el usuario vuelve a la pestaña
  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      fetchBcvRate(); // respeta el caché, solo actualiza si ya expiró
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    clearInterval(interval);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}, [fetchBcvRate]);

  useEffect(()=>{
    if(currentUser===undefined)return;if(currentUser)localStorage.setItem("fokus_user",JSON.stringify(currentUser));
    else{localStorage.removeItem("fokus_user");localStorage.removeItem("fokus_refresh");}
  },[currentUser]);

  useEffect(()=>{try{const s=sessionStorage.getItem("fokus_cart");if(s)setCart(JSON.parse(s) as CartItem[]);}catch{}},[]);
  useEffect(()=>{try{sessionStorage.setItem("fokus_cart",JSON.stringify(cart));}catch{}},[cart]);

  const productsAlreadyLoaded = useRef(false);

  const loadProducts = useCallback(async (forceRefresh = false) => {
    if (productsAlreadyLoaded.current && !forceRefresh) return;
    setLoading(true);
    try {
      if (!forceRefresh) {
        const cached = getCachedProducts();
        if (cached && cached.length > 0) {
          setProducts(cached);
          productsAlreadyLoaded.current = true;
          setLoading(false);
          return;
        }
      }
      const d = await fsGetAll();
      const sorted = d.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const final = sorted.length > 0 ? sorted : DEMO;
      setCachedProducts(final);
      setProducts(final);
      productsAlreadyLoaded.current = true;
    } catch {
      const stale = getCachedProducts();
      setProducts(stale && stale.length > 0 ? stale : DEMO);
      productsAlreadyLoaded.current = true;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ok = FIREBASE_CONFIG.projectId !== "TU_PROJECT_ID";
    setFbReady(ok);
    if (ok) loadProducts();
    else { setProducts(DEMO); setLoading(false); }
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path === "/admin") { setMainViewRaw("admin"); }
      else if (path.startsWith("/tienda/lentes/fotocromaticos")) { setMainViewRaw("shop"); setShopFilter("LENTES·FOTOCROMATICOS"); }
      else if (path.startsWith("/tienda/lentes/anti-luz-azul")) { setMainViewRaw("shop"); setShopFilter("LENTES·ANTI-LUZ-AZUL"); }
      else if (path.startsWith("/tienda/lentes/sol")) { setMainViewRaw("shop"); setShopFilter("LENTES·SOL"); }
      else if (path.startsWith("/tienda/lentes/motorizados")) { setMainViewRaw("shop"); setShopFilter("LENTES·MOTORIZADOS"); }
      else if (path.startsWith("/tienda/lentes")) { setMainViewRaw("shop"); setShopFilter("LENTES"); }
      else if (path.startsWith("/tienda/relojes")) { setMainViewRaw("shop"); setShopFilter("RELOJES"); }
      else if (path.startsWith("/tienda/collares")) { setMainViewRaw("shop"); setShopFilter("COLLARES"); }
      else if (path.startsWith("/tienda/pulseras")) { setMainViewRaw("shop"); setShopFilter("PULSERAS"); }
      else if (path.startsWith("/tienda/anillos")) { setMainViewRaw("shop"); setShopFilter("ANILLOS"); }
      else if (path.startsWith("/tienda/aretes")) { setMainViewRaw("shop"); setShopFilter("ARETES"); }
      else if (path.startsWith("/tienda/billeteras")) { setMainViewRaw("shop"); setShopFilter("BILLETERAS"); }
      else if (path.startsWith("/tienda")) { setMainViewRaw("shop"); setShopFilter("TODO"); }
      else if (path.startsWith("/comunidad")) { setMainViewRaw("comunidad"); }
      else if (path.startsWith("/grabados")) { setMainViewRaw("grabados"); }
      else if (path.startsWith("/carrito")) { setMainViewRaw("cart"); }
    }
  }, []);

  const deepLinkHandled = useRef(false);
  useEffect(()=>{
    if(typeof window==="undefined")return;
    if(deepLinkHandled.current)return;
    const id=productIdFromPath(window.location.pathname);
    if(!id){pendingProductDeepLinkRef.current=false;setDeepLinkPending(false);return;}
    if(!products.length)return;
    deepLinkHandled.current=true;
    const prod=products.find(p=>p.id===id);
    if(!prod){pendingProductDeepLinkRef.current=false;setDeepLinkPending(false);return;}
    const filter:ShopFilter=(ALL_SHOP_CATS as readonly string[]).includes(prod.category)?(prod.category as ShopFilter):"TODO";
    const shopPath=shopFilterToPath(filter);
    window.history.replaceState({},"",shopPath);
    window.history.pushState({fokusModal:true},"",productPath(prod));
    modalPushedRef.current=true;
    setMainViewRaw("shop");
    setShopFilter(filter);
    setLentesOpen(filter==="LENTES"||(LENTES_SUBCATS as readonly string[]).includes(filter));
    setSel(prod);
    setModalQty(1);
    trackViewContent(prod,currentUser?.email);
    pendingProductDeepLinkRef.current=false;
    setDeepLinkPending(false);
  },[products,currentUser?.email]);

  const handleProfilePhoto=useCallback(async(e:React.ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(!file||!currentUser)return;setPhotoLoading(true);try{const url=await uploadImg(file);let idToken=currentUser.idToken;if(!idToken){const rt=localStorage.getItem("fokus_refresh");if(rt){const res=await refreshIdToken(rt);if(res)idToken=res.idToken;}}await fsSaveUser(currentUser.uid,{photoURL:url},idToken).catch(()=>{});setCurrentUser(prev=>{if(!prev)return prev;const u={...prev,photoURL:url,idToken};localStorage.setItem("fokus_user",JSON.stringify(u));return u;});}catch(err){console.error("Error subiendo foto:",err);}finally{setPhotoLoading(false);if(photoInputRef.current)photoInputRef.current.value="";};},[currentUser]);

  const handleSaveName=useCallback(async()=>{if(!newName.trim()||!currentUser)return;setNameLoading(true);const updated:UserData={...currentUser,displayName:newName.trim()};setCurrentUser(updated);setEditingName(false);setNameLoading(false);},[currentUser,newName]);

  const catCounts=useMemo(()=>{const counts:Record<string,number>={};products.filter(p=>p.active!==false).forEach(p=>{const mc=p.category.startsWith("LENTES·")?"LENTES":p.category;counts[mc]=(counts[mc]||0)+1;if(p.category.startsWith("LENTES·"))counts[p.category]=(counts[p.category]||0)+1;});return counts;},[products]);

  const isLentesSubcat=useMemo(()=>(LENTES_SUBCATS as readonly string[]).includes(shopFilter),[shopFilter]);
  const isLentesActive=useMemo(()=>shopFilter==="LENTES"||isLentesSubcat,[shopFilter,isLentesSubcat]);
  const getVisCats=useCallback(():string[]=>{if(shopFilter==="TODO")return["LENTES·ANTI-LUZ-AZUL","LENTES·FOTOCROMATICOS","LENTES·SOL","LENTES·MOTORIZADOS",...SHOP_CATS.filter(c=>c!=="LENTES")];if(shopFilter==="LENTES")return[...LENTES_SUBCATS];return[shopFilter];},[shopFilter]);
  const getProds=useCallback((cat:string)=>products.filter(p=>p.category===cat&&p.active!==false&&(searchQuery===""||p.name.toLowerCase().includes(searchQuery.toLowerCase()))),[products,searchQuery]);
  const totalItems=useMemo(()=>cart.reduce((s,i)=>s+i.qty,0),[cart]);
  const totalPriceBeforeCoupon=useMemo(()=>cart.reduce((s,i)=>s+getFinalPrice(i.product)*i.qty,0),[cart]);
const couponDiscountAmount=useMemo(()=>{
  if(!appliedCoupon)return 0;
  if(appliedCoupon.type==="general")return totalPriceBeforeCoupon*(appliedCoupon.discountPercent/100);
  if(appliedCoupon.type==="category"){
    const catItems=cart.filter(i=>i.product.category===appliedCoupon.category);
    const catTotal=catItems.reduce((s,i)=>s+getFinalPrice(i.product)*i.qty,0);
    return catTotal*(appliedCoupon.discountPercent/100);
  }
  const item=cart.find(i=>i.product.id===appliedCoupon.productId);
  if(!item)return 0;
  return getFinalPrice(item.product)*item.qty*(appliedCoupon.discountPercent/100);
},[appliedCoupon,cart,totalPriceBeforeCoupon]);
const totalPrice=useMemo(()=>Math.max(0,totalPriceBeforeCoupon-couponDiscountAmount),[totalPriceBeforeCoupon,couponDiscountAmount]);
  const modalSuggestions=useMemo(()=>{
    if(!selectedProduct)return[];
    return products.filter(p=>p.category===selectedProduct.category&&p.id!==selectedProduct.id&&p.active!==false);
  },[selectedProduct,products]);

  const closeProdModal=useCallback(()=>{if(modalPushedRef.current)window.history.back();else setSel(null);},[]);

  const addToCart=useCallback((product:Product,qty:number)=>{
    setCart(prev=>{const ex=prev.find(i=>i.product.id===product.id);return ex?prev.map(i=>i.product.id===product.id?{...i,qty:i.qty+qty}:i):[...prev,{product,qty}];});
    closeProdModal();setMainView("cart");
    trackAddToCart(product,qty,currentUser?.email);
    requestAnimationFrame(()=>{scrollTop();setTimeout(scrollTop,60);setTimeout(scrollTop,220);});
  },[currentUser?.email,closeProdModal,setMainView]);

  const updQty=useCallback((id:string,d:number)=>setCart(prev=>prev.map(i=>i.product.id===id?{...i,qty:i.qty+d}:i).filter(i=>i.qty>0)),[]);

  const handleBuyNow=useCallback((product:Product)=>{
    setCart([{product,qty:1}]);
    trackAddToCart(product,1,currentUser?.email);
    setMainView("cart");
  },[currentUser?.email,setMainView]);

  const deliveryValid=useMemo(()=>{if(!deliveryInfo.zone)return false;if(deliveryInfo.zone==="otro")return!!(deliveryInfo.nombre&&deliveryInfo.cedula&&deliveryInfo.telefono&&deliveryInfo.agencia&&deliveryInfo.estado&&deliveryInfo.direccion);return true;},[deliveryInfo]);
  const canSendOrder=useMemo(()=>!!(payMethod&&deliveryValid&&comprobanteUrl),[payMethod,deliveryValid,comprobanteUrl]);

  const buildWaUrl=useCallback(()=>{const lines=cart.map(i=>`• ${i.product.name} ${i.product.code?`(${i.product.code}) `:""}x${i.qty} — $${(getFinalPrice(i.product)*i.qty).toFixed(2)}`);const pm=PAYMENT_METHODS.find(m=>m.id===payMethod);const pmL=pm?`\n\nMétodo de pago: ${pm.name} (${pm.detail})`:"";const dz=DELIVERY_ZONES_MAP.get(deliveryInfo.zone);let delivL=dz?`\n\nEnvio: ${dz.label}`:"";if(deliveryInfo.zone==="otro")delivL+=`\nEstado: ${deliveryInfo.estado}\nNombre: ${deliveryInfo.nombre}\nCédula: ${deliveryInfo.cedula}\nTeléfono: ${deliveryInfo.telefono}\nAgencia: ${deliveryInfo.agencia}\nDirección: ${deliveryInfo.direccion}`;const userL=currentUser?`\n\nCliente: ${currentUser.displayName} (${currentUser.email})`:"";const compL=comprobanteUrl?`\n\n📎 Comprobante: ${comprobanteUrl}`:"";const cupL=appliedCoupon?`\n\n🎟️ Cupón: ${appliedCoupon.code} (-${appliedCoupon.discountPercent}%, -$${couponDiscountAmount.toFixed(2)})`:"";return`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hola! Quiero hacer un pedido:\n\n${lines.join("\n")}\n\nSubtotal: $${totalPriceBeforeCoupon.toFixed(2)}${cupL}\n\nTotal: $${totalPrice.toFixed(2)}${pmL}${delivL}${userL}${compL}`)}`;},[cart,totalPrice,totalPriceBeforeCoupon,payMethod,deliveryInfo,currentUser,comprobanteUrl,appliedCoupon,couponDiscountAmount]);

  const handleSendOrder=useCallback(()=>{
    if(!canSendOrder){
      if(!deliveryInfo.zone){alert("Por favor selecciona el tipo de envio.");return;}
      if(deliveryInfo.zone==="otro"&&(!deliveryInfo.nombre||!deliveryInfo.cedula||!deliveryInfo.telefono||!deliveryInfo.agencia||!deliveryInfo.estado||!deliveryInfo.direccion)){alert("Por favor completa todos los datos de envío.");return;}
      if(!payMethod){alert("Por favor selecciona un método de pago.");return;}
      if(!comprobanteUrl){alert("Por favor sube el comprobante de pago para continuar.");return;}
      return;
    }
    const orderId=`FKS-${Date.now().toString(36).toUpperCase()}`;
    const snap:OrderSnapshot={items:[...cart],total:totalPrice,payMethod:payMethod!,deliveryInfo:{...deliveryInfo},comprobanteUrl,waUrl:buildWaUrl(),orderId,couponCode:appliedCoupon?.code,couponDiscount:appliedCoupon?couponDiscountAmount:undefined};
    setOrderSnap(snap);setCart([]);setComprobante("");setPayMethod(null);setDeliveryInfo({zone:"",nombre:"",cedula:"",telefono:"",agencia:"",direccion:"",estado:""});setAppliedCoupon(null);setCouponInput("");setMainView("thankyou");
  },[canSendOrder,cart,totalPrice,payMethod,deliveryInfo,comprobanteUrl,buildWaUrl,setMainView,appliedCoupon,couponDiscountAmount]);

  const doLogin=()=>{if(adminEmail===ADMIN_EMAIL&&adminPwd===ADMIN_PASSWORD){setAdminLogged(true);setAdminErr("");setAdminSec("menu");}else setAdminErr("Credenciales incorrectas");};
  const doLogout=()=>{setAdminLogged(false);setAdminEmail("");setAdminPwd("");setMainView("fokus");if(typeof window!=="undefined")window.history.pushState("","","/");};
  const resetForm=()=>{setEditing(null);setFName("");setFDesc("");setFPrice("");setFCat("");setFFile(null);setFPrev("");setFErr("");setFOk("");setFGallery([]);setFActive(true);setFDiscount("");setFCode("");if(fileRef.current)fileRef.current.value="";};
  const startEdit=(p:Product)=>{setEditing(p);setFName(p.name);setFDesc(p.description||"");setFPrice(String(p.price));setFCat(p.category);setFPrev(p.img);setFFile(null);setFGallery(p.images||[]);setFActive(p.active!==false);setFDiscount(p.discount&&p.discount>0?String(p.discount):"");setFCode(p.code||"");setFErr("");setFOk("");if(fileRef.current)fileRef.current.value="";setTimeout(()=>formRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),50);};
  const onFileChange=(e:React.ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(!file)return;setFFile(file);const r=new FileReader();r.onload=ev=>setFPrev(ev.target?.result as string);r.readAsDataURL(file);};
  const onGalleryFilesChange=async(e:React.ChangeEvent<HTMLInputElement>)=>{const files=Array.from(e.target.files||[]);if(!files.length)return;setFGalleryUploading(true);try{const urls=await Promise.all(files.map(f=>uploadImg(f)));setFGallery(prev=>[...prev,...urls]);}catch{setFErr("Error subiendo alguna de las fotos adicionales.");}finally{setFGalleryUploading(false);if(galleryFileRef.current)galleryFileRef.current.value="";}};
  const makeGalleryImageMain=(idx:number)=>{setFGallery(prevGal=>{const url=prevGal[idx];const newGal=[...prevGal];newGal.splice(idx,1);if(fPrev)newGal.push(fPrev);setFPrev(url);setFFile(null);return newGal;});};
  const removeGalleryImage=(idx:number)=>setFGallery(prev=>prev.filter((_,i)=>i!==idx));
  const moveGalleryImage=(idx:number,dir:-1|1)=>{setFGallery(prev=>{const arr=[...prev];const ni=idx+dir;if(ni<0||ni>=arr.length)return prev;[arr[idx],arr[ni]]=[arr[ni],arr[idx]];return arr;});};
  const toggleProductActive=async(p:Product)=>{const newActive=p.active===false;setProducts(prev=>{const upd=prev.map(x=>x.id===p.id?{...x,active:newActive}:x);setCachedProducts(upd);return upd;});try{await fsUpdate(p.id,{active:newActive});invalidateProductsCache();}catch{}};
  const promptDiscount=async(p:Product)=>{const current=p.discount&&p.discount>0?String(p.discount):"";const input=window.prompt(`Descuento para "${p.name}" (0-95). Deja vacío o 0 para quitar la oferta:`,current);if(input===null)return;const val=Math.max(0,Math.min(95,parseFloat(input)||0));setProducts(prev=>{const upd=prev.map(x=>x.id===p.id?{...x,discount:val}:x);setCachedProducts(upd);return upd;});try{await fsUpdate(p.id,{discount:val});invalidateProductsCache();}catch{}};
  const toggleProductBestseller=async(p:Product)=>{const newBestseller=!p.bestseller;setProducts(prev=>{const upd=prev.map(x=>x.id===p.id?{...x,bestseller:newBestseller}:x);setCachedProducts(upd);return upd;});try{await fsUpdate(p.id,{bestseller:newBestseller});invalidateProductsCache();}catch{}};

const loadCoupons=useCallback(async(force=false)=>{
  if(couponsLoaded.current&&!force)return;
  setCouponsLoading(true);
  try{
    const raw=await fsGetCollection("coupons",100);
    const list:Coupon[]=raw.map(r=>({id:r.id,code:(r.code as string)||"",type:((r.type as string)==="product"?"product":(r.type as string)==="category"?"category":"general"),productId:(r.productId as string)||"",productName:(r.productName as string)||"",category:(r.category as string)||"",discountPercent:Number(r.discountPercent)||0,durationHours:Number(r.durationHours)||0,createdAt:Number(r.createdAt)||0,expiresAt:Number(r.expiresAt)||0,active:r.active!==false}));
    list.sort((a,b)=>b.createdAt-a.createdAt);
    setCouponsList(list);
    couponsLoaded.current=true;
  }catch(err){setCouponErr("Error al cargar cupones: "+(err instanceof Error?err.message:"desconocido"));}
  finally{setCouponsLoading(false);}
},[]);

const resetCouponForm=()=>{setCouponCode(generateCouponCode());setCouponType("general");setCouponProductId("");setCouponProductSearch("");setCouponProductCatFilter("ALL");setCouponCategory("");setCouponDiscount("");setCouponHours("24");setCouponErr("");setCouponOk("");};

const submitCoupon=async()=>{
  setCouponErr("");setCouponOk("");
  const disc=parseFloat(couponDiscount);
  const hours=parseFloat(couponHours);
  if(!couponCode.trim()){setCouponErr("Ingresa o genera un código.");return;}
  if(!disc||disc<=0||disc>95){setCouponErr("El descuento debe ser entre 1 y 95%.");return;}
  if(!hours||hours<=0){setCouponErr("Ingresa la duración en horas.");return;}
  if(couponType==="product"&&!couponProductId){setCouponErr("Selecciona el producto para este cupón.");return;}
  if(couponType==="category"&&!couponCategory){setCouponErr("Selecciona la sección de accesorios para este cupón.");return;}
  setCouponLoading(true);
  try{
    const now=Date.now();
    const prod=couponType==="product"?products.find(p=>p.id===couponProductId):null;
    await fsAddToCollection("coupons",{code:couponCode.trim().toUpperCase(),type:couponType,productId:couponType==="product"?couponProductId:"",productName:prod?prod.name:"",category:couponType==="category"?couponCategory:"",discountPercent:Math.min(95,disc),durationHours:hours,createdAt:now,expiresAt:now+hours*3600000,active:true});
    setCouponOk("✓ Cupón creado correctamente");
    couponsLoaded.current=false;
    await loadCoupons(true);
    setTimeout(resetCouponForm,1600);
  }catch(err){setCouponErr("Error: "+(err instanceof Error?err.message:"desconocido"));}
  finally{setCouponLoading(false);}
};

const toggleCouponActive=async(c:Coupon)=>{
  const newActive=!c.active;
  setCouponsList(prev=>prev.map(x=>x.id===c.id?{...x,active:newActive}:x));
  try{await fsUpdateDoc("coupons",c.id,{active:newActive});}catch{}
};

const deleteCoupon=async(id:string)=>{
  if(!confirm("¿Eliminar este cupón?"))return;
  setCouponsList(prev=>prev.filter(c=>c.id!==id));
  try{await fsDeleteDoc("coupons",id);}catch{}
};

const extendCoupon=async(c:Coupon)=>{
  const input=window.prompt(`¿Cuántas horas quieres agregar al cupón ${c.code}?`,"24");
  if(input===null)return;
  const extraHours=parseFloat(input);
  if(!extraHours||extraHours<=0)return;
  const base=Math.max(Date.now(),c.expiresAt);
  const newExpiresAt=base+extraHours*3600000;
  setCouponsList(prev=>prev.map(x=>x.id===c.id?{...x,expiresAt:newExpiresAt,active:true}:x));
  try{await fsUpdateDoc("coupons",c.id,{expiresAt:newExpiresAt,active:true});}catch{}
};

const applyCouponCode=useCallback(async()=>{
  const code=couponInput.trim().toUpperCase();
  if(!code){setCouponCheckErr("Ingresa un código de cupón.");return;}
  setCouponCheckLoading(true);setCouponCheckErr("");
  try{
    const raw=await fsGetCollection("coupons",100);
    const now=Date.now();
    const found=raw.find(r=>((r.code as string)||"").toUpperCase()===code);
    if(!found){setCouponCheckErr("Cupón no válido.");setAppliedCoupon(null);return;}
    const active=found.active!==false;
    const expiresAt=Number(found.expiresAt)||0;
    if(!active||now>expiresAt){setCouponCheckErr("Este cupón ha expirado.");setAppliedCoupon(null);return;}
    const type=(found.type as string)==="product"?"product":(found.type as string)==="category"?"category":"general";
    if(type==="product"){
      const pid=(found.productId as string)||"";
      const inCart=cart.some(i=>i.product.id===pid);
      if(!inCart){setCouponCheckErr(`Este cupón solo aplica para "${found.productName||"un producto específico"}". Agrégalo al carrito.`);setAppliedCoupon(null);return;}
    }
    if(type==="category"){
      const catg=(found.category as string)||"";
      const inCart=cart.some(i=>i.product.category===catg);
      if(!inCart){setCouponCheckErr(`Este cupón solo aplica para la sección "${catLabel(catg)}". Agrega un artículo de esa sección al carrito.`);setAppliedCoupon(null);return;}
    }
    setAppliedCoupon({id:found.id,code:(found.code as string)||"",type,productId:(found.productId as string)||"",productName:(found.productName as string)||"",category:(found.category as string)||"",discountPercent:Number(found.discountPercent)||0,durationHours:Number(found.durationHours)||0,createdAt:Number(found.createdAt)||0,expiresAt,active:true});
    setCouponCheckErr("");
  }catch{setCouponCheckErr("Error al validar el cupón. Intenta de nuevo.");}
  finally{setCouponCheckLoading(false);}
},[couponInput,cart]);

const removeCoupon=useCallback(()=>{setAppliedCoupon(null);setCouponInput("");setCouponCheckErr("");},[]);

  const submitProduct=async()=>{
    setFErr("");setFOk("");
    if(!fName.trim()||!fPrice||!fCat){setFErr("Nombre, precio y categoría son obligatorios.");return;}
    if(!editing&&!fFile){setFErr("Selecciona una imagen.");return;}
    if(!fbReady){setFErr("Firebase no configurado.");return;}
    setFLoad(true);
    try{
      let imgUrl=fPrev;
      if(fFile)imgUrl=await uploadImg(fFile);
      const data={name:fName.trim(),description:fDesc.trim(),price:parseFloat(fPrice),category:fCat.toUpperCase(),img:imgUrl,active:fActive,discount:fDiscount?Math.max(0,Math.min(95,parseFloat(fDiscount))):0,images:fGallery,code:fCode.trim()?fCode.trim().toUpperCase():("FK-"+Date.now().toString(36).slice(-6).toUpperCase())};
      if(editing){await fsUpdate(editing.id,data);setFOk("✓ Producto actualizado");}
      else{await fsAdd(data);setFOk("✓ Producto agregado");}
      invalidateProductsCache();
      productsAlreadyLoaded.current = false;
      await loadProducts(true);
      fetch(`/api/catalog/revalidate?secret=fokus-revalidate-2024`,{method:"POST"}).catch(()=>{});
      setTimeout(resetForm,1800);
    }catch(err){setFErr("Error: "+(err instanceof Error?err.message:"desconocido"));}
    finally{setFLoad(false);}
  };

  const delProd=async(id:string)=>{
    if(!confirm("¿Eliminar este producto?"))return;
    await fsDelete(id);
    invalidateProductsCache();
    productsAlreadyLoaded.current = false;
    await loadProducts(true);
  };

  const resetSaleForm=()=>{setSaleName("");setSaleEmail("");setSalePhone("");setSaleProduct("");setSaleCategory("");setSaleAmount("");setSalePayMethod("");setSaleState("");setSaleNotes("");setSaleSendMeta(true);setSaleIsBs(false);setSaleErr("");setSaleOk("");};

  const submitManualSale=async()=>{
    setSaleErr("");setSaleOk("");
    const amountNum=parseFloat(saleAmount);
    if(!amountNum||amountNum<=0){setSaleErr("Ingresa un monto válido.");return;}
    if(saleSendMeta&&!saleEmail.trim()&&!salePhone.trim()){setSaleErr("Ingresa al menos el correo o el teléfono del cliente.");return;}
    setSaleLoading(true);
    try{
      const orderId=`FKS-WA-${Date.now().toString(36).toUpperCase()}`;
      const realAmount=saleIsBs&&bcvRate&&binanceRate?(amountNum*bcvRate)/binanceRate:amountNum;
      const roundedTotal=parseFloat(realAmount.toFixed(2));
      if(saleSendMeta){
        const eventId=genEventId();
        const normalizedPhone=salePhone.trim()?normalizeVEPhone(salePhone):"";
        // Solo CAPI (servidor) — nunca fbqTrack para ventas offline, esa sesión es la del admin, no la del cliente
        await sendCAPI("Purchase",eventId,{value:roundedTotal,currency:"USD",content_name:saleProduct.trim()||"Venta manual",content_type:"product"},{email:saleEmail.trim()||undefined,phone:normalizedPhone||undefined,state:saleState||undefined},"chat");
      }
      await fsAddToCollection("manual_sales",{orderId,source:saleSendMeta?"manual":"offline",name:saleName.trim(),email:saleEmail.trim(),phone:salePhone.trim(),product:saleProduct.trim(),category:saleCategory,amount:roundedTotal,payMethod:salePayMethod.trim(),state:saleState.trim(),notes:saleNotes.trim(),createdAt:Date.now()});
      setSaleOk(saleSendMeta?"✓ Venta registrada y enviada a Meta (CAPI)":"✓ Venta registrada solo en tu panel (no se envió a Meta)");
      statsLoaded.current=false;
      setTimeout(resetSaleForm,1800);
    }catch(err){
      setSaleErr("Error: "+(err instanceof Error?err.message:"desconocido"));
    }finally{
      setSaleLoading(false);
    }
  };

  const loadStats=useCallback(async(force=false)=>{
    if(statsLoaded.current&&!force)return;
    setStatsLoading(true);setStatsErr("");
    try{
      const[sales,leads]=await Promise.all([fsGetCollection("manual_sales"),fsGetCollection("leads")]);
      setSalesList(sales.sort((a,b)=>(Number(b.createdAt)||0)-(Number(a.createdAt)||0)));
      setLeadsList(leads.sort((a,b)=>(Number(b.createdAt)||0)-(Number(a.createdAt)||0)));
      statsLoaded.current=true;
    }catch(err){
      setStatsErr("Error al cargar estadísticas: "+(err instanceof Error?err.message:"desconocido"));
    }finally{
      setStatsLoading(false);
    }
  },[]);

  useEffect(()=>{if(adminSec==="stats")loadStats();},[adminSec,loadStats]);
useEffect(()=>{if(adminSec==="coupons"){loadCoupons();if(!couponCode)setCouponCode(generateCouponCode());}},[adminSec,loadCoupons]);

  const handleDragStart=useCallback((id:string)=>setDragId(id),[]);
  const handleDragOver=useCallback((id:string)=>setOverId(id),[]);
  const handleDragEnd=useCallback(async()=>{
    if(!dragId||!overId||dragId===overId){setDragId(null);setOverId(null);return;}
    setProducts(prev=>{
      const arr=[...prev];
      const fi=arr.findIndex(p=>p.id===dragId),ti=arr.findIndex(p=>p.id===overId);
      if(fi<0||ti<0)return prev;
      const[moved]=arr.splice(fi,1);arr.splice(ti,0,moved);
      arr.forEach((p,i)=>{if(p.order!==i&&fbReady)fsUpdate(p.id,{order:i}).catch(()=>{});});
      const reordered=arr.map((p,i)=>({...p,order:i}));
      setCachedProducts(reordered);
      return reordered;
    });
    setDragId(null);setOverId(null);
  },[dragId,overId,fbReady]);

  const handleTouchDragStart=useCallback((id:string)=>{touchDragId.current=id;touchDragActive.current=true;setDragId(id);},[]);
  const handleTouchDragMove=useCallback((y:number,x:number)=>{if(!touchDragActive.current||!touchDragId.current)return;const el=document.elementFromPoint(x,y);if(!el)return;const row=el.closest("[data-rowid]") as HTMLElement|null;if(row){const id=row.dataset.rowid;if(id&&id!==touchDragId.current)setOverId(id);}},[]);
  const handleTouchDragEnd=useCallback(()=>{
    const from=touchDragId.current,to=overId;
    touchDragId.current=null;touchDragActive.current=false;setDragId(null);
    if(!from||!to||from===to){setOverId(null);return;}
    setProducts(prev=>{
      const arr=[...prev];
      const fi=arr.findIndex(p=>p.id===from),ti=arr.findIndex(p=>p.id===to);
      if(fi<0||ti<0)return prev;
      const[moved]=arr.splice(fi,1);arr.splice(ti,0,moved);
      arr.forEach((p,i)=>{if(p.order!==i&&fbReady)fsUpdate(p.id,{order:i}).catch(()=>{});});
      const reordered=arr.map((p,i)=>({...p,order:i}));
      setCachedProducts(reordered);
      return reordered;
    });
    setOverId(null);
  },[overId,fbReady]);

  const adminProds=useMemo(()=>{let l=products;if(adminCat!=="ALL")l=l.filter(p=>p.category===adminCat);if(adminSearch!=="")l=l.filter(p=>p.name.toLowerCase().includes(adminSearch.toLowerCase())||p.category.toLowerCase().includes(adminSearch.toLowerCase()));return l;},[products,adminCat,adminSearch]);
  const usedCats=useMemo(()=>[...new Set(products.map(p=>p.category))].sort(),[products]);

  const periodCutoff=useMemo(()=>{
    if(statsPeriod==="all")return 0;
    const daysBack=statsPeriod==="7d"?7:statsPeriod==="30d"?30:90;
    const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-(daysBack-1));
    return d.getTime();
  },[statsPeriod]);

  const filteredSales=useMemo(()=>salesList.filter(s=>(Number(s.createdAt)||0)>=periodCutoff&&(statsCategory==="ALL"||(s.category as string)===statsCategory)),[salesList,periodCutoff,statsCategory]);
  const filteredLeads=useMemo(()=>leadsList.filter(l=>(Number(l.createdAt)||0)>=periodCutoff),[leadsList,periodCutoff]);
  const salesCategories=useMemo(()=>[...new Set(salesList.map(s=>s.category as string).filter(Boolean))].sort(),[salesList]);

  const salesStats=useMemo(()=>{
    const onlineSales=filteredSales.filter(s=>s.source!=="offline");
    const offlineSales=filteredSales.filter(s=>s.source==="offline");
    const totalRevenue=onlineSales.reduce((s,sale)=>s+(Number(sale.amount)||0),0);
    const offlineRevenue=offlineSales.reduce((s,sale)=>s+(Number(sale.amount)||0),0);
    const totalSales=onlineSales.length;
    const avgTicket=totalSales>0?totalRevenue/totalSales:0;
    const totalLeads=filteredLeads.length;
    const conversionRate=totalLeads>0?(totalSales/totalLeads)*100:0;
    const payMethodCounts:Record<string,number>={};
    onlineSales.forEach(s=>{const pm=(s.payMethod as string)||"Sin especificar";payMethodCounts[pm]=(payMethodCounts[pm]||0)+1;});
    const topPayMethod=Object.entries(payMethodCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]||"—";
    const bucketCount=statsPeriod==="7d"?7:statsPeriod==="30d"?30:statsPeriod==="90d"?13:12;
    const bucketDays=statsPeriod==="90d"?7:statsPeriod==="all"?30:1;
    const allForChart=onlineSales.concat(offlineSales);
    const days:{label:string;total:number}[]=[];
    for(let i=bucketCount-1;i>=0;i--){
      const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i*bucketDays);
      const dayStart=d.getTime();const dayEnd=dayStart+bucketDays*86400000;
      const total=allForChart.filter(s=>{const t=Number(s.createdAt)||0;return t>=dayStart&&t<dayEnd;}).reduce((s,sale)=>s+(Number(sale.amount)||0),0);
      const label=bucketDays===1?d.toLocaleDateString("es-VE",{weekday:"short"}).toUpperCase():d.toLocaleDateString("es-VE",{day:"2-digit",month:"short"}).toUpperCase();
      days.push({label,total});
    }
    const maxDay=Math.max(1,...days.map(d=>d.total));
    return{totalRevenue,offlineRevenue,totalSales,offlineCount:offlineSales.length,avgTicket,totalLeads,conversionRate,topPayMethod,days,maxDay,onlineSales,offlineSales};
  },[filteredSales,filteredLeads,statsPeriod]);

  const isShop  = mainView==="shop";
  const isAdmin = mainView==="admin";
  const isCart  = mainView==="cart";
  const isTY    = mainView==="thankyou";
  const stickyTop=navH-1;
  const TABS=[{id:"fokus" as MainView,l:"FOKUS"},{id:"shop" as MainView,l:"TIENDA"},{id:"comunidad" as MainView,l:"COMUNIDAD"},{id:"grabados" as MainView,l:"GRABADOS"}];

  const openProd=useCallback((p:Product)=>{setSel(p);setModalQty(1);trackViewContent(p,currentUser?.email);window.history.pushState({fokusModal:true},"",productPath(p));modalPushedRef.current=true;},[currentUser?.email]);
  const switchModalProduct=useCallback((p:Product)=>{
    setSel(p);setModalQty(1);setModalImgIdx(0);trackViewContent(p,currentUser?.email);
    const path=productPath(p);
    if(modalPushedRef.current)window.history.replaceState({fokusModal:true},"",path);
    else{window.history.pushState({fokusModal:true},"",path);modalPushedRef.current=true;}
  },[currentUser?.email]);
  const modalBuyNow=useCallback((p:Product)=>{closeProdModal();handleBuyNow(p);},[closeProdModal,handleBuyNow]);
  const userReady=currentUser!==undefined;

  if(isTY&&orderSnap){
    return(
      <>
        <style>{GLOBAL_CSS}</style>
        <ThankYouView order={orderSnap} onBack={()=>{setOrderSnap(null);setMainView("shop");setShopFilter("TODO");}} currentUser={currentUser} getRealUsdValue={getRealUsdValue}/>
      </>
    );
  }

  if(deepLinkPending){
    return(
      <>
        <style>{GLOBAL_CSS}</style>
        <div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{width:34,height:34,border:"2px solid #222",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
        </div>
      </>
    );
  }

  return(
    <div style={{fontFamily:"'Helvetica Neue',Arial,sans-serif",background:C.bg,minHeight:"100vh",color:C.text}}>
      <style>{GLOBAL_CSS}</style>

      {/* NAVBAR */}
      <nav ref={navRef} style={{position:"fixed",top:0,left:0,right:0,zIndex:200,background:"rgba(8,8,8,0.96)",borderBottom:"1px solid #161616",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 1rem",height:NAV_H,position:"relative"}}>
          <button onClick={()=>setMenuOpen(true)} style={S.iconBtn} aria-label="Menú">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></svg>
          </button>
          <button onClick={()=>setMainView("fokus")} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:7,position:"absolute",left:"50%",transform:"translateX(-50%)",padding:"0 8px",WebkitTapHighlightColor:"transparent",maxWidth:"calc(100% - 120px)"}}>
            <img src="/favicon.png" alt="Fokus" width={26} height={26} style={{objectFit:"contain",flexShrink:0,pointerEvents:"none"}} draggable={false}/>
            <span className="fokus-logo" style={{color:"#fff",fontSize:18,whiteSpace:"nowrap"}}>FOKUS</span>
          </button>
          <div style={{display:"flex",alignItems:"center",marginLeft:"auto",gap:0}}>
            <button onClick={()=>{const n=!searchOpen;setSearchOpen(n);setSearchQuery("");if(n&&mainView!=="shop"){setMainViewRaw("shop");setShopFilter("TODO");scrollTop();}}} style={S.iconBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            </button>
            <button onClick={()=>{if(!userReady)return;currentUser?setMainView("account"):setShowAuth(true);}} style={{...S.iconBtn,position:"relative"}}>
              {userReady&&currentUser?<UserAvatar user={currentUser} size={26}/>:<IcUser s={19} c="#fff"/>}
            </button>
            <button onClick={()=>setMainView("cart")} style={{...S.iconBtn,position:"relative"}}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
              {totalItems>0&&<span style={{position:"absolute",top:4,right:4,background:"#fff",color:"#080808",borderRadius:"50%",width:15,height:15,fontSize:8,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>{totalItems}</span>}
            </button>
          </div>
        </div>
        {!isAdmin&&(
          <NativeTabs items={TABS.map(t=>t.id)} active={mainView} onSelect={id=>{setMainView(id as MainView);if(id==="shop")setShopFilter("TODO");}} height={TABS_H}
            renderItem={(id,a)=>{const l=TABS.find(t=>t.id===id)?.l??id;return<span className="nb" style={{display:"flex",alignItems:"center",padding:"0 1.4rem",height:"100%",borderBottom:a?"2px solid #fff":"2px solid transparent",fontSize:10,fontWeight:800,letterSpacing:2.5,color:a?"#fff":"#444",whiteSpace:"nowrap",transition:"color 0.15s,border-color 0.15s"}}>{l}</span>;}}/>
        )}
        {searchOpen&&(
          <div style={{background:"#111",borderTop:`1px solid ${C.border}`,padding:"0.55rem 1rem"}}>
            <input autoFocus value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Buscar productos…" style={{...S.input,borderRadius:8}}/>
          </div>
        )}
        <div style={{borderTop:"1px solid #161616",padding:"0 1rem",height:36,display:"flex",alignItems:"center",justifyContent:"space-between",gap:"0.5rem"}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:rateLoading?"#555":bcvRate?"#4caf50":"#555",flexShrink:0}}/>
            <span style={{fontSize:10,color:"#444",fontWeight:700,letterSpacing:0.5}}>
              {rateLoading?"Cargando tasa BCV…":bcvRate?`1 USD = ${bcvRate.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})} Bs · BCV`:"Tasa BCV"}
            </span>
          </div>
          <button
            onClick={()=>{if(!showBs)fetchBcvRate();setShowBs(s=>!s);}}
            style={{display:"flex",alignItems:"center",gap:5,background:showBs?"#fff":"#1a1a1a",color:showBs?"#080808":"#888",border:`1px solid ${showBs?"#fff":"#2a2a2a"}`,borderRadius:20,padding:"4px 14px",fontSize:10,fontWeight:900,letterSpacing:1.5,cursor:"pointer",fontFamily:"inherit",flexShrink:0,transition:"all 0.15s",WebkitTapHighlightColor:"transparent",touchAction:"manipulation"}}
          >
            {showBs?"VER EN USD ↕":"VER EN BS ↕"}
          </button>
        </div>
      </nav>

      {/* MENÚ LATERAL */}
      {menuOpen&&(
        <div style={{position:"fixed",inset:0,zIndex:300,display:"flex"}}>
          <div onClick={()=>setMenuOpen(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.8)",animation:"fadeIn 0.2s ease"}}/>
          <div style={{position:"relative",background:"#0e0e0e",width:272,height:"100%",padding:"2rem 1.5rem",overflowY:"auto",display:"flex",flexDirection:"column",animation:"slideInLeft 0.22s cubic-bezier(0.25,0.46,0.45,0.94)",borderRight:"1px solid #1a1a1a"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"2rem"}}>
              <span style={{fontWeight:900,fontSize:11,letterSpacing:3,color:"#555"}}>CATEGORÍAS</span>
              <button onClick={()=>setMenuOpen(false)} style={{...S.iconBtn,padding:4}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <button onClick={()=>setLentesOpen(o=>!o)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",background:"none",border:"none",borderBottom:`1px solid ${C.border}`,padding:"0.85rem 0",textAlign:"left",fontSize:14,cursor:"pointer",fontFamily:"inherit",color:"#d0d0d0",WebkitTapHighlightColor:"transparent"}}>
              <span style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>Lentes{catCounts["LENTES"]>0&&<span style={{fontSize:9,color:"#333",background:"#1a1a1a",padding:"1px 5px",borderRadius:8,fontWeight:700}}>{catCounts["LENTES"]}</span>}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" style={{transition:"transform 0.22s",transform:lentesOpen?"rotate(180deg)":"rotate(0deg)"}}><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {lentesOpen&&<div style={{paddingLeft:"1rem",borderBottom:`1px solid ${C.border}`}}>{LENTES_SUBCATS.map(sub=>(<button key={sub} onClick={()=>{setShopFilter(sub);setMenuOpen(false);setMainView("shop");}} style={{display:"flex",justifyContent:"space-between",width:"100%",background:"none",border:"none",padding:"0.6rem 0",textAlign:"left",fontSize:13,cursor:"pointer",fontFamily:"inherit",color:"#555",WebkitTapHighlightColor:"transparent"}}><span>{catLabel(sub)}</span>{catCounts[sub]>0&&<span style={{fontSize:9,color:"#2a2a2a",background:"#141414",padding:"1px 5px",borderRadius:10}}>{catCounts[sub]}</span>}</button>))}</div>}
            {SHOP_CATS.filter(c=>c!=="LENTES").map(cat=>(<button key={cat} onClick={()=>{setShopFilter(cat);setMenuOpen(false);setMainView("shop");}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",background:"none",border:"none",borderBottom:`1px solid ${C.border}`,padding:"0.85rem 0",textAlign:"left",fontSize:14,cursor:"pointer",fontFamily:"inherit",color:"#d0d0d0",WebkitTapHighlightColor:"transparent"}}><span>{catLabel(cat)}</span>{catCounts[cat]>0&&<span style={{fontSize:9,color:"#333",background:"#1a1a1a",padding:"1px 5px",borderRadius:8,fontWeight:700}}>{catCounts[cat]}</span>}</button>))}
            <div style={{marginTop:"auto",paddingTop:"2rem"}}>
              {userReady&&currentUser?(
                <div style={{marginBottom:"1rem",background:"#141414",borderRadius:10,padding:"0.85rem",border:"1px solid #1a1a1a"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginBottom:"0.5rem"}}><UserAvatar user={currentUser} size={32}/><div><p style={{margin:"0 0 1px",fontSize:12,fontWeight:700,color:"#fff"}}>{currentUser.displayName}</p><p style={{margin:0,fontSize:10,color:"#444"}}>{currentUser.email}</p></div></div>
                  <button onClick={()=>{setCurrentUser(null);setMenuOpen(false);}} style={{background:"none",border:"1px solid #2a2a2a",color:"#555",padding:"0.35rem 0.85rem",borderRadius:6,cursor:"pointer",fontFamily:"inherit",fontSize:10,fontWeight:700,WebkitTapHighlightColor:"transparent"}}>Cerrar sesión</button>
                </div>
              ):(
                <button onClick={()=>{setMenuOpen(false);setShowAuth(true);}} style={{...S.darkBtn,width:"100%",justifyContent:"center",borderRadius:8,marginBottom:"1rem",fontSize:11}}><IcUser s={14} c="#080808"/> ENTRAR / REGISTRARSE</button>
              )}
              <p style={{fontSize:9,letterSpacing:3,color:"#333",marginBottom:"0.85rem",fontWeight:700}}>SÍGUENOS</p>
              <div style={{display:"flex",gap:"0.6rem"}}><a href={SOCIAL.whatsapp} target="_blank" rel="noreferrer" className="sl" style={S.socialA}><IcWA s={16}/></a><a href={SOCIAL.instagram} target="_blank" rel="noreferrer" className="sl" style={S.socialA}><IcIG s={16}/></a><a href={SOCIAL.facebook} target="_blank" rel="noreferrer" className="sl" style={S.socialA}><IcFB s={16}/></a><a href={SOCIAL.tiktok} target="_blank" rel="noreferrer" className="sl" style={S.socialA}><IcTT s={16}/></a></div>
            </div>
          </div>
        </div>
      )}

      {/* ── HOME ── */}
      {mainView==="fokus"&&(
        <main className="pv" style={{paddingTop:navH,background:C.bg}}>
          <div style={{maxWidth:760,margin:"0 auto",padding:"4rem 1.5rem 0",textAlign:"center",animation:"slideUp 0.5s ease"}}>
            <div style={{marginBottom:"2rem"}}><img src="/favicon.png" alt="Fokus" width={64} height={64} style={{objectFit:"contain",filter:"brightness(1.1)",pointerEvents:"none"}} draggable={false}/></div>

            {/* ── ETIQUETA PREMIUM "ACCESORIOS PARA CABALLERO" ── */}
            <div style={{
              display:"inline-flex",
              alignItems:"center",
              gap:"0.55rem",
              marginBottom:"1rem",
              padding:"0.45rem 1.1rem 0.45rem 0.75rem",
              borderRadius:40,
              background:"linear-gradient(135deg,rgba(255,255,255,0.06) 0%,rgba(255,255,255,0.02) 100%)",
              border:"1px solid rgba(255,255,255,0.1)",
              backdropFilter:"blur(12px)",
              WebkitBackdropFilter:"blur(12px)",
              boxShadow:"0 1px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
              position:"relative",
              overflow:"hidden",
            }}>
              {/* shimmer sweep */}
              <div style={{
                position:"absolute",
                inset:0,
                background:"linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.06) 50%,transparent 100%)",
                backgroundSize:"200% 100%",
                animation:"badgeShimmer 3s ease infinite",
                pointerEvents:"none",
                borderRadius:"inherit",
              }}/>
              {/* diamond icon */}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{flexShrink:0,position:"relative"}}>
                <path d="M6 3h12l4 6-10 12L2 9z" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M2 9h20M6 3l4 6 2-6M18 3l-4 6-2-6" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeLinejoin="round"/>
              </svg>
              <span style={{
                fontSize:9,
                fontWeight:800,
                letterSpacing:3,
                color:"rgba(255,255,255,0.5)",
                textTransform:"uppercase" as const,
                position:"relative",
                whiteSpace:"nowrap",
              }}>ACCESORIOS PARA CABALLERO</span>
            </div>

            <h1 className="fokus-logo" style={{fontSize:46,marginBottom:"0.85rem",color:C.accent,lineHeight:1}}>FOKUS</h1>
            <p style={{fontSize:14,color:"#444",lineHeight:1.7,maxWidth:300,margin:"0 auto 2rem"}}>Cada detalle +<br/>Calidad, diseño y actitud.</p>
            <div style={{maxWidth:360,margin:"0 auto 2rem"}}><div style={{background:"linear-gradient(135deg,rgba(255,255,255,0.04) 0%,rgba(255,255,255,0.01) 100%)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"0.85rem 1.25rem",display:"flex",alignItems:"center",gap:"0.85rem",position:"relative",overflow:"hidden",boxShadow:"0 0 32px rgba(255,255,255,0.02), inset 0 1px 0 rgba(255,255,255,0.05)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)"}}><div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,transparent 0%,rgba(76,175,80,0.04) 50%,transparent 100%)",backgroundSize:"200% 100%",animation:"badgeShimmer 3s ease infinite",pointerEvents:"none"}}/><div style={{width:38,height:38,borderRadius:10,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><IcTruck s={20} c="rgba(255,255,255,0.6)"/></div><div style={{textAlign:"left",position:"relative",flex:1}}><p style={{margin:"0 0 2px",fontSize:11,fontWeight:900,color:"rgba(255,255,255,0.75)",letterSpacing:1.5}}>ENVÍOS A TODA VENEZUELA</p><p style={{margin:0,fontSize:10,color:"rgba(255,255,255,0.25)"}}>Llegamos a cualquier estado del país</p></div><div style={{width:6,height:6,borderRadius:"50%",background:"rgba(255,255,255,0.5)",boxShadow:"0 0 0 3px rgba(255,255,255,0.08)",animation:"pulseRing 2s infinite",flexShrink:0}}/></div></div>
            <button onClick={()=>{setMainView("shop");setShopFilter("TODO");}} style={{...S.darkBtn,fontSize:11,padding:"1.1rem 2.8rem",letterSpacing:3,borderRadius:3}}>VER COLECCIÓN →</button><div style={{maxWidth:360,margin:"1.5rem auto 0",background:"linear-gradient(135deg,rgba(255,255,255,0.03) 0%,rgba(255,255,255,0.01) 100%)",border:"1px solid #1e1e1e",borderRadius:14,padding:"1rem 1.25rem",position:"relative",overflow:"hidden"}}><div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.02) 50%,transparent 100%)",backgroundSize:"200% 100%",animation:"badgeShimmer 4s ease infinite",pointerEvents:"none"}}/><div style={{display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"0.6rem",position:"relative"}}><div style={{width:32,height:32,borderRadius:8,background:"rgba(255,255,255,0.04)",border:"1px solid #2a2a2a",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg></div><div style={{flex:1}}><p style={{margin:0,fontSize:11,fontWeight:900,color:"rgba(255,255,255,0.6)",letterSpacing:1.5}}>GRABADOS LÁSER</p><p style={{margin:0,fontSize:9,color:"#2a2a2a",letterSpacing:0.5}}>Personalización exclusiva</p></div><span/></div><p style={{margin:0,fontSize:11,color:"#444",lineHeight:1.75,position:"relative"}}>Personalizamos tu <span style={{color:"rgba(255,255,255,0.3)",fontWeight:700}}>reloj</span>, <span style={{color:"rgba(255,255,255,0.3)",fontWeight:700}}>pulsera</span>, <span style={{color:"rgba(255,255,255,0.3)",fontWeight:700}}>collar</span> y <span style={{color:"rgba(255,255,255,0.3)",fontWeight:700}}>billetera</span> con tu nombre, fecha o diseño especial.</p></div>
            <div style={{display:"flex",justifyContent:"center",gap:"0.75rem",marginTop:"3rem"}}><a href={SOCIAL.instagram} target="_blank" rel="noreferrer" className="sl" style={S.socialA}><IcIG s={18}/></a><a href={SOCIAL.tiktok} target="_blank" rel="noreferrer" className="sl" style={S.socialA}><IcTT s={18}/></a><a href={SOCIAL.facebook} target="_blank" rel="noreferrer" className="sl" style={S.socialA}><IcFB s={18}/></a><a href={SOCIAL.whatsapp} target="_blank" rel="noreferrer" className="sl" style={{...S.socialA,border:"1px solid #1e2e1e",background:"#0e1e0e"}}><IcWA s={18}/></a></div>
          </div>
          <Footer setMainView={setMainView} setShopFilter={setShopFilter}/>
        </main>
      )}

      {/* TIENDA */}
      {isShop&&(
        <main className="pv" style={{paddingTop:navH,background:C.bg}}>
          
      <div style={{position:"sticky",top:stickyTop,zIndex:100,background:"rgba(8,8,8,0.97)",borderBottom:`1px solid ${C.border}`,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)"}}>
            <NativeTabs
              items={["TODO","LENTES",...(SHOP_CATS.filter(c=>c!=="LENTES") as string[])]}
              active={shopFilter==="TODO"?"TODO":isLentesActive?"LENTES":(SHOP_CATS.filter(c=>c!=="LENTES") as string[]).includes(shopFilter)?shopFilter:"TODO"}
              onSelect={item=>{if(item==="LENTES"){const n=!lentesOpen;setLentesOpen(n);if(n)setShopFilter("LENTES");}else{setShopFilter(item as ShopFilter);setLentesOpen(false);}scrollTop();}}
              height={44}
              renderItem={(item,_)=>{const a=item==="TODO"?shopFilter==="TODO":item==="LENTES"?isLentesActive:shopFilter===item;return(<span className="nb" style={{display:"flex",alignItems:"center",gap:4,padding:"0 1rem",height:44,borderBottom:a?"2px solid #fff":"2px solid transparent",fontSize:10,fontWeight:800,letterSpacing:2,color:a?"#fff":"#3e3e3e",whiteSpace:"nowrap",transition:"color 0.15s,border-color 0.15s"}}>{item}{item==="LENTES"&&<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{transition:"transform 0.2s",transform:lentesOpen?"rotate(180deg)":"rotate(0deg)"}}><polyline points="6 9 12 15 18 9"/></svg>}</span>);}}
            />
            {lentesOpen&&(
              <div className="ts" style={{background:"#0a0a0a",borderTop:"1px solid #1a1a1a",padding:"0.55rem 1rem",display:"flex",gap:"0.45rem",overflowX:"auto",scrollbarWidth:"none",WebkitOverflowScrolling:"touch",touchAction:"pan-x"}}>
                {LENTES_SUBCATS.map(sub=>(<button key={sub} onClick={()=>{setShopFilter(sub);scrollTop();}} style={{background:shopFilter===sub?"#fff":"transparent",color:shopFilter===sub?"#080808":"#444",border:`1px solid ${shopFilter===sub?"#fff":"#252525"}`,padding:"0.28rem 0.85rem",borderRadius:20,fontSize:9,fontWeight:800,letterSpacing:1.2,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0,WebkitTapHighlightColor:"transparent",transition:"all 0.15s ease"}}>{catLabel(sub).toUpperCase()}</button>))}
              </div>
            )}
          </div>
          <div style={{maxWidth:1200,margin:"0 auto",padding:"1.5rem 1rem 5rem"}}>
            {loading?(
              <div className="pg" style={{display:"grid",gap:"1rem"}}>{Array.from({length:8}).map((_,i)=><SkeletonCard key={i}/>)}</div>
            ):shopFilter==="TODO"?(
              getVisCats().map(cat=>{
                const prods=getProds(cat);
                if(!prods.length)return null;
                const isLC=(LENTES_SUBCATS as readonly string[]).includes(cat);
                return(
                  <div key={cat} style={{marginBottom:"2.5rem",animation:"fadeIn 0.3s ease"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.85rem",borderBottom:`1px solid ${C.border}`,paddingBottom:"0.65rem"}}>
                      <h2 style={{fontSize:11,fontWeight:800,letterSpacing:3,margin:0,color:"#555"}}>{isLC?`LENTES · ${catLabel(cat).toUpperCase()}`:catLabel(cat).toUpperCase()}</h2>
                      <button onClick={()=>{setShopFilter(cat as ShopFilter);setLentesOpen(isLC);scrollTop();}} style={{background:"none",border:"none",fontSize:10,color:"#333",cursor:"pointer",fontFamily:"inherit",WebkitTapHighlightColor:"transparent",letterSpacing:1,fontWeight:700}}>VER TODOS</button>
                    </div>
                    <HRow products={prods} onSelect={openProd} onBuyNow={openProd} fmtPrice={fmtPrice}/>
                  </div>
                );
              })
            ):(
              getVisCats().map(cat=>{
                const prods=getProds(cat);
                if(!prods.length)return null;
                const isLC=(LENTES_SUBCATS as readonly string[]).includes(cat);
                return(
                  <div key={cat} style={{marginBottom:"3rem",animation:"fadeIn 0.3s ease"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",borderBottom:`1px solid ${C.border}`,paddingBottom:"0.65rem"}}>
                      <h2 style={{fontSize:11,fontWeight:800,letterSpacing:3,margin:0,color:"#555"}}>{isLC?`LENTES · ${catLabel(cat).toUpperCase()}`:catLabel(cat).toUpperCase()}</h2>
                      <button onClick={()=>{setShopFilter(cat as ShopFilter);setLentesOpen(isLC);scrollTop();}} style={{background:"none",border:"none",fontSize:10,color:"#333",cursor:"pointer",fontFamily:"inherit",WebkitTapHighlightColor:"transparent",letterSpacing:1,fontWeight:700}}>VER TODOS</button>
                    </div>
                    <div className="pg" style={{display:"grid",gap:"1rem",alignItems:"start"}}>
                      {prods.map((p,i)=><ProductCard key={p.id} product={p} index={i} onClick={()=>openProd(p)} onBuyNow={()=>openProd(p)} fmtPrice={fmtPrice}/>)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <Footer setMainView={setMainView} setShopFilter={setShopFilter}/>
        </main>
      )}

      {/* COMUNIDAD */}
      {mainView==="comunidad"&&(
        <main className="pv" style={{paddingTop:navH,background:C.bg}}>
          <div style={{maxWidth:680,margin:"0 auto",padding:"3rem 1.5rem 0",textAlign:"center",animation:"slideUp 0.4s ease"}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,padding:"0.35rem 1rem",marginBottom:"1.25rem"}}><div style={{width:6,height:6,borderRadius:"50%",background:"#4caf50",flexShrink:0,boxShadow:"0 0 0 3px rgba(76,175,80,0.2)",animation:"pulseRing 2s infinite"}}/><span style={{fontSize:9,fontWeight:800,letterSpacing:2.5,color:"#4caf50"}}>CLIENTES REALES</span></div>
            <h2 style={{fontSize:28,fontWeight:900,letterSpacing:4,marginBottom:"0.75rem",color:C.accent,lineHeight:1.1}}>COMUNIDAD<br/>FOKUS</h2>
            <p style={{color:"#444",fontSize:13,lineHeight:1.8,maxWidth:360,margin:"0 auto 2rem"}}>Cada pedido es una historia real. Estos son nuestros clientes satisfechos enviando sus productos a toda Venezuela.</p>
            <div style={{display:"flex",justifyContent:"center",gap:"2rem",marginBottom:"2.5rem",flexWrap:"wrap"}}>{[{n:"3000+",l:"Pedidos"},{n:"23+",l:"Estados"},{n:"★ 4.9",l:"Valoración"}].map(({n,l})=>(<div key={l} style={{textAlign:"center"}}><p style={{margin:0,fontSize:20,fontWeight:900,color:C.accent}}>{n}</p><p style={{margin:"2px 0 0",fontSize:10,color:"#444",letterSpacing:1}}>{l}</p></div>))}</div>
          </div>
          <div style={{maxWidth:1100,margin:"0 auto",padding:"0 1rem 5rem"}}>
            <div style={{marginBottom:"2rem",background:"linear-gradient(135deg,#0f0f0f 0%,#111 100%)",borderRadius:16,border:"1px solid #1e1e1e",padding:"1.5rem",display:"flex",alignItems:"center",gap:"1rem",flexWrap:"wrap",justifyContent:"space-between"}}>
              <div style={{flex:1,minWidth:200}}>
                <p style={{margin:"0 0 0.3rem",fontSize:9,fontWeight:800,letterSpacing:3,color:"#333"}}>¿YA TIENES TU ACCESORIO?</p>
                <h3 style={{margin:"0 0 0.4rem",fontSize:17,fontWeight:900,color:C.accent,lineHeight:1.2}}>¡Comparte tu look con Fokus!</h3>
                <p style={{margin:0,fontSize:12,color:"#444",lineHeight:1.6}}>Sube una foto con tu accesorio y cuéntanos tu experiencia. Tu reseña puede inspirar a otros. 🖤</p>
              </div>
              <button onClick={()=>setShowReviewModal(true)} style={{display:"inline-flex",alignItems:"center",gap:"0.6rem",background:"#fff",color:"#080808",border:"none",borderRadius:10,padding:"0.85rem 1.4rem",fontSize:12,fontWeight:900,letterSpacing:1.5,cursor:"pointer",fontFamily:"inherit",WebkitTapHighlightColor:"transparent",flexShrink:0,whiteSpace:"nowrap"}}><IcCamera s={16} c="#080808"/>DEJAR RESEÑA</button>
            </div>
            <div className="cg" style={{display:"grid",gap:"0.85rem"}}>
              {COMMUNITY_POSTS.map((post,i)=><CommunityCard key={post.id} post={post} index={i} onClick={()=>setLightboxIdx(i)}/>)}
            </div>
            <div style={{marginTop:"3rem",background:"#0d0d0d",borderRadius:16,padding:"2rem 1.5rem",border:"1px solid #1a1a1a",textAlign:"center"}}>
              <img src="/favicon.png" alt="Fokus" width={36} height={36} style={{objectFit:"contain",marginBottom:"0.75rem",pointerEvents:"none"}} draggable={false}/>
              <h3 style={{fontSize:16,fontWeight:900,letterSpacing:3,color:C.accent,margin:"0 0 0.5rem"}}>¿QUIERES SER PARTE?</h3>
              <p style={{fontSize:13,color:"#444",lineHeight:1.7,margin:"0 0 1.25rem",maxWidth:340,marginLeft:"auto",marginRight:"auto"}}>Haz tu pedido hoy y recibe tu accesorio en cualquier estado de Venezuela.</p>
              <div style={{display:"flex",gap:"0.65rem",justifyContent:"center",flexWrap:"wrap"}}>
                <button onClick={()=>{setMainView("shop");setShopFilter("TODO");}} style={{...S.darkBtn,borderRadius:8,fontSize:11}}>VER TIENDA →</button>
                <button onClick={()=>setShowReviewModal(true)} style={{display:"inline-flex",alignItems:"center",gap:6,background:"transparent",border:"1px solid #2a2a2a",color:"#888",padding:"0.9rem 1.4rem",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",letterSpacing:1,WebkitTapHighlightColor:"transparent"}}>⭐ DEJAR RESEÑA</button>
                <a href={SOCIAL.instagram} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,background:"transparent",border:"1px solid #2a2a2a",color:"#888",padding:"0.9rem 1.4rem",borderRadius:8,fontSize:11,fontWeight:700,textDecoration:"none",letterSpacing:1}}><IcIG s={14}/> INSTAGRAM</a>
              </div>
            </div>
          </div>
          <Footer setMainView={setMainView} setShopFilter={setShopFilter}/>
        </main>
      )}

      {mainView==="grabados"&&(<main className="pv" style={{paddingTop:navH,background:C.bg}}><div style={{maxWidth:680,margin:"0 auto",padding:"3rem 1.5rem 0",textAlign:"center",animation:"slideUp 0.4s ease"}}><div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,padding:"0.35rem 1rem",marginBottom:"1.25rem"}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg><span style={{fontSize:9,fontWeight:800,letterSpacing:2.5,color:"rgba(255,255,255,0.4)"}}>PERSONALIZACIÓN EXCLUSIVA</span></div><h2 style={{fontSize:28,fontWeight:900,letterSpacing:4,marginBottom:"0.5rem",color:C.accent,lineHeight:1.1}}>GRABADOS<br/>LÁSER</h2><p style={{color:"#444",fontSize:13,lineHeight:1.8,maxWidth:360,margin:"0 auto 1rem"}}>Personalizamos tu accesorio con tu nombre, iniciales, fecha o diseño especial. Único, como tú.</p><div style={{display:"flex",justifyContent:"center",gap:"2rem",marginBottom:"2.5rem",flexWrap:"wrap"}}>{[{n:"Relojes",i:"⌚"},{n:"Pulseras",i:"📿"},{n:"Collares",i:"✝️"},{n:"Billeteras",i:"👜"}].map(({n,i})=>(<div key={n} style={{textAlign:"center",background:"rgba(255,255,255,0.03)",border:"1px solid #1a1a1a",borderRadius:10,padding:"0.6rem 1rem"}}><p style={{margin:0,fontSize:18}}>{i}</p><p style={{margin:"3px 0 0",fontSize:9,color:"#444",letterSpacing:1.5,fontWeight:700}}>{n.toUpperCase()}</p></div>))}</div></div><div style={{maxWidth:900,margin:"0 auto",padding:"0 1rem 5rem"}}><div className="cg" style={{display:"grid",gap:"0.75rem",gridTemplateColumns:"repeat(2,1fr)"}}>{[{img:"/grabados/photo_1.jpg",caption:"Billetera grabada con nombre"},{img:"/grabados/photo_2.jpg",caption:"Pulsera con iniciales"},{img:"/grabados/photo_3.jpg",caption:"Pulsera personalizada"},{img:"/grabados/photo_4.jpg",caption:"Collares con nombres y fechas"}].map((item,i)=>(<div key={i} style={{borderRadius:14,overflow:"hidden",background:"#0d0d0d",border:"1px solid #1a1a1a",position:"relative",aspectRatio:"1",cursor:"pointer"}} className="cc"><img src={item.img} alt={item.caption} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",display:"block",pointerEvents:"none"} as React.CSSProperties} draggable={false}/><div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.7) 0%,transparent 60%)",pointerEvents:"none"}}/><p style={{position:"absolute",bottom:10,left:12,right:12,margin:0,fontSize:11,fontWeight:700,color:"#fff",lineHeight:1.3}}>{item.caption}</p></div>))}</div><div style={{marginTop:"2rem",background:"linear-gradient(135deg,#0f0f0f 0%,#111 100%)",borderRadius:16,border:"1px solid #1e1e1e",padding:"1.75rem 1.5rem",textAlign:"center"}}><p style={{fontSize:9,fontWeight:800,letterSpacing:3,color:"#333",margin:"0 0 0.5rem"}}>¿QUIERES EL TUYO?</p><h3 style={{fontSize:18,fontWeight:900,color:C.accent,margin:"0 0 0.5rem",letterSpacing:1}}>Pide tu grabado personalizado</h3><p style={{fontSize:12,color:"#444",lineHeight:1.7,margin:"0 0 1.25rem"}}>Escríbenos por WhatsApp con el accesorio que quieres grabar y el texto o diseño que deseas.</p><a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hola! Quiero solicitar un GRABADO LÁSER personalizado ✨\n\nAccesorio a grabar: \nTexto / diseño que deseo grabar: \n\n¿Podrían darme información sobre precios y tiempo de entrega?")}`} onClick={()=>trackLeadWhatsApp("grabados_contacto")} target="_blank" rel="noreferrer" data-fokus-tracked="true" style={{display:"inline-flex",alignItems:"center",gap:"0.65rem",background:"#25D366",color:"#fff",padding:"0.95rem 1.75rem",borderRadius:10,textDecoration:"none",fontSize:12,fontWeight:900,letterSpacing:1.5,WebkitTapHighlightColor:"transparent"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>PEDIR GRABADO →</a></div></div><Footer setMainView={setMainView} setShopFilter={setShopFilter}/></main>)}{lightboxIdx!==null&&(<CommunityLightbox post={COMMUNITY_POSTS[lightboxIdx]} onClose={()=>setLightboxIdx(null)} onPrev={()=>setLightboxIdx(i=>i!==null?Math.max(0,i-1):0)} onNext={()=>setLightboxIdx(i=>i!==null?Math.min(COMMUNITY_POSTS.length-1,i+1):0)} hasPrev={lightboxIdx>0} hasNext={lightboxIdx<COMMUNITY_POSTS.length-1}/>)}
      {showReviewModal&&<ReviewModal onClose={()=>setShowReviewModal(false)}/>}

      {/* ACCOUNT */}
      {mainView==="account"&&userReady&&currentUser&&(
        <main className="pv" style={{paddingTop:navH,background:C.bg}}>
          <div style={{maxWidth:480,margin:"0 auto",padding:"2rem 1.25rem 5rem",animation:"slideUp 0.3s ease"}}>
            <h1 style={{fontSize:11,fontWeight:800,letterSpacing:3,marginBottom:"2rem",color:"#444"}}>MI CUENTA</h1>
            <div style={{background:"#111",borderRadius:16,padding:"1.75rem 1.5rem",border:"1px solid #1a1a1a",marginBottom:"1rem"}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:"1.25rem",marginBottom:"1.5rem"}}>
                <div className="avatar-ring" style={{position:"relative",flexShrink:0}}>
                  {currentUser.photoURL?<img key={currentUser.photoURL} src={currentUser.photoURL} alt={currentUser.displayName} style={{width:72,height:72,borderRadius:"50%",objectFit:"cover",border:"2px solid #222",display:"block"}} draggable={false}/>:<div style={{width:72,height:72,borderRadius:"50%",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid #222"}}><span style={{fontSize:28,fontWeight:900,color:"#080808",lineHeight:1}}>{currentUser.displayName[0]?.toUpperCase()}</span></div>}
                  <button onClick={()=>photoInputRef.current?.click()} disabled={photoLoading} style={{position:"absolute",bottom:0,right:0,width:26,height:26,borderRadius:"50%",background:photoLoading?"#333":"#fff",border:"2px solid #111",display:"flex",alignItems:"center",justifyContent:"center",cursor:photoLoading?"not-allowed":"pointer",WebkitTapHighlightColor:"transparent",transition:"background 0.15s"}}>{photoLoading?<div style={{width:10,height:10,border:"1.5px solid #666",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>:<IcCamera s={12} c="#080808"/>}</button>
                  <input ref={photoInputRef} type="file" accept="image/*" onChange={handleProfilePhoto} style={{display:"none"}}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  {editingName?(
                    <div style={{display:"flex",gap:"0.5rem",alignItems:"center",marginBottom:"0.5rem",flexWrap:"wrap"}}>
                      <input autoFocus value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSaveName()} placeholder="Nuevo nombre" style={{...S.input,padding:"0.5rem 0.75rem",fontSize:14,flex:1,minWidth:0}}/>
                      <button onClick={handleSaveName} disabled={nameLoading||!newName.trim()} style={{background:"#fff",color:"#080808",border:"none",borderRadius:8,padding:"0.5rem 0.85rem",cursor:nameLoading||!newName.trim()?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:4,fontSize:12,fontWeight:800,WebkitTapHighlightColor:"transparent",opacity:nameLoading||!newName.trim()?0.5:1}}><IcCheck s={14} c="#080808"/> Guardar</button>
                      <button onClick={()=>setEditingName(false)} style={{background:"none",border:"1px solid #2a2a2a",color:"#555",borderRadius:8,padding:"0.5rem 0.85rem",cursor:"pointer",fontSize:12,WebkitTapHighlightColor:"transparent"}}>Cancelar</button>
                    </div>
                  ):(
                    <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"3px"}}>
                      <p style={{margin:0,fontSize:18,fontWeight:800,color:C.text,wordBreak:"break-word"}}>{currentUser.displayName}</p>
                      <button onClick={()=>{setNewName(currentUser.displayName);setEditingName(true);}} style={{background:"none",border:"none",cursor:"pointer",padding:4,WebkitTapHighlightColor:"transparent",flexShrink:0,color:"#555",display:"flex",alignItems:"center"}}><IcEdit s={14} c="#555"/></button>
                    </div>
                  )}
                  <p style={{margin:"0 0 4px",fontSize:12,color:"#444",wordBreak:"break-word"}}>{currentUser.email}</p>
                  <p style={{fontSize:10,color:"#2a2a2a",margin:0,letterSpacing:0.5}}>Miembro desde {new Date(currentUser.createdAt).toLocaleDateString("es-VE",{year:"numeric",month:"long"})}</p>
                </div>
              </div>
            </div>
            <button onClick={()=>{setCurrentUser(null);setMainView("fokus");}} style={{...S.darkBtn,background:"transparent",color:"#cc3333",border:"1px solid #2a1515",borderRadius:8,width:"100%",justifyContent:"center",fontSize:12}}>Cerrar sesión</button>
          </div>
        </main>
      )}

      {/* CARRITO */}
{isCart&&(
  <main className="pv" style={{paddingTop:navH,background:C.bg}}>
    <div style={{maxWidth:680,margin:"0 auto",padding:"2rem 1rem 5rem",animation:"fadeIn 0.25s ease"}}>
      <h1 style={{fontSize:11,fontWeight:800,letterSpacing:3,marginBottom:"1rem",color:"#444"}}>CARRITO DE COMPRAS</h1>
      <div style={{display:"flex",alignItems:"center",gap:0,marginBottom:"1.75rem"}}>
        {[{n:1,l:"Productos"},{n:2,l:"Envío"},{n:3,l:"Pago"},{n:4,l:"Comprobante"}].map((step,i,arr)=>{
          const done=(step.n===1&&cart.length>0)||(step.n===2&&!!deliveryInfo.zone)||(step.n===3&&!!payMethod)||(step.n===4&&!!comprobanteUrl);
          const active=(step.n===1)||(step.n===2&&cart.length>0&&!deliveryInfo.zone)||(step.n===3&&!!deliveryInfo.zone&&!payMethod)||(step.n===4&&!!payMethod&&!comprobanteUrl);
          return(
            <div key={step.n} style={{display:"flex",alignItems:"center",flex:1}}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,flex:1}}>
                <div style={{width:24,height:24,borderRadius:"50%",background:done?"#fff":active?"#2a2a2a":"#111",border:`1px solid ${done?"#fff":active?"#555":"#1e1e1e"}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}}>
                  {done?<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#080808" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>:<span style={{fontSize:9,fontWeight:800,color:active?"#fff":"#333"}}>{step.n}</span>}
                </div>
                <span style={{fontSize:8,fontWeight:700,letterSpacing:1,color:done?"#fff":active?"#888":"#2a2a2a",whiteSpace:"nowrap"}}>{step.l.toUpperCase()}</span>
              </div>
              {i<arr.length-1&&<div style={{height:1,flex:1,background:done?"#fff":"#1e1e1e",marginBottom:14,transition:"background 0.3s"}}/>}
            </div>
          );
        })}
      </div>
      {cart.length===0?(
        <div style={{textAlign:"center",padding:"5rem 0",color:"#333",animation:"slideUp 0.4s ease"}}>
          <p style={{marginBottom:"1.5rem",fontSize:14}}>Tu carrito está vacío</p>
          <button onClick={()=>{setMainView("shop");setShopFilter("TODO");}} style={{...S.darkBtn,borderRadius:4,fontSize:11}}>IR A LA TIENDA</button>
        </div>
      ):(
        <>
          {/* ── RESUMEN COMPACTO DE PRODUCTOS ── */}
          <div style={{background:"#0e0e0e",borderRadius:12,border:`1px solid ${C.border}`,marginBottom:"1.25rem",overflow:"hidden"}}>
            <div style={{padding:"0.65rem 1rem",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:9,fontWeight:800,letterSpacing:2.5,color:"#333"}}>TU PEDIDO · {cart.reduce((s,i)=>s+i.qty,0)} ITEM{cart.reduce((s,i)=>s+i.qty,0)>1?"S":""}</span>
              <button onClick={()=>setCart([])} style={{background:"none",border:"none",color:"#333",fontSize:10,cursor:"pointer",fontFamily:"inherit",WebkitTapHighlightColor:"transparent",letterSpacing:0.5}}>Vaciar</button>
            </div>
            {cart.map(item=>(
              <div key={item.product.id} style={{display:"flex",alignItems:"center",gap:"0.65rem",padding:"0.65rem 1rem",borderBottom:`1px solid ${C.border}`}}>
                <button onClick={()=>updQty(item.product.id,-item.qty)} style={{background:"none",border:"none",cursor:"pointer",color:"#333",fontSize:11,padding:0,flexShrink:0,lineHeight:1}}>✕</button>
                <img src={optImg(item.product.img,80)} alt={item.product.name} style={{width:40,height:40,objectFit:"cover",borderRadius:6,pointerEvents:"none",flexShrink:0}} draggable={false}/>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{margin:0,fontSize:12,color:"#bbb",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.product.name}</p>
                  <p style={{margin:"2px 0 0",fontSize:11,color:item.product.discount?(isSuperOffer(item.product.discount)?"#ff5555":"#ffd43b"):"#555"}}>{fmtPrice(getFinalPrice(item.product))}{!!item.product.discount&&<span style={{textDecoration:"line-through",color:"#444",marginLeft:6}}>{fmtPrice(item.product.price)}</span>}</p>
                </div>
                <div style={{display:"flex",alignItems:"center",border:`1px solid ${C.border}`,borderRadius:6,flexShrink:0}}>
                  <button onClick={()=>updQty(item.product.id,-1)} style={{...S.qtyBtn,width:28,height:28,fontSize:16}}>−</button>
                  <span style={{padding:"0 0.4rem",fontSize:13,color:C.text,fontWeight:700,minWidth:18,textAlign:"center"}}>{item.qty}</span>
                  <button onClick={()=>updQty(item.product.id,1)} style={{...S.qtyBtn,width:28,height:28,fontSize:16}}>+</button>
                </div>
                <span style={{fontSize:13,fontWeight:800,color:C.accent,flexShrink:0,minWidth:60,textAlign:"right"}}>{fmtPrice(getFinalPrice(item.product)*item.qty)}</span>
              </div>
            ))}
            {!!appliedCoupon&&(
              <div style={{padding:"0.55rem 1rem",display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:`1px dashed ${C.border}`}}>
                <span style={{fontSize:11,color:"#888"}}>Subtotal</span>
                <span style={{fontSize:12,color:"#888"}}>{fmtPrice(totalPriceBeforeCoupon)}</span>
              </div>
            )}
            {!!appliedCoupon&&(
              <div style={{padding:"0 1rem 0.6rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:11,color:"#ffd43b",fontWeight:700}}>🎟️ Cupón {appliedCoupon.code}</span>
                <span style={{fontSize:12,color:"#ffd43b",fontWeight:800}}>-{fmtPrice(couponDiscountAmount)}</span>
              </div>
            )}
            <div style={{padding:"0.75rem 1rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:13,color:"#555"}}>Total</span>
              <div style={{textAlign:"right"}}>
                <span style={{fontSize:18,fontWeight:900,color:"#fff"}}>{fmtPrice(totalPrice)}</span>
                {showBs&&bcvRate&&<p style={{margin:"1px 0 0",fontSize:10,color:"#444"}}>≈ ${totalPrice.toFixed(2)} USD</p>}
              </div>
            </div>
          </div>

          {/* ── BOTÓN PREMIUM: SEGUIR COMPRANDO ── */}
          <button onClick={()=>{setMainView("shop");setShopFilter("TODO");}} style={{position:"relative",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",gap:"0.65rem",width:"100%",background:"linear-gradient(155deg,rgba(255,255,255,0.16) 0%,rgba(20,20,20,0.94) 45%,rgba(10,10,10,0.98) 100%)",color:"#fff",border:"1px solid rgba(255,255,255,0.25)",padding:"1.05rem",fontSize:11,fontWeight:900,letterSpacing:2.8,cursor:"pointer",fontFamily:"inherit",WebkitTapHighlightColor:"transparent",borderRadius:12,marginBottom:"1.25rem",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.18), inset 0 0 0 1px rgba(255,255,255,0.07), 0 10px 28px rgba(0,0,0,0.55)"}}>
            <span style={{position:"absolute",inset:0,background:"linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.12) 50%,transparent 100%)",backgroundSize:"200% 100%",animation:"badgeShimmer 3s ease infinite",pointerEvents:"none"}}/>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{position:"relative",flexShrink:0}}><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
            <span style={{position:"relative"}}>SEGUIR COMPRANDO</span>
          </button>

          {/* ── CUPÓN DE DESCUENTO ── */}
          <div style={{background:"linear-gradient(135deg,#141410 0%,#0a0a08 100%)",borderRadius:12,border:`1px solid ${appliedCoupon?"#3a3520":C.border}`,marginBottom:"1.25rem",padding:"1.1rem",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,212,59,0.25),transparent)"}}/>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:appliedCoupon?"0.75rem":"0.85rem"}}>
              <div style={{width:28,height:28,borderRadius:8,background:"linear-gradient(135deg,#ffd43b 0%,#c99a1f 100%)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#080808" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 000 4h4v-4z"/></svg>
              </div>
              <p style={{margin:0,fontSize:11,fontWeight:800,letterSpacing:1.5,color:"#ffd43b"}}>¿TIENES UN CUPÓN?</p>
            </div>
            {appliedCoupon?(
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"0.75rem",background:"rgba(255,212,59,0.08)",border:"1px solid rgba(255,212,59,0.25)",borderRadius:10,padding:"0.7rem 0.9rem"}}>
                <div>
                  <p style={{margin:"0 0 2px",fontSize:13,fontWeight:800,color:"#ffd43b",letterSpacing:1,fontFamily:"monospace"}}>{appliedCoupon.code}</p>
                  <p style={{margin:0,fontSize:10,color:"#888"}}>-{appliedCoupon.discountPercent}% {appliedCoupon.type==="general"?"en todo el pedido":appliedCoupon.type==="category"?`en la sección ${catLabel(appliedCoupon.category||"")}`:`en ${appliedCoupon.productName||"el producto"}`}</p>
                  <p style={{margin:"3px 0 0",fontSize:10,color:"#ff8888",display:"flex",alignItems:"center",gap:4}}>⏳ Expira en {formatTimeLeft(appliedCoupon.expiresAt)}</p>
                </div>
                <button onClick={removeCoupon} style={{background:"none",border:"1px solid rgba(255,255,255,0.15)",color:"#888",borderRadius:8,padding:"0.4rem 0.75rem",cursor:"pointer",fontSize:10,fontFamily:"inherit",fontWeight:700}}>Quitar</button>
              </div>
            ):(
              <div style={{display:"flex",gap:"0.5rem"}}>
                <input value={couponInput} onChange={e=>{setCouponInput(e.target.value.toUpperCase());setCouponCheckErr("");}} onKeyDown={e=>e.key==="Enter"&&applyCouponCode()} placeholder="INGRESA TU CÓDIGO" style={{...S.input,flex:1,fontWeight:800,letterSpacing:1.5}}/>
                <button onClick={applyCouponCode} disabled={couponCheckLoading} style={{background:"linear-gradient(135deg,#ffd43b 0%,#c99a1f 100%)",color:"#080808",border:"none",borderRadius:8,padding:"0 1.1rem",cursor:couponCheckLoading?"not-allowed":"pointer",fontFamily:"inherit",fontSize:11,fontWeight:900,letterSpacing:1,flexShrink:0,opacity:couponCheckLoading?0.6:1}}>{couponCheckLoading?"…":"APLICAR"}</button>
              </div>
            )}
            {couponCheckErr&&<p style={{margin:"0.6rem 0 0",fontSize:11,color:"#ff8888"}}>{couponCheckErr}</p>}
          </div>

          {/* ── CHECKOUT DIRECTO ── */}
          <div style={{background:"#0e0e0e",padding:"1.25rem",borderRadius:12,border:`1px solid ${C.border}`}}>

            {/* Indicador de siguiente paso */}
            {!deliveryInfo.zone&&(
              <div style={{display:"flex",alignItems:"center",gap:"0.65rem",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"0.75rem 1rem",marginBottom:"1.25rem",animation:"fadeIn 0.3s ease"}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#080808" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                <div>
                  <p style={{margin:0,fontSize:12,fontWeight:800,color:"#fff",letterSpacing:0.5}}>Selecciona dónde enviamos tu pedido</p>
                  <p style={{margin:"2px 0 0",fontSize:10,color:"#555"}}>Solo 3 pasos para completar tu compra</p>
                </div>
              </div>
            )}

            {userReady&&!currentUser&&(<div style={{marginBottom:"1.25rem",background:"#0a0a0a",borderRadius:10,padding:"0.85rem 1rem",border:"1px solid #1a1a1a",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"0.75rem",flexWrap:"wrap"}}><p style={{margin:0,fontSize:12,color:"#555",lineHeight:1.5}}>¿Tienes cuenta? Inicia sesión para un pedido más rápido</p><button onClick={()=>setShowAuth(true)} style={{...S.darkBtn,borderRadius:8,padding:"0.6rem 1rem",fontSize:11,flexShrink:0}}>ENTRAR</button></div>)}

            <DeliveryForm info={deliveryInfo} onChange={i=>{
              setDeliveryInfo(i);
              if(i.zone&&i.zone!=="otro"&&i.zone!==deliveryInfo.zone){
                setTimeout(()=>payMethodRef.current?.scrollIntoView({behavior:"smooth",block:"nearest"}),500);
              }
              if(i.zone==="otro"&&i.zone!==deliveryInfo.zone&&!otroAutoScrolled.current){
  otroAutoScrolled.current=false;
}
const otroCompleto=i.zone==="otro"&&!!(i.nombre&&i.cedula&&i.telefono&&i.agencia&&i.estado&&i.direccion);
if(otroCompleto&&!otroAutoScrolled.current){
  otroAutoScrolled.current=true;
  setTimeout(()=>payMethodRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),450);
}
if(i.zone==="otro"&&!i.cedula&&!i.nombre){
  setTimeout(()=>{
    const firstInput=document.querySelector('[placeholder="Nombre y Apellido *"]') as HTMLElement|null;
    firstInput?.scrollIntoView({behavior:"smooth",block:"center"});
  },300);
}
            }}/>

            {/* Indicador paso 2 */}
            {deliveryInfo.zone&&!payMethod&&(
              <div style={{display:"flex",alignItems:"center",gap:"0.65rem",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"0.75rem 1rem",margin:"1.25rem 0 0",animation:"slideUp 0.25s ease"}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#080808" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                <p style={{margin:0,fontSize:12,fontWeight:800,color:"#fff",letterSpacing:0.5}}>Ahora elige cómo vas a pagar</p>
              </div>
            )}

            <div ref={payMethodRef} style={{marginTop:"1.5rem"}}>
              <div style={{background:"linear-gradient(135deg,#0f0f0f 0%,#111 100%)",border:"1px solid #2a2a2a",borderRadius:10,padding:"0.85rem 1rem",marginBottom:"0.85rem",display:"flex",alignItems:"center",gap:"0.75rem"}}>
                <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",flex:1}}>
                  {[{n:"3.000+",l:"Pedidos"},{ n:"4.9 ★",l:"Valoración"},{n:"23",l:"Estados"}].map(({n,l})=>(
                    <div key={l} style={{textAlign:"center",background:"rgba(255,255,255,0.04)",border:"1px solid #2a2a2a",borderRadius:8,padding:"0.4rem 0.75rem",flex:1}}>
                      <p style={{margin:0,fontSize:13,fontWeight:900,color:"#fff"}}>{n}</p>
                      <p style={{margin:0,fontSize:8,color:"#555",letterSpacing:1}}>{l.toUpperCase()}</p>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
                  <span style={{fontSize:12}}>🔒</span>
                  <span style={{fontSize:9,color:"#444",fontWeight:700,letterSpacing:0.5}}>PAGO SEGURO</span>
                </div>
              </div>
              <p style={{fontSize:9,fontWeight:800,letterSpacing:2.5,color:"#333",marginBottom:"0.75rem"}}>MÉTODO DE PAGO</p>
              <div style={{display:"flex",flexDirection:"column",gap:"0.45rem"}}>
                {PAYMENT_METHODS.map(pm=>(<button key={pm.id} className="pc2" onClick={()=>{setPayMethod(pm.id);setTimeout(()=>payDetailsRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),300);}} style={{display:"flex",alignItems:"center",gap:"0.85rem",background:payMethod===pm.id?"#fff":"#111",color:payMethod===pm.id?"#080808":C.text,border:`1px solid ${payMethod===pm.id?"#fff":"#1e1e1e"}`,borderRadius:10,padding:"0.8rem 1rem",textAlign:"left",cursor:"pointer",fontFamily:"inherit",WebkitTapHighlightColor:"transparent",transition:"all 0.15s"}}><span style={{fontSize:18}}>{pm.icon}</span><div><p style={{margin:0,fontSize:13,fontWeight:700}}>{pm.name}</p><p style={{margin:0,fontSize:10,opacity:0.5,marginTop:1}}>{pm.detail}</p></div>{payMethod===pm.id&&<span style={{marginLeft:"auto",fontSize:14,fontWeight:700}}>✓</span>}</button>))}
              </div>
            </div>

            {payMethod&&(()=>{
              const pm=PAYMENT_METHODS.find(m=>m.id===payMethod)!;
              const isBs=pm.id==="pagomovil_bv"||pm.id==="pagomovil_ba";
              const amountLabel=isBs?(bcvRate?`Bs. ${Math.round(totalPrice*bcvRate).toLocaleString("es-VE")}`:"Cargando tasa…"):`$${totalPrice.toFixed(2)}`;
              return(
                <div ref={payDetailsRef} style={{marginTop:"1rem",background:"linear-gradient(135deg,#141410 0%,#0a0a0a 100%)",borderRadius:14,border:"2px solid #3a3520",overflow:"hidden",boxShadow:"0 8px 28px rgba(255,212,59,0.08), inset 0 1px 0 rgba(255,255,255,0.05)",scrollMarginTop:`${navH+12}px`}}>
                  <div style={{padding:"0.7rem 1.1rem",borderBottom:"1px solid #2a2a1a",display:"flex",alignItems:"center",gap:"0.6rem",background:"rgba(255,212,59,0.05)"}}>
                    <span style={{fontSize:17}}>{pm.icon}</span>
                    <p style={{fontSize:10,fontWeight:900,letterSpacing:2.5,color:"#ffd43b",margin:0}}>DATOS DE PAGO — {pm.name.toUpperCase()}</p>
                  </div>
                  <div style={{padding:"1.1rem 1.2rem"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(76,175,80,0.08)",border:"1px solid rgba(76,175,80,0.2)",borderRadius:8,padding:"0.5rem 0.75rem",marginBottom:"0.75rem"}}>
                      <span style={{fontSize:11}}>✓</span>
                      <p style={{margin:0,fontSize:10,color:"#4caf50",fontWeight:700}}>Más de 3.000 clientes ya pagaron por este método</p>
                    </div>
                    <div style={{background:"#0a0a0a",border:"1px solid #2a2a2a",borderRadius:10,padding:"0.9rem 1rem",marginBottom:"0.85rem"}}>
                      <p style={{margin:"0 0 3px",fontSize:9,fontWeight:800,letterSpacing:2,color:"#555"}}>MONTO A PAGAR</p>
                      <p style={{margin:0,fontSize:24,fontWeight:900,color:"#ffd43b",letterSpacing:0.5,fontVariantNumeric:"tabular-nums"}}>{amountLabel}</p>
                    </div>
                    {(pm as any).bank?(
                      <div style={{marginBottom:"0.9rem"}}>
                        <p style={{margin:"0 0 6px",fontSize:15,color:"#fff",fontWeight:900,letterSpacing:0.4,lineHeight:1.4}}>{(pm as any).bank}</p>
                        <p style={{margin:"0 0 4px",fontSize:18,color:"#fff",fontWeight:900,letterSpacing:0.6,lineHeight:1.4}}>{(pm as any).ci}</p>
                        <p style={{margin:0,fontSize:18,color:"#fff",fontWeight:900,letterSpacing:0.6,lineHeight:1.4}}>{(pm as any).phone}</p>
                      </div>
                    ):(
                      <p style={{fontSize:18,color:"#fff",margin:"0 0 0.9rem",fontWeight:900,letterSpacing:0.6,lineHeight:1.5}}>{pm.detail}</p>
                    )}
                    <button onClick={()=>{navigator.clipboard.writeText(pm.detail).catch(()=>{});setCopiedPay(true);setTimeout(()=>setCopiedPay(false),2000);}} style={{display:"inline-flex",alignItems:"center",gap:"0.4rem",background:copiedPay?"#0d1e0d":"#161616",border:`1px solid ${copiedPay?"#2a4a2a":"#2a2a2a"}`,color:copiedPay?"#4caf50":"#666",padding:"0.4rem 0.85rem",borderRadius:8,fontSize:10,fontWeight:800,letterSpacing:1.5,cursor:"pointer",fontFamily:"inherit",WebkitTapHighlightColor:"transparent",marginBottom:"0.85rem",transition:"all 0.2s ease"}}>{copiedPay?<><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>¡COPIADO!</>:<><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>COPIAR DATOS</>}</button>
                    <p style={{fontSize:11,color:"#555",margin:0,lineHeight:1.7,borderTop:"1px solid #1a1a1a",paddingTop:"0.75rem"}}>Realiza el pago y sube tu comprobante abajo para continuar.</p>
                  </div>
                </div>
              );
            })()}

            <div ref={comprobanteRef}>
              {payMethod&&<ComprobanteUpload url={comprobanteUrl} onUrl={setComprobante}/>}
            </div>

            {payMethod&&deliveryValid&&!comprobanteUrl&&(<div style={{marginTop:"0.75rem",background:"rgba(255,180,0,0.06)",border:"1px solid rgba(255,180,0,0.2)",borderRadius:8,padding:"0.65rem 1rem",display:"flex",alignItems:"center",gap:"0.5rem"}}><span style={{fontSize:14}}>📎</span><p style={{margin:0,fontSize:11,color:"#c8a000",lineHeight:1.5,fontWeight:600}}>Sube el comprobante de pago para activar el envío del pedido</p></div>)}
            {canSendOrder&&(
              <div style={{display:"flex",alignItems:"center",gap:"0.5rem",background:"rgba(37,211,102,0.06)",border:"1px solid rgba(37,211,102,0.15)",borderRadius:8,padding:"0.6rem 1rem",marginTop:"1.25rem"}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:"#25D366",flexShrink:0,boxShadow:"0 0 0 3px rgba(37,211,102,0.15)"}}/>
                <p style={{margin:0,fontSize:11,color:"#3a7a3a",fontWeight:700,lineHeight:1.5}}>Todo listo — tu pedido será confirmado por WhatsApp en minutos</p>
              </div>
            )}
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginBottom:"0.65rem",padding:"0.5rem",background:"rgba(255,255,255,0.02)",borderRadius:8,border:"1px solid #1e1e1e"}}><span style={{fontSize:10}}>⚡</span><p style={{margin:0,fontSize:10,color:"#555",fontWeight:700,letterSpacing:0.5}}>Tu pedido se confirma por WhatsApp en menos de 5 minutos</p></div>
              <button onClick={handleSendOrder} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"0.75rem",width:"100%",marginTop:"0",background:canSendOrder?"#25D366":"#1a1a1a",color:canSendOrder?"#fff":"#444",padding:"1rem",fontWeight:900,letterSpacing:2,fontSize:11,border:`1px solid ${canSendOrder?"transparent":"#2a2a2a"}`,borderRadius:10,cursor:canSendOrder?"pointer":"not-allowed",fontFamily:"inherit",transition:"background 0.25s, color 0.25s"}}>
              {canSendOrder&&<IcWA s={18} c="#fff"/>}
              {canSendOrder?"CONFIRMAR Y ENVIAR PEDIDO →":!deliveryInfo.zone?"SELECCIONA TIPO DE ENVÍO ↑":!payMethod?"SELECCIONA MÉTODO DE PAGO ↑":"SUBE EL COMPROBANTE PARA CONTINUAR ↑"}
            </button>

            <div style={{display:"flex",justifyContent:"center",gap:"1.5rem",marginTop:"1rem",marginBottom:"0.25rem",flexWrap:"wrap"}}>{[{i:"🔒",t:"Pago seguro"},{i:"📦",t:"Envío a todo el país"},{i:"⭐",t:"3.000+ clientes"}].map(({i,t})=>(<div key={t} style={{display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:10}}>{i}</span><span style={{fontSize:9,color:"#333",fontWeight:700,letterSpacing:0.5}}>{t.toUpperCase()}</span></div>))}</div>
              </div>
        </>
      )}
    </div>
  </main>
)}

      {/* ── ADMIN ── */}
      {isAdmin&&(
        <main className="pv" style={{paddingTop:NAV_H,background:"#060606",minHeight:"100vh"}}>
          <div style={{maxWidth:720,margin:"0 auto",padding:"2rem 1rem 4rem"}}>
            {!adminLogged&&(<div style={{background:"#111",borderRadius:14,padding:"2.5rem 2rem",maxWidth:380,margin:"2rem auto",border:"1px solid #1a1a1a",animation:"slideUp 0.3s ease"}}><h1 style={{color:"#fff",fontSize:20,fontWeight:900,marginBottom:"1.5rem",textAlign:"center",letterSpacing:2}}>ADMIN</h1><div style={{display:"flex",flexDirection:"column",gap:"0.85rem"}}><input type="email" placeholder="Correo" value={adminEmail} onChange={e=>setAdminEmail(e.target.value)} style={S.input}/><PwdInput placeholder="Contraseña" value={adminPwd} onChange={setAdminPwd} onKeyDown={e=>e.key==="Enter"&&doLogin()} autoComplete="current-password"/>{adminErr&&<p style={{color:"#ff5555",fontSize:12,margin:0,background:"#1e0a0a",padding:"0.6rem 1rem",borderRadius:8}}>{adminErr}</p>}<button onClick={doLogin} style={S.adminBtn}>Entrar</button><button onClick={doLogout} style={{...S.adminBtn,background:"transparent",color:"#333",marginTop:4}}>← Volver</button></div></div>)}
            {adminLogged&&adminSec==="menu"&&(<div style={{background:"#111",borderRadius:14,padding:"2.5rem 2rem",maxWidth:380,margin:"2rem auto",border:"1px solid #1a1a1a",animation:"slideUp 0.3s ease"}}><h1 style={{color:"#fff",fontSize:18,fontWeight:900,marginBottom:"0.4rem",textAlign:"center",letterSpacing:2}}>PANEL</h1><p style={{color:"#333",fontSize:12,textAlign:"center",marginBottom:"2rem",letterSpacing:1}}>Selecciona una opción</p><div style={{display:"flex",flexDirection:"column",gap:"0.65rem"}}><button onClick={()=>enterAdminSec("products")} style={S.adminBtn}>📦 Gestionar productos</button><button onClick={()=>enterAdminSec("sales")} style={S.adminBtn}>💰 Registrar venta manual</button><button onClick={()=>enterAdminSec("stats")} style={S.adminBtn}>📊 Ver estadísticas</button><button onClick={()=>enterAdminSec("coupons")} style={{...S.adminBtn,background:"linear-gradient(135deg,#fff 0%,#ccc 100%)"}}>🎟️ Cupones de descuento</button><button onClick={()=>enterAdminSec("lookup")} style={S.adminBtn}>🔍 Buscar por código</button><button onClick={doLogout} style={{...S.adminBtn,background:"transparent",color:"#ff5555",border:"none",marginTop:8,letterSpacing:1}}>Cerrar sesión</button></div></div>)}
            {adminLogged&&adminSec==="products"&&(<>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}><h1 style={{color:"#fff",fontSize:16,fontWeight:900,margin:0,letterSpacing:2}}>{editing?"EDITAR PRODUCTO":"PRODUCTOS"}</h1><button onClick={()=>{exitAdminSec();resetForm();}} style={{background:"none",border:"none",color:"#333",cursor:"pointer",fontSize:12,fontFamily:"inherit",WebkitTapHighlightColor:"transparent"}}>← MENÚ</button></div>
              <div ref={formRef} style={{background:"#111",borderRadius:12,padding:"1.5rem",marginBottom:"1.25rem",border:editing?"1px solid #2a2a2a":"1px solid #1a1a1a"}}><p style={{color:"#333",fontSize:9,fontWeight:800,letterSpacing:2,margin:"0 0 1.25rem"}}>{editing?`EDITANDO: ${editing.name}`:"NUEVO PRODUCTO"}</p><div style={{display:"flex",flexDirection:"column",gap:"0.8rem"}}><input placeholder="Nombre del producto *" value={fName} onChange={e=>setFName(e.target.value)} style={S.input}/><textarea placeholder="Descripción (opcional)" value={fDesc} onChange={e=>setFDesc(e.target.value)} rows={2} style={{...S.input,resize:"vertical" as any,lineHeight:1.6}}/><input placeholder="Precio en USD *" type="number" min="0" step="0.01" value={fPrice} onChange={e=>setFPrice(e.target.value)} style={S.input}/><select value={fCat} onChange={e=>setFCat(e.target.value)} style={{...S.input,appearance:"auto" as any}}><option value="">Selecciona categoría *</option><optgroup label="── LENTES">{LENTES_SUBCATS.map(s=><option key={s} value={s}>{catLabel(s)}</option>)}</optgroup><optgroup label="── OTROS">{SHOP_CATS.filter(c=>c!=="LENTES").map(c=><option key={c} value={c}>{catLabel(c)}</option>)}</optgroup></select><div style={{background:"#0e0e0e",borderRadius:8,padding:"1rem",border:"1px dashed #1e1e1e"}}><p style={{color:"#333",fontSize:9,letterSpacing:2,margin:"0 0 0.65rem",fontWeight:800}}>IMAGEN {!editing&&"*"}</p><input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} style={{display:"none"}} id="fi"/><label htmlFor="fi" style={{display:"inline-flex",alignItems:"center",gap:"0.45rem",background:"#1a1a1a",color:"#888",padding:"0.55rem 1rem",borderRadius:8,cursor:"pointer",fontSize:12,border:"1px solid #222",fontFamily:"inherit"}}>📷 {fFile?"Cambiar":"Elegir foto"}</label>{fFile&&<span style={{color:"#444",fontSize:11,marginLeft:"0.65rem"}}>{fFile.name}</span>}{fPrev&&<div style={{marginTop:"0.65rem",width:80,height:80,borderRadius:8,overflow:"hidden",border:"1px solid #222"}}><img src={fPrev} alt="preview" style={{width:"100%",height:"100%",objectFit:"cover",pointerEvents:"none"}} draggable={false}/></div>}</div>
<div style={{background:"#0e0e0e",borderRadius:8,padding:"1rem",border:"1px dashed #1e1e1e"}}>
  <p style={{color:"#333",fontSize:9,letterSpacing:2,margin:"0 0 0.65rem",fontWeight:800}}>FOTOS ADICIONALES (GALERÍA)</p>
  <input ref={galleryFileRef} type="file" accept="image/*" multiple onChange={onGalleryFilesChange} style={{display:"none"}} id="fgi"/>
  <label htmlFor="fgi" style={{display:"inline-flex",alignItems:"center",gap:"0.45rem",background:"#1a1a1a",color:"#888",padding:"0.55rem 1rem",borderRadius:8,cursor:fGalleryUploading?"not-allowed":"pointer",fontSize:12,border:"1px solid #222",fontFamily:"inherit",opacity:fGalleryUploading?0.5:1}}>{fGalleryUploading?"Subiendo…":"🖼️ Agregar fotos"}</label>
  {fGallery.length>0&&(
    <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",marginTop:"0.75rem"}}>
      {fGallery.map((url,i)=>(
        <div key={i} style={{position:"relative",width:70,height:70,borderRadius:8,overflow:"hidden",border:"1px solid #222"}}>
          <img src={url} alt="" style={{width:"100%",height:"100%",objectFit:"cover",pointerEvents:"none"}} draggable={false}/>
          <button type="button" onClick={()=>makeGalleryImageMain(i)} title="Hacer principal" style={{position:"absolute",bottom:2,left:2,background:"rgba(0,0,0,0.75)",border:"none",borderRadius:5,color:"#ffd43b",fontSize:9,padding:"2px 4px",cursor:"pointer"}}>★</button>
          <button type="button" onClick={()=>removeGalleryImage(i)} title="Quitar" style={{position:"absolute",top:2,right:2,background:"rgba(0,0,0,0.75)",border:"none",borderRadius:"50%",width:16,height:16,color:"#ff6666",fontSize:10,lineHeight:1,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
          <div style={{position:"absolute",top:2,left:2,display:"flex",gap:2}}>
            {i>0&&<button type="button" onClick={()=>moveGalleryImage(i,-1)} title="Mover izquierda" style={{background:"rgba(0,0,0,0.75)",border:"none",borderRadius:4,width:16,height:16,color:"#fff",fontSize:9,lineHeight:1,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>◀</button>}
            {i<fGallery.length-1&&<button type="button" onClick={()=>moveGalleryImage(i,1)} title="Mover derecha" style={{background:"rgba(0,0,0,0.75)",border:"none",borderRadius:4,width:16,height:16,color:"#fff",fontSize:9,lineHeight:1,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>▶</button>}
          </div>
        </div>
      ))}
    </div>
  )}
  <p style={{color:"#2a2a2a",fontSize:9,margin:"0.6rem 0 0",lineHeight:1.5}}>Toca ★ en una foto para hacerla la principal.</p>
</div>
<div style={{display:"flex",gap:"0.65rem"}}>
  <button type="button" onClick={()=>setFActive(a=>!a)} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"space-between",background:fActive?"#0d1e0d":"#1e0d0d",border:`1px solid ${fActive?"#2a4a2a":"#4a2a2a"}`,borderRadius:8,padding:"0.65rem 0.9rem",cursor:"pointer",fontFamily:"inherit"}}>
    <span style={{fontSize:11,fontWeight:800,color:fActive?"#4caf50":"#ff6666"}}>{fActive?"✓ VISIBLE EN TIENDA":"✕ OCULTO (AGOTADO)"}</span>
    <div style={{width:34,height:20,borderRadius:20,background:fActive?"#4caf50":"#444",position:"relative",flexShrink:0,transition:"background 0.2s"}}><div style={{position:"absolute",top:2,left:fActive?16:2,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/></div>
  </button>
</div>
<div style={{background:"linear-gradient(135deg,#1a1608 0%,#0e0e0e 100%)",borderRadius:8,padding:"1rem",border:"1px solid #3a2f10"}}>
  <p style={{color:"#ffd43b",fontSize:9,letterSpacing:2,margin:"0 0 0.6rem",fontWeight:800}}>🏷️ OFERTA / DESCUENTO</p>
  <input placeholder="% de descuento (ej: 20). Vacío = sin oferta" type="number" min="0" max="95" value={fDiscount} onChange={e=>setFDiscount(e.target.value)} style={S.input}/>
  {fDiscount&&parseFloat(fDiscount)>0&&fPrice&&(
    <p style={{margin:"0.6rem 0 0",fontSize:11,color:"#ffd43b"}}>Precio con oferta: <strong>${(parseFloat(fPrice)*(1-Math.min(95,parseFloat(fDiscount))/100)).toFixed(2)}</strong> <span style={{color:"#666",textDecoration:"line-through"}}>${parseFloat(fPrice).toFixed(2)}</span></p>
  )}
</div>
<div style={{background:"#0e0e0e",borderRadius:8,padding:"1rem",border:"1px dashed #1e1e1e"}}>
  <p style={{color:"#333",fontSize:9,letterSpacing:2,margin:"0 0 0.6rem",fontWeight:800}}>CÓDIGO DE PRODUCTO (SKU)</p>
  <input placeholder="Ej: FK-RELOJ01 (vacío = se genera automático)" value={fCode} onChange={e=>setFCode(e.target.value.toUpperCase())} style={{...S.input,fontWeight:800,letterSpacing:1}}/>
</div>
{fErr&&<div style={{color:"#ff5555",fontSize:12,background:"#1e0808",padding:"0.65rem 1rem",borderRadius:8}}>{fErr}</div>}{fOk&&<div style={{color:"#55cc77",fontSize:12,background:"#081e0e",padding:"0.65rem 1rem",borderRadius:8}}>{fOk}</div>}<div style={{display:"flex",gap:"0.65rem",flexWrap:"wrap"}}><button onClick={submitProduct} disabled={fLoad} style={{...S.adminBtn,flex:1,opacity:fLoad?0.4:1,cursor:fLoad?"not-allowed":"pointer"}}>{fLoad?"Subiendo...":(editing?"Guardar cambios":"Agregar producto")}</button>{editing&&<button onClick={resetForm} style={{...S.adminBtn,flex:"0 0 auto",width:"auto",padding:"0.8rem 1.1rem",background:"transparent",color:"#444",border:"1px solid #1e1e1e"}}>Cancelar</button>}</div></div></div>
              <div style={{background:"#111",borderRadius:12,padding:"1.5rem",border:"1px solid #1a1a1a"}}>
                <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.85rem"}}><p style={{color:"#333",fontSize:9,fontWeight:800,letterSpacing:2,margin:0}}>PRODUCTOS ({adminProds.length})</p><span style={{fontSize:9,color:"#2a2a2a",background:"#161616",padding:"2px 7px",borderRadius:8,border:"1px solid #1e1e1e"}}>⠿ Arrastra para reordenar</span></div>
                <input placeholder="Buscar…" value={adminSearch} onChange={e=>setAdminSearch(e.target.value)} style={{...S.input,marginBottom:"0.75rem"}}/>

                {/* ── FILTRO DE CATEGORÍAS CON SCROLL DE RUEDA EN DESKTOP ── */}
                <div
                  ref={adminCatRef}
                  className="admin-cat-scroll"
                  style={{display:"flex",gap:"0.35rem",overflowX:"auto",paddingBottom:"0.75rem",marginBottom:"0.5rem",WebkitOverflowScrolling:"touch",touchAction:"pan-x"}}
                >
                  {["ALL",...usedCats].map(cat=>{const a=adminCat===cat;const n=cat==="ALL"?products.length:products.filter(p=>p.category===cat).length;return(<button key={cat} className="pl" onClick={()=>setAdminCat(cat)} style={{background:a?"#fff":"#161616",color:a?"#080808":"#555",border:`1px solid ${a?"#fff":"#222"}`,padding:"0.3rem 0.7rem",borderRadius:20,fontSize:9,fontWeight:800,letterSpacing:1,fontFamily:"inherit",flexShrink:0,WebkitTapHighlightColor:"transparent",cursor:"pointer",whiteSpace:"nowrap",transition:"all 0.12s ease"}}>{cat==="ALL"?"TODOS":catLabel(cat).toUpperCase()} · {n}</button>);})}</div>

                {adminCat==="ALL"?(
                  <div className="admin-list">{usedCats.map(cat=>{const cp=products.filter(p=>p.category===cat&&(adminSearch===""||p.name.toLowerCase().includes(adminSearch.toLowerCase())));if(!cp.length)return null;return(<div key={cat} style={{marginBottom:"1.1rem"}}><div style={{display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.4rem 0",marginBottom:"0.35rem",borderBottom:"1px solid #1a1a1a"}}><span style={{fontSize:9,fontWeight:800,letterSpacing:2,color:"#333"}}>{catLabel(cat).toUpperCase()}</span><span style={{fontSize:9,color:"#2a2a2a",background:"#1a1a1a",padding:"1px 6px",borderRadius:10}}>{cp.length}</span></div>{cp.map(p=>(<div key={p.id} data-rowid={p.id}><ARow p={p} editing={editing} onEdit={startEdit} onDel={delProd} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} isDragging={dragId===p.id} isOver={overId===p.id&&dragId!==p.id} onTouchStart={handleTouchDragStart} onTouchMove={handleTouchDragMove} onTouchEnd={handleTouchDragEnd} onToggleActive={toggleProductActive} onToggleDiscount={promptDiscount} onToggleBestseller={toggleProductBestseller}/></div>))}</div>);})}</div>
                ):(
                  <div className="admin-list" style={{display:"flex",flexDirection:"column",gap:2}}>{adminProds.map(p=>(<div key={p.id} data-rowid={p.id}><ARow p={p} editing={editing} onEdit={startEdit} onDel={delProd} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} isDragging={dragId===p.id} isOver={overId===p.id&&dragId!==p.id} onTouchStart={handleTouchDragStart} onTouchMove={handleTouchDragMove} onTouchEnd={handleTouchDragEnd} onToggleActive={toggleProductActive} onToggleDiscount={promptDiscount} onToggleBestseller={toggleProductBestseller}/></div>))}{!adminProds.length&&<p style={{color:"#333",textAlign:"center",padding:"1.5rem",fontSize:12}}>Sin resultados</p>}</div>
                )}
              </div>
            </>)}

            {adminLogged&&adminSec==="sales"&&(<>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}><h1 style={{color:"#fff",fontSize:16,fontWeight:900,margin:0,letterSpacing:2}}>REGISTRAR VENTA MANUAL</h1><button onClick={()=>{exitAdminSec();resetSaleForm();}} style={{background:"none",border:"none",color:"#333",cursor:"pointer",fontSize:12,fontFamily:"inherit",WebkitTapHighlightColor:"transparent"}}>← MENÚ</button></div>
              <div style={{background:"#111",borderRadius:12,padding:"1.5rem",border:"1px solid #1a1a1a"}}>
                <p style={{color:"#333",fontSize:9,fontWeight:800,letterSpacing:2,margin:"0 0 1.25rem"}}>PARA VENTAS CERRADAS POR WHATSAPP U OTRO CANAL FUERA DEL CHECKOUT AUTOMÁTICO</p>
                <div style={{display:"flex",flexDirection:"column",gap:"0.8rem"}}>
                  <button onClick={()=>setSaleSendMeta(v=>!v)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:saleSendMeta?"#0d1e0d":"#1a1a0d",border:`1px solid ${saleSendMeta?"#2a4a2a":"#4a4a2a"}`,borderRadius:10,padding:"0.75rem 1rem",cursor:"pointer",fontFamily:"inherit",textAlign:"left",WebkitTapHighlightColor:"transparent"}}>
                    <div><p style={{margin:"0 0 2px",fontSize:12,fontWeight:800,color:saleSendMeta?"#4caf50":"#ffd43b"}}>{saleSendMeta?"📤 Se enviará a Meta (CAPI)":"📋 Solo registro interno (no se envía a Meta)"}</p><p style={{margin:0,fontSize:10,color:"#666"}}>{saleSendMeta?"Cuenta como conversión de Purchase en Eventos Manager":"Útil para ventas hechas fuera de tus campañas, o ya reportadas antes"}</p></div>
                    <div style={{width:40,height:22,borderRadius:20,background:saleSendMeta?"#4caf50":"#333",position:"relative",flexShrink:0,transition:"background 0.2s"}}><div style={{position:"absolute",top:2,left:saleSendMeta?20:2,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/></div>
                  </button>
                  <button onClick={()=>setSaleIsBs(v=>!v)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:saleIsBs?"#1a1608":"#111",border:`1px solid ${saleIsBs?"#3a2f10":"#222"}`,borderRadius:10,padding:"0.75rem 1rem",cursor:"pointer",fontFamily:"inherit",textAlign:"left",WebkitTapHighlightColor:"transparent"}}>
                    <div><p style={{margin:"0 0 2px",fontSize:12,fontWeight:800,color:saleIsBs?"#ffd43b":"#888"}}>{saleIsBs?"💱 Pagado en Bolívares (se convierte a valor real USDT)":"💵 Pagado directo en USD/USDT (sin conversión)"}</p><p style={{margin:0,fontSize:10,color:"#666"}}>{saleIsBs?"El monto se recalcula con la tasa Binance antes de guardarse":"Usa esto si el cliente pagó en Pago Móvil o efectivo en bolívares"}</p></div>
                    <div style={{width:40,height:22,borderRadius:20,background:saleIsBs?"#ffd43b":"#333",position:"relative",flexShrink:0,transition:"background 0.2s"}}><div style={{position:"absolute",top:2,left:saleIsBs?20:2,width:18,height:18,borderRadius:"50%",background:saleIsBs?"#080808":"#fff",transition:"left 0.2s"}}/></div>
                  </button>
                  <input placeholder="Nombre del cliente" value={saleName} onChange={e=>setSaleName(e.target.value)} style={S.input}/>
                  <input placeholder={saleSendMeta?"Correo del cliente (recomendado)":"Correo del cliente (opcional)"} type="email" value={saleEmail} onChange={e=>setSaleEmail(e.target.value)} style={S.input}/>
                  <input placeholder={saleSendMeta?"Teléfono del cliente (recomendado)":"Teléfono del cliente (opcional)"} value={salePhone} onChange={e=>setSalePhone(e.target.value)} style={S.input}/>
                  <input placeholder="Producto(s) vendido(s)" value={saleProduct} onChange={e=>setSaleProduct(e.target.value)} style={S.input}/>
                  <select value={saleCategory} onChange={e=>setSaleCategory(e.target.value)} style={{...S.input,appearance:"auto" as any}}><option value="">Categoría del artículo (para estadísticas)</option><optgroup label="── LENTES">{LENTES_SUBCATS.map(s=><option key={s} value={s}>{catLabel(s)}</option>)}</optgroup><optgroup label="── OTROS">{SHOP_CATS.filter(c=>c!=="LENTES").map(c=><option key={c} value={c}>{catLabel(c)}</option>)}</optgroup></select>
                  <input placeholder="Monto total en USD *" type="number" min="0" step="0.01" value={saleAmount} onChange={e=>setSaleAmount(e.target.value)} style={S.input}/>
                  <input placeholder="Método de pago (opcional)" value={salePayMethod} onChange={e=>setSalePayMethod(e.target.value)} style={S.input}/>
                  <select value={saleState} onChange={e=>setSaleState(e.target.value)} style={{...S.input,appearance:"auto" as any}}><option value="">Estado de Venezuela (ubicación para Meta)</option>{VENEZUELA_STATES.map(s=><option key={s} value={s}>{s}</option>)}</select>
                  <textarea placeholder="Notas (opcional)" value={saleNotes} onChange={e=>setSaleNotes(e.target.value)} rows={2} style={{...S.input,resize:"vertical" as any,lineHeight:1.6}}/>
                  {saleErr&&<div style={{color:"#ff5555",fontSize:12,background:"#1e0808",padding:"0.65rem 1rem",borderRadius:8}}>{saleErr}</div>}
                  {saleOk&&<div style={{color:"#55cc77",fontSize:12,background:"#081e0e",padding:"0.65rem 1rem",borderRadius:8}}>{saleOk}</div>}
                  <button onClick={submitManualSale} disabled={saleLoading} style={{...S.adminBtn,opacity:saleLoading?0.4:1,cursor:saleLoading?"not-allowed":"pointer"}}>{saleLoading?"Registrando...":(saleSendMeta?"Registrar venta y enviar a Meta":"Registrar venta (solo interno)")}</button>
                </div>
              </div>
            </>)}

            {adminLogged&&adminSec==="stats"&&(<>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}>
                <h1 style={{color:"#fff",fontSize:16,fontWeight:900,margin:0,letterSpacing:2}}>ESTADÍSTICAS</h1>
                <div style={{display:"flex",gap:"0.5rem",alignItems:"center"}}>
                  <button onClick={()=>loadStats(true)} disabled={statsLoading} style={{background:"none",border:"1px solid #2a2a2a",color:"#888",padding:"0.4rem 0.85rem",borderRadius:8,cursor:statsLoading?"not-allowed":"pointer",fontSize:11,fontFamily:"inherit",fontWeight:700,WebkitTapHighlightColor:"transparent"}}>{statsLoading?"Cargando…":"↻ Actualizar"}</button>
                  <button onClick={()=>exitAdminSec()} style={{background:"none",border:"none",color:"#333",cursor:"pointer",fontSize:12,fontFamily:"inherit",WebkitTapHighlightColor:"transparent"}}>← MENÚ</button>
                </div>
              </div>

              <div style={{display:"flex",gap:"0.4rem",marginBottom:"0.75rem",flexWrap:"wrap"}}>
                {[{id:"7d" as const,l:"7 DÍAS"},{id:"30d" as const,l:"30 DÍAS"},{id:"90d" as const,l:"90 DÍAS"},{id:"all" as const,l:"TODO"}].map(p=>(
                  <button key={p.id} onClick={()=>setStatsPeriod(p.id)} style={{background:statsPeriod===p.id?"#fff":"#161616",color:statsPeriod===p.id?"#080808":"#666",border:`1px solid ${statsPeriod===p.id?"#fff":"#222"}`,padding:"0.4rem 0.9rem",borderRadius:20,fontSize:10,fontWeight:800,letterSpacing:1,cursor:"pointer",fontFamily:"inherit",WebkitTapHighlightColor:"transparent",transition:"all 0.15s"}}>{p.l}</button>
                ))}
              </div>
              <div style={{display:"flex",gap:"0.35rem",marginBottom:"1.25rem",flexWrap:"wrap"}}>
                <button onClick={()=>setStatsCategory("ALL")} style={{background:statsCategory==="ALL"?"#fff":"#161616",color:statsCategory==="ALL"?"#080808":"#666",border:`1px solid ${statsCategory==="ALL"?"#fff":"#222"}`,padding:"0.3rem 0.75rem",borderRadius:20,fontSize:9,fontWeight:800,letterSpacing:0.5,cursor:"pointer",fontFamily:"inherit",WebkitTapHighlightColor:"transparent",whiteSpace:"nowrap"}}>TODOS LOS ARTÍCULOS</button>
                {salesCategories.map(cat=>(<button key={cat} onClick={()=>setStatsCategory(cat)} style={{background:statsCategory===cat?"#fff":"#161616",color:statsCategory===cat?"#080808":"#666",border:`1px solid ${statsCategory===cat?"#fff":"#222"}`,padding:"0.3rem 0.75rem",borderRadius:20,fontSize:9,fontWeight:800,letterSpacing:0.5,cursor:"pointer",fontFamily:"inherit",WebkitTapHighlightColor:"transparent",whiteSpace:"nowrap"}}>{catLabel(cat).toUpperCase()}</button>))}
              </div>

              {statsErr&&<div style={{color:"#ff5555",fontSize:12,background:"#1e0808",padding:"0.75rem 1rem",borderRadius:8,marginBottom:"1.25rem"}}>{statsErr}</div>}

              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:"0.75rem",marginBottom:"1.5rem"}}>
                {[
                  {icon:"💰",label:"VENTAS (META)",value:`$${salesStats.totalRevenue.toFixed(2)}`,color:"#4caf50"},
                  {icon:"🧾",label:"PEDIDOS (META)",value:String(salesStats.totalSales),color:"#fff"},
                  {icon:"📈",label:"TICKET PROMEDIO",value:`$${salesStats.avgTicket.toFixed(2)}`,color:"#fff"},
                  {icon:"💬",label:"LEADS TOTALES",value:String(salesStats.totalLeads),color:"#4dabf7"},
                  {icon:"🎯",label:"CONVERSIÓN",value:`${salesStats.conversionRate.toFixed(1)}%`,color:"#ffd43b"},
                  {icon:"📋",label:"FUERA DE META",value:`$${salesStats.offlineRevenue.toFixed(2)} (${salesStats.offlineCount})`,color:"#c084fc"},
                ].map(k=>(
                  <div key={k.label} style={{background:"linear-gradient(160deg,#141414 0%,#0d0d0d 100%)",border:"1px solid #1e1e1e",borderRadius:14,padding:"1.1rem 1rem",position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)"}}/>
                    <p style={{fontSize:20,margin:"0 0 0.5rem"}}>{k.icon}</p>
                    <p style={{fontSize:18,fontWeight:900,margin:"0 0 2px",color:k.color,fontVariantNumeric:"tabular-nums"}}>{k.value}</p>
                    <p style={{fontSize:8,fontWeight:800,letterSpacing:1.5,color:"#444",margin:0}}>{k.label}</p>
                  </div>
                ))}
              </div>

              <div style={{background:"#111",borderRadius:14,border:"1px solid #1a1a1a",padding:"1.25rem",marginBottom:"1.25rem"}}>
                <p style={{fontSize:9,fontWeight:800,letterSpacing:2.5,color:"#333",margin:"0 0 1rem"}}>VENTAS · {statsPeriod==="7d"?"ÚLTIMOS 7 DÍAS":statsPeriod==="30d"?"ÚLTIMOS 30 DÍAS":statsPeriod==="90d"?"ÚLTIMOS 90 DÍAS (POR SEMANA)":"HISTÓRICO (POR MES)"}</p>
                <div className="ts" style={{display:"flex",alignItems:"flex-end",gap:statsPeriod==="30d"?"0.25rem":"0.6rem",height:120,overflowX:statsPeriod==="30d"?"auto":"visible",WebkitOverflowScrolling:"touch"}}>
                  {salesStats.days.map((d,i)=>(
                    <div key={i} style={{flex:statsPeriod==="30d"?"0 0 auto":1,width:statsPeriod==="30d"?24:"auto",display:"flex",flexDirection:"column",alignItems:"center",gap:6,height:"100%",justifyContent:"flex-end"}}>
                      <span style={{fontSize:8,color:"#555",fontWeight:700,whiteSpace:"nowrap"}}>{d.total>0?`$${d.total.toFixed(0)}`:""}</span>
                      <div style={{width:"100%",maxWidth:28,height:`${Math.max(4,(d.total/salesStats.maxDay)*90)}px`,background:d.total>0?"linear-gradient(180deg,#fff 0%,#999 100%)":"#1e1e1e",borderRadius:"4px 4px 0 0",transition:"height 0.3s ease"}}/>
                      <span style={{fontSize:8,color:"#333",fontWeight:800,letterSpacing:1,whiteSpace:"nowrap"}}>{d.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{display:"flex",alignItems:"center",gap:"0.75rem",background:"linear-gradient(135deg,#0f0f0f 0%,#111 100%)",border:"1px solid #1e1e1e",borderRadius:12,padding:"0.85rem 1.1rem",marginBottom:"1.5rem"}}>
                <span style={{fontSize:18}}>🏆</span>
                <p style={{margin:0,fontSize:12,color:"#888"}}>Método de pago más usado: <span style={{color:"#fff",fontWeight:800}}>{salesStats.topPayMethod}</span></p>
              </div>

              <div style={{background:"#111",borderRadius:14,border:"1px solid #1a1a1a",padding:"1.25rem",marginBottom:"1.25rem"}}>
                <p style={{fontSize:9,fontWeight:800,letterSpacing:2.5,color:"#333",margin:"0 0 1rem"}}>VENTAS RECIENTES · META ({salesStats.onlineSales.length})</p>
                {statsLoading&&!salesStats.onlineSales.length?(
                  <p style={{color:"#333",fontSize:12,textAlign:"center",padding:"1rem"}}>Cargando…</p>
                ):salesStats.onlineSales.length===0?(
                  <p style={{color:"#333",fontSize:12,textAlign:"center",padding:"1rem"}}>Aún no hay ventas registradas en este período</p>
                ):(
                  <div style={{display:"flex",flexDirection:"column",gap:2}}>
                    {salesStats.onlineSales.slice(0,15).map(sale=>(
                      <div key={sale.id} style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.65rem",borderRadius:8,background:"#0c0c0c"}}>
                        <div style={{width:32,height:32,borderRadius:"50%",background:"#0d1e0d",border:"1px solid #2a4a2a",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:13}}>💵</span></div>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{margin:"0 0 1px",fontSize:12,fontWeight:700,color:"#ccc",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(sale.name as string)||"Cliente sin nombre"} {sale.product?`· ${sale.product}`:""}</p>
                          <p style={{margin:0,fontSize:10,color:"#444"}}>{sale.createdAt?new Date(Number(sale.createdAt)).toLocaleString("es-VE",{dateStyle:"medium",timeStyle:"short"}):""} {sale.payMethod?`· ${sale.payMethod}`:""} {sale.category?`· ${catLabel(sale.category as string)}`:""} {sale.source?<span style={{color:sale.source==="web"?"#4dabf7":"#ffd43b",fontWeight:800}}>· {sale.source==="web"?"WEB":"MANUAL"}</span>:null}</p>
                        </div>
                        <span style={{fontSize:13,fontWeight:900,color:"#4caf50",flexShrink:0}}>${(Number(sale.amount)||0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{background:"#111",borderRadius:14,border:"1px solid #2a1a3a",padding:"1.25rem",marginBottom:"1.25rem"}}>
                <p style={{fontSize:9,fontWeight:800,letterSpacing:2.5,color:"#c084fc",margin:"0 0 1rem"}}>VENTAS FUERA DE META ({salesStats.offlineSales.length}) · ${salesStats.offlineRevenue.toFixed(2)}</p>
                {salesStats.offlineSales.length===0?(
                  <p style={{color:"#333",fontSize:12,textAlign:"center",padding:"1rem"}}>Aún no hay ventas fuera de Meta registradas en este período</p>
                ):(
                  <div style={{display:"flex",flexDirection:"column",gap:2}}>
                    {salesStats.offlineSales.slice(0,15).map(sale=>(
                      <div key={sale.id} style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.65rem",borderRadius:8,background:"#0c0c0c"}}>
                        <div style={{width:32,height:32,borderRadius:"50%",background:"#1a0d2a",border:"1px solid #4a2a5a",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:13}}>📋</span></div>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{margin:"0 0 1px",fontSize:12,fontWeight:700,color:"#ccc",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(sale.name as string)||"Cliente sin nombre"} {sale.product?`· ${sale.product}`:""}</p>
                          <p style={{margin:0,fontSize:10,color:"#444"}}>{sale.createdAt?new Date(Number(sale.createdAt)).toLocaleString("es-VE",{dateStyle:"medium",timeStyle:"short"}):""} {sale.payMethod?`· ${sale.payMethod}`:""} {sale.category?`· ${catLabel(sale.category as string)}`:""} {sale.notes?`· ${sale.notes}`:""}</p>
                        </div>
                        <span style={{fontSize:13,fontWeight:900,color:"#c084fc",flexShrink:0}}>${(Number(sale.amount)||0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{background:"#111",borderRadius:14,border:"1px solid #1a1a1a",padding:"1.25rem"}}>
                <p style={{fontSize:9,fontWeight:800,letterSpacing:2.5,color:"#333",margin:"0 0 1rem"}}>LEADS RECIENTES ({filteredLeads.length})</p>
                {statsLoading&&!filteredLeads.length?(
                  <p style={{color:"#333",fontSize:12,textAlign:"center",padding:"1rem"}}>Cargando…</p>
                ):filteredLeads.length===0?(
                  <p style={{color:"#333",fontSize:12,textAlign:"center",padding:"1rem"}}>Aún no hay leads registrados en este período</p>
                ):(
                  <div style={{display:"flex",flexDirection:"column",gap:2}}>
                    {filteredLeads.slice(0,15).map(lead=>(
                      <div key={lead.id} style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.6rem 0.65rem",borderRadius:8,background:"#0c0c0c"}}>
                        <div style={{width:28,height:28,borderRadius:"50%",background:"#0a1a2a",border:"1px solid #1a3a5a",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:11}}>💬</span></div>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{margin:"0 0 1px",fontSize:11,fontWeight:700,color:"#ccc"}}>{(lead.source as string)||"Origen desconocido"}</p>
                          <p style={{margin:0,fontSize:9,color:"#444"}}>{lead.createdAt?new Date(Number(lead.createdAt)).toLocaleString("es-VE",{dateStyle:"medium",timeStyle:"short"}):""}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>)}

            {adminLogged&&adminSec==="coupons"&&(<>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}><h1 style={{color:"#fff",fontSize:16,fontWeight:900,margin:0,letterSpacing:2}}>CUPONES DE DESCUENTO</h1><button onClick={()=>exitAdminSec()} style={{background:"none",border:"none",color:"#333",cursor:"pointer",fontSize:12,fontFamily:"inherit",WebkitTapHighlightColor:"transparent"}}>← MENÚ</button></div>

              <div style={{background:"linear-gradient(160deg,#141414 0%,#0a0a0a 100%)",borderRadius:14,padding:"1.5rem",border:"1px solid #2a2a2a",marginBottom:"1.5rem",position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)"}}/>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:"1.25rem"}}>
                  <div style={{width:32,height:32,borderRadius:8,background:"linear-gradient(135deg,#fff 0%,#999 100%)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#080808" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 000 4h4v-4z"/></svg>
                  </div>
                  <p style={{color:"#333",fontSize:9,fontWeight:800,letterSpacing:2.5,margin:0}}>GENERAR NUEVO CUPÓN</p>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:"0.8rem"}}>
                  <div style={{display:"flex",gap:"0.6rem"}}>
                    <input placeholder="CÓDIGO" value={couponCode} onChange={e=>setCouponCode(e.target.value.toUpperCase())} style={{...S.input,flex:1,fontWeight:800,letterSpacing:2}}/>
                    <button type="button" onClick={()=>setCouponCode(generateCouponCode())} style={{background:"#1a1a1a",color:"#ccc",border:"1px solid #2a2a2a",borderRadius:8,padding:"0 1rem",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:800,flexShrink:0}}>🎲 GENERAR</button>
                  </div>
                  <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
                    <button type="button" onClick={()=>setCouponType("general")} style={{flex:1,minWidth:110,background:couponType==="general"?"#fff":"#111",color:couponType==="general"?"#080808":"#666",border:`1px solid ${couponType==="general"?"#fff":"#222"}`,borderRadius:8,padding:"0.65rem",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:800,letterSpacing:0.5}}>🌐 GENERAL</button>
                    <button type="button" onClick={()=>setCouponType("category")} style={{flex:1,minWidth:110,background:couponType==="category"?"#fff":"#111",color:couponType==="category"?"#080808":"#666",border:`1px solid ${couponType==="category"?"#fff":"#222"}`,borderRadius:8,padding:"0.65rem",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:800,letterSpacing:0.5}}>🗂️ SECCIÓN</button>
                    <button type="button" onClick={()=>setCouponType("product")} style={{flex:1,minWidth:110,background:couponType==="product"?"#fff":"#111",color:couponType==="product"?"#080808":"#666",border:`1px solid ${couponType==="product"?"#fff":"#222"}`,borderRadius:8,padding:"0.65rem",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:800,letterSpacing:0.5}}>🎯 PRODUCTO</button>
                  </div>
                  {couponType==="category"&&(
                    <select value={couponCategory} onChange={e=>setCouponCategory(e.target.value)} style={{...S.input,appearance:"auto" as any}}>
                      <option value="">Selecciona la sección de accesorios *</option>
                      <optgroup label="── LENTES">{LENTES_SUBCATS.map(s=><option key={s} value={s}>{catLabel(s)}</option>)}</optgroup>
                      <optgroup label="── OTROS">{SHOP_CATS.filter(c=>c!=="LENTES").map(c=><option key={c} value={c}>{catLabel(c)}</option>)}</optgroup>
                    </select>
                  )}
                  {couponType==="product"&&(
                    <>
                      <select value={couponProductCatFilter} onChange={e=>{setCouponProductCatFilter(e.target.value);setCouponProductId("");}} style={{...S.input,appearance:"auto" as any}}>
                        <option value="ALL">Todas las secciones</option>
                        <optgroup label="── LENTES">{LENTES_SUBCATS.map(s=><option key={s} value={s}>{catLabel(s)}</option>)}</optgroup>
                        <optgroup label="── OTROS">{SHOP_CATS.filter(c=>c!=="LENTES").map(c=><option key={c} value={c}>{catLabel(c)}</option>)}</optgroup>
                      </select>
                      <input placeholder="🔎 Buscar producto…" value={couponProductSearch} onChange={e=>setCouponProductSearch(e.target.value)} style={S.input}/>
                      <select value={couponProductId} onChange={e=>setCouponProductId(e.target.value)} style={{...S.input,appearance:"auto" as any}}>
                        <option value="">Selecciona el producto *</option>
                        {products.filter(p=>(couponProductCatFilter==="ALL"||p.category===couponProductCatFilter)&&p.name.toLowerCase().includes(couponProductSearch.toLowerCase())).map(p=><option key={p.id} value={p.id}>{p.name} — ${p.price.toFixed(2)}</option>)}
                      </select>
                    </>
                  )}
                  <div style={{display:"flex",gap:"0.6rem"}}>
                    <input placeholder="% descuento *" type="number" min="1" max="95" value={couponDiscount} onChange={e=>setCouponDiscount(e.target.value)} style={{...S.input,flex:1}}/>
                    <input placeholder="Duración (horas) *" type="number" min="1" value={couponHours} onChange={e=>setCouponHours(e.target.value)} style={{...S.input,flex:1}}/>
                  </div>
                  {couponErr&&<div style={{color:"#ff5555",fontSize:12,background:"#1e0808",padding:"0.65rem 1rem",borderRadius:8}}>{couponErr}</div>}
                  {couponOk&&<div style={{color:"#55cc77",fontSize:12,background:"#081e0e",padding:"0.65rem 1rem",borderRadius:8}}>{couponOk}</div>}
                  <button onClick={submitCoupon} disabled={couponLoading} style={{...S.adminBtn,background:"linear-gradient(135deg,#fff 0%,#ccc 100%)",opacity:couponLoading?0.5:1,cursor:couponLoading?"not-allowed":"pointer"}}>{couponLoading?"Creando...":"✨ Crear cupón"}</button>
                </div>
              </div>

              <div style={{background:"#111",borderRadius:14,border:"1px solid #1a1a1a",padding:"1.25rem"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
                  <p style={{color:"#333",fontSize:9,fontWeight:800,letterSpacing:2.5,margin:0}}>CUPONES CREADOS ({couponsList.length})</p>
                  <button onClick={()=>loadCoupons(true)} disabled={couponsLoading} style={{background:"none",border:"1px solid #2a2a2a",color:"#888",padding:"0.3rem 0.7rem",borderRadius:8,cursor:couponsLoading?"not-allowed":"pointer",fontSize:10,fontFamily:"inherit",fontWeight:700}}>{couponsLoading?"…":"↻"}</button>
                </div>
                {couponsLoading&&!couponsList.length?(
                  <p style={{color:"#333",fontSize:12,textAlign:"center",padding:"1.5rem"}}>Cargando…</p>
                ):couponsList.length===0?(
                  <p style={{color:"#333",fontSize:12,textAlign:"center",padding:"1.5rem"}}>Aún no has creado ningún cupón</p>
                ):(
                  <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
                    {couponsList.map(c=>{
                      const now=Date.now();
                      const expired=now>c.expiresAt;
                      const isLive=c.active&&!expired;
                      const msLeft=c.expiresAt-now;
                      const hLeft=Math.max(0,Math.floor(msLeft/3600000));
                      const mLeft=Math.max(0,Math.floor((msLeft%3600000)/60000));
                      return(
                        <div key={c.id} style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.75rem",borderRadius:10,background:isLive?"linear-gradient(135deg,#141410 0%,#0d0d0a 100%)":"#0c0c0c",border:`1px solid ${isLive?"#3a3520":"#1a1a1a"}`}}>
                          <div style={{width:38,height:38,borderRadius:8,background:isLive?"linear-gradient(135deg,#ffd43b 0%,#c99a1f 100%)":"#1a1a1a",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                            <span style={{fontSize:15}}>{c.type==="general"?"🌐":c.type==="category"?"🗂️":"🎯"}</span>
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <p style={{margin:"0 0 2px",fontSize:12,fontWeight:800,color:"#fff",letterSpacing:1,fontFamily:"monospace"}}>{c.code} <span style={{color:"#ffd43b"}}>-{c.discountPercent}%</span></p>
                            <p style={{margin:0,fontSize:10,color:"#555"}}>{c.type==="general"?"Aplica a todo el carrito":c.type==="category"?`Sección: ${catLabel(c.category||"")}`:`Solo: ${c.productName||"producto"}`} {isLive?`· quedan ${hLeft}h ${mLeft}m`:expired?"· expirado":"· desactivado"}</p>
                          </div>
                          <span style={{fontSize:9,fontWeight:800,letterSpacing:1,padding:"3px 8px",borderRadius:20,background:isLive?"#0d1e0d":"#1e0d0d",color:isLive?"#4caf50":"#ff6666",flexShrink:0}}>{isLive?"ACTIVO":expired?"EXPIRADO":"PAUSADO"}</span>
                          <div style={{display:"flex",gap:"0.3rem",flexShrink:0}}>
                            <button onClick={()=>extendCoupon(c)} title="Alargar vigencia" style={{background:"#0d1a2a",color:"#4dabf7",border:"1px solid #1a3a5a",padding:"0.3rem 0.5rem",borderRadius:6,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>⏱️+</button>
                            <button onClick={()=>toggleCouponActive(c)} title={c.active?"Pausar":"Reactivar"} style={{background:"#1a1a1a",color:"#888",border:"1px solid #222",padding:"0.3rem 0.5rem",borderRadius:6,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>{c.active?"⏸️":"▶️"}</button>
                            <button onClick={()=>deleteCoupon(c.id)} style={{background:"none",color:"#cc3333",border:"1px solid #2a1515",padding:"0.3rem 0.55rem",borderRadius:6,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>✕</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>)}

            {adminLogged&&adminSec==="lookup"&&(<>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}><h1 style={{color:"#fff",fontSize:16,fontWeight:900,margin:0,letterSpacing:2}}>BUSCAR POR CÓDIGO</h1><button onClick={()=>exitAdminSec()} style={{background:"none",border:"none",color:"#333",cursor:"pointer",fontSize:12,fontFamily:"inherit",WebkitTapHighlightColor:"transparent"}}>← MENÚ</button></div>
              <div style={{background:"#111",borderRadius:14,padding:"1.5rem",border:"1px solid #1a1a1a"}}>
                <p style={{color:"#333",fontSize:9,fontWeight:800,letterSpacing:2,margin:"0 0 1rem"}}>INGRESA EL CÓDIGO QUE TE ENVIÓ EL CLIENTE EN SU PEDIDO</p>
                <input autoFocus placeholder="Ej: FK-RELOJ01" value={lookupCode} onChange={e=>setLookupCode(e.target.value.toUpperCase())} style={{...S.input,fontWeight:800,letterSpacing:1.5,marginBottom:"1.25rem"}}/>
                {lookupCode.trim()===""?(
                  <p style={{color:"#333",fontSize:12,textAlign:"center",padding:"1.5rem"}}>Escribe un código para buscar el producto</p>
                ):(()=>{
                  const results=products.filter(p=>(p.code||"").toUpperCase().includes(lookupCode.trim()));
                  if(!results.length)return<p style={{color:"#ff6666",fontSize:12,textAlign:"center",padding:"1.5rem",background:"#1e0808",borderRadius:8}}>No se encontró ningún producto con ese código</p>;
                  return(
                    <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
                      {results.map(p=>(
                        <div key={p.id} style={{display:"flex",alignItems:"center",gap:"0.85rem",background:"linear-gradient(135deg,#141410 0%,#0d0d0a 100%)",border:"1px solid #2a4a2a",borderRadius:10,padding:"0.85rem"}}>
                          <img src={optImg(p.img,120)} alt={p.name} style={{width:56,height:56,objectFit:"cover",borderRadius:8,flexShrink:0}} draggable={false}/>
                          <div style={{flex:1,minWidth:0}}>
                            <p style={{margin:"0 0 3px",fontSize:13,fontWeight:800,color:"#fff"}}>{p.name}</p>
                            <p style={{margin:"0 0 2px",fontSize:11,color:"#4caf50",fontFamily:"monospace",fontWeight:800}}>{p.code}</p>
                            <p style={{margin:0,fontSize:11,color:"#666"}}>{catLabel(p.category)} · ${p.price.toFixed(2)} {p.active===false&&<span style={{color:"#ff6666",fontWeight:800}}> · OCULTO</span>}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </>)}
          </div>
        </main>
      )}

      {/* PRODUCT MODAL */}
      {selectedProduct&&(
        <div onClick={closeProdModal} style={{position:"fixed",inset:0,zIndex:400,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadeIn 0.18s ease"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#111",width:"100%",maxWidth:520,maxHeight:"92vh",borderRadius:"18px 18px 0 0",display:"flex",flexDirection:"column",animation:"slideUp 0.28s cubic-bezier(0.25,0.46,0.45,0.94)",border:"1px solid #1e1e1e",borderBottom:"none",overflow:"hidden"}}>
            <div style={{padding:"1.5rem 1.5rem 0",flexShrink:0}}>
              <div style={{width:36,height:3,background:"#222",borderRadius:2,margin:"0 auto 1rem"}}/>
            </div>
            <div className="ts" style={{overflowY:"auto",WebkitOverflowScrolling:"touch",padding:"0 1.5rem",flex:1,minHeight:0}}>
              <div style={{background:"#0a0a0a",aspectRatio:"1/1",overflow:"hidden",marginBottom:"0.6rem",borderRadius:12,position:"relative"}}>
                <LazyImg src={getAllImages(selectedProduct)[modalImgIdx]||selectedProduct.img} alt={selectedProduct.name} fit="contain"/>
                {!!selectedProduct.discount&&selectedProduct.discount>0&&<DiscountBadge percent={selectedProduct.discount} issuper={isSuperOffer(selectedProduct.discount)}/>}
              </div>
              {getAllImages(selectedProduct).length>1&&(
                <div className="ts" style={{display:"flex",gap:"0.5rem",overflowX:"auto",marginBottom:"1.1rem",WebkitOverflowScrolling:"touch"}}>
                  {getAllImages(selectedProduct).map((src,i)=>(
                    <button key={i} onClick={()=>setModalImgIdx(i)} style={{flexShrink:0,width:56,height:56,borderRadius:8,overflow:"hidden",padding:0,cursor:"pointer",background:"#0a0a0a",border:`2px solid ${modalImgIdx===i?"#fff":"transparent"}`,WebkitTapHighlightColor:"transparent"}}>
                      <img src={optImg(src,120)} alt="" style={{width:"100%",height:"100%",objectFit:"cover",pointerEvents:"none"}} draggable={false}/>
                    </button>
                  ))}
                </div>
              )}
              <h2 style={{fontSize:18,fontWeight:900,margin:"0 0 0.35rem",color:C.accent}}>{selectedProduct.name}</h2>
              {selectedProduct.code&&<p style={{fontSize:10,color:"#333",margin:"0 0 0.5rem",fontFamily:"monospace",letterSpacing:1}}>Código: {selectedProduct.code}</p>}
              {selectedProduct.description&&<p style={{fontSize:13,color:"#555",margin:"0 0 0.65rem",lineHeight:1.6}}>{selectedProduct.description}</p>}
              {selectedProduct.discount&&selectedProduct.discount>0?(
                <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:"1.25rem",flexWrap:"wrap"}}>
                  <p style={{fontSize:24,fontWeight:900,margin:0,color:isSuperOffer(selectedProduct.discount)?"#ff5555":"#ffd43b"}}>{fmtPrice(getFinalPrice(selectedProduct))}</p>
                  <p style={{fontSize:15,margin:0,color:"#555",textDecoration:"line-through"}}>{fmtPrice(selectedProduct.price)}</p>
                </div>
              ):(
                <p style={{fontSize:24,fontWeight:900,margin:"0 0 1.25rem",color:C.accent}}>{fmtPrice(selectedProduct.price)}</p>
              )}
              {modalSuggestions.length>0&&(
                <div style={{marginTop:"0.5rem",paddingTop:"1.25rem",borderTop:`1px solid ${C.border}`,paddingBottom:"1.5rem"}}>
                  <p style={{fontSize:10,fontWeight:800,letterSpacing:2,color:"#555",margin:"0 0 0.85rem"}}>TAMBIÉN TE PUEDE INTERESAR</p>
                  <HRow products={modalSuggestions} onSelect={switchModalProduct} onBuyNow={switchModalProduct} fmtPrice={fmtPrice}/>
                </div>
              )}
            </div>
            <div style={{flexShrink:0,padding:"1rem 1.5rem 1.5rem",background:"#111",borderTop:"1px solid #1e1e1e",display:"flex",alignItems:"center",gap:"0.75rem",boxShadow:"0 -8px 24px rgba(0,0,0,0.4)"}}>
              <div style={{display:"flex",alignItems:"center",border:`1px solid ${C.border}`,borderRadius:8,flexShrink:0}}>
                <button onClick={()=>setModalQty(Math.max(1,modalQty-1))} style={S.qtyBtn}>−</button>
                <span style={{padding:"0 0.85rem",fontSize:16,color:C.text,fontWeight:700}}>{modalQty}</span>
                <button onClick={()=>setModalQty(modalQty+1)} style={S.qtyBtn}>+</button>
              </div>
              <button onClick={()=>addToCart(selectedProduct,modalQty)} style={{...S.darkBtn,flex:1,justifyContent:"center",fontSize:12,padding:"1.05rem",borderRadius:10}}>AGREGAR AL CARRITO</button>
            </div>
          </div>
        </div>
      )}

      {addedProduct&&<AddedModal product={addedProduct} onClose={()=>setAddedProduct(null)} onGoCart={()=>{setAddedProduct(null);setMainView("cart");}} fmtPrice={fmtPrice}/>}
      {showAuth&&<AuthModal onClose={()=>setShowAuth(false)} onSuccess={u=>{setCurrentUser(u);setShowAuth(false);}}/>}
      {totalItems>0&&!isCart&&!isAdmin&&!isTY&&!selectedProduct&&<MiniCartBar totalItems={totalItems} totalPrice={totalPrice} fmtPrice={fmtPrice} onClick={()=>setMainView("cart")}/>}
      {!isAdmin&&<DraggableWA/>}
    </div>
  );
}     