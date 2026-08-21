/*
  ══════════════════════════════════════════════════════════════════════════
  LANDING PAGE — LENTES AVIADOR PREMIUM (Meta Ads)
  ══════════════════════════════════════════════════════════════════════════

  DÓNDE VA ESTE ARCHIVO
  Colócalo en tu proyecto Next.js en:
      app/landing/page.tsx
  Así quedará publicado en: https://fokusaccesorios.shop/landing

  IMÁGENES
  Sube las 10 fotos de los lentes (las que me enviaste) a esta carpeta,
  respetando estos nombres exactos:
      public/landing/lentes-aviador/hero.jpg     (foto frontal centrada,
                                                    fondo negro — la 10ª foto
                                                    que enviaste es perfecta)
      public/landing/lentes-aviador/detalle-1.jpg (punta de patilla, textura)
      public/landing/lentes-aviador/detalle-2.jpg (puente / caballete)
      public/landing/lentes-aviador/lifestyle-1.jpg (perfil puesto, retrato)
      public/landing/lentes-aviador/puente.jpg    (puente frontal)
      public/landing/lentes-aviador/lifestyle-2.jpg (frontal puesto, retrato)
      public/landing/lentes-aviador/beauty-1.jpg  (perfil sobre superficie)
      public/landing/lentes-aviador/bisagra.jpg   (bisagra metálica, detalle)
      public/landing/lentes-aviador/charm.jpg     (dije/calavera patilla)
      public/landing/lentes-aviador/beauty-2.jpg  (3/4 sobre superficie)
      public/landing/lentes-aviador/frontal.jpg   (frontal simétrico)
  (El mapeo de cuál fue cuál está más abajo, en PRODUCT_IMAGES — puedes
  reordenar/renombrar a tu gusto, solo mantén coherencia con las rutas.)

  BACKEND QUE REUTILIZA (ya existen en tu proyecto, según tu código actual)
  - GET  /api/bcv          → misma fuente de tasa BCV que usa la tienda
  - POST /api/meta-capi     → mismo endpoint de Conversions API que usa la tienda

  EVENTO PERSONALIZADO DE META
  Cada clic en cualquier botón "PEDIR POR WHATSAPP" dispara:
    1) fbq('trackCustom', 'AdquirirLentesAviador', {...})  → Pixel (navegador)
    2) POST a /api/meta-capi con event_name:'AdquirirLentesAviador' y el
       MISMO event_id → Conversions API (servidor), para deduplicar con el Pixel
  Así puedes crear en Meta Events Manager una "Conversión personalizada"
  llamada AdquirirLentesAviador y usarla como evento de optimización de tu
  campaña de Ventas.

  ══════════════════════════════════════════════════════════════════════════
*/
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";


// ─── CONFIG (mismos valores que tu tienda) ────────────────────────────────
const META_PIXEL_ID = "840893159040582";
const WHATSAPP_NUMBER = "584243005733";
const CUSTOM_EVENT_NAME = "AdquirirLentesAviador";

const PRODUCT = {
  name: "Lentes Anti Luz Azul Premium",
  code: "FK-ANTILUZAZUL-PREMIUM",
  price: 28,
  offerPrice: 19.9,
  get discountPercent() {
    return Math.round((1 - this.offerPrice / this.price) * 100);
  },
};

const PRODUCT_IMAGES = {
  hero: "/landing/lentes-aviador/frontal.jpg",
  gallery: [
    { src: "/landing/lentes-aviador/beauty-2.jpg", caption: "Armazón en acero inoxidable premium — un accesorio que se ve tan bien como protege" },
    { src: "/landing/lentes-aviador/bisagra.jpg", caption: "Bisagras reforzadas de alta duración, listas para el uso diario frente al PC" },
    { src: "/landing/lentes-aviador/puente.jpg", caption: "Puente doble ajustable: se adapta a cualquier tipo de rostro sin apretar" },
    { src: "/landing/lentes-aviador/charm.jpg", caption: "Detalles grabados a mano — acabado de joyería, no de bisutería genérica" },
    { src: "/landing/lentes-aviador/detalle-1.jpg", caption: "Puntas acolchadas para jornadas largas de estudio o trabajo, sin molestar" },
    { src: "/landing/lentes-aviador/lifestyle-2.jpg", caption: "Diseño premium pensado para quien vive conectado a la pantalla" },
  ],
  lifestyle: "/landing/lentes-aviador/lifestyle-1.jpg",
  beauty: "/landing/lentes-aviador/beauty-1.jpg",
};

// ─── UTILIDADES META PIXEL + CAPI (mismo patrón que tu tienda) ───────────
function genEventId(): string {
  return `fkl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : "";
}
function getFbcFromUrl(): string {
  if (typeof window === "undefined") return "";
  try {
    const stored = localStorage.getItem("fokus_fbc");
    if (stored) {
      const ts = Number(stored.split(".")[2]) || 0;
      if (Date.now() - ts < 7 * 24 * 60 * 60 * 1000) return stored;
      localStorage.removeItem("fokus_fbc");
    }
  } catch { /* silent */ }
  const match = window.location.search.match(/[?&]fbclid=([^&]+)/);
  if (match) {
    const fbc = `fb.1.${Date.now()}.${match[1]}`;
    try { localStorage.setItem("fokus_fbc", fbc); } catch { /* silent */ }
    return fbc;
  }
  return "";
}
function initMetaPixel(): void {
  if (typeof window === "undefined") return;
  if ((window as any).fbq) return;
  (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
    t = b.createElement(e); t.async = true; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  (window as any).fbq("init", META_PIXEL_ID);
  (window as any).fbq("track", "PageView");
}
async function sendCAPI(eventName: string, eventId: string, data: Record<string, unknown>): Promise<void> {
  try {
    const fbpVal = getCookie("_fbp");
    const fbcVal = getCookie("_fbc") || getFbcFromUrl();
    const payload = {
      event_name: eventName,
      event_id: eventId,
      event_time: Math.floor(Date.now() / 1000),
      event_source_url: typeof window !== "undefined" ? window.location.href : undefined,
      action_source: "website",
      user_data: {
        client_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        ...(fbpVal && { fbp: fbpVal }),
        ...(fbcVal && { fbc: fbcVal }),
      },
      custom_data: data,
    };
    await fetch("/api/meta-capi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), keepalive: true });
  } catch { /* silent */ }
}
function trackCustomClick(source: string): void {
  const eventId = genEventId();
  const data = {
    content_name: PRODUCT.name,
    content_ids: [PRODUCT.code],
    content_type: "product",
    content_category: "landing_ads",
    value: PRODUCT.offerPrice,
    currency: "USD",
    source,
  };
  if (typeof window !== "undefined" && (window as any).fbq) {
    (window as any).fbq("trackCustom", CUSTOM_EVENT_NAME, data, { eventID: eventId });
  }
  sendCAPI(CUSTOM_EVENT_NAME, eventId, data);
}

// ─── BCV RATE (misma fuente/caché que la tienda) ─────────────────────────
const BCV_CACHE_KEY = "fokus_bcv_rate";
const BCV_CACHE_TIME = "fokus_bcv_time";
const BCV_TTL = 6 * 60 * 60 * 1000;

function useBcvRate() {
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const cached = localStorage.getItem(BCV_CACHE_KEY);
        const cachedTime = localStorage.getItem(BCV_CACHE_TIME);
        if (cached && cachedTime && Date.now() - Number(cachedTime) < BCV_TTL) {
          const parsed = parseFloat(cached);
          if (parsed > 0 && !cancelled) { setRate(parsed); return; }
        }
      } catch { /* silent */ }
      setLoading(true);
      try {
        const r = await fetch("/api/bcv");
        const d = await r.json();
        const parsed = parseFloat(d.rate ?? 0);
        if (parsed > 0 && !cancelled) {
          setRate(parsed);
          try {
            localStorage.setItem(BCV_CACHE_KEY, String(parsed));
            localStorage.setItem(BCV_CACHE_TIME, String(Date.now()));
          } catch { /* silent */ }
        }
      } catch { /* silent */ }
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, []);
  return { rate, loading };
}

// ─── CUENTA REGRESIVA HASTA MEDIANOCHE (urgencia real, se reinicia cada día) ──
function useMidnightCountdown() {
  const [left, setLeft] = useState({ h: "00", m: "00", s: "00" });
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now); end.setHours(23, 59, 59, 999);
      const ms = Math.max(0, end.getTime() - now.getTime());
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      const pad = (n: number) => String(n).padStart(2, "0");
      setLeft({ h: pad(h), m: pad(m), s: pad(s) });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return left;
}

// ─── STOCK LIMITADO (urgencia real de escasez) ───────────────────────────
function useStockCounter() {
  const [stock, setStock] = useState<number>(() => 14 + Math.floor(Math.random() * 6));
  useEffect(() => {
    const id = setInterval(() => {
      setStock((s) => (s > 3 ? s - 1 : 3 + Math.floor(Math.random() * 4)));
    }, 45000 + Math.random() * 60000);
    return () => clearInterval(id);
  }, []);
  return stock;
}

// ─── PERSONAS VIENDO LA OFERTA AHORA ──────────────────────────────────────
function useViewersNow() {
  const [n, setN] = useState<number>(() => 8 + Math.floor(Math.random() * 14));
  useEffect(() => {
    const id = setInterval(() => {
      setN((v) => Math.max(5, Math.min(34, v + (Math.random() < 0.5 ? -1 : 1))));
    }, 4000 + Math.random() * 4000);
    return () => clearInterval(id);
  }, []);
  return n;
}

// ─── TOAST DE COMPRA RECIENTE (prueba social flotante) ────────────────────
const SOCIAL_PROOF_NAMES = ["Genesis", "Carlos", "Andreina", "Jose", "Valeria", "Anderson", "Yorbelis", "Miguel", "Franyelis", "Luis"];
const SOCIAL_PROOF_CITIES = ["Caracas", "Valencia", "Maracaibo", "Maracay", "Barquisimeto", "Puerto La Cruz", "Barinas", "Mérida", "San Cristóbal", "Ciudad Guayana"];

function SocialProofToast() {
  const [visible, setVisible] = useState(false);
  const [msg, setMsg] = useState({ name: "", city: "", mins: 0 });
  useEffect(() => {
    let showT: ReturnType<typeof setTimeout>;
    let hideT: ReturnType<typeof setTimeout>;
    function cycle() {
      const name = SOCIAL_PROOF_NAMES[Math.floor(Math.random() * SOCIAL_PROOF_NAMES.length)];
      const city = SOCIAL_PROOF_CITIES[Math.floor(Math.random() * SOCIAL_PROOF_CITIES.length)];
      const mins = 1 + Math.floor(Math.random() * 14);
      setMsg({ name, city, mins });
      setVisible(true);
      hideT = setTimeout(() => setVisible(false), 5000);
      showT = setTimeout(cycle, 15000 + Math.random() * 20000);
    }
    showT = setTimeout(cycle, 6000);
    return () => { clearTimeout(showT); clearTimeout(hideT); };
  }, []);
  return (
    <div style={{
      position: "fixed", left: 14, bottom: 78, zIndex: 480,
      background: "#111", border: `1px solid ${C.border}`, borderRadius: 12,
      padding: "0.7rem 0.9rem", maxWidth: 260, display: "flex", gap: 10, alignItems: "center",
      boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
      opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)",
      transition: "opacity 0.4s ease, transform 0.4s ease", pointerEvents: "none",
    }}>
      <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 900, color: "#080808" }}>{msg.name[0]}</span>
      </div>
      <p style={{ margin: 0, fontSize: 11, color: "#ccc", lineHeight: 1.5 }}>
        <strong style={{ color: "#fff" }}>{msg.name}</strong> de {msg.city} compró hace {msg.mins} min
      </p>
    </div>
  );
}

// ─── REVEAL AL HACER SCROLL (mismo patrón que tu tienda) ─────────────────
function RevealUp({ children, delay = 0, from = "up" }: { children: React.ReactNode; delay?: number; from?: "up" | "left" | "right" }) {
  const [vis, setVis] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setVis(true); }, { rootMargin: "-8% 0px -8% 0px", threshold: 0.01 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const startX = from === "left" ? -28 : from === "right" ? 28 : 0;
  const startY = from === "up" ? 34 : 0;
  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? "translate(0,0) scale(1)" : `translate(${startX}px, ${startY}px) scale(0.97)`,
      filter: vis ? "blur(0px)" : "blur(6px)",
      transition: `opacity 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.85s cubic-bezier(0.16,1,0.3,1) ${delay}ms, filter 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      willChange: "transform,opacity,filter",
    }}>
      {children}
    </div>
  );
}

// ─── ESTILOS GLOBALES (mismos tokens visuales que fokusaccesorios.shop) ──
const C = { bg: "#080808", border: "#1e1e1e", text: "#ececec", accent: "#fff", gold: "#ffd43b" };

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&display=swap');
  .fokus-logo { font-family:'Playfair Display',Georgia,serif; font-weight:800; letter-spacing:3px; }
  *,*::before,*::after{box-sizing:border-box;}
  html{scroll-behavior:smooth;-webkit-text-size-adjust:100%;}
  body{background:#080808;margin:0;overflow-x:clip;-webkit-font-smoothing:antialiased;}
  img{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;}
  button{-webkit-tap-highlight-color:transparent;}

  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
  @keyframes heroKenBurns{0%{transform:scale(1.06)}100%{transform:scale(1.14)}}
  @keyframes spotlightPulse{0%,100%{opacity:0.55}50%{opacity:0.85}}
  @keyframes focusCornerIn{0%{opacity:0;transform:scale(1.7)}60%{opacity:1}100%{opacity:1;transform:scale(1)}}
  @keyframes focusRingPulse{0%{opacity:0.5;transform:scale(0.94)}70%{opacity:0}100%{opacity:0;transform:scale(1.3)}}
  @keyframes badgeShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
  @keyframes ctaGlow{0%,100%{box-shadow:0 10px 30px rgba(255,255,255,0.18),inset 0 1px 0 rgba(255,255,255,0.85)}50%{box-shadow:0 14px 46px rgba(255,255,255,0.34),inset 0 1px 0 rgba(255,255,255,0.95)}}
  @keyframes priceTagPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.035)}}
  @keyframes scrollHintBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}
  @keyframes urgentDot{0%,100%{opacity:1}50%{opacity:0.35}}
  @keyframes stampIn{0%{opacity:0;transform:rotate(-14deg) scale(0.5)}60%{opacity:1;transform:rotate(-8deg) scale(1.08)}100%{opacity:1;transform:rotate(-8deg) scale(1)}}

  .cta-btn{position:relative;overflow:hidden;animation:ctaGlow 2.6s ease-in-out infinite;}
  .cta-btn::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.5) 50%,transparent 100%);background-size:200% 100%;animation:badgeShimmer 2.8s ease infinite;mix-blend-mode:overlay;pointer-events:none;}
  .cta-btn:active{transform:scale(0.97);}

  @media(max-width:480px){
    .hero-title{font-size:34px !important;}
    .hero-sub{font-size:13px !important;}
    .gallery-row{grid-template-columns:1fr !important;}
    .benefits-grid{grid-template-columns:repeat(2,1fr) !important;}
  }
  @media(min-width:481px){
    .gallery-row{grid-template-columns:1fr 1fr !important;}
    .benefits-grid{grid-template-columns:repeat(3,1fr) !important;}
  }
`;

// ─── ÍCONOS ────────────────────────────────────────────────────────────────
const IcWA = ({ s = 20, c = "#fff" }: { s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
);
const IcCheck = ({ s = 14, c = "#4caf50" }: { s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
);
const IcShield = ({ s = 20, c = "#fff" }: { s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg>
);
const IcTruck = ({ s = 20, c = "#fff" }: { s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
);
const IcSun = ({ s = 20, c = "#fff" }: { s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
);
const IcGem = ({ s = 20, c = "#fff" }: { s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinejoin="round"><path d="M6 3h12l4 6-10 12L2 9z" /><path d="M2 9h20M6 3l4 6 2-6M18 3l-4 6-2-6" /></svg>
);
const IcRefresh = ({ s = 20, c = "#fff" }: { s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><polyline points="23 20 23 14 17 14" /><path d="M20.49 9A9 9 0 005.6 5.6L1 10m22 4l-4.6 4.4A9 9 0 013.51 15" /></svg>
);
const IcLock = ({ s = 20, c = "#fff" }: { s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
);

// ─── SECCIÓN: WHATSAPP CTA (reutilizable) ─────────────────────────────────
function WhatsAppCTA({ source, big = false, label = "PEDIR POR WHATSAPP AHORA" }: { source: string; big?: boolean; label?: string }) {
  return (
    <button
      onClick={() => {
        trackCustomClick(source);
        const msg = encodeURIComponent(`Hola! Vi la oferta de los *Lentes Aviador Premium* a $${PRODUCT.offerPrice} (antes $${PRODUCT.price}) y quiero aprovecharla ahora 🖤🕶️`);
        window.location.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
      }}
      className="cta-btn"
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: "0.65rem",
        width: "100%", background: "linear-gradient(180deg,#ffffff 0%,#f0f0f0 100%)", color: "#080808",
        border: "none", fontSize: big ? 14 : 12, fontWeight: 900, letterSpacing: 2,
        padding: big ? "1.15rem" : "1rem", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
      }}
    >
      <IcWA s={big ? 20 : 17} c="#080808" />
      <span style={{ position: "relative" }}>{label}</span>
    </button>
  );
}

// ─── SECCIÓN: PRECIO ───────────────────────────────────────────────────────
function PriceBlock({ bcvRate }: { bcvRate: number | null }) {
  const bs = bcvRate ? Math.round(PRODUCT.offerPrice * bcvRate).toLocaleString("es-VE") : null;
  const bsOriginal = bcvRate ? Math.round(PRODUCT.price * bcvRate).toLocaleString("es-VE") : null;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <span style={{ fontSize: 17, color: "#555", textDecoration: "line-through" }}>${PRODUCT.price.toFixed(2)}</span>
        <span style={{ fontSize: 42, fontWeight: 900, color: "#fff", lineHeight: 1, animation: "priceTagPulse 2.4s ease-in-out infinite" }}>${PRODUCT.offerPrice.toFixed(2)}</span>
        <span style={{ background: "linear-gradient(135deg,#ff3b3b 0%,#7a0000 100%)", color: "#fff", fontSize: 11, fontWeight: 900, letterSpacing: 1, padding: "4px 10px", borderRadius: 20, boxShadow: "0 4px 14px rgba(255,0,0,0.35)" }}>
          -{PRODUCT.discountPercent}% HOY
        </span>
      </div>
      {bcvRate ? (
        <p style={{ margin: 0, fontSize: 12, color: "#666" }}>
          Equivale a <strong style={{ color: C.gold }}>Bs. {bs}</strong> <span style={{ textDecoration: "line-through", color: "#3a3a3a" }}>Bs. {bsOriginal}</span> · Tasa BCV
        </p>
      ) : (
        <p style={{ margin: 0, fontSize: 11, color: "#3a3a3a" }}>Calculando equivalencia en bolívares…</p>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────
export default function LandingLentesAviador() {
  const { rate: bcvRate } = useBcvRate();
  const countdown = useMidnightCountdown();
  const stock = useStockCounter();
  const viewersNow = useViewersNow();
  const [heroLoaded, setHeroLoaded] = useState(false);

  useEffect(() => { initMetaPixel(); getFbcFromUrl(); }, []);
  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).fbq) return;
    (window as any).fbq("track", "ViewContent", {
      content_name: PRODUCT.name, content_ids: [PRODUCT.code], content_type: "product",
      value: PRODUCT.offerPrice, currency: "USD",
    });
  }, []);

  const faqs = useMemo(() => ([
    { q: "¿Es seguro comprar por WhatsApp?", a: "Sí. Hablas directo con nosotros, sin intermediarios ni bots. Confirmamos tu pedido, te enviamos los datos de pago y coordinamos el envío contigo en tiempo real. Más de 15.000 pedidos entregados nos respaldan." },
    { q: "¿Y si los lentes no me quedan o no me gustan?", a: "Tienes garantía de satisfacción: si al recibirlos algo no está bien, lo resolvemos contigo directamente. Nuestro objetivo es que te quedes feliz con tu compra, no solo que compres." },
    { q: "¿Cómo pago?", a: "Aceptamos Pago Móvil (Banco de Venezuela y Bancamiga), Binance Pay y Zinli. Tú eliges el método que prefieras al finalizar por WhatsApp." },
    { q: "¿Cuánto tarda el envío y a dónde llega?", a: "Enviamos a los 23 estados de Venezuela mediante MRW, Zoom y Tealca. Con MRW el tiempo de entrega es de 1 a 2 días hábiles. Si estás en Naguanagua el envío es gratis; en Valencia tiene un costo fijo de $3." },
    { q: "¿De verdad filtran la luz azul de las pantallas?", a: "Sí, el cristal cuenta con filtro real de luz azul, no es solo un lente con tinte decorativo — ayuda a reducir el cansancio y el ardor en los ojos tras horas de PC, laptop o celular." },
    { q: "¿De qué material están hechos? ¿Se van a poner feos rápido?", a: "Armazón en acero inoxidable premium combinado con acetato técnico de alta resistencia, con acabado grabado a mano. Aguanta la oxidación, el sudor y los golpes del uso diario — nada de aleaciones baratas que se despintan con el tiempo." },
    { q: "¿Sirven para colocarles mi fórmula (graduación)?", a: "Sí. El armazón está preparado tanto para mandar a montar tu fórmula en cualquier óptica, como para usarlos tal cual en tu día a día frente a la pantalla — dos usos en un solo accesorio." },
    { q: "¿Por qué están en oferta, tienen algo malo?", a: `No — es una promoción por tiempo limitado, ${PRODUCT.discountPercent}% de descuento sobre el precio normal de $${PRODUCT.price}. Es exactamente el mismo producto premium, solo que hoy cuesta menos.` },
  ]), []);

  return (
    <div style={{ fontFamily: "'Helvetica Neue',Arial,sans-serif", background: C.bg, minHeight: "100vh", color: C.text }}>
      <style>{GLOBAL_CSS}</style>

      {/* BARRA DE URGENCIA */}
      <div style={{ background: "linear-gradient(90deg,#1a0000 0%,#3a0a0a 50%,#1a0000 100%)", borderBottom: "1px solid #3a1515", padding: "0.55rem 1rem", textAlign: "center", position: "sticky", top: 0, zIndex: 300 }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: 1.2, color: "#ff9999" }}>
          <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#ff3b3b", marginRight: 6, animation: "urgentDot 1.2s ease-in-out infinite" }} />
          OFERTA TERMINA HOY A MEDIANOCHE · {countdown.h}:{countdown.m}:{countdown.s}
        </p>
      </div>

      {/* LOGO */}
      <div style={{ display: "flex", justifyContent: "center", padding: "1.25rem 1rem 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/favicon.png" alt="Fokus" width={26} height={26} style={{ objectFit: "contain" }} draggable={false} />
          <span className="fokus-logo" style={{ color: "#fff", fontSize: 18 }}>FOKUS</span>
        </div>
      </div>

      {/* ── HERO ── */}
      <section style={{ maxWidth: 640, margin: "0 auto", padding: "1.5rem 1.25rem 0", textAlign: "center" }}>
        <div style={{ animation: "fadeIn 0.6s ease" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: "0.35rem 0.9rem", marginBottom: "1rem" }}>
            <IcGem s={11} c="rgba(255,255,255,0.6)" />
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2, color: "rgba(255,255,255,0.55)" }}>EDICIÓN LIMITADA · FILTRO DE LUZ AZUL · ACERO INOXIDABLE</span>
          </div>
          <h1 className="hero-title" style={{ fontSize: 40, fontWeight: 900, lineHeight: 1.08, margin: "0 0 0.75rem", color: "#fff", letterSpacing: 0.5 }}>
            Lentes Anti Luz Azul<br />que se ven tan bien como protegen
          </h1>
          <p className="hero-sub" style={{ fontSize: 14, color: "#777", lineHeight: 1.7, maxWidth: 420, margin: "0 auto 1.5rem" }}>
            Diseño premium en acero inoxidable y acetato técnico de alta resistencia, grabado a mano, con filtro real de luz azul para tus jornadas frente al PC, la laptop o el celular. Sirven tanto para mandar a formular con tu graduación como para uso diario. Hoy con {PRODUCT.discountPercent}% de descuento — te llegan en 1 a 2 días hábiles por MRW.
          </p>
        </div>

        {/* IMAGEN HERO CON EFECTO "ENFOQUE" (motivo de marca Fokus) */}
        <div style={{ position: "relative", maxWidth: 380, margin: "0 auto 1.25rem" }}>
          <span aria-hidden="true" style={{ position: "absolute", top: -10, left: -10, width: 22, height: 22, borderTop: "2px solid rgba(255,255,255,0.8)", borderLeft: "2px solid rgba(255,255,255,0.8)", animation: "focusCornerIn 0.8s cubic-bezier(0.16,1,0.3,1) both", zIndex: 3 }} />
          <span aria-hidden="true" style={{ position: "absolute", top: -10, right: -10, width: 22, height: 22, borderTop: "2px solid rgba(255,255,255,0.8)", borderRight: "2px solid rgba(255,255,255,0.8)", animation: "focusCornerIn 0.8s cubic-bezier(0.16,1,0.3,1) 0.06s both", zIndex: 3 }} />
          <span aria-hidden="true" style={{ position: "absolute", bottom: -10, left: -10, width: 22, height: 22, borderBottom: "2px solid rgba(255,255,255,0.8)", borderLeft: "2px solid rgba(255,255,255,0.8)", animation: "focusCornerIn 0.8s cubic-bezier(0.16,1,0.3,1) 0.12s both", zIndex: 3 }} />
          <span aria-hidden="true" style={{ position: "absolute", bottom: -10, right: -10, width: 22, height: 22, borderBottom: "2px solid rgba(255,255,255,0.8)", borderRight: "2px solid rgba(255,255,255,0.8)", animation: "focusCornerIn 0.8s cubic-bezier(0.16,1,0.3,1) 0.18s both", zIndex: 3 }} />
          <span aria-hidden="true" style={{ position: "absolute", inset: -10, borderRadius: 18, border: "1px solid rgba(255,255,255,0.5)", animation: "focusRingPulse 2.8s ease-out infinite", pointerEvents: "none", zIndex: 3 }} />
          <div style={{ position: "relative", aspectRatio: "1/1", borderRadius: 16, overflow: "hidden", background: "#0a0a0a", boxShadow: "0 30px 70px rgba(0,0,0,0.6)" }}>
            {!heroLoaded && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,#141414 0%,#1e1e1e 50%,#141414 100%)", backgroundSize: "200% 100%", animation: "badgeShimmer 1.4s infinite", zIndex: 1 }} />}
            <img
              src={PRODUCT_IMAGES.hero}
              alt={PRODUCT.name}
              loading="eager"
              fetchPriority="high"
              onLoad={() => setHeroLoaded(true)}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: heroLoaded ? 1 : 0, transition: "opacity 0.4s ease", animation: heroLoaded ? "heroKenBurns 9s ease-in-out infinite alternate" : "none" }}
              draggable={false}
            />
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.35) 100%)", pointerEvents: "none", animation: "spotlightPulse 4s ease-in-out infinite", zIndex: 2 }} />
          </div>
        </div>

        <PriceBlock bcvRate={bcvRate} />
        <p style={{ fontSize: 11, fontWeight: 800, color: "#ff8888", margin: "0.6rem 0 0", letterSpacing: 0.3 }}>
          🔥 Solo quedan <span style={{ color: "#fff" }}>{stock}</span> unidades a este precio
        </p>
        <p style={{ fontSize: 10, color: "#666", margin: "0.25rem 0 0" }}>
          👀 <span style={{ color: "#ccc", fontWeight: 700 }}>{viewersNow} personas</span> viendo esta oferta ahora mismo
        </p>
        <div style={{ maxWidth: 380, margin: "1.25rem auto 0.75rem" }}>
          <WhatsAppCTA source="hero" big />
        </div>
        <p style={{ fontSize: 10, color: "#333", margin: "0 0 1.5rem" }}>🔒 Compra 100% segura · Respondemos en minutos</p>

        <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", flexWrap: "wrap", marginBottom: "2.25rem" }}>
          {[{ n: "15.000+", l: "Pedidos" }, { n: "★ 4.9", l: "Valoración" }, { n: "23", l: "Estados" }].map(({ n, l }) => (
            <div key={l} style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "#fff" }}>{n}</p>
              <p style={{ margin: "2px 0 0", fontSize: 9, color: "#444", letterSpacing: 1 }}>{l.toUpperCase()}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── GALERÍA / HISTORIA DE PRODUCTO ── */}
      <section style={{ maxWidth: 880, margin: "0 auto", padding: "0 1.25rem 3rem" }}>
        <RevealUp>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3, color: "#333", margin: "0 0 0.5rem" }}>CADA DETALLE, A PROPÓSITO</p>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: "#fff", margin: 0, letterSpacing: 0.5 }}>No son unos lentes más</h2>
          </div>
        </RevealUp>
        <div className="gallery-row" style={{ display: "grid", gap: "1rem" }}>
          {PRODUCT_IMAGES.gallery.map((item, i) => (
            <RevealUp key={item.src} delay={i * 70} from={i % 2 === 0 ? "left" : "right"}>
              <div style={{ borderRadius: 14, overflow: "hidden", background: "#0d0d0d", border: `1px solid ${C.border}` }}>
                <div style={{ position: "relative", aspectRatio: "1/1", background: "#0a0a0a" }}>
                  <img src={item.src} alt={item.caption} loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} draggable={false} />
                </div>
                <p style={{ margin: 0, padding: "0.9rem 1rem", fontSize: 12, color: "#999", lineHeight: 1.6 }}>{item.caption}</p>
              </div>
            </RevealUp>
          ))}
        </div>
      </section>

      {/* ── BENEFICIOS ── */}
      <section style={{ background: "#0a0a0a", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "3rem 1.25rem" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <RevealUp>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: "#fff", textAlign: "center", margin: "0 0 2rem", letterSpacing: 0.5 }}>Por qué son la mejor opción</h2>
          </RevealUp>
          <div className="benefits-grid" style={{ display: "grid", gap: "1rem" }}>
            {[
              { icon: <IcGem s={20} />, t: "Acero inoxidable y acetato técnico", d: "Materiales de altísima resistencia: acero inoxidable premium y acetato técnico reforzado. No se oxida, no se despinta y aguanta el uso diario sin perder su brillo." },
              { icon: <IcSun s={20} />, t: "Filtro real de luz azul", d: "Reduce la fatiga visual y el ardor en los ojos tras horas de PC, laptop o celular — no es solo un cristal con tinte." },
              { icon: <IcCheck s={20} c="#fff" />, t: "Ajuste cómodo todo el día", d: "Puente doble y puntas acolchadas — se te olvida que los llevas puestos." },
              { icon: <IcTruck s={20} />, t: "Envío a toda Venezuela", d: "Con MRW llegan en 1 a 2 días hábiles; también trabajamos con Zoom y Tealca a los 23 estados del país." },
              { icon: <IcShield s={20} />, t: "Garantía de satisfacción", d: "Si algo no está bien al recibirlos, lo resolvemos contigo directamente." },
              { icon: <IcRefresh s={20} />, t: "Diseño exclusivo Fokus", d: "Detalles grabados a mano — acabado de joyería, un accesorio con el que se nota tu estilo." },
              { icon: <IcCheck s={20} c="#fff" />, t: "Listos para tu fórmula o uso diario", d: "El armazón admite montar tus lentes formulados en cualquier óptica, o úsalos tal cual para tu jornada diaria frente a la pantalla." },
            ].map((b, i) => (
              <RevealUp key={b.t} delay={i * 60}>
                <div style={{ background: "#111", border: `1px solid ${C.border}`, borderRadius: 14, padding: "1.25rem 1.1rem", height: "100%" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "0.85rem" }}>{b.icon}</div>
                  <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 800, color: "#eee" }}>{b.t}</p>
                  <p style={{ margin: 0, fontSize: 11.5, color: "#666", lineHeight: 1.6 }}>{b.d}</p>
                </div>
              </RevealUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA INTERMEDIO ── */}
      <section style={{ maxWidth: 460, margin: "0 auto", padding: "3rem 1.25rem 0", textAlign: "center" }}>
        <RevealUp>
          <div style={{ background: "linear-gradient(135deg,#141410 0%,#0a0a08 100%)", border: "1px solid #3a3520", borderRadius: 16, padding: "1.5rem" }}>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2.5, color: C.gold, margin: "0 0 0.6rem" }}>🔥 QUEDAN POCAS UNIDADES A ESTE PRECIO</p>
            <PriceBlock bcvRate={bcvRate} />
            <div style={{ marginTop: "1.1rem" }}><WhatsAppCTA source="cta_intermedio" /></div>
          </div>
        </RevealUp>
      </section>

      {/* ── LIFESTYLE ── */}
      <section style={{ maxWidth: 880, margin: "0 auto", padding: "3rem 1.25rem" }}>
        <div className="gallery-row" style={{ display: "grid", gap: "1.25rem", alignItems: "center" }}>
          <RevealUp from="left">
            <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", aspectRatio: "1/1", background: "#0a0a0a" }}>
              <img src={PRODUCT_IMAGES.lifestyle} alt="Lentes puestos, uso diario frente a la pantalla" loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} draggable={false} />
            </div>
          </RevealUp>
          <RevealUp from="right" delay={100}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3, color: "#333", margin: "0 0 0.6rem" }}>ESTILO Y PROTECCIÓN, EN UNO SOLO</p>
              <h3 style={{ fontSize: 20, fontWeight: 900, color: "#fff", margin: "0 0 0.85rem", lineHeight: 1.3 }}>Pensados para quien vive conectado</h3>
              <p style={{ fontSize: 13, color: "#777", lineHeight: 1.8, margin: 0 }}>
                Un diseño premium con terminaciones grabadas a mano, ideal para gamers, estudiantes y quienes trabajan todo el día frente a una pantalla. No solo se ven de lujo: cuidan tus ojos mientras lo hacen. De la oficina al gaming, sin cambiar de lentes.
              </p>
            </div>
          </RevealUp>
        </div>
      </section>

      <ReviewsSection />

      {/* ── ELIMINACIÓN DE OBJECIONES / FAQ ── */}
      <section style={{ maxWidth: 720, margin: "0 auto", padding: "3rem 1.25rem" }}>
        <RevealUp>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3, color: "#333", margin: "0 0 0.5rem" }}>ANTES DE QUE PREGUNTES</p>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: "#fff", margin: 0 }}>Todo lo que necesitas saber</h2>
          </div>
        </RevealUp>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {faqs.map((f, i) => (
            <RevealUp key={f.q} delay={i * 45}>
              <FaqItem q={f.q} a={f.a} />
            </RevealUp>
          ))}
        </div>
      </section>

      {/* ── CONFIANZA / MÉTODOS DE PAGO ── */}
      <section style={{ maxWidth: 560, margin: "0 auto", padding: "0 1.25rem 3rem" }}>
        <RevealUp>
          <div style={{ background: "linear-gradient(160deg,#141414 0%,#0c0c0c 100%)", border: `1px solid ${C.border}`, borderRadius: 16, padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem" }}>
              <IcLock s={16} c="#4caf50" />
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: "#4caf50", margin: 0 }}>COMPRA 100% SEGURA</p>
            </div>
            <p style={{ fontSize: 12, color: "#777", lineHeight: 1.8, margin: "0 0 1.1rem" }}>
              Hablas directo con nuestro equipo por WhatsApp — sin bots, sin letras pequeñas. Confirmamos tu pedido, tú envías el comprobante y coordinamos la entrega contigo.
            </p>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              {[{ i: "🏦", l: "Pago Móvil" }, { i: "🟡", l: "Binance Pay" }, { i: "💳", l: "Zinli" }].map(pm => (
                <div key={pm.l} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "0.4rem 0.85rem 0.4rem 0.5rem" }}>
                  <span style={{ fontSize: 14 }}>{pm.i}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#ccc" }}>{pm.l}</span>
                </div>
              ))}
            </div>
          </div>
        </RevealUp>
      </section>

      {/* ── CTA FINAL ── */}
      <section style={{ maxWidth: 460, margin: "0 auto", padding: "0 1.25rem 6rem", textAlign: "center" }}>
        <RevealUp>
          <div style={{ position: "relative", background: "linear-gradient(160deg,#141414 0%,#0a0a0a 100%)", border: "1px solid #2a2a2a", borderRadius: 18, padding: "2rem 1.5rem", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)" }} />
            <div style={{ display: "inline-block", background: "rgba(255,59,59,0.12)", border: "1px solid rgba(255,59,59,0.35)", borderRadius: 20, padding: "0.3rem 0.9rem", marginBottom: "1rem" }}>
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, color: "#ff8888" }}>ÚLTIMA LLAMADA — LA OFERTA TERMINA HOY</span>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: "#fff", margin: "0 0 0.75rem", lineHeight: 1.3 }}>No dejes pasar tus lentes aviador</h2>
            <p style={{ fontSize: 13, color: "#777", lineHeight: 1.7, margin: "0 0 1.25rem" }}>
              {PRODUCT.discountPercent}% de descuento, envío a toda Venezuela y garantía de satisfacción. Escríbenos ahora y te respondemos en minutos.
            </p>
            <PriceBlock bcvRate={bcvRate} />
            <div style={{ marginTop: "1.25rem" }}><WhatsAppCTA source="cta_final" big /></div>
            <p style={{ fontSize: 9, color: "#333", margin: "0.75rem 0 0" }}>⏳ Oferta termina en {countdown.h}h {countdown.m}m</p>
          </div>
        </RevealUp>
      </section>

      {/* ── MÁS MODELOS ── */}
      <section style={{ maxWidth: 640, margin: "0 auto", padding: "0 1.25rem 3rem" }}>
        <RevealUp>
          <a href="https://www.fokusaccesorios.shop/tienda/lentes/anti-luz-azul" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block" }}>
            <div style={{ background: "linear-gradient(160deg,#141414 0%,#0c0c0c 100%)", border: `1px solid ${C.border}`, borderRadius: 18, padding: "2rem 1.5rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)" }} />
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3, color: "#333", margin: "0 0 0.75rem" }}>COLECCIÓN COMPLETA</p>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: "#fff", margin: "0 0 0.5rem", lineHeight: 1.3 }}>¿Buscas otro estilo?</h2>
              <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6, margin: "0 0 1.25rem" }}>Explora todos nuestros modelos de lentes anti luz azul y encuentra el que mejor va contigo.</p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 20, padding: "0.6rem 1.2rem" }}>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: "#fff" }}>VER MÁS MODELOS</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
            </div>
          </a>
        </RevealUp>
      </section>

      {/* FOOTER MÍNIMO */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: "1.5rem", textAlign: "center" }}>
        <p style={{ fontSize: 9, color: "#222", margin: 0, letterSpacing: 1 }}>© {new Date().getFullYear()} FOKUS. TODOS LOS DERECHOS RESERVADOS.</p>
      </footer>

      <SocialProofToast />

      {/* BARRA FIJA INFERIOR (siempre visible, máxima conversión) */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 500, background: "rgba(8,8,8,0.97)", borderTop: `1px solid ${C.border}`, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: "0.65rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 9, color: "#555", letterSpacing: 0.5 }}>OFERTA HOY · SIN REGISTRO</p>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: "#fff" }}>
            ${PRODUCT.offerPrice.toFixed(2)} <span style={{ fontSize: 10, color: "#444", textDecoration: "line-through", fontWeight: 600 }}>${PRODUCT.price.toFixed(2)}</span>
          </p>
        </div>
        <div style={{ flexShrink: 0, width: 190 }}>
          <WhatsAppCTA source="barra_fija" label="COMPRAR →" />
        </div>
      </div>
    </div>
  );
}

// ─── RESEÑAS (mismo sistema de comentarios que la tienda) ────────────────
const REVIEWS_FIREBASE_PROJECT_ID = "fokus-16a0c";
const REVIEWS_CLOUDINARY_CLOUD = "drgafle8o";
const REVIEWS_CLOUDINARY_PRESET = "fokus_products";
// Cambia esto por el ID de otro producto de tu tienda si quieres mostrar SUS reseñas aquí:
const REVIEWS_PRODUCT_ID = "FK-13YTHA";
const REVIEWS_PRODUCT_NAME = PRODUCT.name;

interface LandingReview { id: string; name: string; comment: string; stars: number; createdAt: number; photoUrl?: string; avatarUrl?: string; }

function reviewsFsBase() { return `https://firestore.googleapis.com/v1/projects/${REVIEWS_FIREBASE_PROJECT_ID}/databases/(default)/documents`; }
function reviewsFromFs(f: any): unknown {
  if (!f) return null;
  if ("stringValue" in f) return f.stringValue;
  if ("doubleValue" in f) return f.doubleValue;
  if ("integerValue" in f) return Number(f.integerValue);
  if ("booleanValue" in f) return f.booleanValue;
  return null;
}
function reviewsToFs(v: unknown): any {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "number") return { doubleValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  return { stringValue: String(v) };
}
async function fetchLandingReviews(): Promise<LandingReview[]> {
  try {
    const r = await fetch(`${reviewsFsBase()}:runQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "product_comments" }], where: { fieldFilter: { field: { fieldPath: "productId" }, op: "EQUAL", value: { stringValue: REVIEWS_PRODUCT_ID } } } } }),
    });
    const d = await r.json();
    const list: LandingReview[] = (Array.isArray(d) ? d : []).filter((x: any) => x.document).map((x: any) => {
      const doc = x.document; const f = doc.fields || {};
      return {
        id: doc.name.split("/").pop(),
        name: (reviewsFromFs(f.name) as string) || "Cliente Fokus",
        comment: (reviewsFromFs(f.comment) as string) || "",
        stars: Number(reviewsFromFs(f.stars)) || 5,
        createdAt: Number(reviewsFromFs(f.createdAt)) || Date.now(),
        photoUrl: (reviewsFromFs(f.photoUrl) as string) || "",
        avatarUrl: (reviewsFromFs(f.avatarUrl) as string) || "",
      };
    });
    list.sort((a, b) => b.createdAt - a.createdAt);
    return list;
  } catch { return []; }
}
async function submitLandingReview(name: string, comment: string, stars: number, photoUrl: string): Promise<void> {
  const fields = {
    productId: reviewsToFs(REVIEWS_PRODUCT_ID),
    productName: reviewsToFs(REVIEWS_PRODUCT_NAME),
    name: reviewsToFs(name),
    email: reviewsToFs(""),
    comment: reviewsToFs(comment),
    stars: reviewsToFs(stars),
    createdAt: reviewsToFs(Date.now()),
    photoUrl: reviewsToFs(photoUrl),
    avatarUrl: reviewsToFs(""),
    isAdmin: reviewsToFs(false),
  };
  await fetch(`${reviewsFsBase()}/product_comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields }) });
}
async function uploadReviewPhoto(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", REVIEWS_CLOUDINARY_PRESET);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${REVIEWS_CLOUDINARY_CLOUD}/image/upload`, { method: "POST", body: fd });
  const d = await r.json();
  return d.secure_url as string;
}

const SEED_REVIEWS: LandingReview[] = [
  { id: "seed1", name: "Javier Jose", stars: 5, comment: "Los uso todo el día en la computadora del trabajo y se nota la diferencia, ya no llego a la casa con los ojos cansados. Se ven finísimos además.", createdAt: Date.now() - 86400000 * 6 },
  { id: "seed2", name: "Anderson", stars: 5, comment: "Excelente calidad, el armazón no se siente para nada barato. Los pedí para el estudio y quedé encantado con el acabado.", createdAt: Date.now() - 86400000 * 14 },
  { id: "seed3", name: "Carrillo", stars: 5, comment: "Se ven elegantes y de verdad ayudan con el cansancio visual de estar tantas horas frente a la pantalla. Llegaron rápido a mi estado.", createdAt: Date.now() - 86400000 * 21 },
  { id: "seed4", name: "Gamarra", stars: 4, comment: "Muy buen diseño, cómodos para usar todo el día. Los recomiendo para quienes trabajamos frente al PC.", createdAt: Date.now() - 86400000 * 30 },
  { id: "seed5", name: "Arturo Jose", stars: 5, comment: "Pinta de lujo y encima cumplen su función. Ya no me duele tanto la cabeza después de las jornadas largas de PC.", createdAt: Date.now() - 86400000 * 40 },
];

function ReviewsStarRow({ value, onChange, size = 16 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={onChange ? () => onChange(n) : undefined} disabled={!onChange} style={{ background: "none", border: "none", padding: 1, cursor: onChange ? "pointer" : "default", display: "flex" }}>
          <svg width={size} height={size} viewBox="0 0 24 24" fill={n <= value ? "#fff" : "none"} stroke={n <= value ? "#fff" : "#3a3a3a"} strokeWidth="1.5" strokeLinejoin="round"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01z" /></svg>
        </button>
      ))}
    </div>
  );
}

function ReviewsSection() {
  const [reviews, setReviews] = useState<LandingReview[]>([]);
  const [visible, setVisible] = useState(4);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [stars, setStars] = useState(5);
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchLandingReviews().then(list => { setReviews(list.length ? list : SEED_REVIEWS); }); }, []);

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length : 5;

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { setPhotoUrl(await uploadReviewPhoto(file)); } catch { /* silent */ }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !comment.trim()) return;
    setSending(true);
    try {
      await submitLandingReview(name.trim(), comment.trim(), stars, photoUrl);
      setReviews(prev => [{ id: "tmp_" + Date.now(), name: name.trim(), comment: comment.trim(), stars, createdAt: Date.now(), photoUrl }, ...prev]);
      setName(""); setComment(""); setStars(5); setPhotoUrl(""); setDone(true);
      setTimeout(() => setDone(false), 3000);
    } finally { setSending(false); }
  };

  return (
    <section style={{ maxWidth: 720, margin: "0 auto", padding: "3rem 1.25rem" }}>
      <RevealUp>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3, color: "#333", margin: "0 0 0.5rem" }}>OPINIONES REALES</p>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: "#fff", margin: "0 0 0.5rem" }}>Lo que dicen nuestros clientes</h2>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <ReviewsStarRow value={Math.round(avg)} size={14} />
            <span style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>{avg.toFixed(1)}</span>
            <span style={{ fontSize: 11, color: "#444" }}>({reviews.length} reseñas)</span>
          </div>
        </div>
      </RevealUp>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.5rem" }}>
        {reviews.slice(0, visible).map(r => (
          <div key={r.id} style={{ background: "#111", border: `1px solid ${C.border}`, borderRadius: 12, padding: "1rem 1.1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {r.avatarUrl ? <img src={r.avatarUrl} alt={r.name} style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }} draggable={false} /> : <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ fontSize: 11, fontWeight: 900, color: "#080808" }}>{r.name[0]?.toUpperCase()}</span></div>}
                <span style={{ fontSize: 12, fontWeight: 800, color: "#ddd" }}>{r.name}</span>
              </div>
              <span style={{ fontSize: 9, color: "#333" }}>{new Date(r.createdAt).toLocaleDateString("es-VE", { day: "2-digit", month: "short" })}</span>
            </div>
            <div style={{ marginBottom: 5 }}><ReviewsStarRow value={r.stars} size={11} /></div>
            <p style={{ margin: 0, fontSize: 12.5, color: "#888", lineHeight: 1.7 }}>{r.comment}</p>
            {!!r.photoUrl && <img src={r.photoUrl} alt="" style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 8, marginTop: 8 }} draggable={false} />}
          </div>
        ))}
        {reviews.length > visible && (
          <button onClick={() => setVisible(v => v + 6)} style={{ background: "#161616", border: `1px solid ${C.border}`, color: "#ccc", borderRadius: 10, padding: "0.75rem", fontSize: 11, fontWeight: 800, letterSpacing: 1, cursor: "pointer", fontFamily: "inherit" }}>VER MÁS RESEÑAS</button>
        )}
      </div>
      <div style={{ background: "linear-gradient(160deg,#141414 0%,#0c0c0c 100%)", border: `1px solid ${C.border}`, borderRadius: 14, padding: "1.1rem" }}>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2, color: "#444", margin: "0 0 0.6rem" }}>DEJA TU RESEÑA</p>
        <div style={{ marginBottom: "0.85rem" }}><ReviewsStarRow value={stars} onChange={setStars} size={22} /></div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <input placeholder="Tu nombre *" value={name} onChange={e => setName(e.target.value)} style={{ width: "100%", border: `1px solid ${C.border}`, padding: "0.75rem 1rem", fontSize: 13, outline: "none", fontFamily: "inherit", background: "#161616", color: "#eee", borderRadius: 8, boxSizing: "border-box" }} />
          <textarea placeholder="Cuéntanos tu experiencia..." value={comment} onChange={e => setComment(e.target.value)} rows={2} style={{ width: "100%", border: `1px solid ${C.border}`, padding: "0.75rem 1rem", fontSize: 13, outline: "none", fontFamily: "inherit", background: "#161616", color: "#eee", borderRadius: 8, boxSizing: "border-box", resize: "vertical" as const, lineHeight: 1.6 }} />
          <div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} disabled={uploading} style={{ display: "none" }} id="landing-review-photo" />
            {photoUrl ? (
              <div style={{ position: "relative", display: "inline-block" }}>
                <img src={photoUrl} alt="" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8 }} draggable={false} />
                <button type="button" onClick={() => setPhotoUrl("")} style={{ position: "absolute", top: -6, right: -6, background: "#cc3333", border: "none", borderRadius: "50%", width: 18, height: 18, color: "#fff", fontSize: 10, cursor: "pointer" }}>✕</button>
              </div>
            ) : (
              <label htmlFor="landing-review-photo" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#161616", border: "1px dashed #2a2a2a", borderRadius: 8, padding: "0.55rem 0.9rem", cursor: uploading ? "not-allowed" : "pointer", fontSize: 11, color: "#888", fontWeight: 700 }}>{uploading ? "Subiendo…" : "📷 Agregar foto (opcional)"}</label>
            )}
          </div>
          <button onClick={handleSubmit} disabled={!name.trim() || !comment.trim() || sending} style={{ background: "#fff", color: "#080808", border: "none", borderRadius: 8, padding: "0.85rem", fontSize: 11, fontWeight: 900, letterSpacing: 1, cursor: (!name.trim() || !comment.trim() || sending) ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: (!name.trim() || !comment.trim() || sending) ? 0.5 : 1 }}>{sending ? "Publicando..." : "PUBLICAR RESEÑA"}</button>
          {done && <p style={{ margin: 0, fontSize: 11, color: "#4caf50" }}>✓ ¡Gracias por tu reseña!</p>}
        </div>
      </div>
    </section>
  );
}

// ─── ITEM DE FAQ (acordeón) ────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen(o => !o)}
      style={{ display: "block", width: "100%", textAlign: "left", background: "#111", border: `1px solid ${open ? "#333" : C.border}`, borderRadius: 12, padding: "1rem 1.1rem", cursor: "pointer", fontFamily: "inherit", WebkitTapHighlightColor: "transparent", transition: "border-color 0.15s" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#eee", lineHeight: 1.5 }}>{q}</span>
        <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", transform: open ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        </span>
      </div>
      <div style={{ maxHeight: open ? 300 : 0, overflow: "hidden", transition: "max-height 0.3s ease" }}>
        <p style={{ margin: "0.75rem 0 0", fontSize: 12.5, color: "#888", lineHeight: 1.75 }}>{a}</p>
      </div>
    </button>
  );
}