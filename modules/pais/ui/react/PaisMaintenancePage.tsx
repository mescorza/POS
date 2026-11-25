import * as React from "react";
import { PosTerminalShell } from "../../../../shared/ui/pos-terminal/PosTerminalShell";
import { PosFunctionKeyBar } from "../../../../shared/ui/pos-terminal/PosFunctionKeyBar";
import { PosField } from "../../../../shared/ui/pos-terminal/PosField";
import { usePosFocus } from "../../../../shared/ui/pos-terminal/usePosFocus";
import { PaisHttpGateway, PaisSearchResult } from "../../infrastructure/PaisHttpGateway";

/**
 * Administra Direcciones > Mantenedor de Países (pos.pais).
 * Etapa 1: sólo consulta (lista paginada + búsqueda por nombre, código,
 * ISO, SAAD o continente).
 * Teclas: ↑↓ mueve, AvPág/RePág pagina, Inicio/Fin salta, F2 busca,
 * Esc/F9 vuelve. Alta, edición y baja vendrán en etapas siguientes.
 */
export interface PaisMaintenancePageProps {
  onBack: () => void;
}

const PAGE_SIZE = 15;
const DEBOUNCE_MS = 250;
const headerSpan = { fontWeight: "bold", color: "var(--pos-fg)" } as const;

const gateway = new PaisHttpGateway();

export function PaisMaintenancePage({ onBack }: PaisMaintenancePageProps) {
  const [result, setResult] = React.useState<PaisSearchResult | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const pendingSelect = React.useRef<"first" | "last" | null>(null);

  const [searching, setSearching] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [appliedQuery, setAppliedQuery] = React.useState("");

  const bodyRef = usePosFocus<HTMLDivElement>("browsing");

  // Debounce de la búsqueda: cada pausa de tipeo vuelve a la página 1.
  React.useEffect(() => {
    const t = setTimeout(() => {
      setAppliedQuery((prev) => {
        if (prev !== searchQuery) setPage(1);
        return searchQuery;
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchQuery]);

  React.useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    gateway
      .search(appliedQuery, page, PAGE_SIZE)
      .then((r) => {
        if (cancelled) return;
        setResult(r);
        const last = Math.max(r.items.length - 1, 0);
        setSelectedIndex(pendingSelect.current === "last" ? last : 0);
        pendingSelect.current = null;
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [appliedQuery, page]);

  const items = result?.items ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (searching) {
      if (event.key === "Enter") {
        event.preventDefault();
        setSearching(false);
        setAppliedQuery(searchQuery); // aplica ya, sin esperar el debounce
        bodyRef.current?.focus();
      } else if (event.key === "Escape") {
        event.preventDefault();
        setSearching(false);
        setSearchQuery("");
        bodyRef.current?.focus();
      }
      return;
    }

    switch (event.key) {
      case "F9":
      case "Escape":
        event.preventDefault();
        onBack();
        return;
      case "F2":
        event.preventDefault();
        setSearching(true);
        return;
      case "ArrowDown":
        event.preventDefault();
        if (selectedIndex < items.length - 1) setSelectedIndex(selectedIndex + 1);
        else if (page < totalPages) setPage(page + 1);
        return;
      case "ArrowUp":
        event.preventDefault();
        if (selectedIndex > 0) setSelectedIndex(selectedIndex - 1);
        else if (page > 1) {
          pendingSelect.current = "last";
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
        event.preventDefault();
        setSelectedIndex(0);
        if (page !== 1) setPage(1);
        return;
      case "End":
        event.preventDefault();
        if (page !== totalPages) {
          pendingSelect.current = "last";
          setPage(totalPages);
        } else setSelectedIndex(Math.max(items.length - 1, 0));
        return;
    }
  };

  return (
    <PosTerminalShell>
      <div className="pos-operational-header">
        <span style={headerSpan}>ADRIAZOLA REPUESTOS</span>
        <span style={headerSpan}>MANTENCIÓN DE PAÍSES</span>
        <span style={headerSpan}>POS TIENDA</span>
      </div>
      <div className="pos-terminal-body" tabIndex={0} onKeyDown={handleKeyDown} ref={bodyRef}>
        {loadError && <p style={{ color: "var(--pos-fg-highlight)" }}>Error consultando /paises: {loadError}</p>}

        {searching && (
          <PosField label="Buscar (nombre/cód/ISO)" value={searchQuery} onChange={setSearchQuery} autoFocus />
        )}

        {!loadError && result === null && <p>Cargando países...</p>}

        {!loadError && result !== null && items.length === 0 && (
          <p>{appliedQuery ? `Sin resultados para "${appliedQuery}".` : "No hay países registrados."}</p>
        )}

        {!loadError && items.length > 0 && (
          <>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  {["Cód", "Nombre", "Continente", "ISO", "SAAD", "Regiones", "Proveedores"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "2px 12px 6px 0" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((p, i) => {
                  const isSelected = i === selectedIndex;
                  const cell = {
                    padding: "2px 12px 2px 0",
                    background: isSelected ? "var(--pos-selection-bg)" : "transparent",
                    color: isSelected ? "var(--pos-fg-highlight)" : "var(--pos-fg)",
                  };
                  return (
                    <tr key={p.id}>
                      <td style={cell}>
                        {isSelected ? "» " : "  "}
                        {p.id}
                      </td>
                      <td style={cell}>{p.nombre || "-"}</td>
                      <td style={cell}>{p.continente || `(${p.continenteId})`}</td>
                      <td style={cell}>{p.iso2 || "-"}</td>
                      <td style={cell}>{p.saad || "-"}</td>
                      <td style={cell}>{p.regiones}</td>
                      <td style={cell}>{p.proveedores}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ marginTop: 8, color: "var(--pos-fg-dim)" }}>
              Página {page} de {totalPages} — {total} registro{total === 1 ? "" : "s"}
            </div>
          </>
        )}
      </div>
      <PosFunctionKeyBar
        keys={[
          { key: "↑↓", label: "Mover selección" },
          { key: "AvPág/RePág", label: "Página" },
          { key: "Inicio/Fin", label: "Primero/Último" },
          { key: "F2", label: searching ? "Enter=Confirma Esc=Cancela" : "Buscar" },
          { key: "F9", label: "Volver" },
        ]}
      />
    </PosTerminalShell>
  );
}
