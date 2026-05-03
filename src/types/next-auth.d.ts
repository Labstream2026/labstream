import type { CmsRole, UserKind } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role: CmsRole;
    kind: UserKind;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      role: CmsRole;
      kind: UserKind;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: CmsRole;
    kind: UserKind;
  }
}
