import AuthForm from "../../components/auth-form";

import { redirectAuthenticatedGuest } from "@/lib/auth/guest";

export default async function LoginPage() {
  await redirectAuthenticatedGuest();
  return <AuthForm mode="login" />;
}