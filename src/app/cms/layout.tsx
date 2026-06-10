import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { CmsRole, UserKind } from "@prisma/client";
import { CmsShell } from "@/components/cms/CmsShell";
import { CmsToaster } from "@/components/cms/Toaster";
import { CommandPalette } from "@/components/cms/CommandPalette";
import { readFlash } from "@/lib/cms-flash";
import { canAccessCms } from "@/lib/cms-guard";

export default async function CmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const hdrs = await headers();
  const path = hdrs.get("x-invoke-path") ?? hdrs.get("next-url") ?? "";
  const flash = await readFlash();
  const initialToast = flash
    ? { kind: flash.kind, message: flash.message }
    : null;

  const isLogin = path.includes("/cms/login");

  if (isLogin || !session?.user) {
    return (
      <>
        {children}
        <CmsToaster initial={initialToast} />
      </>
    );
  }

  const user = session.user;

  // Defensa en profundidad: un usuario logueado que no es del CMS
  // (cliente / equipo / productor) no debe ver el shell del CMS.
  if (!canAccessCms(user.kind)) {
    redirect("/app?denied_cms=1");
  }

  const isSuper = user.role === CmsRole.SUPER_ADMIN;
  const isMaster = user.kind === UserKind.ADMIN;

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/cms/login" });
  }

  return (
    <>
      <CmsShell
        user={{ name: user.name ?? null, email: user.email, role: user.role }}
        isSuper={isSuper}
        isMaster={isMaster}
        signOut={handleSignOut}
      >
        {children}
      </CmsShell>
      <CmsToaster initial={initialToast} />
      <CommandPalette />
    </>
  );
}
