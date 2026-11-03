import { Footer } from "@/components/ui";
import MemberHeader from "@/components/member-header";
import "@uploadthing/react/styles.css";
import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
    title: { default: "Klubo", template: "%s | Klubo" },
    icons: { icon: "/brand/klubo-icon.png", apple: "/brand/klubo-icon.png" },
    description: "Clubes, membresías, reservas y pagos en un solo lugar",
};
// src/app/layout.tsx
export default function RootLayout({ children, }: {
    children: React.ReactNode;
}) {
    return (<html lang="es">
      <body>
        <a href="#main-content" className="skip-link">Saltar al contenido</a>
        <MemberHeader />
        {children}
        <Footer />
      </body>
    </html>);
}
