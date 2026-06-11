import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import type { CmsRole, UserKind } from "@prisma/client";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/cms/login",
  },
  providers: [
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
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
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
