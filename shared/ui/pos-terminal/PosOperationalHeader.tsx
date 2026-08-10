import * as React from "react";

/**
 * Tienda, terminal, usuario conectado, conectividad y sincronización.
 * Por ahora sólo presenta contexto fijo/placeholder; se conectará a un
 * puerto de sesión operacional real más adelante.
 */
export interface PosOperationalHeaderProps {
  store?: string;
  terminal?: string;
  user?: string;
  connectivity?: "online" | "offline";
}

export function PosOperationalHeader({
  store = "-",
  terminal = "-",
  user = "sin sesión",
  connectivity = "offline",
}: PosOperationalHeaderProps) {
  return (
    <div className="pos-operational-header">
      <span>Tienda: {store}</span>
      <span>Terminal: {terminal}</span>
      <span>Usuario: {user}</span>
      <span>{connectivity === "online" ? "● conectado" : "○ sin conexión"}</span>
    </div>
  );
}
