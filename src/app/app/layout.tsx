import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/auth";
export default async function PersonalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const incoming = await headers();
  const user = await getCurrentUser(
    new Request("http://internal.local", {
      headers: { cookie: incoming.get("cookie") || "" },
    }),
  );
  if (!user) redirect("/login");
  return <>{children}</>;
}
