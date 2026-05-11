import { headers } from "next/headers";
import { auth, signOut } from "@/auth";
import { CmsRole, UserKind } from "@prisma/client";
import { CmsShell } from "@/components/cms/CmsShell";
import { CmsToaster } from "@/components/cms/Toaster";
import { readFlash } from "@/lib/cms-flash";

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
    </>
  );
}
