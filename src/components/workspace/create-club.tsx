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

"use client";
import { useState } from "react";
import Link from "next/link";
import { Form, clubFields, href, type Row } from "./common";
import { UploadButton } from "@/lib/uploadthing";
/** Recoge los datos del nuevo club y coordina su alta con el flujo de imágenes del perfil. */
export function CreateClub() {
    const [club, setClub] = useState<Row | null>(null), [error, setError] = useState("");
    return club ? <><p className="notice">Club creado. Personaliza sus imágenes.</p><h3>Logotipo</h3><UploadButton endpoint="clubLogoUploader" input={{ clubId: club.id }} onUploadError={e => setError(e.message)}/><h3>Portada</h3><UploadButton endpoint="clubCoverUploader" input={{ clubId: club.id }} onUploadError={e => setError(e.message)}/>{error && <p role="alert">{error}</p>}<Link className="btn" href={href("club", { club: club.id })}>Abrir mi club →</Link></> : <Form fields={clubFields} url="/api/clubs" onDone={d => setClub(d.club)} submit="Crear club"/>;
}
