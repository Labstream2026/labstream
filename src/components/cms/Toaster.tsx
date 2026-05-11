"use client";

import { useEffect } from "react";
import { Toaster as SonnerToaster, toast } from "sonner";

const COOKIE = "cms_flash";

type Flash = {
  kind: "success" | "error" | "info";
  message: string;
  fieldErrors?: Record<string, string>;
};

function readFlash(): Flash | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE}=`));
  if (!match) return null;
  const raw = match.slice(COOKIE.length + 1);
  // Clear immediately so a refresh doesn't re-fire it.
  document.cookie = `${COOKIE}=; path=/; max-age=0; samesite=lax`;
  try {
    return JSON.parse(decodeURIComponent(raw)) as Flash;
  } catch {
    return null;
  }
}

function FlashReader() {
  useEffect(() => {
    const flash = readFlash();
    if (!flash) return;
    // Defer to next tick so Sonner's <Toaster> has registered with the toast store.
    const timer = setTimeout(() => {
      console.log("[FlashReader] firing toast:", flash);
      if (flash.kind === "success") {
        toast.success(flash.message, { duration: 3000 });
      } else if (flash.kind === "error") {
        toast.error(flash.message, { duration: 6000 });
      } else {
        toast(flash.message, { duration: 4000 });
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  return null;
}

export function CmsToaster() {
  return (
    <>
      <SonnerToaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          classNames: {
            toast:
              "!bg-[#141414] !border !border-white/10 !text-white !rounded-xl !shadow-lg",
            success: "!border-green-500/30",
            error: "!border-red-500/30",
            title: "!font-medium !text-[13px]",
            description: "!text-[12px] !text-white/60",
          },
        }}
      />
      <FlashReader />
    </>
  );
}
