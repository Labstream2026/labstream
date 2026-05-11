import { cookies } from "next/headers";

const COOKIE = "cms_flash";

export type FlashKind = "success" | "error" | "info";

export type Flash = {
  kind: FlashKind;
  message: string;
  /** Optional per-field validation errors (used by Zod parsing). */
  fieldErrors?: Record<string, string>;
};

/**
 * Set a one-shot toast on the next CMS page render. Call from server actions
 * before redirecting. The cookie is consumed by `<FlashReader>` on the client.
 */
export async function setFlash(flash: Flash): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, encodeURIComponent(JSON.stringify(flash)), {
    httpOnly: false, // client reads it
    sameSite: "lax",
    path: "/",
    maxAge: 30,
  });
}

export async function setSuccess(message: string): Promise<void> {
  await setFlash({ kind: "success", message });
}

export async function setError(
  message: string,
  fieldErrors?: Record<string, string>,
): Promise<void> {
  await setFlash({ kind: "error", message, fieldErrors });
}

/**
 * Read and clear the flash. Server-side use (e.g. in a server component that
 * passes it to a client `<Toaster>`); the client reader handles the common case.
 */
export async function consumeFlash(): Promise<Flash | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  store.set(COOKIE, "", { path: "/", maxAge: 0 });
  try {
    return JSON.parse(decodeURIComponent(raw)) as Flash;
  } catch {
    return null;
  }
}
