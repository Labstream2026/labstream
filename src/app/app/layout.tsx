import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { getPrimaryAppRole, canAccessApp } from "@/lib/app-guards";
import { CmsRole } from "@prisma/client";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/cms/login?next=/app");

  const u = session.user;

  // Defensa en profundidad: los usuarios exclusivos del CMS no entran a /app.
  if (!canAccessApp(u.kind)) {
    redirect("/cms");
  }
  const role = await getPrimaryAppRole(u.id, u.role);
  const isMaster = u.role === CmsRole.SUPER_ADMIN;

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/cms/login" });
  }

  return (
    <AppShell
      user={{ name: u.name ?? null, email: u.email }}
      role={role}
      isMaster={isMaster}
      signOut={handleSignOut}
    >
      {children}
    </AppShell>
  );
}
