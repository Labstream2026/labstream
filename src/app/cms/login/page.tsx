import { redirect } from "next/navigation";
import { UserKind } from "@prisma/client";
import { auth, signIn } from "@/auth";
import { AuthError } from "next-auth";
import { Logo } from "@/components/Logo";
import { canAccessCms } from "@/lib/cms-guard";

function safeNext(raw: string | undefined): string {
  if (!raw) return "";
  // Solo permitimos rutas internas (empiezan con /), evitar open-redirect
  if (!raw.startsWith("/") || raw.startsWith("//")) return "";
  return raw;
}

/**
 * Default landing por tipo de usuario.
 * Editor/Reviewer del CMS aterrizan en /cms; los demás en /app.
 * Admin va a /app por default (su lugar de trabajo principal).
 */
function defaultLandingForKind(kind: UserKind | undefined): string {
  if (kind === UserKind.CMS_EDITOR || kind === UserKind.CMS_REVIEWER) return "/cms";
  return "/app";
}

export default async function LoginPage(props: {
  searchParams: Promise<{ error?: string; next?: string; callbackUrl?: string }>;
}) {
  const sp = await props.searchParams;
  const explicitNext = safeNext(sp.next ?? sp.callbackUrl);

  const session = await auth();
  if (session?.user) {
    let target = explicitNext || defaultLandingForKind(session.user.kind);
    // Si pidieron /cms pero no tiene acceso, mandar a /app
    if (target.startsWith("/cms") && !canAccessCms(session.user.kind)) {
      target = "/app";
    }
    redirect(target);
  }
  const next = explicitNext;

  const errorMsg =
    sp.error === "CredentialsSignin"
      ? "Email o contraseña incorrectos."
      : sp.error
        ? "No fue posible iniciar sesión."
        : null;

  async function handleLogin(formData: FormData) {
    "use server";
    const explicitTarget = safeNext(String(formData.get("next") ?? ""));
    try {
      // Si no se pidió un next explícito, NextAuth redirige al callback default ("/")
      // Lo capturamos y reasignamos según el kind del usuario en el server component
      // que renderiza /. Como NextAuth necesita un redirectTo concreto, usamos /api/auth/post-login
      // que decide según session.
      const redirectTo = explicitTarget || "/api/auth/post-login";
      await signIn("credentials", {
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        redirectTo,
      });
    } catch (e) {
      if (e instanceof AuthError) {
        const qs = new URLSearchParams({ error: e.type });
        if (explicitTarget) qs.set("next", explicitTarget);
        redirect(`/cms/login?${qs.toString()}`);
      }
      throw e;
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-6"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo size={1.2} />
        </div>

        <div className="lg rounded-2xl p-8">
          <h1 className="mb-1 text-[22px] font-semibold text-white">
            CMS Labstream
          </h1>
          <p className="mb-7 text-[13px] text-white/60">
            Ingresa con tu cuenta del equipo
          </p>

          {errorMsg && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-300">
              {errorMsg}
            </div>
          )}

          <form action={handleLogin} className="flex flex-col gap-3">
            <input type="hidden" name="next" value={next} />
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
                Email
              </span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white focus:border-orange/50 focus:outline-none"
                defaultValue="admin@labstream.local"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
                Contraseña
              </span>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white focus:border-orange/50 focus:outline-none"
              />
            </label>

            <button type="submit" className="btn-primary mt-3 justify-center">
              Iniciar sesión
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[12px] text-white/40">
          ¿Olvidaste tu contraseña? Contacta al super admin.
        </p>
      </div>
    </div>
  );
}
