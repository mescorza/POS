import * as React from "react";

/** Encabezado de sección subrayado (ej. "IDENTIDAD Y CUENTA"), como en los
 * mockups V6/V9 de POS_..._USUARIOS_V2 (Figuras V6-2/V8-1/V9-1). */
export function PosSectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: "16px 0 8px",
        fontWeight: "bold",
        borderBottom: "1px solid var(--pos-fg-dim)",
        paddingBottom: 2,
      }}
    >
      {children}
    </p>
  );
}
