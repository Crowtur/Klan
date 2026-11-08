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

/* Valida tarjetas de planes y representaciones de series temporales mediante renderizado en el servidor. */
import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { PlanCard } from "../src/components/workspace/plan-card";
import { Bars } from "../src/components/workspace/activity";

test("plan cards render the contracted duration, USD, multiline benefits and actual counts", () => {
  for (const benefits of ["Acceso\nReserva", ["Acceso", "Reserva"]]) {
    const html = renderToStaticMarkup(<PlanCard plan={{name:"Club",type:"PAID",durationValue:3,durationUnit:"MONTH",price:35,benefits,activeMembers:2,requiresDocumentation:true,documentRequirements:[{name:"Licencia"}]}}>Editar plan</PlanCard>);
    for (const text of ["3 MESES","USD","2 socios","1 requisito documental","Acceso","Reserva","Editar plan"]) assert.ok(html.includes(text), text);
    assert.equal((html.match(/<li>/g)||[]).length,2);
  }
});

test("daily chart groups adjacent months and identifies a single month in its heading", () => {
  const render = (days:string[]) => renderToStaticMarkup(<Bars title="Ingresos" calendar="day" xAxis="Días" yAxis="USD" series={["Ingresos"]} rows={days.map(label=>({label,values:[5]}))}/>);
  const single = render(["2026-10-31"]);
  assert.match(single,/<h3>Ingresos · octubre de 2026<\/h3>/);
  const multiple = render(["2026-10-31","2026-11-01","2026-11-02"]);
  assert.match(multiple,/grid-column:span 2[^>]*>noviembre de 2026/);
  assert.match(multiple,/<small>1<\/small>/);
  assert.match(multiple,/class="numeric">5/);
});
