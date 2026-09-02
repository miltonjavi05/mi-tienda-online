"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

// ─── FIREBASE (mismo proyecto que la tienda Fokus) ─────────────────────────
const FIREBASE_PROJECT_ID = "fokus-16a0c";
const fsBase = () => `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

type FsVal =
  | { stringValue: string }
  | { doubleValue: number }
  | { integerValue: string }
  | { booleanValue: boolean }
  | { nullValue: null };

function toFs(v: unknown): FsVal {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "number") return { doubleValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  return { stringValue: String(v) };
}
function fromFs(f: FsVal | undefined): unknown {
  if (!f) return null;
  if ("stringValue" in f) return f.stringValue;
  if ("doubleValue" in f) return f.doubleValue;
  if ("integerValue" in f) return Number(f.integerValue);
  if ("booleanValue" in f) return f.booleanValue;
  return null;
}
interface FsDoc { name: string; fields: Record<string, FsVal>; }

async function fsGetCollectionAll(collection: string): Promise<Array<Record<string, unknown> & { id: string }>> {
  const out: Array<Record<string, unknown> & { id: string }> = [];
  let pageToken: string | undefined = undefined;
  do {
    const url = `${fsBase()}/${collection}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(await r.text());
    const d = (await r.json()) as { documents?: FsDoc[]; nextPageToken?: string };
    (d.documents || []).forEach(doc => {
      const fields = doc.fields || {};
      const obj: Record<string, unknown> = {};
      Object.entries(fields).forEach(([k, v]) => { obj[k] = fromFs(v); });
      out.push({ ...obj, id: doc.name.split("/").pop() as string });
    });
    pageToken = d.nextPageToken;
  } while (pageToken);
  return out;
}
async function fsAddToCollection(collection: string, data: Record<string, unknown>): Promise<string> {
  const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toFs(v)]));
  const r = await fetch(`${fsBase()}/${collection}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields }) });
  if (!r.ok) throw new Error(await r.text());
  const d = (await r.json()) as FsDoc;
  return d.name.split("/").pop() as string;
}
async function fsUpdateDoc(collection: string, id: string, data: Record<string, unknown>): Promise<void> {
  const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toFs(v)]));
  const mask = Object.keys(data).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
  const r = await fetch(`${fsBase()}/${collection}/${id}?${mask}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields }) });
  if (!r.ok) throw new Error(await r.text());
}
async function fsDeleteDoc(collection: string, id: string): Promise<void> {
  const r = await fetch(`${fsBase()}/${collection}/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error(await r.text());
}
async function fsGetSingleDoc(collection: string, id: string): Promise<Record<string, unknown> | null> {
  const r = await fetch(`${fsBase()}/${collection}/${id}`);
  if (!r.ok) return null;
  const d = (await r.json()) as FsDoc;
  const fields = d.fields || {};
  const obj: Record<string, unknown> = {};
  Object.entries(fields).forEach(([k, v]) => { obj[k] = fromFs(v); });
  return obj;
}
async function fsSetSingleDoc(collection: string, id: string, data: Record<string, unknown>): Promise<void> {
  const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toFs(v)]));
  const mask = Object.keys(data).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
  await fetch(`${fsBase()}/${collection}/${id}?${mask}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields }) });
}

// Colecciones dedicadas al panel de Mami (separadas de las de la tienda)
const COL = { ventas: "mami_sales", inv: "mami_investments", agenda: "mami_agenda" };
const CONFIG_COL = "mami_config";
const CONFIG_ID = "settings";
const BCV_CACHE_KEY = "mami_bcv_rate";
const BCV_CACHE_TIME = "mami_bcv_time";
const BCV_TTL = 6 * 60 * 60 * 1000;
// ─── LOGIN ────────────────────────────────────────────────────────────────
const MAMI_USER = "morelia";
const MAMI_PASS = "morelia";
const SESSION_KEY = "mami_session_ok";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function fmtUSD(n: number) {
  return "$" + (Number(n) || 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtBs(n: number) {
  return "Bs. " + Math.round(Number(n) || 0).toLocaleString("es-VE");
}
function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" });
}

interface SaleItem { category: string; liters: number; value: number; }
interface Sale { id: string; name: string; phone: string; product: string; items: SaleItem[]; amount: number; paymentMethod: string; date: string; createdAt: number; }
interface Investment { id: string; desc: string; amount: number; category: string; date: string; createdAt: number; }
interface AgendaClient { id: string; name: string; phone: string; product: string; items: SaleItem[]; amount: number; paidAmount: number; paid: boolean; paymentMethod: string; notes: string; createdAt: number; }

const PRODUCT_CATEGORIES = ["Cloro", "Lavaplatos", "Desinfectante", "Suavizante", "Cera de piso", "Desengrasante", "Ariel líquido"];
const PAYMENT_METHODS = [
  { id: "efectivo", label: "Efectivo" },
  { id: "pagomovil", label: "Pago Móvil" },
];
const INV_CATEGORIES = ["Materia prima", "Envases/Empaque", "Transporte", "Otro"];

function parseItems(raw: unknown): SaleItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw as string);
    if (Array.isArray(parsed)) {
      return parsed.map((it: any) => ({
        category: String(it.category || ""),
        liters: Number(it.liters) || 0,
        value: Number(it.value) || 0,
      }));
    }
  } catch { /* silencioso */ }
  return [];
}

const TABS = [
  { id: "ventas", label: "Ventas" },
  { id: "inversion", label: "Inversión" },
  { id: "stats", label: "Estadísticas" },
  { id: "agenda", label: "Agenda" },
];

const PERIODS = [
  { id: "hoy", label: "Hoy", days: 1 },
  { id: "2d", label: "2 días", days: 2 },
  { id: "3d", label: "3 días", days: 3 },
  { id: "7d", label: "7 días", days: 7 },
  { id: "15d", label: "15 días", days: 15 },
  { id: "mes", label: "Este mes", days: null as number | null },
  { id: "todo", label: "Todo", days: 0 },
];

function cutoffFor(period: (typeof PERIODS)[number]): number | null {
  if (period.id === "todo") return null;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (period.id === "mes") {
    d.setDate(1);
  } else {
    d.setDate(d.getDate() - ((period.days as number) - 1));
  }
  return d.getTime();
}

// ─── PANTALLA DE LOGIN ──────────────────────────────────────────────────────
function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  const submit = () => {
    if (user.trim().toLowerCase() === MAMI_USER && pass === MAMI_PASS) {
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* silencioso */ }
      onSuccess();
    } else {
      setErr("Usuario o clave incorrectos.");
    }
  };

  return (
    <div style={{
      fontFamily: "'Poppins', system-ui, sans-serif",
      background: "linear-gradient(160deg,#fff5f8 0%,#ffeaf1 45%,#fde3ed 100%)",
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Playfair+Display:wght@700;800&display=swap');`}</style>
      <div style={{
        width: "100%", maxWidth: 340, background: "#fffdfe", borderRadius: 20, padding: "2rem 1.75rem",
        border: "1px solid #ffd8e6", boxShadow: "0 10px 30px rgba(214,51,108,0.12)", textAlign: "center",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%", margin: "0 auto 0.9rem",
          background: "linear-gradient(140deg,#ff8fb3,#e05485)", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 14px rgba(224,84,133,0.4)",
        }}><span style={{ fontSize: 24 }}>🧴</span></div>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 800, margin: "0 0 0.2rem", color: "#a3134f" }}>Mami</h1>
        <p style={{ fontSize: 11.5, color: "#b56e89", margin: "0 0 1.4rem" }}>Panel de ventas privado</p>
        <div style={{ textAlign: "left", marginBottom: "0.6rem" }}>
          <input placeholder="Usuario" value={user} onChange={e => setUser(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()}
            style={{ width: "100%", border: "1px solid #f4c2d6", borderRadius: 10, padding: "0.65rem 0.85rem", fontSize: 13.5, marginBottom: 8, color: "#5a2540" }} />
          <input placeholder="Clave" type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()}
            style={{ width: "100%", border: "1px solid #f4c2d6", borderRadius: 10, padding: "0.65rem 0.85rem", fontSize: 13.5, color: "#5a2540" }} />
        </div>
        {err && <p style={{ fontSize: 11.5, color: "#c2447a", background: "#fff0f5", borderRadius: 8, padding: "0.5rem 0.75rem", margin: "0 0 0.8rem" }}>{err}</p>}
        <button onClick={submit} style={{
          width: "100%", border: "none", borderRadius: 12, padding: "0.75rem", background: "linear-gradient(135deg,#ff8fb3,#e05485)",
          color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "0 6px 16px rgba(224,84,133,0.35)",
        }}>Entrar</button>
      </div>
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ───────────────────────────────────────────────────────
export default function MamiPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    try { setAuthed(sessionStorage.getItem(SESSION_KEY) === "1"); } catch { setAuthed(false); }
  }, []);

  if (authed === null) return null;
  if (!authed) return <LoginScreen onSuccess={() => setAuthed(true)} />;
  return <MamiPanel onLogout={() => { try { sessionStorage.removeItem(SESSION_KEY); } catch {} setAuthed(false); }} />;
}

function MamiPanel({ onLogout }: { onLogout: () => void }) {
  const [ready, setReady] = useState(false);
  const [syncErr, setSyncErr] = useState("");
  const [tab, setTab] = useState("ventas");
  const [rate, setRate] = useState(40);
  const [rateLoading, setRateLoading] = useState(false);
  const [sales, setSales] = useState<Sale[]>([]);
  const [invs, setInvs] = useState<Investment[]>([]);
  const [agenda, setAgenda] = useState<AgendaClient[]>([]);
  const [periodId, setPeriodId] = useState("hoy");

 // Carga inicial desde Firestore — así se ve lo mismo sin importar desde qué dispositivo inicie sesión
  useEffect(() => {
    (async () => {
      try {
        const [rawSales, rawInvs, rawAgenda] = await Promise.all([
          fsGetCollectionAll(COL.ventas),
          fsGetCollectionAll(COL.inv),
          fsGetCollectionAll(COL.agenda),
        ]);
        const s: Sale[] = rawSales.map(r => ({
          id: r.id, name: (r.name as string) || "", phone: (r.phone as string) || "",
          product: (r.product as string) || "", items: parseItems(r.items), amount: Number(r.amount) || 0,
          paymentMethod: (r.paymentMethod as string) || "efectivo",
          date: (r.date as string) || todayISO(), createdAt: Number(r.createdAt) || 0,
        })).sort((a, b) => b.createdAt - a.createdAt);
        const i: Investment[] = rawInvs.map(r => ({
          id: r.id, desc: (r.desc as string) || "", amount: Number(r.amount) || 0,
          category: (r.category as string) || "Otro",
          date: (r.date as string) || todayISO(), createdAt: Number(r.createdAt) || 0,
        })).sort((a, b) => b.createdAt - a.createdAt);
        const a: AgendaClient[] = rawAgenda.map(r => ({
          id: r.id, name: (r.name as string) || "", phone: (r.phone as string) || "",
          product: (r.product as string) || "", items: parseItems(r.items), amount: Number(r.amount) || 0,
          paidAmount: Number(r.paidAmount) || 0, paid: !!r.paid,
          paymentMethod: (r.paymentMethod as string) || "efectivo", notes: (r.notes as string) || "",
          createdAt: Number(r.createdAt) || 0,
        })).sort((x, y) => Number(x.paid) - Number(y.paid) || y.createdAt - x.createdAt);
        setSales(s); setInvs(i); setAgenda(a);
      } catch (e) {
        setSyncErr("No se pudo conectar con la base de datos. Verifica tu conexión e intenta de nuevo.");
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // Tasa BCV: se obtiene automáticamente (mismo endpoint /api/bcv que usa la tienda), con caché de 6 horas
  const fetchBcvRate = useCallback(async (force = false) => {
    if (!force) {
      try {
        const cached = localStorage.getItem(BCV_CACHE_KEY);
        const cachedTime = localStorage.getItem(BCV_CACHE_TIME);
        if (cached && cachedTime && Date.now() - Number(cachedTime) < BCV_TTL) {
          const parsed = parseFloat(cached);
          if (parsed > 0) { setRate(parsed); return; }
        }
      } catch { /* silencioso */ }
    }
    setRateLoading(true);
    try {
      const r = await fetch("/api/bcv");
      const d = await r.json();
      const parsed = parseFloat(d.rate ?? 0);
      if (parsed > 0) {
        setRate(parsed);
        try {
          localStorage.setItem(BCV_CACHE_KEY, String(parsed));
          localStorage.setItem(BCV_CACHE_TIME, String(Date.now()));
        } catch { /* silencioso */ }
        return;
      }
      throw new Error("sin tasa");
    } catch {
      try {
        const r2 = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
        const d2 = await r2.json();
        const parsed2 = parseFloat(d2.rates?.VES ?? 0);
        if (parsed2 > 0) {
          setRate(parsed2);
          try {
            localStorage.setItem(BCV_CACHE_KEY, String(parsed2));
            localStorage.setItem(BCV_CACHE_TIME, String(Date.now()));
          } catch { /* silencioso */ }
        }
      } catch { /* silencioso */ }
    } finally {
      setRateLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBcvRate();
    const interval = setInterval(() => fetchBcvRate(true), BCV_TTL);
    const onVisibility = () => { if (document.visibilityState === "visible") fetchBcvRate(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchBcvRate]);

  // ── Ventas ──
  const addSale = useCallback(async (data: Omit<Sale, "id" | "createdAt">) => {
    const createdAt = Date.now();
    const tempId = "tmp_" + createdAt;
    setSales(prev => [{ ...data, id: tempId, createdAt }, ...prev]);
    try {
      const realId = await fsAddToCollection(COL.ventas, { ...data, items: JSON.stringify(data.items), createdAt });
      setSales(prev => prev.map(s => s.id === tempId ? { ...s, id: realId } : s));
    } catch {
      setSales(prev => prev.filter(s => s.id !== tempId));
      setSyncErr("No se pudo guardar la venta. Intenta de nuevo.");
    }
  }, []);
  const removeSale = useCallback(async (id: string) => {
    setSales(prev => prev.filter(s => s.id !== id));
    try { await fsDeleteDoc(COL.ventas, id); } catch { setSyncErr("No se pudo eliminar la venta."); }
  }, []);

  // ── Inversiones ──
  const addInv = useCallback(async (data: Omit<Investment, "id" | "createdAt">) => {
    const createdAt = Date.now();
    const tempId = "tmp_" + createdAt;
    setInvs(prev => [{ ...data, id: tempId, createdAt }, ...prev]);
    try {
      const realId = await fsAddToCollection(COL.inv, { ...data, createdAt });
      setInvs(prev => prev.map(i => i.id === tempId ? { ...i, id: realId } : i));
    } catch {
      setInvs(prev => prev.filter(i => i.id !== tempId));
      setSyncErr("No se pudo guardar la inversión. Intenta de nuevo.");
    }
  }, []);
  const removeInv = useCallback(async (id: string) => {
    setInvs(prev => prev.filter(i => i.id !== id));
    try { await fsDeleteDoc(COL.inv, id); } catch { setSyncErr("No se pudo eliminar la inversión."); }
  }, []);

  // ── Agenda ──
  const addAgenda = useCallback(async (data: Omit<AgendaClient, "id" | "createdAt" | "paid" | "paidAmount">) => {
    const createdAt = Date.now();
    const tempId = "tmp_" + createdAt;
    const full: AgendaClient = { ...data, id: tempId, createdAt, paid: false, paidAmount: 0 };
    setAgenda(prev => [full, ...prev]);
    try {
      const realId = await fsAddToCollection(COL.agenda, { ...data, items: JSON.stringify(data.items), createdAt, paid: false, paidAmount: 0 });
      setAgenda(prev => prev.map(c => c.id === tempId ? { ...c, id: realId } : c));
    } catch {
      setAgenda(prev => prev.filter(c => c.id !== tempId));
      setSyncErr("No se pudo agendar al cliente. Intenta de nuevo.");
    }
  }, []);
  const removeAgenda = useCallback(async (id: string) => {
    setAgenda(prev => prev.filter(c => c.id !== id));
    try { await fsDeleteDoc(COL.agenda, id); } catch { setSyncErr("No se pudo eliminar de la agenda."); }
  }, []);
  const toggleAgendaPaid = useCallback(async (client: AgendaClient) => {
    const nextPaid = !client.paid;
    const nextPaidAmount = nextPaid ? client.amount : client.paidAmount;
    setAgenda(prev => prev.map(c => c.id === client.id ? { ...c, paid: nextPaid, paidAmount: nextPaidAmount } : c));
    try { await fsUpdateDoc(COL.agenda, client.id, { paid: nextPaid, paidAmount: nextPaidAmount }); }
    catch { setSyncErr("No se pudo actualizar el estado de pago."); }
  }, []);
  const abonarAgenda = useCallback(async (client: AgendaClient, monto: number) => {
    const nextPaidAmount = Math.min(client.amount, Math.max(0, (client.paidAmount || 0) + monto));
    const nextPaid = nextPaidAmount >= client.amount;
    setAgenda(prev => prev.map(c => c.id === client.id ? { ...c, paidAmount: nextPaidAmount, paid: nextPaid } : c));
    try { await fsUpdateDoc(COL.agenda, client.id, { paidAmount: nextPaidAmount, paid: nextPaid }); }
    catch { setSyncErr("No se pudo registrar el abono."); }
  }, []);

  const period = PERIODS.find(p => p.id === periodId)!;
  const cutoff = cutoffFor(period);
  const inRange = useCallback((dateStr: string) => {
    if (cutoff === null) return true;
    return new Date(dateStr + "T00:00:00").getTime() >= cutoff;
  }, [cutoff]);

  const statsSales = useMemo(() => sales.filter(s => inRange(s.date)), [sales, inRange]);
  const statsInvs = useMemo(() => invs.filter(i => inRange(i.date)), [invs, inRange]);
  const totalVentas = statsSales.reduce((a, s) => a + s.amount, 0);
  const totalInv = statsInvs.reduce((a, i) => a + i.amount, 0);
  const ganancia = totalVentas - totalInv;
  const pendientes = agenda.filter(c => !c.paid);
  const totalPendiente = pendientes.reduce((a, c) => a + Math.max(0, c.amount - (c.paidAmount || 0)), 0);

  if (!ready) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "system-ui", background: "linear-gradient(160deg,#fff5f8 0%,#ffeaf1 45%,#fde3ed 100%)",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 32, height: 32, border: "3px solid #ffd8e6", borderTopColor: "#e05485", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 0.75rem" }} />
          <p style={{ color: "#b23a5e", fontSize: 13 }}>Cargando panel…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "'Poppins', system-ui, sans-serif",
      background: "linear-gradient(160deg,#fff5f8 0%,#ffeaf1 45%,#fde3ed 100%)",
      minHeight: "100vh", padding: "1.25rem 0.9rem 3rem", color: "#5a2540",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Playfair+Display:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        input, textarea { font-family: inherit; }
        input:focus, textarea:focus { outline: 2px solid #f4a6c1; outline-offset: 1px; }
        button { font-family: inherit; }
      `}</style>

      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 12, marginBottom: "1.1rem",
          background: "linear-gradient(135deg,#ffffffaa,#ffe0ec99)", borderRadius: 20,
          padding: "1rem 1.1rem", border: "1px solid #ffd3e2", boxShadow: "0 6px 20px rgba(214,51,108,0.08)",
        }}>
          <div style={{
            width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(140deg,#ff8fb3,#e05485)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            boxShadow: "0 4px 14px rgba(224,84,133,0.4)",
          }}><span style={{ fontSize: 20 }}>🧴</span></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 19, fontWeight: 800, margin: 0, color: "#a3134f", letterSpacing: 0.3 }}>Mami</h1>
            <p style={{ margin: 0, fontSize: 11, color: "#b56e89" }}>Ventas de productos de limpieza</p>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: 9, color: "#c288a0", fontWeight: 600 }}>TASA BCV BS/$</p>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#a3134f" }}>{rateLoading ? "…" : rate.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <button onClick={() => fetchBcvRate(true)} disabled={rateLoading} title="Actualizar tasa" style={{ background: "none", border: "none", cursor: rateLoading ? "not-allowed" : "pointer", padding: 2, color: "#c2447a", fontSize: 12, opacity: rateLoading ? 0.5 : 1 }}>↻</button>
            </div>
          </div>
        </div>

        {syncErr && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff0f0", border: "1px solid #f4b8b8", borderRadius: 12, padding: "0.6rem 0.85rem", marginBottom: "0.9rem" }}>
            <p style={{ margin: 0, fontSize: 11.5, color: "#c23838", flex: 1 }}>{syncErr}</p>
            <button onClick={() => setSyncErr("")} style={{ background: "none", border: "none", color: "#c23838", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>✕</button>
          </div>
        )}

        <div style={{ display: "flex", gap: 6, marginBottom: "1.1rem", background: "#ffffff8a", borderRadius: 16, padding: 5, border: "1px solid #ffd8e6" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: "0.55rem 0.3rem", borderRadius: 12, border: "none", cursor: "pointer",
              fontSize: 11.5, fontWeight: 700, letterSpacing: 0.2,
              background: tab === t.id ? "linear-gradient(135deg,#ff8fb3,#e05485)" : "transparent",
              color: tab === t.id ? "#fff" : "#b56e89",
              boxShadow: tab === t.id ? "0 4px 12px rgba(224,84,133,0.35)" : "none",
              transition: "all 0.15s",
            }}>{t.label}</button>
          ))}
        </div>

        {tab === "ventas" && <VentasTab sales={sales} addSale={addSale} removeSale={removeSale} rate={rate} />}
        {tab === "inversion" && <InversionTab invs={invs} addInv={addInv} removeInv={removeInv} />}
        {tab === "stats" && (
          <StatsTab periodId={periodId} setPeriodId={setPeriodId} totalVentas={totalVentas} totalInv={totalInv}
            ganancia={ganancia} statsSales={statsSales} rate={rate} totalPendiente={totalPendiente} pendientesCount={pendientes.length} />
        )}
        {tab === "agenda" && <AgendaTab agenda={agenda} addAgenda={addAgenda} removeAgenda={removeAgenda} togglePaid={toggleAgendaPaid} abonar={abonarAgenda} rate={rate} />}

        <button onClick={onLogout} style={{
          width: "100%", marginTop: "0.5rem", background: "transparent", border: "1px solid #f4c2d6", color: "#c2447a",
          borderRadius: 10, padding: "0.65rem", fontSize: 11.5, fontWeight: 700, cursor: "pointer",
        }}>Cerrar sesión</button>
      </div>
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "#fffdfe", border: "1px solid #ffd8e6", borderRadius: 16, padding: "1rem 1.1rem",
      marginBottom: "0.85rem", boxShadow: "0 4px 14px rgba(214,51,108,0.06)", ...style,
    }}>{children}</div>
  );
}

function Field({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "0.6rem" }}>
      {label && <p style={{ margin: "0 0 4px", fontSize: 10.5, fontWeight: 700, color: "#c288a0", letterSpacing: 0.3 }}>{label}</p>}
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", border: "1px solid #f4c2d6", borderRadius: 10, padding: "0.6rem 0.75rem",
  fontSize: 13.5, color: "#5a2540", background: "#fffafc",
};

function PrimaryBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", border: "none", borderRadius: 12, padding: "0.75rem",
      background: disabled ? "#f5c6d7" : "linear-gradient(135deg,#ff8fb3,#e05485)",
      color: "#fff", fontWeight: 700, fontSize: 13, letterSpacing: 0.3,
      cursor: disabled ? "not-allowed" : "pointer", boxShadow: disabled ? "none" : "0 6px 16px rgba(224,84,133,0.35)",
    }}>{children}</button>
  );
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: "#fff0f5", border: "1px solid #f4b8cf", color: "#c2447a", borderRadius: 8, width: 26, height: 26,
      cursor: "pointer", fontSize: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
    }}>✕</button>
  );
}

function VentasTab({ sales, addSale, removeSale, rate }: {
  sales: Sale[]; addSale: (d: Omit<Sale, "id" | "createdAt">) => void; removeSale: (id: string) => void; rate: number;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [date, setDate] = useState(todayISO());
  const [items, setItems] = useState<SaleItem[]>([]);
  const [err, setErr] = useState("");

  const toggleCategory = (cat: string) => {
    setItems(prev => prev.some(it => it.category === cat)
      ? prev.filter(it => it.category !== cat)
      : [...prev, { category: cat, liters: 1, value: 0 }]);
  };
  const updateItem = (cat: string, field: "liters" | "value", value: number) => {
    setItems(prev => prev.map(it => it.category === cat ? { ...it, [field]: value } : it));
  };
  const totalAmount = items.reduce((a, it) => a + (Number(it.value) || 0), 0);

  const add = () => {
    if (!name.trim() || items.length === 0 || totalAmount <= 0) { setErr("Completa el cliente, selecciona al menos un producto y su valor."); return; }
    const product = items.map(it => `${it.category} (${it.liters}L)`).join(", ");
    addSale({ name: name.trim(), phone: phone.trim(), product, items, amount: totalAmount, paymentMethod, date });
    setName(""); setPhone(""); setItems([]); setPaymentMethod("efectivo"); setErr("");
  };

  const grouped = useMemo(() => {
    const map: Record<string, Sale[]> = {};
    [...sales].sort((a, b) => b.createdAt - a.createdAt).forEach(s => { (map[s.date] = map[s.date] || []).push(s); });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [sales]);

  return (
    <>
      <Card>
        <p style={{ margin: "0 0 0.75rem", fontSize: 13, fontWeight: 700, color: "#a3134f" }}>Registrar venta del día</p>
        <Field label="Cliente"><input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del cliente" /></Field>
        <Field label="Teléfono"><input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} placeholder="Teléfono (opcional)" /></Field>
        <Field label="Productos que se llevó">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {PRODUCT_CATEGORIES.map(cat => (
              <button key={cat} type="button" onClick={() => toggleCategory(cat)} style={{
                border: "1px solid " + (items.some(it => it.category === cat) ? "transparent" : "#f4c2d6"),
                background: items.some(it => it.category === cat) ? "linear-gradient(135deg,#ff8fb3,#e05485)" : "#fff",
                color: items.some(it => it.category === cat) ? "#fff" : "#b56e89",
                borderRadius: 16, padding: "0.35rem 0.75rem", fontSize: 11.5, fontWeight: 700, cursor: "pointer",
              }}>{cat}</button>
            ))}
          </div>
        </Field>
        {items.map(it => (
          <div key={it.category} style={{ marginBottom: "0.5rem" }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#5a2540" }}>{it.category}</p>
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Field label="Litros"><input style={inputStyle} type="number" min={0} step={0.5} value={it.liters} onChange={e => updateItem(it.category, "liters", parseFloat(e.target.value) || 0)} /></Field>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Field label="Valor (USD)"><input style={inputStyle} type="number" min={0} step={0.01} value={it.value} onChange={e => updateItem(it.category, "value", parseFloat(e.target.value) || 0)} /></Field>
              </div>
            </div>
          </div>
        ))}
        <Field label="Método de pago">
          <select style={inputStyle} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
            {PAYMENT_METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </Field>
        <Field label="Fecha"><input style={inputStyle} type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
        {totalAmount > 0 && <p style={{ margin: "0 0 0.6rem", fontSize: 11.5, color: "#c2447a" }}>Total: {fmtUSD(totalAmount)} ≈ {fmtBs(totalAmount * rate)}</p>}
        {err && <p style={{ margin: "0 0 0.6rem", fontSize: 11.5, color: "#c2447a", background: "#fff0f5", padding: "0.5rem 0.75rem", borderRadius: 8 }}>{err}</p>}
        <PrimaryBtn onClick={add}>Registrar venta</PrimaryBtn>
      </Card>

      {grouped.length === 0 ? (
        <p style={{ textAlign: "center", color: "#c9a3b6", fontSize: 12.5, padding: "1.5rem 0" }}>Aún no hay ventas registradas</p>
      ) : grouped.map(([d, dayItems]) => (
        <div key={d} style={{ marginBottom: "0.9rem" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#c288a0", margin: "0 0 0.4rem 0.2rem" }}>
            {fmtDate(d)} · {fmtUSD(dayItems.reduce((a, s) => a + s.amount, 0))}
          </p>
          {dayItems.map(s => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fffdfe", border: "1px solid #ffe0ec", borderRadius: 12, padding: "0.6rem 0.8rem", marginBottom: 6 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: "0 0 2px", fontSize: 12.5, fontWeight: 700, color: "#5a2540" }}>{s.name}{s.phone ? ` · ${s.phone}` : ""}</p>
                <p style={{ margin: 0, fontSize: 11, color: "#b56e89" }}>{s.product}</p>
                <p style={{ margin: 0, fontSize: 10, color: "#c9a3b6" }}>{PAYMENT_METHODS.find(m => m.id === s.paymentMethod)?.label || s.paymentMethod}</p>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#e05485" }}>{fmtUSD(s.amount)}</p>
                <p style={{ margin: 0, fontSize: 10, color: "#c9a3b6" }}>{fmtBs(s.amount * rate)}</p>
              </div>
              <DeleteBtn onClick={() => removeSale(s.id)} />
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

function InversionTab({ invs, addInv, removeInv }: {
  invs: Investment[]; addInv: (d: Omit<Investment, "id" | "createdAt">) => void; removeInv: (id: string) => void;
}) {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(INV_CATEGORIES[0]);
  const [date, setDate] = useState(todayISO());
  const [err, setErr] = useState("");

  const add = () => {
    const amt = parseFloat(amount);
    if (!desc.trim() || !amt || amt <= 0) { setErr("Indica en qué se invirtió y un monto válido."); return; }
    addInv({ desc: desc.trim(), amount: amt, category, date });
    setDesc(""); setAmount(""); setCategory(INV_CATEGORIES[0]); setErr("");
  };
  const sorted = useMemo(() => [...invs].sort((a, b) => b.createdAt - a.createdAt), [invs]);
  const totalMes = useMemo(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0);
    return invs.filter(i => new Date(i.date + "T00:00:00").getTime() >= d.getTime()).reduce((a, i) => a + i.amount, 0);
  }, [invs]);

  return (
    <>
      <Card style={{ background: "linear-gradient(135deg,#fff0f6,#ffe4ee)", border: "1px solid #f4b8cf" }}>
        <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, color: "#c2447a", letterSpacing: 0.3 }}>INVERTIDO ESTE MES</p>
        <p style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 800, color: "#a3134f" }}>{fmtUSD(totalMes)}</p>
      </Card>

      <Card>
        <p style={{ margin: "0 0 0.75rem", fontSize: 13, fontWeight: 700, color: "#a3134f" }}>Registrar inversión</p>
        <Field label="¿En qué se invirtió?"><input style={inputStyle} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ej: Compra de mercancía / envases / delivery" /></Field>
        <Field label="Categoría">
          <select style={inputStyle} value={category} onChange={e => setCategory(e.target.value)}>
            {INV_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <Field label="Monto (USD)"><input style={inputStyle} type="number" min={0} step={0.01} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" /></Field>
          <Field label="Fecha"><input style={inputStyle} type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
        </div>
        {err && <p style={{ margin: "0 0 0.6rem", fontSize: 11.5, color: "#c2447a", background: "#fff0f5", padding: "0.5rem 0.75rem", borderRadius: 8 }}>{err}</p>}
        <PrimaryBtn onClick={add}>Registrar inversión</PrimaryBtn>
      </Card>

      {sorted.length === 0 ? (
        <p style={{ textAlign: "center", color: "#c9a3b6", fontSize: 12.5, padding: "1rem 0" }}>Aún no has registrado inversiones</p>
      ) : sorted.map(i => (
        <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fffdfe", border: "1px solid #ffe0ec", borderRadius: 12, padding: "0.6rem 0.8rem", marginBottom: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: "0 0 2px", fontSize: 12.5, fontWeight: 700, color: "#5a2540" }}>{i.desc}</p>
            <p style={{ margin: 0, fontSize: 10.5, color: "#c9a3b6" }}>{i.category} · {fmtDate(i.date)}</p>
          </div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#a3134f", flexShrink: 0 }}>-{fmtUSD(i.amount)}</p>
          <DeleteBtn onClick={() => removeInv(i.id)} />
        </div>
      ))}
    </>
  );
}

function StatsTab({ periodId, setPeriodId, totalVentas, totalInv, ganancia, statsSales, rate, totalPendiente, pendientesCount }: {
  periodId: string; setPeriodId: (id: string) => void; totalVentas: number; totalInv: number; ganancia: number;
  statsSales: Sale[]; rate: number; totalPendiente: number; pendientesCount: number;
}) {
  return (
    <>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: "0.9rem", paddingBottom: 2 }}>
        {PERIODS.map(p => (
          <button key={p.id} onClick={() => setPeriodId(p.id)} style={{
            flexShrink: 0, border: "1px solid " + (periodId === p.id ? "transparent" : "#f4c2d6"),
            background: periodId === p.id ? "linear-gradient(135deg,#ff8fb3,#e05485)" : "#fff",
            color: periodId === p.id ? "#fff" : "#b56e89", borderRadius: 20, padding: "0.4rem 0.9rem",
            fontSize: 11.5, fontWeight: 700, cursor: "pointer",
          }}>{p.label}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: "0.9rem" }}>
        <Card style={{ margin: 0 }}>
          <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: "#c288a0" }}>VENTAS</p>
          <p style={{ margin: "3px 0 0", fontSize: 18, fontWeight: 800, color: "#e05485" }}>{fmtUSD(totalVentas)}</p>
        </Card>
        <Card style={{ margin: 0 }}>
          <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: "#c288a0" }}>INVERSIÓN</p>
          <p style={{ margin: "3px 0 0", fontSize: 18, fontWeight: 800, color: "#a3134f" }}>{fmtUSD(totalInv)}</p>
        </Card>
      </div>

      <Card style={{ background: ganancia >= 0 ? "linear-gradient(135deg,#fff0f6,#ffd9e8)" : "linear-gradient(135deg,#fff0f0,#ffd6d6)", border: "1px solid " + (ganancia >= 0 ? "#f4b8cf" : "#f4b8b8") }}>
        <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, color: "#a3134f", letterSpacing: 0.3 }}>GANANCIA NETA</p>
        <p style={{ margin: "3px 0 0", fontSize: 26, fontWeight: 800, color: ganancia >= 0 ? "#a3134f" : "#c23838" }}>{fmtUSD(ganancia)}</p>
        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#c2447a" }}>≈ {fmtBs(ganancia * rate)}</p>
      </Card>

      <Card>
        <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, color: "#c288a0" }}>PENDIENTE POR COBRAR (AGENDA)</p>
        <p style={{ margin: "3px 0 0", fontSize: 18, fontWeight: 800, color: "#e0a13a" }}>{fmtUSD(totalPendiente)}</p>
        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#c9a3b6" }}>{pendientesCount} cliente(s) con pago pendiente</p>
      </Card>

      <Card>
        <p style={{ margin: "0 0 0.6rem", fontSize: 12, fontWeight: 700, color: "#a3134f" }}>Ventas en este período ({statsSales.length})</p>
        {statsSales.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12, color: "#c9a3b6" }}>No hay ventas en este período</p>
        ) : (
          [...statsSales].sort((a, b) => b.createdAt - a.createdAt).slice(0, 20).map(s => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid #ffeaf1" }}>
              <span style={{ fontSize: 11.5, color: "#5a2540" }}>{s.name} · {fmtDate(s.date)}</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#e05485" }}>{fmtUSD(s.amount)}</span>
            </div>
          ))
        )}
      </Card>
    </>
  );
}

function AgendaTab({ agenda, addAgenda, removeAgenda, togglePaid, abonar, rate }: {
  agenda: AgendaClient[];
  addAgenda: (d: Omit<AgendaClient, "id" | "createdAt" | "paid" | "paidAmount">) => void;
  removeAgenda: (id: string) => void;
  togglePaid: (client: AgendaClient) => void;
  abonar: (client: AgendaClient, monto: number) => void;
  rate: number;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<SaleItem[]>([]);
  const [err, setErr] = useState("");
  const [abonoInputs, setAbonoInputs] = useState<Record<string, string>>({});

  const toggleCategory = (cat: string) => {
    setItems(prev => prev.some(it => it.category === cat)
      ? prev.filter(it => it.category !== cat)
      : [...prev, { category: cat, liters: 1, value: 0 }]);
  };
  const updateItem = (cat: string, field: "liters" | "value", value: number) => {
    setItems(prev => prev.map(it => it.category === cat ? { ...it, [field]: value } : it));
  };
  const totalAmount = items.reduce((a, it) => a + (Number(it.value) || 0), 0);

  const add = () => {
    if (!name.trim() || items.length === 0 || totalAmount <= 0) { setErr("Ingresa el cliente, selecciona al menos un producto y su valor."); return; }
    const product = items.map(it => `${it.category} (${it.liters}L)`).join(", ");
    addAgenda({ name: name.trim(), phone: phone.trim(), product, items, amount: totalAmount, paymentMethod, notes: notes.trim() });
    setName(""); setPhone(""); setItems([]); setPaymentMethod("efectivo"); setNotes(""); setErr("");
  };

  const sorted = useMemo(() => [...agenda].sort((a, b) => Number(a.paid) - Number(b.paid) || b.createdAt - a.createdAt), [agenda]);

  const doAbono = (client: AgendaClient) => {
    const monto = parseFloat(abonoInputs[client.id] || "");
    if (!monto || monto <= 0) return;
    abonar(client, monto);
    setAbonoInputs(prev => ({ ...prev, [client.id]: "" }));
  };

  return (
    <>
      <Card>
        <p style={{ margin: "0 0 0.75rem", fontSize: 13, fontWeight: 700, color: "#a3134f" }}>Agendar cliente pendiente</p>
        <Field label="Cliente"><input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del cliente" /></Field>
        <Field label="Teléfono"><input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} placeholder="Teléfono (opcional)" /></Field>
        <Field label="Productos que se llevó">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {PRODUCT_CATEGORIES.map(cat => (
              <button key={cat} type="button" onClick={() => toggleCategory(cat)} style={{
                border: "1px solid " + (items.some(it => it.category === cat) ? "transparent" : "#f4c2d6"),
                background: items.some(it => it.category === cat) ? "linear-gradient(135deg,#ff8fb3,#e05485)" : "#fff",
                color: items.some(it => it.category === cat) ? "#fff" : "#b56e89",
                borderRadius: 16, padding: "0.35rem 0.75rem", fontSize: 11.5, fontWeight: 700, cursor: "pointer",
              }}>{cat}</button>
            ))}
          </div>
        </Field>
        {items.map(it => (
          <div key={it.category} style={{ marginBottom: "0.5rem" }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#5a2540" }}>{it.category}</p>
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Field label="Litros"><input style={inputStyle} type="number" min={0} step={0.5} value={it.liters} onChange={e => updateItem(it.category, "liters", parseFloat(e.target.value) || 0)} /></Field>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Field label="Valor (USD)"><input style={inputStyle} type="number" min={0} step={0.01} value={it.value} onChange={e => updateItem(it.category, "value", parseFloat(e.target.value) || 0)} /></Field>
              </div>
            </div>
          </div>
        ))}  
        <Field label="Método de pago (al cancelar)">
          <select style={inputStyle} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
            {PAYMENT_METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </Field>
        <Field label="Notas (opcional)"><textarea style={{ ...inputStyle, resize: "vertical", minHeight: 50 }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: promete pagar el viernes" /></Field>
        {totalAmount > 0 && <p style={{ margin: "0 0 0.6rem", fontSize: 11.5, color: "#c2447a" }}>Debe: {fmtUSD(totalAmount)} ≈ {fmtBs(totalAmount * rate)}</p>}
        {err && <p style={{ margin: "0 0 0.6rem", fontSize: 11.5, color: "#c2447a", background: "#fff0f5", padding: "0.5rem 0.75rem", borderRadius: 8 }}>{err}</p>}
        <PrimaryBtn onClick={add}>Agendar cliente</PrimaryBtn>
      </Card>

      {sorted.length === 0 ? (
        <p style={{ textAlign: "center", color: "#c9a3b6", fontSize: 12.5, padding: "1rem 0" }}>No hay clientes pendientes agendados</p>
      ) : sorted.map(c => {
        const restante = Math.max(0, c.amount - (c.paidAmount || 0));
        return (
        <div key={c.id} style={{
          background: c.paid ? "#f7fff2" : "#fffdfe", border: "1px solid " + (c.paid ? "#cdeeb8" : "#ffe0ec"),
          borderRadius: 14, padding: "0.75rem 0.9rem", marginBottom: 8,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: "0 0 2px", fontSize: 12.5, fontWeight: 700, color: "#5a2540" }}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</p>
              {c.product && <p style={{ margin: "0 0 3px", fontSize: 11, color: "#b56e89" }}>{c.product}</p>}
              {c.notes && <p style={{ margin: "0 0 3px", fontSize: 10.5, color: "#c9a3b6", fontStyle: "italic" }}>{c.notes}</p>}
              <p style={{ margin: 0, fontSize: 9.5, color: "#c9a3b6" }}>Agendado {fmtDate(new Date(c.createdAt).toISOString().slice(0, 10))}</p>
              {!c.paid && (c.paidAmount || 0) > 0 && <p style={{ margin: "2px 0 0", fontSize: 10.5, fontWeight: 700, color: "#5a9a3e" }}>Abonado: {fmtUSD(c.paidAmount)} · Resta: {fmtUSD(restante)}</p>}
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: c.paid ? "#5a9a3e" : "#e0a13a" }}>{fmtUSD(c.amount)}</p>
              <p style={{ margin: 0, fontSize: 10, color: "#c9a3b6" }}>{fmtBs(c.amount * rate)}</p>
            </div>
          </div>
          {!c.paid && (
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <input style={{ ...inputStyle, flex: 1 }} type="number" min={0} step={0.01} placeholder="Monto a abonar (USD)"
                value={abonoInputs[c.id] || ""} onChange={e => setAbonoInputs(prev => ({ ...prev, [c.id]: e.target.value }))} />
              <button onClick={() => doAbono(c)} style={{
                border: "1px solid #f4c2d6", borderRadius: 9, background: "#fff0f5", color: "#c2447a",
                fontSize: 11, fontWeight: 700, padding: "0 0.75rem", cursor: "pointer",
              }}>Abonar</button>
            </div>
          )}
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button onClick={() => togglePaid(c)} style={{
              flex: 1, border: "1px solid " + (c.paid ? "#a9d98f" : "#f4c2d6"), borderRadius: 9,
              background: c.paid ? "#e9f7de" : "#fff0f5", color: c.paid ? "#4a7a30" : "#c2447a",
              fontSize: 11, fontWeight: 700, padding: "0.4rem", cursor: "pointer",
            }}>{c.paid ? "✓ Pagado" : "Marcar como pagado por completo"}</button>
            <DeleteBtn onClick={() => removeAgenda(c.id)} />
          </div>
        </div>
      );})}
    </>
  );
}