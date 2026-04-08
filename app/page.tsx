[8/4/2026 1:07 p. m.] Hermanish: @tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: white;
  color: black;
  margin: 0;
  font-family: sans-serif;
}

/* Esto arregla que el menú no se amontone en celulares */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
[8/4/2026 1:08 p. m.] Hermanish: export default function Home() {
  const categorias = ["TODO", "RELOJES", "COLLARES", "LENTES", "BILLETERAS", "PULSERAS", "ANILLOS"];
  const esqueleto = [1, 2, 3, 4, 5, 6];

  return (
    <div className="min-h-screen bg-white text-black">
      {/* HEADER NEGRO PREMIUM */}
      <header className="bg-black text-white p-5 sticky top-0 z-50">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div className="text-xl">☰</div>
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-[0.3em]">MILTON</h1>
            <p className="text-[9px] tracking-[0.2em] text-gray-400 -mt-1">ACCESORIOS</p>
          </div>
          <div className="text-xl">🛒</div>
        </div>
      </header>

      {/* MENÚ DE CATEGORÍAS BLANCO */}
      <nav className="border-b border-gray-100 bg-white sticky top-[80px] z-40">
        <div className="flex gap-8 p-4 overflow-x-auto max-w-6xl mx-auto no-scrollbar">
          {categorias.map((cat, i) => (
            <span key={i} className={`text-[11px] font-bold tracking-widest whitespace-nowrap ${i === 0 ? 'text-black border-b-2 border-black' : 'text-gray-400'}`}>
              {cat}
            </span>
          ))}
        </div>
      </nav>

      {/* CUERPO CON GRILLA DE PRODUCTOS */}
      <main className="p-4 max-w-6xl mx-auto">
        <h2 className="text-sm font-black uppercase tracking-widest mb-6 py-4">Nuevos Ingresos</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {esqueleto.map((item) => (
            <div key={item} className="flex flex-col">
              <div className="aspect-[3/4] bg-gray-50 border border-gray-100 rounded-sm flex items-center justify-center mb-3">
                <span className="text-[10px] text-gray-300 tracking-widest uppercase font-bold">Próximamente</span>
              </div>
              <div className="h-3 w-3/4 bg-gray-100 rounded mb-2"></div>
              <div className="h-4 w-1/4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </main>

      {/* BOTÓN WHATSAPP */}
      <div className="fixed bottom-6 right-6 bg-[#25D366] text-white p-4 rounded-full shadow-2xl font-bold">
        WA
      </div>
    </div>
  );
}
