[8/4/2026 12:51 p. m.] Hermanish: export default function Home() {
  const categorias = ["TODO", "RELOJES", "COLLARES", "LENTES", "BILLETERAS", "PULSERAS", "ANILLOS"];
  const productosVacios = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      
      {/* HEADER NEGRO PREMIUM */}
      <header className="bg-black text-white sticky top-0 z-50">
        <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex gap-5">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-2xl font-black tracking-[0.3em] uppercase">Milton</span>
            <span className="text-[9px] tracking-[0.4em] text-gray-400 uppercase -mt-1">Accesorios</span>
          </div>

          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.119-1.243l1.263-12c.07-.665.45-1.243 1.119-1.243h15.25c.669 0 1.212.558 1.119 1.243Z" /></svg>
            <span className="absolute -top-1 -right-2 bg-white text-black text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">0</span>
          </div>
        </nav>

        {/* MENÚ DE CATEGORÍAS DENTRO DEL HEADER */}
        <div className="bg-white border-b border-gray-100 overflow-x-auto">
          <div className="container mx-auto px-6 flex gap-8 py-4">
            {categorias.map((cat, i) => (
              <span key={i} className={`text-[11px] font-bold tracking-widest whitespace-nowrap cursor-pointer hover:text-black transition-colors ${i === 0 ? 'text-black border-b-2 border-black pb-1' : 'text-gray-400'}`}>
                {cat}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* CUERPO DE LA TIENDA */}
      <main className="container mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-xl font-black uppercase tracking-tighter">Nuevas Colecciones</h2>
          <div className="h-[1px] flex-grow mx-6 bg-gray-100"></div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {productosVacios.map((p) => (
            <div key={p} className="flex flex-col">
              <div className="aspect-[3/4] bg-gray-50 rounded-sm border border-gray-100 flex items-center justify-center mb-4 hover:shadow-xl transition-shadow cursor-pointer">
                <span className="text-[10px] text-gray-300 tracking-[0.2em] uppercase font-bold">Próximamente</span>
              </div>
              <div className="h-3 w-2/3 bg-gray-100 mb-2"></div>
              <div className="h-4 w-1/3 bg-black/5"></div>
            </div>
          ))}
        </div>
      </main>

      {/* BOTÓN WHATSAPP ELEGANTE */}
      <a href="#" className="fixed bottom-8 right-8 bg-[#25D366] p-4 rounded-full shadow-2xl hover:scale-110 transition-transform z-50">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.588-5.946 0-6.56 5.333-11.892 11.892-11.892 3.181 0 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.481 8.404 0 6.56-5.333 11.892-11.893 11.892-1.997 0-3.951-.5-5.688-1.448l-6.305 1.665zm8.867-20.691c-2.73 0-5.301 1.063-7.
[8/4/2026 12:51 p. m.] Hermanish: 238 2.999s-3 4.508-3 7.238c0 1.848.502 3.639 1.45 5.204l-.986 3.604 3.737-.986c1.5.883 3.209 1.348 4.956 1.348 2.731 0 5.303-1.063 7.238-3 1.938-1.937 3-4.508 3-7.238s-1.062-5.301-3-7.238-4.507-2.999-7.238-2.999zm4.752 11.063c-.269-.135-1.594-.787-1.841-.875-.246-.09-.425-.135-.604.135-.179.27-.692.876-.848 1.056-.157.181-.313.203-.582.068-.269-.135-1.138-.419-2.167-1.338-.8-.713-1.34-1.593-1.497-1.863-.157-.269-.017-.414.118-.548.121-.121.269-.315.404-.472.135-.157.179-.27.269-.45.09-.18.045-.337-.022-.472-.067-.135-.604-1.458-.828-1.997-.219-.523-.438-.452-.604-.46h-.516c-.179 0-.471.068-.717.337-.246.27-.941.922-.941 2.249s.964 2.609 1.098 2.789c.135.18 1.897 2.897 4.594 4.057.641.276 1.143.44 1.534.564.644.205 1.229.176 1.692.107.516-.078 1.594-.652 1.817-1.282.224-.63.224-1.17.157-1.282-.068-.112-.247-.18-.516-.315z" /></svg>
      </a>
    </div>
  );
}
