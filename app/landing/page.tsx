"use client";

import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";

const WHATSAPP_NUMBER = "584243005733";
const PRODUCT = { name: "Lentes Anti Luz Azul Premium", price: 28, offerPrice: 19.9 };
const LeadModalContext = createContext<(source: string) => void>(() => {});

// ─── RESEÑAS EN VIVO (FIRESTORE) ─────────────────────────────────────────
const FIREBASE_PROJECT_ID = "fokus-16a0c";
const REVIEWS_PRODUCT_CODE = "FK-13YTHA";
const REVIEWS_POLL_MS = 20000;

type LiveReview = { id: string; name: string; comment: string; stars: number; createdAt: number; email: string };

function fsBaseLanding() {
  return `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
}

function fsValueToJs(v: any): any {
  if (!v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("doubleValue" in v) return v.doubleValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(fsValueToJs);
  if ("mapValue" in v) {
    const fields = v.mapValue.fields || {};
    return Object.fromEntries(Object.entries(fields).map(([k, val]) => [k, fsValueToJs(val)]));
  }
  return null;
}

async function fetchProductIdByCode(code: string): Promise<string | null> {
  try {
    const res = await fetch(`${fsBaseLanding()}:runQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "products" }],
          where: { fieldFilter: { field: { fieldPath: "code" }, op: "EQUAL", value: { stringValue: code } } },
          limit: 1,
        },
      }),
    });
    const data = await res.json();
    const found = (Array.isArray(data) ? data : []).find((x: any) => x.document);
    if (!found) return null;
    return found.document.name.split("/").pop();
  } catch { return null; }
}

async function fetchProductReviews(productId: string): Promise<LiveReview[]> {
  try {
    const res = await fetch(`${fsBaseLanding()}:runQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "product_comments" }],
          where: { fieldFilter: { field: { fieldPath: "productId" }, op: "EQUAL", value: { stringValue: productId } } },
        },
      }),
    });
    const data = await res.json();
    const docs = (Array.isArray(data) ? data : []).filter((x: any) => x.document).map((x: any) => x.document);
    const reviews: LiveReview[] = docs.map((doc: any) => {
      const f = doc.fields || {};
      return {
        id: doc.name.split("/").pop(),
        name: fsValueToJs(f.name) || "Cliente Fokus",
        comment: fsValueToJs(f.comment) || "",
        stars: Number(fsValueToJs(f.stars)) || 5,
        createdAt: Number(fsValueToJs(f.createdAt)) || 0,
        email: fsValueToJs(f.email) || "",
      };
    });
    reviews.sort((a, b) => b.createdAt - a.createdAt);
    return reviews;
  } catch { return []; }
}

function formatRelativeDate(ts: number): string {
  if (!ts) return "";
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return "Hoy";
  if (days === 1) return "Hace 1 día";
  if (days < 30) return `Hace ${days} días`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Hace ${months} mes${months > 1 ? "es" : ""}`;
  const years = Math.floor(months / 12);
  return `Hace ${years} año${years > 1 ? "s" : ""}`;
}

function useLiveReviews() {
  const [reviews, setReviews] = useState<LiveReview[]>([]);
  const [loading, setLoading] = useState(true);
  const productIdRef = useRef<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!productIdRef.current) productIdRef.current = await fetchProductIdByCode(REVIEWS_PRODUCT_CODE);
      if (!productIdRef.current) { if (!cancelled) setLoading(false); return; }
      const list = await fetchProductReviews(productIdRef.current);
      if (!cancelled) { setReviews(list); setLoading(false); }
    };
    load();
    const id = setInterval(load, REVIEWS_POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);
  const avg = reviews.length ? reviews.reduce((s, r) => s + (r.stars || 5), 0) / reviews.length : 0;
  return { reviews, avg, loading };
}

// ─── ESTILOS GLOBALES ───────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @keyframes udot { 0%,100%{opacity:1} 50%{opacity:0.35} }
    @keyframes gp { 0%,100%{transform:translate(-50%,-50%) scale(1);opacity:0.6} 50%{transform:translate(-50%,-50%) scale(1.2);opacity:1} }
    @keyframes fy { 0%,100%{transform:translate(-50%,-50%) translateY(0)} 50%{transform:translate(-50%,-50%) translateY(-12px)} }
    @keyframes fr { 0%,100%{transform:translate(-50%,-50%) rotate(-1deg)} 50%{transform:translate(-50%,-50%) rotate(1deg)} }
    @keyframes rf { 0%,100%{opacity:0.6} 50%{opacity:0.2} }
    @keyframes pf { 0%,100%{transform:translateY(0) scale(1);opacity:0.8} 50%{transform:translateY(-20px) scale(1.3);opacity:1} }
    @keyframes pp { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
    @keyframes bs { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
    @keyframes shimmerBtn { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
    @keyframes slideUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
    @keyframes fadeIn { from{opacity:0} to{opacity:1} }
    .lentes-box:hover .lentes-img { animation-play-state:paused !important; transform:translate(-50%,-50%) scale(1.08) !important; }
    .cta-btn:active { transform:scale(0.94) !important; }
    .cta-btn { touch-action:manipulation; -webkit-tap-highlight-color:transparent; }
    .reveal { opacity:0; transform:translateY(30px); filter:blur(4px); transition:all 0.8s cubic-bezier(0.16,1,0.3,1); }
    .reveal.visible { opacity:1; transform:translateY(0); filter:blur(0); }
  `}</style>
);

// ─── ÍCONOS ─────────────────────────────────────────────────────────────
const IcWA = ({ s = 20 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
);

const IcStar = ({ s = 11 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="#fff"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01z"/></svg>
);

const IcArrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
);

const IcGem = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z"/></svg>
);

// ─── REVEAL ON SCROLL ───────────────────────────────────────────────────
function useReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); });
    }, { threshold: 0.1, rootMargin: "0px 0px -5% 0px" });
    document.querySelectorAll(".reveal").forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

// ─── COUNTDOWN ──────────────────────────────────────────────────────────
function useCountdown() {
  const [t, setT] = useState({ h: "04", m: "23", s: "17" });
  useEffect(() => {
    const tick = () => {
      const n = new Date(); const e = new Date(n); e.setHours(23, 59, 59, 999);
      const ms = Math.max(0, e.getTime() - n.getTime());
      const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
      const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
      const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
      setT({ h, m, s });
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);
  return t;
}

// ─── STOCK COUNTER ──────────────────────────────────────────────────────
function useStock() {
  const [stock, setStock] = useState(7);
  useEffect(() => {
    const id = setInterval(() => {
      setStock(s => (Math.random() < 0.25 && s > 2 ? s - 1 : s));
    }, 12000);
    return () => clearInterval(id);
  }, []);
  return stock;
}

// ─── SOCIAL PROOF TOAST ─────────────────────────────────────────────────
function SocialToast() {
  const [vis, setVis] = useState(false);
  const [msg, setMsg] = useState({ name: "Genesis", city: "Valencia", mins: 3 });
  useEffect(() => {
    const ns = ["Genesis","Carlos","Andreina","Jose","Valeria","Anderson","Yorbelis","Miguel","Franyelis","Luis"];
    const cs = ["Caracas","Valencia","Maracaibo","Maracay","Barquisimeto","Puerto La Cruz","Barinas","Mérida","San Cristóbal"];
    let t1: any, t2: any;
    const cycle = () => {
      setMsg({ name: ns[Math.floor(Math.random()*ns.length)], city: cs[Math.floor(Math.random()*cs.length)], mins: 1+Math.floor(Math.random()*14) });
      setVis(true); t2 = setTimeout(() => setVis(false), 5000);
      t1 = setTimeout(cycle, 16000+Math.random()*8000);
    };
    t1 = setTimeout(cycle, 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return (
    <div style={{ position:"fixed",left:14,bottom:90,zIndex:480,background:"#111",border:"1px solid #1e1e1e",borderRadius:12,padding:"12px 14px",maxWidth:260,display:"flex",gap:10,alignItems:"center",boxShadow:"0 12px 30px rgba(0,0,0,0.5)",opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"opacity 0.4s,transform 0.4s",pointerEvents:"none" }}>
      <div style={{ width:30,height:30,borderRadius:"50%",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
        <span style={{ fontSize:12,fontWeight:900,color:"#080808" }}>{msg.name[0]}</span>
      </div>
      <p style={{ margin:0,fontSize:11,color:"#ccc",lineHeight:1.5 }}>
        <strong style={{ color:"#fff" }}>{msg.name}</strong> de {msg.city} compró hace {msg.mins} min
      </p>
    </div>
  );
}

// ─── PARTICLES CANVAS ───────────────────────────────────────────────────
function ParticlesBg() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const x = c.getContext("2d"); if (!x) return;
    let W = 0, H = 0, pts: any[] = [], raf: number;
    const rs = () => { W = c.width = window.innerWidth; H = c.height = window.innerHeight; };
    rs(); window.addEventListener("resize", rs);
    for (let i = 0; i < 30; i++) pts.push({ x: Math.random()*W, y: Math.random()*H, r: Math.random()*2+0.5, vx: (Math.random()-0.5)*0.3, vy: (Math.random()-0.5)*0.3, o: Math.random()*0.5+0.2 });
    const dr = () => {
      x.clearRect(0,0,W,H);
      pts.forEach(p => { p.x+=p.vx; p.y+=p.vy; if(p.x<0||p.x>W)p.vx*=-1; if(p.y<0||p.y>H)p.vy*=-1; x.beginPath(); x.arc(p.x,p.y,p.r,0,Math.PI*2); x.fillStyle=`rgba(255,255,255,${p.o})`; x.fill(); });
      raf = requestAnimationFrame(dr);
    };
    dr();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", rs); };
  }, []);
  return <canvas ref={ref} style={{ position:"fixed",top:0,left:0,width:"100%",height:"100%",zIndex:0,pointerEvents:"none",opacity:0.35 }} />;
}

// ─── CLICK BURST CANVAS ─────────────────────────────────────────────────
function BurstCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const x = c.getContext("2d"); if (!x) return;
    let W = 0, H = 0, fp: any[] = [], raf: number;
    const rs = () => { W = c.width = window.innerWidth; H = c.height = window.innerHeight; };
    rs(); window.addEventListener("resize", rs);
    const loop = () => {
      x.clearRect(0,0,W,H); fp = fp.filter(p=>p.life>0); fp.forEach(p=>{p.update();p.draw();});
      raf = requestAnimationFrame(loop);
    };
    class P {
      life=1; decay=0; size=0; color=""; x=0; y=0; vx=0; vy=0; g=0.12;
      constructor(px:number,py:number,co?:string){
        this.x=px;this.y=py;const a=Math.random()*Math.PI*2;const sp=2+Math.random()*6;
        this.vx=Math.cos(a)*sp;this.vy=Math.sin(a)*sp;this.decay=0.015+Math.random()*0.02;
        this.size=2+Math.random()*5;this.color=co||["#ff3b3b","#ffd43b","#fff","#ff8888"][Math.floor(Math.random()*4)];
      }
      update(){this.x+=this.vx;this.y+=this.vy;this.vy+=this.g;this.life-=this.decay;this.size*=0.97;}
      draw(){x!.globalAlpha=this.life;x!.fillStyle=this.color;x!.beginPath();x!.arc(this.x,this.y,this.size,0,Math.PI*2);x!.fill();x!.globalAlpha=1;}
    }
    (window as any).__burst = (px:number,py:number,co?:string,count=24)=>{ for(let i=0;i<count;i++)fp.push(new P(px,py,co)); if(navigator.vibrate)navigator.vibrate(40); };
    loop();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", rs); };
  }, []);
  return <canvas ref={ref} style={{ position:"fixed",top:0,left:0,width:"100%",height:"100%",zIndex:999,pointerEvents:"none" }} />;
}

// ─── FAQ ────────────────────────────────────────────────────────────────
const FAQS = [
  { q: "¿Es seguro comprar por WhatsApp?", a: "Sí. Hablas directo con nosotros, sin intermediarios ni bots. Confirmamos tu pedido, te enviamos los datos de pago y coordinamos el envío en tiempo real. Más de 15.000 pedidos entregados nos respaldan." },
  { q: "¿Y si no me quedan o no me gustan?", a: "Tienes garantía de satisfacción: si al recibirlos algo no está bien, lo resolvemos contigo directamente." },
  { q: "¿Cómo pago?", a: "Aceptamos Pago Móvil (Banco de Venezuela y Bancamiga), Binance Pay y Zinli. Tú eliges al finalizar por WhatsApp." },
  { q: "¿Cuánto tarda el envío?", a: "Enviamos a los 23 estados de Venezuela mediante MRW, Zoom y Tealca. Con MRW el tiempo de entrega es de 1 a 2 días hábiles." },
  { q: "¿De verdad filtran la luz azul?", a: "Sí, el cristal cuenta con filtro real de luz azul, no es solo un lente con tinte decorativo." },
 { q: "¿Sirven para mi fórmula (graduación)?", a: "Sí. El diseño está preparado tanto para mandar a montar tu fórmula en cualquier óptica, como para usarlos tal cual en tu día a día frente a la pantalla." },
  { q: "¿Me van a quedar bien? No sé si es mi estilo", a: "El diseño aviador con puente doble se adapta a la mayoría de los rostros, y el acabado mate es discreto — no es un lente 'llamativo', es un lente que se nota por calidad, no por exceso." },
  { q: "¿No se ven muy formales / muy casuales?", a: "Justo por eso funcionan: van igual de bien con una reunión que con una salida de fin de semana. Es la pieza que no tienes que pensar dos veces antes de usar." },
];
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const ansRef = useRef<HTMLDivElement>(null);
  return (
    <button onClick={() => setOpen(o => !o)} style={{ display:"block",width:"100%",textAlign:"left",background:"#111",border:`1px solid ${open?"#333":"#1e1e1e"}`,borderRadius:12,padding:16,cursor:"pointer",color:"inherit",fontFamily:"inherit",transition:"border-color 0.15s" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",gap:12 }}>
        <span style={{ fontSize:13,fontWeight:800,color:"#eee" }}>{q}</span>
        <span style={{ flexShrink:0,width:22,height:22,borderRadius:"50%",background:"#1a1a1a",display:"flex",alignItems:"center",justifyContent:"center",transform:open?"rotate(45deg)":"rotate(0deg)",transition:"transform 0.2s" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </span>
      </div>
      <div ref={ansRef} style={{ maxHeight: open ? (ansRef.current?.scrollHeight || 300) : 0, overflow:"hidden", transition:"max-height 0.3s ease" }}>
        <p style={{ margin:"12px 0 0",fontSize:12,color:"#888",lineHeight:1.75 }}>{a}</p>
      </div>
    </button>
  );
}

// ─── CTA BUTTON ──────────────────────────────────────────────────────────
function CTAButton({ source, big = false, compact = false, label = "SÍ, LOS QUIERO AHORA", urgent = false }: { source: string; big?: boolean; compact?: boolean; label?: string; urgent?: boolean }) {
  const openLead = useContext(LeadModalContext);
  const handleClick = useCallback(() => {
    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("trackCustom", "AdquirirLentesAviador", { content_name: PRODUCT.name, value: PRODUCT.offerPrice, currency: "USD", source });
    }
    openLead(source);
  }, [source, openLead]);

  const bg = urgent
    ? "linear-gradient(135deg,#ff4b4b 0%,#e01e1e 55%,#8a0000 100%)"
    : "linear-gradient(135deg,#ffffff 0%,#f2f2f2 55%,#d9d9d9 100%)";
  const color = urgent ? "#fff" : "#0a0a0a";
  const border = urgent ? "1px solid rgba(255,255,255,0.25)" : "1px solid rgba(0,0,0,0.08)";
  const shadow = urgent
    ? "0 8px 28px rgba(255,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.3)"
    : "0 8px 28px rgba(255,255,255,0.18), inset 0 1px 0 rgba(255,255,255,0.6)";
  const shimmer = urgent ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.12)";

  return (
    <button onClick={handleClick} className="cta-btn" style={{ position:"relative",overflow:"hidden",width:compact?"auto":"100%",flexShrink:0,whiteSpace:"nowrap" as const,background:bg,color,border,borderRadius:compact?12:16,padding:compact?"0.8rem 1.3rem":big?"1.15rem":"1rem",fontSize:compact?12:big?15:13,fontWeight:900,letterSpacing:1.5,textTransform:"uppercase" as const,cursor:"pointer",fontFamily:"inherit",boxShadow:shadow }}>
      <span style={{ position:"absolute",inset:0,background:`linear-gradient(115deg,transparent 0%,${shimmer} 50%,transparent 100%)`,backgroundSize:"200% 100%",animation:"shimmerBtn 2.6s ease infinite",pointerEvents:"none" }} />
      <span style={{ position:"relative",display:"flex",alignItems:"center",justifyContent:"center",gap:compact?8:10 }}>
        <IcWA s={big?20:compact?17:18} /> {label}
      </span>
    </button>
  );
}

// ─── MODAL DE DATOS (FILTRO DE CLIENTES) ────────────────────────────────
function LeadModal({ open, source, onClose }: { open: boolean; source: string; onClose: () => void }) {
  const [nombre, setNombre] = useState("");
  const [entrega, setEntrega] = useState<"valencia" | "nacional">("nacional");

  const [enviando, setEnviando] = useState(false);

  if (!open) return null;

  const puedeConfirmar = nombre.trim().length > 1;

  const handleConfirmar = () => {
    if (!puedeConfirmar) return;
    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("track", "Lead", { content_name: PRODUCT.name, value: PRODUCT.offerPrice, currency: "USD", source });
    }
    const entregaTxt = entrega === "valencia" ? "Retiro / Delivery en Valencia" : "Envío Nacional (MRW / Zoom / Tealca)";
    const msg = encodeURIComponent(`Hola! Quiero mis *${PRODUCT.name}* a $${PRODUCT.offerPrice} (antes $${PRODUCT.price})\n\n• Nombre: ${nombre}\n• Entrega: ${entregaTxt}\n\n_Este mensaje es de alta prioridad, te contactaremos enseguida._`);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank");
    setEnviando(true);
    setTimeout(() => { setEnviando(false); onClose(); }, 400);
  };

  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(6px)",display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadeIn 0.2s ease" }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:"100%",maxWidth:460,maxHeight:"90vh",overflowY:"auto" as const,background:"linear-gradient(160deg,#141414 0%,#080808 100%)",border:"1px solid #2a2a2a",borderTop:"1px solid #333",borderRadius:"20px 20px 0 0",padding:"24px 20px 28px",position:"relative",boxShadow:"0 -20px 60px rgba(0,0,0,0.6)" }}>
        <div style={{ position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)" }} />
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16 }}>
          <div>
            <p style={{ margin:0,fontSize:9,fontWeight:800,letterSpacing:2,color:"#666",textTransform:"uppercase" }}>Fokus Accesorios</p>
            <h3 style={{ margin:"4px 0 0",fontSize:20,fontWeight:900,color:"#fff" }}>Asegura tus lentes</h3>
          </div>
          <button onClick={onClose} style={{ background:"#141414",border:"1px solid #2a2a2a",borderRadius:"50%",width:30,height:30,color:"#888",cursor:"pointer",fontSize:14,flexShrink:0 }}>✕</button>
        </div>

        <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:6 }}>
          <span style={{ fontSize:15,color:"#444",textDecoration:"line-through" }}>${PRODUCT.price.toFixed(2)}</span>
          <span style={{ fontSize:28,fontWeight:900,color:"#fff" }}>${PRODUCT.offerPrice.toFixed(2)}</span>
        </div>
        <p style={{ margin:"0 0 22px",fontSize:11,color:"#555" }}>Equivale a <strong style={{ color:"#fff" }}>Bs. 892</strong> · Tasa BCV</p>

        <label style={{ display:"block",fontSize:10,fontWeight:800,letterSpacing:1.5,color:"#888",textTransform:"uppercase",marginBottom:8 }}>Nombre completo *</label>
        <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="¿Cómo te llamas?" style={{ width:"100%",background:"#141414",border:"1px solid #2a2a2a",borderRadius:10,padding:"14px 16px",color:"#fff",fontSize:14,marginBottom:20,fontFamily:"inherit",boxSizing:"border-box" as const }} />

        <label style={{ display:"block",fontSize:10,fontWeight:800,letterSpacing:1.5,color:"#888",textTransform:"uppercase",marginBottom:8 }}>Método de entrega *</label>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20 }}>
          <button onClick={()=>setEntrega("valencia")} style={{ background:entrega==="valencia"?"#1a0000":"#141414",border:`1px solid ${entrega==="valencia"?"#ff3b3b":"#2a2a2a"}`,borderRadius:10,padding:"14px 10px",cursor:"pointer",textAlign:"center" }}>
            <p style={{ margin:0,fontSize:11,fontWeight:800,color:"#eee" }}>Valencia</p>
            <p style={{ margin:"2px 0 0",fontSize:9,color:"#666" }}>Retiro / Delivery</p>
          </button>
          <button onClick={()=>setEntrega("nacional")} style={{ background:entrega==="nacional"?"#1a0000":"#141414",border:`1px solid ${entrega==="nacional"?"#ff3b3b":"#2a2a2a"}`,borderRadius:10,padding:"14px 10px",cursor:"pointer",textAlign:"center" }}>
            <p style={{ margin:0,fontSize:11,fontWeight:800,color:"#eee" }}>Envío Nacional</p>
            <p style={{ margin:"2px 0 0",fontSize:9,color:"#666" }}>MRW / Zoom / Tealca</p>
          </button>
        </div>

        <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:20,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 12px" }}>
          <span style={{ fontSize:14 }}>🔒</span>
          <span style={{ fontSize:10,color:"#888",lineHeight:1.5 }}>Coordinamos tu pago y envío directo por WhatsApp, sin compromiso.</span>
        </div>

        <button onClick={handleConfirmar} disabled={!puedeConfirmar || enviando} style={{ position:"relative",overflow:"hidden",width:"100%",background: puedeConfirmar ? "linear-gradient(135deg,#ff4b4b 0%,#e01e1e 55%,#8a0000 100%)" : "#2a2a2a",color:"#fff",border:puedeConfirmar?"1px solid rgba(255,255,255,0.25)":"none",borderRadius:12,padding:"1rem",fontSize:13,fontWeight:900,letterSpacing:1.5,textTransform:"uppercase" as const,cursor: puedeConfirmar ? "pointer" : "not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit",boxShadow:puedeConfirmar?"0 8px 28px rgba(255,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.3)":"none" }}>
          {puedeConfirmar&&<span style={{ position:"absolute",inset:0,background:"linear-gradient(115deg,transparent 0%,rgba(255,255,255,0.35) 50%,transparent 100%)",backgroundSize:"200% 100%",animation:"shimmerBtn 2.6s ease infinite",pointerEvents:"none" }} />}
          <span style={{ position:"relative",display:"flex",alignItems:"center",gap:8 }}>{enviando ? "Redirigiendo..." : <>CONFIRMAR PEDIDO <IcArrow /></>}</span>
        </button>
        <p style={{ fontSize:9,color:"#333",margin:"12px 0 0",textAlign:"center" }}>🔒 Te contactamos por WhatsApp en breve</p>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────
export default function LandingLentesAviador() {
  const cd = useCountdown();
  const stock = useStock();
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadSource, setLeadSource] = useState("hero");
  const { reviews, avg, loading: reviewsLoading } = useLiveReviews();
  const [reviewsVisible, setReviewsVisible] = useState(10);
  useReveal();

  const openLead = useCallback((source: string) => { setLeadSource(source); setLeadOpen(true); }, []);

  // Parallax lentes
  useEffect(() => {
    const onScroll = () => {
      const img = document.getElementById("lentes-img");
      if (img) { const off = window.scrollY * 0.12; img.style.transform = `translate(-50%, calc(-50% + ${off}px))`; }
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Init Meta Pixel
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as any).fbq) return;
    (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = true; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    (window as any).fbq("init", "840893159040582");
    (window as any).fbq("track", "PageView");
    (window as any).fbq("track", "ViewContent", { content_name: PRODUCT.name, value: PRODUCT.offerPrice, currency: "USD" });
  }, []);

  return (
    <LeadModalContext.Provider value={openLead}>
    <div style={{ fontFamily:"'Helvetica Neue',Arial,sans-serif",background:"#050505",minHeight:"100vh",color:"#fff",overflowX:"hidden",position:"relative" }}>
      <GlobalStyles />
      <ParticlesBg />
      <BurstCanvas />

      {/* URGENCIA STICKY */}
      <div style={{ position:"sticky",top:0,zIndex:100,background:"linear-gradient(90deg,#1a0000,#3a0a0a,#1a0000)",borderBottom:"1px solid #3a1515",padding:"10px 16px",textAlign:"center" }}>
        <p style={{ margin:0,fontSize:10,fontWeight:800,letterSpacing:2,color:"#ff9999",textTransform:"uppercase" }}>
          <span style={{ display:"inline-block",width:7,height:7,borderRadius:"50%",background:"#ff3b3b",marginRight:8,animation:"udot 1.2s ease-in-out infinite" }} />
          Oferta termina en <span style={{ color:"#fff",fontWeight:900 }}>{cd.h}:{cd.m}:{cd.s}</span> · Solo <span style={{ color:"#fff" }}>{stock}</span> unidades
        </p>
      </div>

      {/* HERO */}
      <section style={{ position:"relative",zIndex:2,maxWidth:640,margin:"0 auto",padding:"40px 20px 20px",textAlign:"center" }}>
        <div className="reveal" style={{ animationDelay:"0.1s" }}>
          <div style={{ display:"inline-flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:30,padding:"6px 16px",marginBottom:24,backdropFilter:"blur(10px)" }}>
            <IcGem />
            <span style={{ fontSize:9,fontWeight:800,letterSpacing:2.5,color:"rgba(255,255,255,0.6)",textTransform:"uppercase" }}>Para Hombres Que No Pasan Desapercibidos</span>
          </div>
        </div>

        <h1 className="reveal" style={{ fontSize:36,fontWeight:900,lineHeight:1.05,margin:"0 0 16px",letterSpacing:-0.5,background:"linear-gradient(180deg,#fff 0%,#aaa 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animationDelay:"0.2s" }}>
          El detalle que hace<br/>que te noten primero
        </h1>
        <p className="reveal" style={{ fontSize:14,color:"#777",lineHeight:1.7,maxWidth:380,margin:"0 auto 30px",animationDelay:"0.3s" }}>
          Para el hombre que entra a una reunión, una llamada o una foto y se nota la diferencia. Acero inoxidable + acetato técnico, filtro real de luz azul, grabado a mano.
        </p>

        {/* LENTES FLONTANTES SIN FONDO */}
        <div className="reveal lentes-box" id="lentes-box" style={{ position:"relative",width:"100%",maxWidth:400,height:320,margin:"0 auto 30px",perspective:1000,cursor:"pointer",animationDelay:"0.4s" }}
          onClick={(e) => { const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect(); const x = e.clientX || rect.left+rect.width/2; const y = e.clientY || rect.top+rect.height/2; if((window as any).__burst)(window as any).__burst(x,y); }}>
          <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:280,height:280,background:"radial-gradient(circle,rgba(255,255,255,0.12) 0%,transparent 70%)",borderRadius:"50%",filter:"blur(40px)",animation:"gp 3s ease-in-out infinite" }} />
          <img id="lentes-img" className="lentes-img" src="/landing/lentes-aviador/frontal.jpg" alt="Lentes Aviador Premium"
            style={{ position:"absolute",top:"50%",left:"50%",width:"90%",maxWidth:360,filter:"drop-shadow(0 20px 60px rgba(0,0,0,0.8)) drop-shadow(0 0 30px rgba(255,59,59,0.2))",animation:"fy 4s ease-in-out infinite, fr 6s ease-in-out infinite",transition:"transform 0.4s cubic-bezier(0.16,1,0.3,1)" }} />
          <div style={{ position:"absolute",bottom:20,left:"50%",transform:"translateX(-50%) scaleY(-1)",width:"60%",height:40,background:"linear-gradient(180deg,rgba(255,255,255,0.08),transparent)",filter:"blur(8px)",borderRadius:"50%",animation:"rf 4s ease-in-out infinite" }} />
          <div style={{ position:"absolute",top:"20%",left:"15%",width:4,height:4,background:"#ffd43b",borderRadius:"50%",boxShadow:"0 0 10px #ffd43b",animation:"pf 5s ease-in-out infinite" }} />
          <div style={{ position:"absolute",top:"60%",right:"10%",width:3,height:3,background:"#ff3b3b",borderRadius:"50%",boxShadow:"0 0 8px #ff3b3b",animation:"pf 4s ease-in-out infinite 1s" }} />
          <div style={{ position:"absolute",bottom:"25%",left:"20%",width:5,height:5,background:"#fff",borderRadius:"50%",boxShadow:"0 0 12px rgba(255,255,255,0.5)",animation:"pf 6s ease-in-out infinite 0.5s" }} />
        </div>

        {/* PRECIO */}
        <div className="reveal" style={{ marginBottom:20,animationDelay:"0.5s" }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:16,flexWrap:"wrap" }}>
            <span style={{ fontSize:18,color:"#444",textDecoration:"line-through",fontWeight:600 }}>${PRODUCT.price.toFixed(2)}</span>
            <span style={{ fontSize:48,fontWeight:900,color:"#fff",lineHeight:1,animation:"pp 2.4s ease-in-out infinite",textShadow:"0 0 40px rgba(255,255,255,0.25)" }}>${PRODUCT.offerPrice.toFixed(2)}</span>
            <span style={{ background:"linear-gradient(135deg,#ff3b3b,#7a0000)",color:"#fff",fontSize:11,fontWeight:900,letterSpacing:1,padding:"6px 14px",borderRadius:20,boxShadow:"0 4px 20px rgba(255,0,0,0.4)",animation:"bs 2.8s ease infinite" }}>
              -29% HOY
            </span>
          </div>
          <p style={{ margin:"8px 0 0",fontSize:12,color:"#555" }}>Equivale a <strong style={{ color:"#fff" }}>Bs. 892</strong> · Tasa BCV</p>
        </div>

        <p className="reveal" style={{ fontSize:11,color:"#ff8888",margin:"0 0 16px",fontWeight:700,animationDelay:"0.6s" }}>
          🔥 Solo quedan <span style={{ color:"#fff",fontSize:14 }}>{stock}</span> unidades a este precio
        </p>
        <p className="reveal" style={{ fontSize:10,color:"#444",margin:"0 0 24px",animationDelay:"0.65s" }}>
          👀 <span style={{ color:"#888",fontWeight:700 }}>23 personas</span> viendo esta oferta ahora
        </p>

        <div className="reveal" style={{ maxWidth:380,margin:"0 auto 12px",animationDelay:"0.7s" }}>
          <CTAButton source="hero" big />
        </div>
        <p className="reveal" style={{ fontSize:10,color:"#333",margin:0,animationDelay:"0.75s" }}>🔒 Compra segura · Atención inmediata por WhatsApp</p>

        <div className="reveal" style={{ display:"flex",justifyContent:"center",gap:32,marginTop:32,animationDelay:"0.8s" }}>
          {[{n:"15K+",l:"Pedidos"},{n:"★4.9",l:"Valoración"},{n:"23",l:"Estados"}].map(s=>(
            <div key={s.l} style={{ textAlign:"center" }}>
              <p style={{ margin:0,fontSize:20,fontWeight:900,color:"#fff" }}>{s.n}</p>
              <p style={{ margin:"4px 0 0",fontSize:9,color:"#444",letterSpacing:1,textTransform:"uppercase" }}>{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* GALERÍA */}
      <section style={{ position:"relative",zIndex:2,maxWidth:640,margin:"0 auto",padding:"40px 20px" }}>
        <div className="reveal">
          <p style={{ fontSize:9,fontWeight:800,letterSpacing:3,color:"#333",textAlign:"center",margin:"0 0 8px",textTransform:"uppercase" }}>Cada detalle, a propósito</p>
          <h2 style={{ fontSize:24,fontWeight:900,color:"#fff",textAlign:"center",margin:"0 0 32px" }}>No son unos lentes más</h2>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
          {[
            {src:"/landing/lentes-aviador/beauty-1.jpg",cap:"Perfil aerodinámico, acabado mate premium"},
            {src:"/landing/lentes-aviador/beauty-2.jpg",cap:"Acero inoxidable combinado con acetato técnico"},
            {src:"/landing/lentes-aviador/bisagra.jpg",cap:"Bisagras reforzadas de alta duración"},
            {src:"/landing/lentes-aviador/detalle-1.jpg",cap:"Puntas ergonómicas para uso todo el día"},
            {src:"/landing/lentes-aviador/detalle-2.jpg",cap:"Puente doble ajustable para cualquier rostro"},
            {src:"/landing/lentes-aviador/charm.jpg",cap:"Detalles grabados a mano, acabado de precisión"},
          ].map((img,i)=> (
            <div key={i} className="reveal" style={{ borderRadius:16,overflow:"hidden",background:"#0d0d0d",border:"1px solid #1e1e1e",animationDelay:`${0.1*i}s` }}>
              <img src={img.src} alt="" style={{ width:"100%",aspectRatio:"1/1",objectFit:"cover",display:"block" }} />
              <p style={{ margin:0,padding:12,fontSize:11,color:"#888" }}>{img.cap}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PARA QUIÉN ES */}
      <section style={{ position:"relative",zIndex:2,maxWidth:640,margin:"0 auto",padding:"0 20px 40px" }}>
        <div className="reveal">
          <p style={{ fontSize:9,fontWeight:800,letterSpacing:3,color:"#333",textAlign:"center",margin:"0 0 8px",textTransform:"uppercase" }}>No son para cualquiera</p>
          <h2 style={{ fontSize:22,fontWeight:900,color:"#fff",textAlign:"center",margin:"0 0 24px" }}>Son para el hombre que...</h2>
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
          {[
            "Lidera reuniones, cierra tratos y sabe que la primera impresión cuenta",
            "Pasa horas frente a la pantalla y no está dispuesto a sacrificar ni su vista ni su imagen",
            "Se cuida en los detalles: reloj, cadena, lentes — nada al azar",
            "No busca 'unos lentes más', busca la pieza que completa el look",
          ].map((t,i)=>(
            <div key={i} className="reveal" style={{ display:"flex",alignItems:"center",gap:12,background:"#111",border:"1px solid #1e1e1e",borderRadius:12,padding:"14px 16px",animationDelay:`${0.08*i}s` }}>
              <span style={{ flexShrink:0,width:22,height:22,borderRadius:"50%",background:"#1a0000",border:"1px solid #ff3b3b",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#ff8888",fontWeight:900 }}>✓</span>
              <p style={{ margin:0,fontSize:13,color:"#ddd",lineHeight:1.5 }}>{t}</p>
            </div>
          ))}
        </div>
      </section>

      {/* LIFESTYLE */}
      <section style={{ position:"relative",zIndex:2,maxWidth:640,margin:"0 auto",padding:"0 20px 40px" }}>
        <div className="reveal">
          <p style={{ fontSize:9,fontWeight:800,letterSpacing:3,color:"#333",textAlign:"center",margin:"0 0 8px",textTransform:"uppercase" }}>Así se ven puestos</p>
          <h2 style={{ fontSize:22,fontWeight:900,color:"#fff",textAlign:"center",margin:"0 0 24px" }}>Hechos para lucir todos los días</h2>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
          <div className="reveal" style={{ borderRadius:16,overflow:"hidden",border:"1px solid #1e1e1e",animationDelay:"0.1s" }}>
            <img src="/landing/lentes-aviador/lifestyle-1.jpg" alt="Modelo usando lentes aviador" style={{ width:"100%",aspectRatio:"3/4",objectFit:"cover",display:"block" }} />
          </div>
          <div className="reveal" style={{ borderRadius:16,overflow:"hidden",border:"1px solid #1e1e1e",animationDelay:"0.2s" }}>
            <img src="/landing/lentes-aviador/lifestyle-2.jpg" alt="Modelo usando lentes aviador de frente" style={{ width:"100%",aspectRatio:"3/4",objectFit:"cover",display:"block" }} />
          </div>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section style={{ position:"relative",zIndex:2,background:"#0a0a0a",borderTop:"1px solid #1e1e1e",borderBottom:"1px solid #1e1e1e",padding:"48px 20px" }}>
        <div style={{ maxWidth:640,margin:"0 auto" }}>
          <div className="reveal">
            <h2 style={{ fontSize:22,fontWeight:900,color:"#fff",textAlign:"center",margin:"0 0 32px" }}>Por qué son la mejor opción</h2>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
            {[
              {icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6"><path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M6 3l4 6 2-6M18 3l-4 6-2-6"/></svg>,t:"Acero + acetato técnico",d:"No se oxida, no se despinta. Aguanta el uso diario."},
              {icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>,t:"Filtro real de luz azul",d:"Reduce fatiga visual y ardor tras horas de pantalla."},
              {icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,t:"Envío a toda Venezuela",d:"MRW: 1-2 días hábiles. Zoom y Tealca."},
              {icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,t:"Garantía de satisfacción",d:"Si algo no está bien, lo resolvemos directo."},
            ].map((b,i)=> (
              <div key={i} className="reveal" style={{ background:"#111",border:"1px solid #1e1e1e",borderRadius:14,padding:"20px 16px",animationDelay:`${0.1*i}s` }}>
                <div style={{ width:36,height:36,borderRadius:10,background:"rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12 }}>{b.icon}</div>
                <p style={{ margin:"0 0 4px",fontSize:12,fontWeight:800,color:"#eee" }}>{b.t}</p>
                <p style={{ margin:0,fontSize:11,color:"#555",lineHeight:1.6 }}>{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA INTERMEDIO */}
      <section className="reveal" style={{ position:"relative",zIndex:2,maxWidth:460,margin:"0 auto",padding:"40px 20px 0",textAlign:"center" }}>
        <div style={{ background:"linear-gradient(135deg,#141410,#0a0a08)",border:"1px solid #3a3520",borderRadius:16,padding:"28px 20px" }}>
          <p style={{ fontSize:9,fontWeight:800,letterSpacing:2.5,color:"#fff",margin:"0 0 12px",textTransform:"uppercase" }}>🔥 Quedan pocas unidades a este precio</p>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginBottom:16 }}>
            <span style={{ fontSize:17,color:"#444",textDecoration:"line-through" }}>${PRODUCT.price.toFixed(2)}</span>
            <span style={{ fontSize:36,fontWeight:900,color:"#fff" }}>${PRODUCT.offerPrice.toFixed(2)}</span>
          </div>
          <CTAButton source="cta_intermedio" label="PEDIR POR WHATSAPP AHORA" />
        </div>
      </section>

      {/* RESEÑAS */}
      <section style={{ position:"relative",zIndex:2,maxWidth:640,margin:"0 auto",padding:"48px 20px" }}>
        <div className="reveal">
          <p style={{ fontSize:9,fontWeight:800,letterSpacing:3,color:"#333",textAlign:"center",margin:"0 0 8px",textTransform:"uppercase" }}>Opiniones reales</p>
          <h2 style={{ fontSize:22,fontWeight:900,color:"#fff",textAlign:"center",margin:"0 0 8px" }}>Lo que dicen nuestros clientes</h2>
          {reviews.length>0&&(
            <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8,margin:"0 0 24px" }}>
              <div style={{ display:"flex",gap:2 }}>{[1,2,3,4,5].map(s=><IcStar key={s} />)}</div>
              <span style={{ fontSize:12,fontWeight:800,color:"#fff" }}>{avg.toFixed(1)}</span>
              <span style={{ fontSize:11,color:"#555" }}>· {reviews.length} reseñas</span>
            </div>
          )}
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
          {reviewsLoading?(
            <p style={{ textAlign:"center",color:"#333",fontSize:12,margin:0 }}>Cargando reseñas…</p>
          ):reviews.length===0?(
            <p style={{ textAlign:"center",color:"#333",fontSize:12,margin:0 }}>Aún no hay reseñas para este producto.</p>
          ):(
            reviews.slice(0,reviewsVisible).map((r,i)=> (
              <div key={r.id} style={{ background:"#111",border:"1px solid #1e1e1e",borderRadius:12,padding:16,animation:"fadeIn 0.4s ease" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                    <div style={{ width:28,height:28,borderRadius:"50%",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center" }}>
                      <span style={{ fontSize:11,fontWeight:900,color:"#080808" }}>{(r.name||"?")[0]}</span>
                    </div>
                    <span style={{ fontSize:12,fontWeight:800,color:"#ddd" }}>{r.name}</span>
                  </div>
                  <span style={{ fontSize:9,color:"#333" }}>{formatRelativeDate(r.createdAt)}</span>
                </div>
                <div style={{ display:"flex",gap:2,marginBottom:6 }}>
                  {[1,2,3,4,5].map(s=><IcStar key={s} />)}
                </div>
                <p style={{ margin:0,fontSize:12,color:"#888",lineHeight:1.7 }}>{r.comment}</p>
              </div>
            ))
          )}
          {reviews.length>reviewsVisible&&(
            <button onClick={()=>setReviewsVisible(v=>v+10)} style={{ background:"#161616",border:"1px solid #1e1e1e",color:"#ccc",borderRadius:10,padding:"0.75rem",fontSize:12,fontWeight:800,letterSpacing:1,cursor:"pointer",fontFamily:"inherit" }}>VER MÁS RESEÑAS ({reviews.length-reviewsVisible})</button>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ position:"relative",zIndex:2,maxWidth:640,margin:"0 auto",padding:"0 20px 40px" }}>
        <div className="reveal">
          <p style={{ fontSize:9,fontWeight:800,letterSpacing:3,color:"#333",textAlign:"center",margin:"0 0 8px",textTransform:"uppercase" }}>Antes de que preguntes</p>
          <h2 style={{ fontSize:22,fontWeight:900,color:"#fff",textAlign:"center",margin:"0 0 24px" }}>Todo lo que necesitas saber</h2>
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
          {FAQS.map((f,i)=> (
            <div key={i} className="reveal" style={{ animationDelay:`${0.05*i}s` }}>
              <FaqItem q={f.q} a={f.a} />
            </div>
          ))}
        </div>
      </section>

      {/* MÁS MODELOS */}
      <section className="reveal" style={{ position:"relative",zIndex:2,maxWidth:640,margin:"0 auto",padding:"0 20px 40px" }}>
        <a href="https://www.fokusaccesorios.shop/tienda/lentes/anti-luz-azul" target="_blank" rel="noopener noreferrer" style={{ textDecoration:"none",display:"block" }}>
          <div style={{ background:"linear-gradient(160deg,#141414,#0c0c0c)",border:"1px solid #1e1e1e",borderRadius:18,padding:"28px 24px",textAlign:"center",position:"relative",overflow:"hidden",transition:"border-color 0.3s" }}
            onMouseEnter={e=>e.currentTarget.style.borderColor="#333"}
            onMouseLeave={e=>e.currentTarget.style.borderColor="#1e1e1e"}>
            <div style={{ position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)" }} />
            <p style={{ fontSize:9,fontWeight:800,letterSpacing:3,color:"#333",margin:"0 0 10px",textTransform:"uppercase" }}>Colección completa</p>
            <h2 style={{ fontSize:20,fontWeight:900,color:"#fff",margin:"0 0 8px" }}>¿Buscas otro estilo?</h2>
            <p style={{ fontSize:13,color:"#666",lineHeight:1.6,margin:"0 0 18px" }}>Explora todos nuestros modelos de lentes anti luz azul.</p>
            <div style={{ display:"inline-flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:20,padding:"10px 18px" }}>
              <span style={{ fontSize:11,fontWeight:800,letterSpacing:1.5,color:"#fff",textTransform:"uppercase" }}>Ver más modelos</span>
              <IcArrow />
            </div>
          </div>
        </a>
      </section>

      {/* CTA FINAL */}
      <section className="reveal" style={{ position:"relative",zIndex:2,maxWidth:460,margin:"0 auto",padding:"0 20px 100px",textAlign:"center" }}>
        <div style={{ background:"linear-gradient(160deg,#141414,#0a0a0a)",border:"1px solid #2a2a2a",borderRadius:18,padding:"32px 24px",position:"relative",overflow:"hidden" }}>
          <div style={{ position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)" }} />
          <div style={{ display:"inline-block",background:"rgba(255,59,59,0.12)",border:"1px solid rgba(255,59,59,0.35)",borderRadius:20,padding:"6px 14px",marginBottom:16 }}>
            <span style={{ fontSize:9,fontWeight:800,letterSpacing:1.5,color:"#ff8888",textTransform:"uppercase" }}>Última llamada — la oferta termina hoy</span>
          </div>
          <h2 style={{ fontSize:22,fontWeight:900,color:"#fff",margin:"0 0 12px" }}>No dejes pasar tus lentes</h2>
          <p style={{ fontSize:13,color:"#777",lineHeight:1.7,margin:"0 0 20px" }}>29% de descuento, envío a toda Venezuela y garantía de satisfacción.</p>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginBottom:20 }}>
            <span style={{ fontSize:17,color:"#444",textDecoration:"line-through" }}>${PRODUCT.price.toFixed(2)}</span>
            <span style={{ fontSize:36,fontWeight:900,color:"#fff" }}>${PRODUCT.offerPrice.toFixed(2)}</span>
          </div>
          <CTAButton source="cta_final" big urgent label="COMPRAR AHORA" />
          <p style={{ fontSize:9,color:"#333",margin:"12px 0 0" }}>⏳ Oferta termina en {cd.h}h {cd.m}m</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ position:"relative",zIndex:2,borderTop:"1px solid #1e1e1e",padding:"24px 24px 90px",textAlign:"center" }}>
        <p style={{ fontSize:9,color:"#222",margin:0,letterSpacing:1,textTransform:"uppercase" }}>© 2026 FOKUS. Todos los derechos reservados.</p>
      </footer>

      {/* BARRA FIJA */}
      <div style={{ position:"fixed",left:0,right:0,bottom:0,zIndex:500,background:"rgba(8,8,8,0.97)",borderTop:"1px solid #1e1e1e",backdropFilter:"blur(16px)",padding:"12px 16px",display:"flex",alignItems:"center",gap:12 }}>
        <div style={{ flex:1,minWidth:0 }}>
          <p style={{ margin:0,fontSize:9,color:"#555",letterSpacing:0.5,textTransform:"uppercase" }}>Últimas unidades · Entrega directa</p>
          <p style={{ margin:0,fontSize:15,fontWeight:900,color:"#fff" }}>${PRODUCT.offerPrice.toFixed(2)} <span style={{ fontSize:10,color:"#444",textDecoration:"line-through",fontWeight:600 }}>${PRODUCT.price.toFixed(2)}</span></p>
        </div>
        <CTAButton source="barra_fija" label="COMPRAR POR WS" compact urgent />
      </div>

      <SocialToast />
      <LeadModal open={leadOpen} source={leadSource} onClose={() => setLeadOpen(false)} />
    </div>
    </LeadModalContext.Provider>
  );
}