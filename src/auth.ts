import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Authentik from "next-auth/providers/authentik";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import type { CmsRole, UserKind } from "@prisma/client";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

/**
 * SSO con Authentik (el del NAS) — OPCIONAL y gateado por env. Si las tres
 * variables no están, el provider no se añade y el login sigue siendo solo
 * email+contraseña. Para activarlo: crea un proveedor OAuth2/OpenID + una
 * Application en Authentik y define AUTHENTIK_ISSUER / AUTHENTIK_CLIENT_ID /
 * AUTHENTIK_CLIENT_SECRET. Ver docs/SSO-AUTHENTIK.md.
 */
export const authentikEnabled = Boolean(
  process.env.AUTHENTIK_ISSUER &&
    process.env.AUTHENTIK_CLIENT_ID &&
    process.env.AUTHENTIK_CLIENT_SECRET,
);

/**
 * Auto-provisión por SSO: las cuentas de Authentik con email de este dominio
 * que aún no existen en la app se crean solas como Equipo (TEAM) la primera vez
 * que entran. Las de otros dominios (externos) se rechazan. Configurable por
 * env; "" desactiva la auto-provisión (solo entran usuarios pre-creados).
 */
const AUTHENTIK_PROVISION_DOMAIN = (
  process.env.AUTHENTIK_PROVISION_DOMAIN ?? "labstreamsas.com"
)
  .toLowerCase()
  .trim();

const providers: NextAuthConfig["providers"] = [
  Credentials({
    credentials: {
      email: {},
      password: {},
    },
    authorize: async (rawCreds) => {
      const parsed = credentialsSchema.safeParse(rawCreds);
      if (!parsed.success) return null;

      const email = parsed.data.email.toLowerCase();
      // Anti fuerza-bruta: 10 intentos / 5 min por email.
      if (!rateLimit(`login:${email}`, 10, 5 * 60_000)) return null;

      const user = await prisma.user.findUnique({
        where: { email },
      });
      if (!user || !user.active) return null;

      const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!ok) return null;

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name ?? user.email,
        role: user.role,
        kind: user.kind,
      };
    },
  }),
];

if (authentikEnabled) {
  providers.push(
    Authentik({
      issuer: process.env.AUTHENTIK_ISSUER!,
      clientId: process.env.AUTHENTIK_CLIENT_ID!,
      clientSecret: process.env.AUTHENTIK_CLIENT_SECRET!,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/cms/login",
  },
  providers,
  callbacks: {
    /**
     * Para Authentik: entran (a) los usuarios que YA existen y están activos, o
     * (b) los del dominio permitido (AUTHENTIK_PROVISION_DOMAIN), que se
     * auto-provisionan como Equipo en el jwt. Los externos se rechazan. El
     * rol/kind siempre sale de nuestra BD, no de Authentik.
     */
    async signIn({ user, account }) {
      if (account?.provider !== "authentik") return true;
      const email = (user.email ?? "").toLowerCase();
      if (!email) return false;
      const dbUser = await prisma.user.findUnique({
        where: { email },
        select: { active: true },
      });
      // Usuario ya existente: dejamos entrar si está activo.
      if (dbUser) return dbUser.active;
      // No existe: solo lo dejamos pasar (para auto-provisionarlo en el jwt) si
      // su email es del dominio permitido. Externos → rechazo.
      return Boolean(
        AUTHENTIK_PROVISION_DOMAIN &&
          email.endsWith("@" + AUTHENTIK_PROVISION_DOMAIN),
      );
    },
    async jwt({ token, user, account }) {
      if (user) {
        // Login por Authentik: el `user` es el perfil del IdP (sin rol/kind);
        // emparejamos por email con nuestro usuario para sacar id/rol/kind.
        if (account?.provider === "authentik") {
          const email = (user.email ?? "").toLowerCase();
          let dbUser = email
            ? await prisma.user.findUnique({ where: { email } })
            : null;
          // Auto-provisión: si no existe y el email es del dominio permitido,
          // lo creamos como Equipo (solo webapp, ve proyectos asignados). El
          // admin puede subirlo a Productor luego. Contraseña aleatoria (entra
          // por SSO).
          if (
            !dbUser &&
            email &&
            AUTHENTIK_PROVISION_DOMAIN &&
            email.endsWith("@" + AUTHENTIK_PROVISION_DOMAIN)
          ) {
            const hash = await bcrypt.hash(
              randomBytes(24).toString("hex"),
              12,
            );
            dbUser = await prisma.user.create({
              data: {
                email,
                name: user.name ?? email,
                kind: "TEAM",
                role: "EDITOR",
                active: true,
                passwordHash: hash,
              },
            });
          }
          if (dbUser && dbUser.active) {
            await prisma.user.update({
              where: { id: dbUser.id },
              data: { lastLoginAt: new Date() },
            });
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.kind = dbUser.kind;
            token.active = true;
            token.refreshedAt = Date.now();
          }
          return token;
        }
        token.id = user.id as string;
        token.role = (user as { role: CmsRole }).role;
        token.kind = (user as { kind: UserKind }).kind;
        token.active = true;
        token.refreshedAt = Date.now();
        return token;
      }
      // Refresco periódico desde la BD (máx cada 60s) para que la
      // desactivación y la degradación de rol surtan efecto sin esperar a que
      // caduque el JWT. Sin esto, un usuario desactivado conserva acceso.
      const now = Date.now();
      if (!token.refreshedAt || now - token.refreshedAt > 60_000) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { active: true, kind: true, role: true },
        });
        token.active = Boolean(dbUser?.active);
        if (dbUser) {
          token.kind = dbUser.kind;
          token.role = dbUser.role;
        }
        token.refreshedAt = now;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as CmsRole;
        session.user.kind = token.kind as UserKind;
        session.user.active = token.active !== false;
      }
      return session;
    },
  },
});
