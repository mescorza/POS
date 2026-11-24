import * as React from "react";

/**
 * Ventana de error modal, centrada y destacada (borde y título en rojo sobre
 * el fondo oscurecido). Explica QUÉ falló y, si se sabe, cómo resolverlo.
 * Se cierra con Enter, Esc o Espacio. Mientras está abierta captura todo el
 * teclado a nivel de ventana (como PosLookupPopup), para que la pantalla de
 * atrás no reaccione, y al cerrarse devuelve el foco al elemento que lo tenía.
 */
export interface PosErrorPopupProps {
  /** Qué se estaba intentando hacer: "No se pudo crear el proveedor". */
  title: string;
  /** Explicación del error y, si aplica, qué hacer. */
  message: string;
  onClose: () => void;
}

const ERROR_COLOR = "#ff5f5f";

export function PosErrorPopup({ title, message, onClose }: PosErrorPopupProps) {
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  React.useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;

    const listener = (event: KeyboardEvent) => {
      // Todo el teclado es de esta ventana mientras está abierta.
      event.stopPropagation();
      if (event.key === "Enter" || event.key === "Escape" || event.key === " ") {
        event.preventDefault();
        onCloseRef.current();
      } else if (event.key.startsWith("F") && event.key.length <= 3) {
        // F5 y otras teclas de función no deben recargar ni actuar por detrás.
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", listener, true);
    return () => {
      window.removeEventListener("keydown", listener, true);
      // El foco vuelve a donde estaba (campo o cuerpo de la pantalla).
      setTimeout(() => previous?.isConnected && previous.focus(), 0);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 20,
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div
        role="alertdialog"
        aria-label={title}
        aria-describedby="pos-error-message"
        style={{
          background: "var(--pos-bg)",
          color: "var(--pos-fg)",
          border: `3px solid ${ERROR_COLOR}`,
          boxShadow: `0 0 24px ${ERROR_COLOR}66`,
          fontFamily: "var(--pos-font)",
          width: 560,
          maxWidth: "92vw",
          padding: 0,
        }}
      >
        <div
          style={{
            background: ERROR_COLOR,
            color: "#000",
            fontWeight: "bold",
            padding: "6px 16px",
            letterSpacing: 1,
          }}
        >
          ERROR
        </div>
        <div style={{ padding: "14px 18px" }}>
          <div style={{ color: ERROR_COLOR, fontWeight: "bold", fontSize: 16, marginBottom: 10 }}>{title}</div>
          <div id="pos-error-message" style={{ lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
            {message}
          </div>
        </div>
        <div
          style={{
            borderTop: `1px solid ${ERROR_COLOR}`,
            padding: "8px 18px",
            fontSize: 13,
            color: "var(--pos-fg-dim)",
          }}
        >
          <span style={{ color: "var(--pos-fg-highlight)", fontWeight: "bold" }}>Enter / Esc</span> Cerrar
        </div>
      </div>
    </div>
  );
}
