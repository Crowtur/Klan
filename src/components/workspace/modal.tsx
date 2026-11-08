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
import { useRef, useState, type ReactNode } from "react";
/** Usa el diálogo nativo para mantener el foco dentro del editor y admite un disparador de retirada. */
export function EditorModal({ title, children, destructive = false, lazy = false }: {
    title: string;
    destructive?: boolean;
    lazy?: boolean;
    children: ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const dialog = useRef<HTMLDialogElement>(null);
    return <><button className={destructive ? "outline-destructive" : "secondary"} onClick={() => { if (lazy) setOpen(true); dialog.current?.showModal(); }}>{title}</button><dialog className="editor-modal" ref={dialog} onClose={() => { if (lazy) setOpen(false); }} aria-label={title} onClick={e => { if (e.target === dialog.current)
        dialog.current.close(); }}>
 <header><h2>{title}</h2><button className="secondary" onClick={() => dialog.current?.close()} aria-label="Cerrar">×</button></header>
 {(!lazy || open) && children}<button className="outline-destructive" onClick={() => dialog.current?.close()}>Cancelar</button>
 </dialog></>;
}
