/**
 * ==============================================================================
 * PONTIFICIA UNIVERSIDAD CATÓLICA DEL ECUADOR
 * Facultad Internacional de Innovación (PUCE - Icam)
 * ==============================================================================
 * 
 * PROYECTO DE TITULACIÓN - INGENIERÍA INTEGRAL
 * Autor: Diego Alexis Tipán Zambrano
 * Director del Proyecto: PhD. Rafael Melgarejo
 * Promoción: Primera Promoción (Año 2026)
 * 
 * ------------------------------------------------------------------------------
 * DECLARACIÓN SOBRE EL USO DE INTELIGENCIA ARTIFICIAL
 * ------------------------------------------------------------------------------
 * Se declara formalmente el uso de herramientas de Inteligencia Artificial como
 * soporte y asistente técnico para el desarrollo de este proyecto, destacando su
 * aplicación en:
 * 
 * - Generación y optimización de bloques de código repetitivos y extensos.
 * - Desarrollos de endpoints complejos con variabilidad de permisos y roles.
 * - Integración de nuevas funciones y sugerencias de arquitectura de software.
 * - Depuración ágil, corrección de errores y optimización de rendimiento.
 * - Creación, maquetación e integración de diseños UI/UX de formato visual a código.
 * - Automatización de documentación técnica y estructuración de comentarios.
 * 
 * Herramientas de IA utilizadas:
 * - GPT-5.6 Luna
 * - GPT-6 Astra
 * - Gemini 3.6 Flash
 * - Figma AI (Visual Engine / Make Real)
 * 
 * ------------------------------------------------------------------------------
 * DERECHOS DE AUTOR Y PROPIEDAD INTELECTUAL
 * ------------------------------------------------------------------------------
 * Los derechos del presente proyecto corresponden a la Pontificia Universidad
 * Católica del Ecuador junto al autor y al director del proyecto, en estricto
 * cumplimiento del reglamento institucional sobre patentes, tesis y titulación.
 * 
 * ALCANCE: Dichos derechos aplican exclusivamente al código fuente desarrollado
 * en este proyecto, excluyendo la idea de negocio global y futuras versiones 
 * o derivados sustanciales que puedan desarrollarse sobre el sistema.
 * ==============================================================================
 */

import { Footer } from "@/components/ui";
import MemberHeader from "@/components/member-header";
import "@uploadthing/react/styles.css";
import type { Metadata } from "next";
import "./globals.css";
// Parte 10.4: La identidad compartida también se publica en las tarjetas sociales.
export const metadata: Metadata = {
    title: { default: "Klan", template: "%s | Klan" },
    icons: { icon: "/brand/klan-icon.png", apple: "/brand/klan-icon.png" },
    description: "Klan: clubes, membresías, reservas y pagos en un solo lugar",
    openGraph: {
        title: "Klan",
        siteName: "Klan",
        description: "Klan: clubes, membresías, reservas y pagos en un solo lugar",
        locale: "es_EC",
        type: "website",
    },
};
// src/app/layout.tsx
/** Aplica el idioma, los estilos y la cabecera compartida a todas las rutas. */
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
