import { Suspense } from "react";
import PaymentReturn from "@/components/workspace/payment-return";
export default function Page() {
  return (
    <Suspense fallback={<p>Cargando…</p>}>
      <PaymentReturn />
    </Suspense>
  );
}
