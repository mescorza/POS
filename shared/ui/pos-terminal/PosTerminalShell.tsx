import * as React from "react";
import "./pos-terminal.css";

/**
 * Marco visual común de las ventanas verdes del POS: sólo presentación
 * (tamaño, tema oscuro/verde). No conoce reglas de negocio de ningún módulo.
 * Ver 35.3 del documento de arquitectura: shared/ui/pos-terminal.
 */
export interface PosTerminalShellProps {
  children: React.ReactNode;
}

export function PosTerminalShell({ children }: PosTerminalShellProps) {
  return (
    <div className="pos-terminal-shell">
      <div className="pos-terminal-window">{children}</div>
    </div>
  );
}
