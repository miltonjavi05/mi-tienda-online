"use client";

import { useState } from "react";

const categories = ["Todos", "Pulseras", "Collares", "Relojes", "Billeteras"];

const products = [
  {
    id: 1,
    name: "Pulsera Eslabón",
    category: "Pulseras",
    price: "Bs. 13.000",
    img: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&q=80",
  },
  {
    id: 2,
    name: "Collar Cruz Moderna",
    category: "Collares",
    price: "Bs. 13.000",
    img: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80",
  },
  {
    id: 3,
    name: "Reloj Clásico Negro",
    category: "Relojes",
    price: "Bs. 28.000",
    img: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&q=80",
  },
  {
    id: 4,
    name: "Billetera Minimalista",
    category: "Billeteras",
    price: "Bs. 18.000",
    img: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&q=80",
  },
  {
    id: 5,
    name: "Pulsera Trenzada",
    category: "Pulseras",
    price: "Bs. 11.000",
    img: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=400&q=80",
  },
  {
    id: 6,
    name: "Collar Cadena Fina",
    category: "Collares",
    price: "Bs. 15.000",
    img: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&q=80",
  },
  {
    id: 7,
    name: "Reloj Acero Mate",
    category: "Relojes",
    price: "Bs. 32.000",
    img: "https://images.unsplash.com/photo-1542496658-e33a6d0d53f6?w=400&q=80",
  },
  {
    id: 8,
    name: "Tarjetero Cuero",
    category: "Billeteras",
    price: "Bs. 14.000",
    img: "https://images.unsplash.com/photo-1556742031-c6961e8560b0?w=400&q=80",
  },
];

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [cart, setCart] = useState<number[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const filtered =
    activeCategory === "Todos"
      ? products
      : products.filter((p) => p.category === activeCategory);

  const addToCart = (id: number) => {
    setCart((prev) => [...prev, id]);
  };

  return (
    <>
      {/* Navbar */}
      <nav className="navbar">
        <a href="#" className="navbar-logo">
          Mi Tienda
        </a>
        <ul className="navbar-links">
          <li><a href="#">Inicio</a></li>
          <li><a href="#">Tienda</a></li>
          <li><a href="#">Nosotros</a></li>
          <li><a href="#">Contacto</a></li>
        </ul>
        <button
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "0.7rem",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontFamily: "inherit",
          }}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          Carrito
          {cart.length > 0 && (
            <span
              style={{
                background: "#0a0a0a",
                color: "#f5f5f0",
                borderRadius: "50%",
                width: "18px",
                height: "18px",
                fontSize: "0.6rem",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {cart.length}
            </span>
          )}
        </button>
      </nav>

      {/* Banner */}
      <div className="shipping-banner">
        ✦ Envío gratis a nivel nacional en todos los pedidos ✦
      </div>

      {/* Hero */}
      <section className="hero">
        <div>
          <h1 className="hero-title">
            Acce<br />
            so<em>rios</em><br />
            únicos.
          </h1>
        </div>
        <div>
          <p className="hero-subtitle">
            Piezas diseñadas para quienes valoran el detalle.
            Cada accesorio refleja carácter y autenticidad.
            Envío a todo el país.
          </p>
        </div>
      </section>

      {/* Filtros */}
      <div className="filters">
        <span className="filter-label">Filtrar:</span>
        {categories.map((cat) => (
          <button
            key={cat}
            className={`filter-btn ${activeCategory === cat ? "active" : ""}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Productos */}
      <section className="products-section">
        <div className="products-header">
          <h2 className="products-title">Colección</h2>
          <span className="products-count">{filtered.length} productos</span>
        </div>

        <div className="products-grid">
          {filtered.map((product, index) => (
            <div key={product.id} className="product-card">
              <span className="product-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="product-img-wrapper">
                <img src={product.img} alt={product.name} />
              </div>
              <p className="product-category">{product.category}</p>
              <h3 className="product-name">{product.name}</h3>
              <p className="product-price">{product.price}</p>
              <button
                className="add-to-cart"
                onClick={() => addToCart(product.id)}
              >
                Añadir al carrito
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="footer">
          <div>
            <div className="footer-brand">Mi<br />Tienda</div>
            <p className="footer-tagline">
              Accesorios exclusivos que reflejan<br />
              confianza y autenticidad.<br />
              Destaca con estilo.
            </p>
          </div>
          <div>
            <p className="footer-heading">Tienda</p>
            <ul className="footer-links">
              <li><a href="#">Pulseras</a></li>
              <li><a href="#">Collares</a></li>
              <li><a href="#">Relojes</a></li>
              <li><a href="#">Billeteras</a></li>
            </ul>
          </div>
          <div>
            <p className="footer-heading">Info</p>
            <ul className="footer-links">
              <li><a href="#">Nosotros</a></li>
              <li><a href="#">Envíos</a></li>
              <li><a href="#">Devoluciones</a></li>
              <li><a href="#">Contacto</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span className="footer-copy">© 2026 Mi Tienda. Todos los derechos reservados.</span>
          <span className="footer-copy">Hecho con ♥</span>
        </div>
      </footer>
    </>
  );
}
