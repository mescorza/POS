import * as React from "react";

export interface PosFunctionKey {
  key: string;
  label: string;
}

export interface PosFunctionKeyBarProps {
  keys: PosFunctionKey[];
}

/** Mapeo visible de teclas de función al pie de la ventana (F2/F3/.../Esc). */
export function PosFunctionKeyBar({ keys }: PosFunctionKeyBarProps) {
  return (
    <div className="pos-function-key-bar">
      {keys.map((k) => (
        <span key={k.key}>
          <span className="key">{k.key}</span>
          {k.label}
        </span>
      ))}
    </div>
  );
}
