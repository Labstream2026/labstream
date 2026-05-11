import { signOut } from "@/auth";
import { requireAdminUser } from "@/lib/admin-guards";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await requireAdminUser();

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/cms/login" });
  }

  return (
    <AdminShell
      user={{ name: me.name ?? null, email: me.email }}
      signOut={handleSignOut}
    >
      {children}
    </AdminShell>
  );
}
