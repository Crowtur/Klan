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
import {prisma} from "@/lib/prisma";
import {stripe} from "@/lib/stripe";

const headers = {"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"};
function message(text:string,status:number) {
  return new Response(text,{status,headers:{...headers,"Content-Type":"text/plain; charset=utf-8"}});
}

/** Resuelve en Stripe la factura o el recibo de un pago completado del titular y redirige a su URL. */
export async function GET(request:Request,{params}:{params:Promise<{paymentId:string}>}) {
  try {
    const user = await requireAuth(request);
    const {paymentId} = await params;
    const payment = await prisma.payment.findFirst({
      where:{id:paymentId,userId:user.id,status:"PAID"},
      select:{stripeInvoiceId:true,stripePaymentIntentId:true,stripeCheckoutSessionId:true}
    });
    if (!payment) return message("No se encontró un pago completado en tu cuenta.",404);
    let invoiceId = payment.stripeInvoiceId;
    let intentId = payment.stripePaymentIntentId;
    // Los pagos antiguos pueden conservar solo la sesión de Checkout. Sus referencias permiten localizar el comprobante.
    if (!invoiceId && !intentId && payment.stripeCheckoutSessionId) {
      const session = await stripe.checkout.sessions.retrieve(payment.stripeCheckoutSessionId);
      invoiceId = typeof session.invoice === "string" ? session.invoice : session.invoice?.id ?? null;
      intentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
    }
    let url = invoiceId ? (await stripe.invoices.retrieve(invoiceId)).hosted_invoice_url : null;
    // Para los cobros sin factura alojada se utiliza el recibo del cargo asociado al intento.
    if (!url && intentId) {
      const intent = await stripe.paymentIntents.retrieve(intentId,{expand:["latest_charge"]});
      const charge = intent.latest_charge;
      if (charge && typeof charge !== "string") url = charge.receipt_url;
    }
    if (!url) return message("Stripe todavía no tiene un comprobante disponible para este pago.",404);
    return new Response(null,{status:303,headers:{...headers,Location:url}});
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return message("Inicia sesión para consultar tu comprobante.",401);
    return message("No se pudo consultar el comprobante. Vuelve a intentarlo en unos minutos.",503);
  }
}
