"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";

type Variant = "danger" | "warn" | "neutral";

type Props = {
  /** Visible button content (icon, text, etc.) */
  children: React.ReactNode;
  /** Class for the trigger button. Defaults to a subtle red ghost. */
  className?: string;
  /** Accessible name for the trigger when `children` is an icon. */
  ariaLabel?: string;
  /** Title of the confirm dialog (e.g. "Eliminar proyecto"). */
  title: string;
  /** Optional descriptive paragraph below the title. */
  description?: React.ReactNode;
  /** Confirm button label inside the dialog (defaults to "Confirmar"). */
  confirmLabel?: string;
  /** Cancel button label (defaults to "Cancelar"). */
  cancelLabel?: string;
  /** Visual style of the confirm button. */
  variant?: Variant;
  /** Form action to call once the user confirms — the same `(formData) => …`
   *  server action the original button would submit to. */
  action: (formData: FormData) => Promise<void> | void;
  /** Hidden form fields to include in the submission (e.g. record id). */
  hiddenFields?: Record<string, string>;
};

export function ConfirmButton({
  children,
  className,
  ariaLabel,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  action,
  hiddenFields,
}: Props) {
  const [open, setOpen] = useState(false);

  const variantClass =
    variant === "danger"
      ? "bg-red-500/90 hover:bg-red-500 text-white"
      : variant === "warn"
        ? "bg-yellow-500/90 hover:bg-yellow-500 text-black"
        : "bg-white/10 hover:bg-white/15 text-white";

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={
            className ??
            "rounded-md border border-red-500/20 px-2.5 py-2 text-[12px] text-red-300 hover:bg-red-500/10"
          }
        >
          {children}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[10001] w-[min(440px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#141414] p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <Dialog.Title className="text-[16px] font-semibold text-white">
            {title}
          </Dialog.Title>
          {description && (
            <Dialog.Description className="mt-2 text-[13px] leading-relaxed text-white/65">
              {description}
            </Dialog.Description>
          )}

          <form
            action={action}
            className="mt-5 flex items-center justify-end gap-2"
          >
            {hiddenFields &&
              Object.entries(hiddenFields).map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-md border border-white/10 px-4 py-2 text-[13px] text-white/75 hover:bg-white/5"
              >
                {cancelLabel}
              </button>
            </Dialog.Close>
            <button
              type="submit"
              className={`rounded-md px-4 py-2 text-[13px] font-medium ${variantClass}`}
            >
              {confirmLabel}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
