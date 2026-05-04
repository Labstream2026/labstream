"use client";

import { useEffect, useState } from "react";

const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "573000000000";
const WA_MESSAGE = "Hola, vengo de la web de Labstream Studio.";

export function WhatsAppFloat() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <a
      href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MESSAGE)}`}
      target="_blank"
      rel="noreferrer"
      aria-label="WhatsApp"
      className={`fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all duration-500 ${
        visible ? "scale-100 opacity-100" : "scale-50 opacity-0"
      }`}
      style={{
        background: "#25D366",
        boxShadow: "0 8px 24px rgba(37,211,102,0.5)",
      }}
    >
      <svg
        viewBox="0 0 32 32"
        width="28"
        height="28"
        fill="white"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M16 0C7.2 0 0 7.2 0 16c0 2.8.8 5.6 2.2 8L0 32l8.2-2.2C10.6 31.2 13.2 32 16 32c8.8 0 16-7.2 16-16S24.8 0 16 0zm0 29.4c-2.6 0-5.2-.8-7.4-2.2l-.6-.4-5 1.4 1.4-4.8-.4-.6c-1.4-2.2-2.2-4.8-2.2-7.4 0-7.4 6-13.4 13.4-13.4s13.4 6 13.4 13.4-6 13.4-13.4 13.4zm7.4-10c-.4-.2-2.4-1.2-2.8-1.4s-.6-.2-.8.2-1 1.4-1.2 1.6-.4.2-.8 0c-.4-.2-1.8-.6-3.4-2-1.2-1.2-2-2.6-2.2-3-.2-.4 0-.6.2-.8.2-.2.4-.4.6-.8.2-.2.2-.4.4-.8s0-.6 0-.8c0-.2-.8-2-1.2-2.8-.4-.6-.6-.6-.8-.6h-.8c-.2 0-.6.2-.8.4-.4.4-1.2 1.2-1.2 3 0 1.8 1.2 3.6 1.4 3.8s2.6 4 6.4 5.6c2.4 1 3.4 1 4.6.8.6 0 2.4-1 2.8-1.8.4-.8.4-1.6.2-1.8 0-.2-.4-.2-.8-.4z" />
      </svg>
    </a>
  );
}
