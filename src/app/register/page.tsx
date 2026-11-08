import AuthForm from "../../components/auth-form";

import { redirectAuthenticatedGuest } from "@/lib/auth/guest";

export default async function RegisterPage() {
  await redirectAuthenticatedGuest();
  return <AuthForm mode="register" />;
}