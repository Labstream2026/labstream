import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  email: z.string().email().max(160),
  name: z.string().max(120).optional(),
  source: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  await prisma.newsletterSignup
    .upsert({
      where: { email: parsed.data.email.toLowerCase() },
      update: { name: parsed.data.name },
      create: {
        email: parsed.data.email.toLowerCase(),
        name: parsed.data.name,
        source: parsed.data.source ?? "footer",
      },
    })
    .catch(() => null);

  return NextResponse.json({ ok: true });
}
