import MemberHeader from "@/components/member-header";
import "@uploadthing/react/styles.css";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Club SaaS",
  description: "Clubes, membresías, reservas y pagos en un solo lugar",
};

// src/app/layout.tsx

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <MemberHeader />
        {children}
      </body>
    </html>
  );
}
