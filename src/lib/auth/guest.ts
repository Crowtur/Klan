import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { userFromToken } from "./auth";

export async function redirectAuthenticatedGuest() {
  const token = (await cookies()).get("auth_token")?.value;
  if (await userFromToken(token)) redirect("/app");
}
