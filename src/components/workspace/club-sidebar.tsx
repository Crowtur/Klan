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
import {useState} from "react";
import {FacilityIcon} from "./facility-icon";
import Link from "next/link";
import { Icon } from "@/components/ui";
import { Action, date, href, Status, useData, type Row } from "./common";

/** Escoge la próxima reserva vigente y recomienda instalaciones usando las reservas y la popularidad. */
export function ClubSidebar({club,admin}: {club:string;admin:boolean}) {
  const [version,refresh]=useState(0);
  const bookings = useData(`/api/clubs/${club}/my-reservations`,version);
  
  const confirmed:Row[] = (bookings.data?.reservations || []).filter((r:Row)=>r.status === "CONFIRMED");
  const next = confirmed.filter(r => Date.parse(r.startAt) >= Date.now())
    .sort((a,b)=>Date.parse(a.startAt)-Date.parse(b.startAt))[0];
  const last = [...confirmed].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt))[0];
  const facilities = useData(`/api/clubs/${club}/facilities?summary=popular&limit=2`,version);
  const suggestions:Row[] = [last?.facility,...(facilities.data?.facilities||[])].filter((f,i,rows)=>f && rows.findIndex(item=>item?.id===f.id)===i).slice(0,2);
  return <aside className="club-post-sidebar">
    <div className="list-heading"><h3>Tu espacio en el club</h3>{admin && <small>Administrador</small>}</div><div className="club-sidebar-cards"><section className="panel"><h3 className="reservation-title"><Icon name="calendar"/>Mi próxima reserva</h3>
      <Status state={bookings}>{next ? <><strong>{next.facility.name}</strong><p>{date(next.startAt)}</p>
        <p>{Math.round((Date.parse(next.endAt)-Date.parse(next.startAt))/60000)} minutos · Confirmada</p><Action variant="destructive" method="PATCH" url={`/api/clubs/${club}/facilities/${next.facilityId}/reservations/${next.id}`} confirm="¿Cancelar esta reserva?" onDone={()=>refresh(v=>v+1)}>Cancelar reserva</Action></> : <p>No tienes ninguna reserva.</p>}</Status>
    </section>
    <section className="panel"><div className="list-heading"><h3>Instalaciones</h3><Link href={href("club",{club,tab:"facilities"})}>Ver todas ↗</Link></div>
      <Status state={facilities}>{suggestions.length ? suggestions.map(facility=><article className="facility-preview" key={facility.id}><div><FacilityIcon value={facility.icon}/><strong>{facility.name}</strong></div>
        <small>{facility.location}</small><p>{facility.description}</p>
        <Link className="btn btn-outline" href={href("facility",{club,id:facility.id})}>Consultar instalación</Link></article>) : <p><FacilityIcon/> El club aún no tiene instalaciones.</p>}</Status>
    </section>
  </div></aside>;
}
