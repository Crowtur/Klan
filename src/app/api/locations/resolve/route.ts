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

import {requireAuth} from "@/lib/auth/auth";
import {resolveLocation} from "@/lib/locations/verified-location";
import {OUTSIDE_ECUADOR} from "@/lib/locations/ecuador";
import {z} from "zod";
/** La sesión y un límite por usuario protegen la consulta de geocodificación; los rechazos territoriales son explícitos. */
const requests=new Map<string,{until:number;count:number}>();
export async function POST(request:Request) {
  try {
    const user=await requireAuth(request);
    const current=requests.get(user.id),now=Date.now();
    if(current&&current.until>now&&current.count>=30)return Response.json({success:false,message:"Espera un momento antes de elegir otra ubicación"},{status:429});
    if(requests.size>=2000)requests.clear();
    requests.set(user.id,current&&current.until>now?{...current,count:current.count+1}:{until:now+60000,count:1});
    const parsed=z.object({latitude:z.number().finite().min(-90).max(90),longitude:z.number().finite().min(-180).max(180)}).strict().safeParse(await request.json());
    if(!parsed.success)return Response.json({success:false,message:"Coordenadas inválidas"},{status:400});
    return Response.json({success:true,location:await resolveLocation(parsed.data,user.id)},{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){
    const message=error instanceof Error?error.message:'';
    const status=message==='UNAUTHORIZED'?401:message===OUTSIDE_ECUADOR||message.startsWith('No se pudo identificar')?400:error instanceof SyntaxError?400:503;
    return Response.json({success:false,message:message===OUTSIDE_ECUADOR||message.startsWith('No se pudo identificar')?message:status===401?'Debes iniciar sesión':status===400?'Datos inválidos':'El mapa no está disponible en este momento. Intenta nuevamente.'},{status});
  }
}
