"use client";

import { useEffect, useRef } from "react";

type Props = {
  /** Spanish message shown by the browser native confirm if user tries to leave. */
  unsavedMessage?: string;
};

/**
 * Drop this component anywhere inside a `<form>` to wire up:
 *
 * - Cmd/Ctrl+S → submits the enclosing form
 * - beforeunload warning when there are unsaved changes (any input/change event
 *   on a field has fired since the last submit)
 *
 * It auto-discovers the closest ancestor <form> element on mount. Re-rendering
 * the same form is harmless — the listeners are de-duped via cleanup.
 */
export function FormShortcuts({
  unsavedMessage = "Hay cambios sin guardar. ¿Quieres salir igual?",
}: Props) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const dirtyRef = useRef(false);

  useEffect(() => {
    const form = anchorRef.current?.closest("form");
    if (!form) return;

    const onChange = () => {
      dirtyRef.current = true;
    };
    const onSubmit = () => {
      dirtyRef.current = false;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (typeof form.requestSubmit === "function") form.requestSubmit();
        else form.submit();
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      // Modern browsers show their own generic message; setting returnValue is
      // still required to trigger the prompt.
      e.returnValue = unsavedMessage;
      return unsavedMessage;
    };

    form.addEventListener("input", onChange);
    form.addEventListener("change", onChange);
    form.addEventListener("submit", onSubmit);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      form.removeEventListener("input", onChange);
      form.removeEventListener("change", onChange);
      form.removeEventListener("submit", onSubmit);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [unsavedMessage]);

  return <span ref={anchorRef} aria-hidden="true" className="hidden" />;
}
