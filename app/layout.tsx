import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fokus",
  description: "Accesorios con actitud. Cada detalle importa.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Fokus",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        {/* PWA – shows Fokus icon when added to home screen */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Fokus" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#080808" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="facebook-domain-verification" content="d4yithl47jpogjnpv52sx14j5mtebd" />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#080808" }}>
        {children}
      </body>
    </html>
  );
}