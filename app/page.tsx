"use client";

import { useState } from "react";

// ─── TIPOS ───────────────────────────────────────────────────────────────────
interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  img: string;
}

interface CartItem {
  product: Product;
  qty: number;
}

// ─── DATOS ───────────────────────────────────────────────────────────────────
const CATEGORIES = ["TODO", "RELOJES", "COLLARES", "LENTES", "BILLETERAS", "PULSERAS", "ANILLOS", "ARETES", "SOMBREROS"];

const PRODUCTS: Product[] = [
  { id: 1,  name: "Megir NF56",             category: "RELOJES",    price: 40, img: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&q=80" },
  { id: 2,  name: "Navigorce NF65",         category: "RELOJES",    price: 40, img: "https://images.unsplash.com/photo-1548171916-c8fd28f7f356?w=400&q=80" },
  { id: 3,  name: "Collar de Cruz",         category: "COLLARES",   price: 25, img: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80" },
  { id: 4,  name: "Cadena Eslabón",         category: "COLLARES",   price: 22, img: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&q=80" },
  { id: 5,  name: "Lentes Aviador",         category: "LENTES",     price: 18, img: "https://images.unsplash.com/photo-1577803645773-f96470509666?w=400&q=80" },
  { id: 6,  name: "Lentes Cuadrados",       category: "LENTES",     price: 20, img: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&q=80" },
  { id: 7,  name: "Billetera Cuero",        category: "BILLETERAS", price: 30, img: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&q=80" },
  { id: 8,  name: "Tarjetero Minimalista",  category: "BILLETERAS", price: 20, img: "https://images.unsplash.com/photo-1556742031-c6961e8560b0?w=400&q=80" },
  { id: 9,  name: "Pulsera Trenzada",       category: "PULSERAS",   price: 15, img: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=400&q=80" },
  { id: 10, name: "Pulsera Eslabón",        category: "PULSERAS",   price: 18, img: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&q=80" },
  { id: 11, name: "Anillo Liso",            category: "ANILLOS",    price: 12, img: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&q=80" },
  { id: 12, name: "Anillo Grabado",         category: "ANILLOS",    price: 15, img: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&q=80" },
  { id: 13, name: "Aretes Argolla",         category: "ARETES",     price: 10, img: "https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=400&q=80" },
  { id: 14, name: "Sombrero Fedora",        category: "SOMBREROS",  price: 35, img: "https://images.unsplash.com/photo-1521369909029-2afed882baee?w=400&q=80" },
];

// ─── CONTACTO Y REDES ────────────────────────────────────────────────────────
const WHATSAPP_NUMBER = "584243005733";
const SOCIAL = {
  whatsapp:  `https://wa.me/${WHATSAPP_NUMBER}`,
  instagram: "https://www.instagram.com/fokus_accesorios?igsh=eGNiNHZmczUwY3Np",
  facebook:  "https://www.facebook.com/share/14d2kQuHQ3y/?mibextid=wwXIfr",
  tiktok:    "https://www.tiktok.com/@fokus_accesorios?_r=1&_t=ZS-95NNWYzuIxV",
};

// ─── ÍCONOS SVG ──────────────────────────────────────────────────────────────
const IconWhatsApp = ({ size = 22, color = "#fff" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const IconInstagram = ({ size = 22, color = "#fff" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);

const IconFacebook = ({ size = 22, color = "#fff" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const IconTikTok = ({ size = 22, color = "#fff" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
  </svg>
);

// Logo de Fokus (SVG inline del icono de cruz)
const FokusLogo = ({ size = 28 }: { size?: number }) => (
  <img
    src="/favicon.png"
    alt="Fokus logo"
    width={size}
    height={size}
    style={{ objectFit: "contain", display: "block" }}
  />
);

// ─── ESTILOS BASE ─────────────────────────────────────────────────────────────
const iconBtn: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: 6,
};

const darkBtn: React.CSSProperties = {
  background: "#111", color: "#fff", border: "none",
  padding: "0.85rem 1.5rem", fontSize: 12, fontWeight: 700,
  letterSpacing: 1.5, cursor: "pointer", fontFamily: "inherit",
  display: "inline-flex", alignItems: "center", gap: "0.5rem",
};

const qtyBtn: React.CSSProperties = {
  background: "none", border: "none", width: 36, height: 36,
  fontSize: 20, cursor: "pointer", fontFamily: "inherit",
  display: "flex", alignItems: "center", justifyContent: "center",
};

const socialLink: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center",
  width: 38, height: 38, borderRadius: "50%",
  background: "#222", textDecoration: "none", transition: "background 0.2s",
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function Home() {
  const [activeCategory, setActiveCategory] = useState("TODO");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalQty, setModalQty] = useState(1);
  const [view, setView] = useState<"shop" | "cart">("shop");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const categoriesToShow =
    activeCategory === "TODO"
      ? CATEGORIES.filter((c) => c !== "TODO")
      : [activeCategory];

  const getProducts = (cat: string) =>
    PRODUCTS.filter((p) => {
      const matchCat = p.category === cat;
      const matchSearch = searchQuery === "" || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });

  const totalItems = cart.reduce((s, i) => s + i.qty, 0);
  const totalPrice = cart.reduce((s, i) => s + i.product.price * i.qty, 0);

  const addToCart = (product: Product, qty: number) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, qty: i.qty + qty } : i);
      return [...prev, { product, qty }];
    });
    setSelectedProduct(null);
  };

  const updateCartQty = (id: number, delta: number) => {
    setCart((prev) => prev.map((i) => i.product.id === id ? { ...i, qty: i.qty + delta } : i).filter((i) => i.qty > 0));
  };

  const buildWhatsAppMsg = () => {
    const lines = cart.map((i) => `• ${i.product.name} x${i.qty} — $${(i.product.price * i.qty).toFixed(2)}`);
    const msg = `Hola! Quiero hacer un pedido:\n\n${lines.join("\n")}\n\nTotal: $${totalPrice.toFixed(2)}`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", background: "#fff", minHeight: "100vh", color: "#111" }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
        background: "#111", color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 1rem", height: 56,
      }}>
        {/* Hamburger */}
        <button onClick={() => setMenuOpen(true)} style={iconBtn}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        {/* Logo + Nombre */}
        <button
          onClick={() => { setView("shop"); setActiveCategory("TODO"); }}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
        >
          <FokusLogo size={30} />
          <span style={{ color: "#fff", fontSize: 18, fontWeight: 900, letterSpacing: 4 }}>FOKUS</span>
        </button>

        {/* Íconos derecha */}
        <div style={{ display: "flex", gap: 2 }}>
          <button onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(""); }} style={iconBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
          </button>
          <button onClick={() => setView("cart")} style={{ ...iconBtn, position: "relative" as const }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            {totalItems > 0 && (
              <span style={{
                position: "absolute", top: 2, right: 2,
                background: "#fff", color: "#111", borderRadius: "50%",
                width: 16, height: 16, fontSize: 9, fontWeight: 900,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{totalItems}</span>
            )}
          </button>
        </div>
      </nav>

      {/* ── BÚSQUEDA ── */}
      {searchOpen && (
        <div style={{ position: "fixed", top: 56, left: 0, right: 0, zIndex: 190, background: "#fff", borderBottom: "1px solid #ddd", padding: "0.75rem 1rem" }}>
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar productos..."
            style={{ width: "100%", border: "1px solid #111", padding: "0.6rem 1rem", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const }}
          />
        </div>
      )}

      {/* ── MENÚ LATERAL ── */}
      {menuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex" }}>
          {/* Overlay */}
          <div onClick={() => setMenuOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
          {/* Panel */}
          <div style={{ position: "relative", background: "#fff", width: 280, height: "100%", padding: "2rem 1.5rem", overflowY: "auto" as const, display: "flex", flexDirection: "column" as const }}>
            {/* Cabecera menú */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
              <span style={{ fontWeight: 900, fontSize: 15, letterSpacing: 2 }}>CATEGORÍAS</span>
              <button onClick={() => setMenuOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#111" }}>✕</button>
            </div>

            {/* Categorías */}
            {CATEGORIES.filter(c => c !== "TODO").map((cat) => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setMenuOpen(false); setView("shop"); }}
                style={{
                  display: "block", width: "100%", background: "none", border: "none",
                  borderBottom: "1px solid #eee", padding: "1rem 0", textAlign: "left",
                  fontSize: 15, cursor: "pointer", fontFamily: "inherit", color: "#111",
                }}
              >
                {cat.charAt(0) + cat.slice(1).toLowerCase()}
              </button>
            ))}

            {/* Redes sociales */}
            <div style={{ marginTop: "2rem" }}>
              <p style={{ fontSize: 10, letterSpacing: 2, color: "#aaa", marginBottom: "1rem", fontWeight: 700 }}>REDES SOCIALES</p>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" as const }}>
                <a href={SOCIAL.whatsapp} target="_blank" rel="noreferrer" style={socialLink} title="WhatsApp">
                  <IconWhatsApp size={18} color="#fff" />
                </a>
                <a href={SOCIAL.instagram} target="_blank" rel="noreferrer" style={socialLink} title="Instagram">
                  <IconInstagram size={18} color="#fff" />
                </a>
                <a href={SOCIAL.facebook} target="_blank" rel="noreferrer" style={socialLink} title="Facebook">
                  <IconFacebook size={18} color="#fff" />
                </a>
                <a href={SOCIAL.tiktok} target="_blank" rel="noreferrer" style={socialLink} title="TikTok">
                  <IconTikTok size={18} color="#fff" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TIENDA ── */}
      {view === "shop" && (
        <main style={{ paddingTop: searchOpen ? 112 : 56 }}>
          {/* Filtros horizontales */}
          <div style={{
            position: "sticky", top: 56, zIndex: 100, background: "#fff",
            borderBottom: "1px solid #ddd", overflowX: "auto", display: "flex",
            scrollbarWidth: "none" as const,
          }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  background: "none", border: "none",
                  borderBottom: activeCategory === cat ? "2px solid #111" : "2px solid transparent",
                  padding: "0.85rem 1rem", fontSize: 11, fontWeight: 700,
                  letterSpacing: 1.5, cursor: "pointer", whiteSpace: "nowrap" as const,
                  color: activeCategory === cat ? "#111" : "#aaa",
                  fontFamily: "inherit", flexShrink: 0, transition: "all 0.15s",
                }}
              >{cat}</button>
            ))}
          </div>

          {/* Productos */}
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "1.5rem 1rem 4rem" }}>
            {categoriesToShow.map((cat) => {
              const prods = getProducts(cat);
              if (prods.length === 0) return null;
              return (
                <div key={cat} style={{ marginBottom: "3rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid #eee", paddingBottom: "0.6rem" }}>
                    <h2 style={{ fontSize: 17, fontWeight: 900, letterSpacing: 2, margin: 0 }}>{cat}</h2>
                    <button onClick={() => setActiveCategory(cat)} style={{ background: "none", border: "none", fontSize: 13, color: "#aaa", cursor: "pointer", fontFamily: "inherit" }}>
                      Ver solo esta categoría
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "1rem" }}>
                    {prods.map((product) => (
                      <div key={product.id} onClick={() => { setSelectedProduct(product); setModalQty(1); }} style={{ cursor: "pointer" }}>
                        <div style={{ background: "#f5f5f5", aspectRatio: "1", overflow: "hidden", marginBottom: "0.5rem" }}>
                          <img
                            src={product.img}
                            alt={product.name}
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.3s" }}
                            onMouseOver={e => (e.currentTarget.style.transform = "scale(1.05)")}
                            onMouseOut={e => (e.currentTarget.style.transform = "scale(1)")}
                          />
                        </div>
                        <p style={{ margin: "0 0 3px", fontSize: 13 }}>{product.name}</p>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>${product.price.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* ── CARRITO ── */}
      {view === "cart" && (
        <main style={{ paddingTop: 56 }}>
          <div style={{ maxWidth: 700, margin: "0 auto", padding: "2rem 1rem 4rem" }}>
            <h1 style={{ fontSize: 20, fontWeight: 900, letterSpacing: 2, marginBottom: "1.5rem" }}>CARRITO DE COMPRAS</h1>

            {cart.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 0", color: "#999" }}>
                <p style={{ marginBottom: "1.5rem" }}>Tu carrito está vacío</p>
                <button onClick={() => setView("shop")} style={darkBtn}>IR A LA TIENDA</button>
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: "1rem", padding: "0.5rem 0", borderBottom: "2px solid #111", fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#999" }}>
                  <span>PRODUCTO</span>
                  <span>PRECIO</span>
                  <span>CANTIDAD</span>
                  <span>SUBTOTAL</span>
                </div>

                {cart.map((item) => (
                  <div key={item.product.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: "1rem", padding: "1rem 0", borderBottom: "1px solid #eee", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <button onClick={() => updateCartQty(item.product.id, -item.qty)} style={{ background: "none", border: "none", cursor: "pointer", color: "#bbb", fontSize: 15, padding: 0 }}>✕</button>
                      <img src={item.product.img} alt={item.product.name} style={{ width: 56, height: 56, objectFit: "cover" }} />
                      <span style={{ fontSize: 13 }}>{item.product.name}</span>
                    </div>
                    <span style={{ fontSize: 14 }}>${item.product.price.toFixed(2)}</span>
                    <div style={{ display: "flex", alignItems: "center", border: "1px solid #ddd" }}>
                      <button onClick={() => updateCartQty(item.product.id, -1)} style={qtyBtn}>−</button>
                      <span style={{ padding: "0 0.5rem", fontSize: 14 }}>{item.qty}</span>
                      <button onClick={() => updateCartQty(item.product.id, 1)} style={qtyBtn}>+</button>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>${(item.product.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}

                <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem", flexWrap: "wrap" as const }}>
                  <button onClick={() => setView("shop")} style={darkBtn}>← SEGUIR COMPRANDO</button>
                  <button onClick={() => setCart([])} style={{ ...darkBtn, background: "#fff", color: "#111", border: "1px solid #111" }}>Vaciar carrito</button>
                </div>

                <div style={{ marginTop: "2rem", background: "#f8f8f8", padding: "1.5rem" }}>
                  <h2 style={{ fontSize: 14, fontWeight: 900, letterSpacing: 2, marginBottom: "1rem" }}>TOTALES DEL CARRITO</h2>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", fontSize: 14 }}>
                    <span>Subtotal</span><span>${totalPrice.toFixed(2)}</span>
                  </div>
                  <div style={{ borderTop: "1px solid #ddd", paddingTop: "0.75rem", display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700 }}>
                    <span>Total</span><span>${totalPrice.toFixed(2)}</span>
                  </div>
                  <a href={buildWhatsAppMsg()} target="_blank" rel="noreferrer" style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem",
                    marginTop: "1.5rem", background: "#25D366", color: "#fff",
                    padding: "1rem", fontWeight: 900, letterSpacing: 1.5,
                    fontSize: 13, textDecoration: "none",
                  }}>
                    <IconWhatsApp size={20} color="#fff" />
                    FINALIZAR COMPRA POR WHATSAPP
                  </a>
                </div>
              </>
            )}
          </div>
        </main>
      )}

      {/* ── MODAL PRODUCTO ── */}
      {selectedProduct && (
        <div
          onClick={() => setSelectedProduct(null)}
          style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", width: "100%", maxWidth: 560, borderRadius: "12px 12px 0 0", padding: "1.5rem", maxHeight: "90vh", overflowY: "auto" as const }}
          >
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.5rem" }}>
              <button onClick={() => setSelectedProduct(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#aaa" }}>✕</button>
            </div>
            <div style={{ background: "#f5f5f5", aspectRatio: "4/3", overflow: "hidden", marginBottom: "1rem" }}>
              <img src={selectedProduct.img} alt={selectedProduct.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 0.4rem" }}>{selectedProduct.name}</h2>
            <p style={{ fontSize: 22, fontWeight: 700, margin: "0 0 1.5rem" }}>${selectedProduct.price.toFixed(2)}</p>
            <div style={{ display: "flex", alignItems: "center", border: "1px solid #ddd", width: "fit-content", marginBottom: "1rem" }}>
              <button onClick={() => setModalQty(Math.max(1, modalQty - 1))} style={qtyBtn}>−</button>
              <span style={{ padding: "0 1rem", fontSize: 16 }}>{modalQty}</span>
              <button onClick={() => setModalQty(modalQty + 1)} style={qtyBtn}>+</button>
            </div>
            <button
              onClick={() => addToCart(selectedProduct, modalQty)}
              style={{ ...darkBtn, width: "100%", justifyContent: "center", fontSize: 14, padding: "1rem" }}
            >
              Agregar al carrito
            </button>
          </div>
        </div>
      )}

      {/* ── WHATSAPP FLOTANTE ── */}
      <a
        href={SOCIAL.whatsapp}
        target="_blank"
        rel="noreferrer"
        style={{
          position: "fixed", bottom: 20, right: 20, zIndex: 150,
          background: "#25D366", borderRadius: "50%", width: 52, height: 52,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)", textDecoration: "none",
        }}
      >
        <IconWhatsApp size={28} color="#fff" />
      </a>
    </div>
  );
}