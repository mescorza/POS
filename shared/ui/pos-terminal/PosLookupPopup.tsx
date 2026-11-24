import * as React from "react";

/**
 * Pop-up de lookup (docs/proveedores_mantenedor.md §6): ventana modal sobre
 * el formulario para BUSCAR y SELECCIONAR un registro de un maestro
 * (código + descripción). No crea ni modifica nada: los maestros se mantienen
 * en otras opciones del menú. Un único componente sirve a todos los campos
 * codificados; sólo cambia el título y de dónde vienen los datos.
 *
 * Teclas: escribir filtra, ↑↓ mueve, AvPág/RePág pagina, Inicio/Fin salta,
 * Enter selecciona, Esc cancela. Captura TODO el teclado a nivel de ventana
 * mientras está abierto (stopPropagation) para que el formulario de abajo no
 * reaccione y para que Esc funcione aunque el foco se haya salido del campo.
 */
export interface LookupRow {
  id: string;
  name: string;
}

export interface LookupPage {
  items: LookupRow[];
  total: number;
}

export interface PosLookupPopupProps {
  title: string;
  /** Texto bajo el título cuando el maestro está filtrado por un padre. */
  subtitle?: string;
  /** Código actual del campo, para dejarlo marcado si está en la página. */
  currentId?: string;
  /** Texto con el que arranca la búsqueda (p. ej. la primera tecla tipeada). */
  initialQuery?: string;
  fetchPage: (q: string, page: number, size: number) => Promise<LookupPage>;
  onSelect: (row: LookupRow) => void;
  onClose: () => void;
}

const SIZE = 8;
const DEBOUNCE_MS = 200;

export function PosLookupPopup({
  title,
  subtitle,
  currentId,
  initialQuery = "",
  fetchPage,
  onSelect,
  onClose,
}: PosLookupPopupProps) {
  const [query, setQuery] = React.useState(initialQuery);
  const [applied, setApplied] = React.useState(initialQuery);
  const [page, setPage] = React.useState(1);
  const [data, setData] = React.useState<LookupPage | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState(0);
  const pendingLast = React.useRef(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setApplied((prev) => {
        if (prev !== query) setPage(1);
        return query;
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const requestId = React.useRef(0);
  React.useEffect(() => {
    const id = ++requestId.current;
    setError(null);
    fetchPage(applied, page, SIZE)
      .then((r) => {
        if (id !== requestId.current) return;
        setData(r);
        const last = Math.max(r.items.length - 1, 0);
        if (pendingLast.current) {
          setSelected(last);
        } else {
          const i = currentId ? r.items.findIndex((x) => x.id === currentId) : -1;
          setSelected(i >= 0 ? i : 0);
        }
        pendingLast.current = false;
      })
      .catch((e) => {
        if (id !== requestId.current) return;
        setError(e instanceof Error ? e.message : String(e));
      });
    // fetchPage cambia de identidad en cada render del padre; el efecto
    // depende sólo de lo que realmente cambia la consulta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied, page]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(Math.ceil(total / SIZE), 1);

  const handleKeyDown = (event: KeyboardEvent | React.KeyboardEvent) => {
    // Todo lo que se teclea mientras el pop-up está abierto es del pop-up, no
    // del formulario de atrás (p. ej. F5 no debe guardar por detrás).
    event.stopPropagation();

    switch (event.key) {
      case "Escape":
        event.preventDefault();
        onClose();
        return;
      case "Enter":
        event.preventDefault();
        if (items[selected]) onSelect(items[selected]);
        return;
      case "ArrowDown":
        event.preventDefault();
        if (selected < items.length - 1) setSelected(selected + 1);
        else if (page < totalPages) setPage(page + 1);
        return;
      case "ArrowUp":
        event.preventDefault();
        if (selected > 0) setSelected(selected - 1);
        else if (page > 1) {
          pendingLast.current = true;
          setPage(page - 1);
        }
        return;
      case "PageDown":
        event.preventDefault();
        if (page < totalPages) setPage(page + 1);
        return;
      case "PageUp":
        event.preventDefault();
        if (page > 1) setPage(page - 1);
        return;
      case "Home":
        if (event.ctrlKey || items.length) {
          event.preventDefault();
          setSelected(0);
          if (page !== 1) setPage(1);
        }
        return;
      case "End":
        event.preventDefault();
        if (page !== totalPages) {
          pendingLast.current = true;
          setPage(totalPages);
        } else setSelected(Math.max(items.length - 1, 0));
        return;
    }
  };

  // El teclado se escucha a nivel de ventana (fase de captura), no sólo en el
  // campo de búsqueda: si el foco se sale de él (p. ej. un clic sobre el texto
  // "No hay registros"), Esc/Enter/flechas deben seguir funcionando. Sin esto,
  // con 0 resultados -- donde no hay filas que elegir -- el pop-up quedaba
  // atrapado. El ref evita re-registrar el listener en cada render.
  const keyHandlerRef = React.useRef(handleKeyDown);
  keyHandlerRef.current = handleKeyDown;
  React.useEffect(() => {
    const listener = (e: KeyboardEvent) => keyHandlerRef.current(e);
    window.addEventListener("keydown", listener, true);
    return () => window.removeEventListener("keydown", listener, true);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
      }}
      // Ventana modal: un clic en cualquier parte que no sea el campo de
      // búsqueda no debe quitarle el foco (los clics sobre las filas siguen
      // funcionando; sólo se evita el cambio de foco).
      onMouseDown={(e) => {
        if (e.target !== inputRef.current) e.preventDefault();
      }}
    >
      <div
        role="dialog"
        aria-label={title}
        style={{
          background: "var(--pos-bg)",
          color: "var(--pos-fg)",
          border: "2px solid var(--pos-border)",
          fontFamily: "var(--pos-font)",
          width: 460,
          maxWidth: "92vw",
          padding: "10px 16px",
        }}
      >
        <div style={{ fontWeight: "bold", color: "var(--pos-fg-highlight)" }}>-- {title} --</div>
        {subtitle && <div style={{ color: "var(--pos-fg-dim)" }}>{subtitle}</div>}

        <label style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0" }}>
          <span>Buscar</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            // Modal: si el foco se pierde por otra vía, vuelve al buscador.
            onBlur={() => setTimeout(() => inputRef.current?.focus(), 0)}
            style={{
              flex: 1,
              background: "var(--pos-bg)",
              color: "var(--pos-fg)",
              border: "1px solid var(--pos-fg-dim)",
              fontFamily: "var(--pos-font)",
              padding: "2px 6px",
            }}
          />
        </label>

        {error && <p style={{ color: "var(--pos-fg-highlight)" }}>{error}</p>}
        {!error && data === null && <p>Cargando...</p>}
        {!error && data !== null && items.length === 0 && (
          <p style={{ color: "var(--pos-fg-dim)" }}>
            {applied ? `Sin resultados para "${applied}".` : "No hay registros."}
          </p>
        )}

        {items.length > 0 && (
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", width: 70, padding: "2px 8px 4px 0" }}>Cód</th>
                <th style={{ textAlign: "left", padding: "2px 0 4px" }}>Descripción</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, i) => {
                const isSel = i === selected;
                const cell = {
                  padding: "2px 8px 2px 0",
                  background: isSel ? "var(--pos-selection-bg)" : "transparent",
                  color: isSel ? "var(--pos-fg-highlight)" : "var(--pos-fg)",
                };
                return (
                  <tr key={row.id} onClick={() => onSelect(row)} style={{ cursor: "pointer" }}>
                    <td style={cell}>
                      {isSel ? "»" : " "}
                      {row.id}
                    </td>
                    <td style={cell}>{row.name}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div style={{ marginTop: 8, color: "var(--pos-fg-dim)", fontSize: 13 }}>
          Pág. {page}/{totalPages} — {total} registro{total === 1 ? "" : "s"}
        </div>
        <div style={{ marginTop: 6, borderTop: "1px solid var(--pos-fg-dim)", paddingTop: 6, fontSize: 13 }}>
          <span style={{ color: "var(--pos-fg-highlight)", fontWeight: "bold" }}>Enter</span> Selecciona{"  "}
          <span style={{ color: "var(--pos-fg-highlight)", fontWeight: "bold" }}>↑↓ AvPág/RePág</span> Mover{"  "}
          <span style={{ color: "var(--pos-fg-highlight)", fontWeight: "bold" }}>Esc</span> Cancela
        </div>
      </div>
    </div>
  );
}
