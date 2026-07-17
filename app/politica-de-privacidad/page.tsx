export default function PoliticaDePrivacidad() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px", lineHeight: 1.6 }}>
      <h1>Política de Privacidad</h1>
      <p>Última actualización: {new Date().toLocaleDateString("es-VE")}</p>

      <p>
        En Fokus Accesorios (fokusaccesorios.shop) valoramos tu privacidad. Esta política explica
        qué información recopilamos y cómo la usamos.
      </p>

      <h2>1. Información que recopilamos</h2>
      <ul>
        <li>Datos de navegación (páginas visitadas, productos vistos, interacciones en el sitio).</li>
        <li>Datos que nos proporcionas voluntariamente al contactarnos por WhatsApp (nombre, número de teléfono, dirección de entrega si aplica).</li>
        <li>Datos técnicos como dirección IP, tipo de dispositivo y navegador, mediante cookies y píxeles de seguimiento (Meta Pixel).</li>
      </ul>

      <h2>2. Uso de la información</h2>
      <ul>
        <li>Procesar y gestionar tus pedidos.</li>
        <li>Comunicarnos contigo sobre tu compra vía WhatsApp.</li>
        <li>Mejorar nuestro sitio y catálogo.</li>
        <li>Mostrar anuncios relevantes a través de Meta (Facebook/Instagram) usando Meta Pixel y la API de Conversiones.</li>
      </ul>

      <h2>3. Compartición de datos</h2>
      <p>
        No vendemos tu información personal a terceros. Compartimos datos únicamente con proveedores
        de servicios que nos ayudan a operar el sitio (Firebase/Google, Cloudinary, Meta) bajo sus
        propias políticas de privacidad.
      </p>

      <h2>4. Cookies</h2>
      <p>
        Usamos cookies y tecnologías similares para analizar el tráfico del sitio y optimizar
        campañas publicitarias en Meta.
      </p>

      <h2>5. Tus derechos</h2>
      <p>
        Puedes solicitar acceso, corrección o eliminación de tus datos personales escribiéndonos a
        través de WhatsApp o al correo miltonjavi05@gmail.com.
      </p>

      <h2>6. Contacto</h2>
      <p>Si tienes preguntas sobre esta política, contáctanos: miltonjavi05@gmail.com</p>
    </div>
  );
}