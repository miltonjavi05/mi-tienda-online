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

const WHATSAPP_NUMBER = "59170000000"; // ← Cambia este número

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
        <button onClick={() => setMenuOpen(true)} style={iconBtn}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        <button onClick={() => { setView("shop"); setActiveCategory("TODO"); }} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "#fff", fontSize: 9, letterSpacing: 2, marginRight: 2 }}>✦</span>
          <span style={{ color: "#fff", fontSize: 18, fontWeight: 900, letterSpacing: 4 }}>FOKUS</span>
        </button>

        <div style={{ display: "flex", gap: 2 }}>
          <button onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(""); }} style={iconBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
          </button>
          <button onClick={() => setView("cart")} style={{ ...iconBtn, position: "relative" as const }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
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
          <input autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar productos..." style={{ width: "100%", border: "1px solid #111", padding: "0.6rem 1rem", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const }} />
        </div>
      )}

      {/* ── MENÚ LATERAL ── */}
      {menuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex" }}>
          <div onClick={() => setMenuOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
          <div style={{ position: "relative", background: "#fff", width: 280, height: "100%", padding: "2rem 1.5rem", overflowY: "auto" as const }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
              <span style={{ fontWeight: 900, fontSize: 15, letterSpacing: 2 }}>CATEGORÍAS</span>
              <button onClick={() => setMenuOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#111" }}>✕</button>
            </div>
            {CATEGORIES.filter(c => c !== "TODO").map((cat) => (
              <button key={cat} onClick={() => { setActiveCategory(cat); setMenuOpen(false); setView("shop"); }} style={{
                display: "block", width: "100%", background: "none", border: "none",
                borderBottom: "1px solid #eee", padding: "1rem 0", textAlign: "left",
                fontSize: 15, cursor: "pointer", fontFamily: "inherit", color: "#111",
              }}>
                {cat.charAt(0) + cat.slice(1).toLowerCase()}
              </button>
            ))}
            <div style={{ marginTop: "2rem" }}>
              <p style={{ fontSize: 10, letterSpacing: 2, color: "#aaa", marginBottom: "1rem", fontWeight: 700 }}>REDES SOCIALES</p>
              <div style={{ display: "flex", gap: "1.2rem" }}>
                {["Facebook", "Instagram", "TikTok"].map(s => (
                  <a key={s} href="#" style={{ color: "#111", fontSize: 12, textDecoration: "none", letterSpacing: 1 }}>{s.substring(0,2).toUpperCase()}</a>
                ))}
                <a href={`https://wa.me/${WHATSAPP_NUMBER}`} style={{ color: "#25D366", fontSize: 12, textDecoration: "none", letterSpacing: 1 }}>WA</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TIENDA ── */}
      {view === "shop" && (
        <main style={{ paddingTop: searchOpen ? 112 : 56 }}>
          {/* Filtros */}
          <div style={{
            position: "sticky", top: 56, zIndex: 100, background: "#fff",
            borderBottom: "1px solid #ddd", overflowX: "auto", display: "flex",
            scrollbarWidth: "none" as const,
          }}>
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                background: "none", border: "none",
                borderBottom: activeCategory === cat ? "2px solid #111" : "2px solid transparent",
                padding: "0.85rem 1rem", fontSize: 11, fontWeight: 700,
                letterSpacing: 1.5, cursor: "pointer", whiteSpace: "nowrap" as const,
                color: activeCategory === cat ? "#111" : "#aaa",
                fontFamily: "inherit", flexShrink: 0, transition: "all 0.15s",
              }}>{cat}</button>
            ))}
          </div>

          {/* Grid de productos por categoría */}
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
                          <img src={product.img} alt={product.name}
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
                    💬 FINALIZAR COMPRA POR WHATSAPP
                  </a>
                </div>
              </>
            )}
          </div>
        </main>
      )}

      {/* ── MODAL PRODUCTO ── */}
      {selectedProduct && (
        <div onClick={() => setSelectedProduct(null)} style={{
          position: "fixed", inset: 0, zIndex: 400,
          background: "rgba(0,0,0,0.55)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "#fff", width: "100%", maxWidth: 560,
            borderRadius: "12px 12px 0 0", padding: "1.5rem",
            maxHeight: "90vh", overflowY: "auto" as const,
          }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.5rem" }}>
              <button onClick={() => setSelectedProduct(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#aaa" }}>✕</button>
            </div>
            <div style={{ background: "#f5f5f5", aspectRatio: "4/3", overflow: "hidden", marginBottom: "1rem" }}>
              <img src={selectedProduct.img} alt={selectedProduct.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 0.4rem" }}>{selectedProduct.name}</h2>
            <p style={{ fontSize: 22, fontWeight: 700, margin: "0 0 1.5rem" }}>${selectedProduct.price.toFixed(2)}</p>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", border: "1px solid #ddd" }}>
                <button onClick={() => setModalQty(Math.max(1, modalQty - 1))} style={qtyBtn}>−</button>
                <span style={{ padding: "0 1rem", fontSize: 16 }}>{modalQty}</span>
                <button onClick={() => setModalQty(modalQty + 1)} style={qtyBtn}>+</button>
              </div>
            </div>
            <button onClick={() => addToCart(selectedProduct, modalQty)} style={{ ...darkBtn, width: "100%", justifyContent: "center", fontSize: 14, padding: "1rem" }}>
              Agregar al carrito
            </button>
          </div>
        </div>
      )}

      {/* ── WHATSAPP FLOTANTE ── */}
      <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" style={{
        position: "fixed", bottom: 20, right: 20, zIndex: 150,
        background: "#25D366", borderRadius: "50%", width: 52, height: 52,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 26, boxShadow: "0 4px 16px rgba(0,0,0,0.2)", textDecoration: "none",
      }}>💬</a>
    </div>
  );
}