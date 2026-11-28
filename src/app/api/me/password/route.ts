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

import {z} from "zod";
import {getCurrentUser} from "@/lib/auth/auth";
import {hashPassword,verifyPassword} from "@/lib/auth/password";
import {passwordChangeError} from "@/lib/auth/password-change";
import {prisma} from "@/lib/prisma";

const fields = z.object({
  currentPassword:z.string(), newPassword:z.string(), confirmation:z.string(),
}).strict();

export async function PATCH(request:Request) {
  try {
    // La cuenta y su hash proceden exclusivamente de la sesión activa.
    const user = await getCurrentUser(request);
    if (!user) return Response.json({message:"Debes iniciar sesión."},{status:401});
    const input = fields.safeParse(await request.json().catch(()=>null));
    if (!input.success) return Response.json({message:"Envía los tres campos de contraseña."},{status:400});
    const error = passwordChangeError(input.data);
    if (error) return Response.json({message:error},{status:400});
    const {currentPassword,newPassword} = input.data;
    if (!await verifyPassword(currentPassword,user.passwordHash)) {
      return Response.json({message:"La contraseña actual es incorrecta."},{status:403});
    }
    // Las claves antiguas podían superar el límite de bcrypt y compartir sus primeros 72 bytes.
    if (new TextEncoder().encode(currentPassword).length > 72 && await verifyPassword(newPassword,user.passwordHash)) {
      return Response.json({message:"La nueva contraseña debe ser diferente de la actual."},{status:400});
    }
    const passwordHash = await hashPassword(newPassword);
    // Si otra petición cambió la clave o desactivó la cuenta, se descarta esta actualización.
    const saved = await prisma.user.updateMany({
      where:{id:user.id,status:"ACTIVE",passwordHash:user.passwordHash},data:{passwordHash},
    });
    if (!saved.count) return Response.json({message:"La cuenta cambió durante el guardado. Vuelve a intentarlo."},{status:409});
    return Response.json({message:"Contraseña actualizada correctamente."});
  } catch {
    return Response.json({message:"No se pudo actualizar la contraseña. Intenta nuevamente."},{status:500});
  }
}
