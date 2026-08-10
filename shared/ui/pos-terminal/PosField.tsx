import * as React from "react";

/** Campo etiquetado accesible, sin reglas de dominio (35.3 del documento). */
export interface PosFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  autoFocus?: boolean;
  type?: string;
}

export function PosField({ label, value, onChange, readOnly, autoFocus, type = "text" }: PosFieldProps) {
  return (
    <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
      <span style={{ width: 140, flexShrink: 0 }}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        autoFocus={autoFocus}
        style={{
          background: "var(--pos-bg)",
          color: readOnly ? "var(--pos-fg-dim)" : "var(--pos-fg)",
          border: "1px solid var(--pos-fg-dim)",
          fontFamily: "var(--pos-font)",
          padding: "2px 6px",
          flex: 1,
          maxWidth: 320,
        }}
      />
    </label>
  );
}
