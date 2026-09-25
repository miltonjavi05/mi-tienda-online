"use client";

const WHATSAPP_NUMERO = "584120000000"; // ← reemplaza por el número real de Mami

const CATEGORIAS = [
  { icon: "🚗", nombre: "Champú carros y motos", desc: "Espuma rica, brillo sin dañar la pintura." },
  { icon: "🧴", nombre: "Desengrasante multiusos", desc: "Para cocina, motor y superficies difíciles." },
  { icon: "🍽️", nombre: "Lavaplatos", desc: "Corta la grasa, rinde muchísimo." },
  { icon: "🧺", nombre: "Detergente líquido y premium", desc: "Ropa limpia, aroma que dura." },
  { icon: "💜", nombre: "Suavizantes", desc: "Morado y clásico, telas suaves por días." },
  { icon: "✨", nombre: "Vanish desmanchador", desc: "Elimina manchas difíciles." },
  { icon: "🧼", nombre: "Cloro y cloro jabonoso", desc: "Desinfecta y deja aroma a limpio." },
  { icon: "🛡️", nombre: "Desinfectante", desc: "Elimina gérmenes en pisos y superficies." },
  { icon: "🪞", nombre: "Cera blanca autobrillante", desc: "Pisos con brillo espejo, fácil de aplicar." },
  { icon: "🚽", nombre: "Limpia poceta / cerámica", desc: "Desinfecta y blanquea a fondo." },
  { icon: "🛋️", nombre: "Limpia tapicería", desc: "Renueva muebles y asientos de tela." },
  { icon: "🌸", nombre: "Ambientador spray", desc: "Aromas: lavanda, cherry, vainilla y más." },
];

const FRAGANCIAS = ["Lavanda", "Menta", "Cherry", "Bebés talco", "Pino", "Vainilla", "Parchita", "Mandarina", "Suavitel", "Caricias de algodón"];

export default function MamiProductosLanding() {
  const waLink = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent("Hola, quiero ver el catálogo de productos de limpieza de Mami")}`;

  return (
    <div style={{
      fontFamily: "'Poppins', system-ui, sans-serif",
      background: "linear-gradient(160deg,#120a0f 0%,#1a0f16 45%,#150c12 100%)",
      minHeight: "100vh", color: "#f3e2ea", paddingBottom: "3rem",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Playfair+Display:wght@700;800&display=swap');
        * { box-sizing: border-box; }`}</style>

      {/* HERO */}
      <div style={{ textAlign: "center", padding: "3.5rem 1.25rem 2.5rem", maxWidth: 560, margin: "0 auto" }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%", margin: "0 auto 1rem",
          background: "linear-gradient(140deg,#ff8fb3,#e05485)", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 18px rgba(224,84,133,0.45)",
        }}><span style={{ fontSize: 28 }}>🧴</span></div>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 800, margin: "0 0 0.5rem", color: "#ff6fa8" }}>
          Productos de limpieza Mami
        </h1>
        <p style={{ fontSize: 14, color: "#c99bb0", lineHeight: 1.6, margin: "0 0 1.5rem" }}>
          Detergentes, suavizantes, desinfectantes y más — hechos con dedicación,
          al mejor precio y con la calidad de siempre.
        </p>
        <a href={waLink} target="_blank" rel="noopener noreferrer" style={{
          display: "inline-block", textDecoration: "none", border: "none", borderRadius: 14, padding: "0.9rem 2rem",
          background: "linear-gradient(135deg,#ff8fb3,#e05485)", color: "#fff", fontWeight: 700, fontSize: 14,
          boxShadow: "0 6px 18px rgba(224,84,133,0.4)",
        }}>💬 Pedir por WhatsApp</a>
      </div>

      {/* CATÁLOGO */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 1.25rem" }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 800, color: "#ff6fa8", textAlign: "center", margin: "0 0 1.5rem" }}>
          Nuestro catálogo
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {CATEGORIAS.map(c => (
            <div key={c.nombre} style={{
              background: "#1e1219", border: "1px solid #3a2430", borderRadius: 16, padding: "1.1rem 1.15rem",
              boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
            }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>{c.icon}</div>
              <p style={{ margin: "0 0 4px", fontSize: 13.5, fontWeight: 700, color: "#f3e2ea" }}>{c.nombre}</p>
              <p style={{ margin: 0, fontSize: 11.5, color: "#c99bb0", lineHeight: 1.5 }}>{c.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FRAGANCIAS */}
      <div style={{ maxWidth: 900, margin: "2.5rem auto 0", padding: "0 1.25rem" }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 800, color: "#ff6fa8", textAlign: "center", margin: "0 0 1rem" }}>
          Fragancias disponibles
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
          {FRAGANCIAS.map(f => (
            <span key={f} style={{
              border: "1px solid #4a2f3a", background: "#2f1c27", color: "#ff7fae",
              borderRadius: 20, padding: "0.4rem 0.9rem", fontSize: 11.5, fontWeight: 600,
            }}>{f}</span>
          ))}
        </div>
      </div>

      {/* CTA FINAL */}
      <div style={{ maxWidth: 480, margin: "3rem auto 0", padding: "0 1.25rem", textAlign: "center" }}>
        <div style={{
          background: "linear-gradient(135deg,#2a1620,#3a1f2c)", border: "1px solid #5a3346", borderRadius: 18,
          padding: "1.5rem 1.25rem",
        }}>
          <p style={{ margin: "0 0 0.5rem", fontSize: 14, fontWeight: 700, color: "#f3e2ea" }}>
            ¿Necesitas surtir tu casa o negocio?
          </p>
          <p style={{ margin: "0 0 1rem", fontSize: 12, color: "#c99bb0" }}>
            Escríbenos y arma tu pedido a la medida.
          </p>
          <a href={waLink} target="_blank" rel="noopener noreferrer" style={{
            display: "inline-block", textDecoration: "none", border: "none", borderRadius: 12, padding: "0.75rem 1.75rem",
            background: "linear-gradient(135deg,#ff8fb3,#e05485)", color: "#fff", fontWeight: 700, fontSize: 13,
            boxShadow: "0 6px 16px rgba(224,84,133,0.35)",
          }}>Escribir ahora</a>
        </div>
      </div>
    </div>
  );
}