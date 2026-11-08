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

/* Inspecciona el HTML generado por los componentes y verifica los tamaños reales de las miniaturas. */
import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { renderToStaticMarkup as render } from "react-dom/server";
import {renderAvatars} from "../src/lib/thumbnails";
import {AvatarImage} from "../src/components/avatar-image";
import {ClubBubbles} from "../src/components/club-bubbles";
import {BankDetails,FinanceChart,SettlementForm} from "../src/components/workspace/finance-controls";
import {PostCard} from "../src/components/workspace/post-card";

test("la portada comienza con siete burbujas genéricas sin enlaces",()=>{
  const html=render(<ClubBubbles/>);
  assert.equal((html.match(/class="bubble-position"/g)||[]).length,7);
  assert.doesNotMatch(html,/<a\s/);
});

test("las miniaturas del servidor son WebP cuadrados de 128 y 300 píxeles",async()=>{
  const original=await sharp({create:{width:1280,height:720,channels:3,background:"#186539"}}).jpeg().toBuffer();
  const sizes=await renderAvatars(original);
  for(const [bytes,dimension] of [[sizes.small,128],[sizes.large,300]] as const){
    const meta=await sharp(bytes).metadata();
    assert.equal(meta.format,"webp");assert.equal(meta.width,dimension);assert.equal(meta.height,dimension);
    assert.ok(bytes.length<original.length);
  }
});
test("las imágenes nuevas y anteriores ofrecen variantes de densidad",()=>{
  for(const src of ["/api/avatars/test","https://demo.ufs.sh/f/test"]){
    const html=render(<AvatarImage src={src} alt="Club"/>);
    assert.match(html,/128w/);assert.match(html,/300w/);
  }
});
test("los datos bancarios se presentan cerrados y conservan los ceros de la cuenta",()=>{
  assert.match(render(<BankDetails data={null}/>),/El administrador aún no ha registrado datos/);
  const html=render(<BankDetails data={{accountNumber:"001009",accountType:"AHORROS",identity:"0001",beneficiary:"Socio",bankName:"Banco"}}/>);
  assert.match(html,/001009/);assert.match(html,/Ahorros/);assert.doesNotMatch(html,/<details[^>]* open/);
});
test("las liquidaciones terminales no ofrecen transiciones y las notas comienzan cerradas",()=>{
  assert.equal(render(<SettlementForm settlement={{status:"PAID"}} onDone={()=>{}}/>),"");
  const html=render(<SettlementForm settlement={{status:"PROCESSING",notes:"Existente"}} onDone={()=>{}}/>);
  assert.match(html,/Existente/);assert.match(html,/Agregar notas/);assert.doesNotMatch(html,/<details[^>]* open/);
});
test("la dona selecciona inicialmente los cinco mayores importes",()=>{
  const clubs=Array.from({length:7},(_,i)=>({clubName:"Equipo "+i,clubId:String(i),grossRevenue:i}));
  const html=render(<FinanceChart clubs={clubs}/>);
  const chart=html.split("<dialog")[0];
  assert.match(chart,/Equipo 6/);assert.doesNotMatch(chart,/Equipo [01]/);assert.match(chart,/>20<\/span>/);
});
test("un lector puede compartir sin ver controles de edición",()=>{
  const html=render(<PostCard post={{id:"p",createdAt:"2026-11-01",club:{id:"c",name:"Deportivo"},content:"Encuentro"}}/>);
  assert.match(html,/id="post-p"/);assert.match(html,/Compartir/);assert.doesNotMatch(html,/Eliminar|Editar publicación/);
});

test("la variante destructiva distingue una baja, una cancelación y la suspensión global",async()=>{
  const {Action}=await import("../src/components/workspace/common");
  for (const props of [{method:"DELETE"},{method:"PATCH",variant:"destructive" as const}]) {
    const html=render(<Action url="/operacion" confirm="¿Continuar?" {...props}>Aplicar</Action>);
    assert.equal((html.match(/class="outline-destructive"/g)||[]).length,2);
  }
  const html=render(<Action url="/suspend" variant="club-suspension" confirm="¿Suspender?">Suspender</Action>);
  assert.match(html,/<button class="danger">Suspender/);
  assert.match(html,/<button class="outline-destructive">Confirmar/);
  assert.doesNotMatch(render(<Action url="/reservations">Reservar</Action>),/outline-destructive|class="danger"/);
});
