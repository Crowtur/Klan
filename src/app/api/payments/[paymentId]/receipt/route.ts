import {requireAuth} from "@/lib/auth/auth";
import {prisma} from "@/lib/prisma";
import {stripe} from "@/lib/stripe";

const headers = {"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"};
function message(text:string,status:number) {
  return new Response(text,{status,headers:{...headers,"Content-Type":"text/plain; charset=utf-8"}});
}

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
    if (!invoiceId && !intentId && payment.stripeCheckoutSessionId) {
      const session = await stripe.checkout.sessions.retrieve(payment.stripeCheckoutSessionId);
      invoiceId = typeof session.invoice === "string" ? session.invoice : session.invoice?.id ?? null;
      intentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
    }
    let url = invoiceId ? (await stripe.invoices.retrieve(invoiceId)).hosted_invoice_url : null;
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
