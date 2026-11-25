import * as React from "react";
import { PosTerminalShell } from "../../../../shared/ui/pos-terminal/PosTerminalShell";
import { PosFunctionKeyBar } from "../../../../shared/ui/pos-terminal/PosFunctionKeyBar";
import { PosField } from "../../../../shared/ui/pos-terminal/PosField";
import { usePosFocus } from "../../../../shared/ui/pos-terminal/usePosFocus";
import { PosErrorPopup } from "../../../../shared/ui/pos-terminal/PosErrorPopup";
import { PosLookupPopup } from "../../../../shared/ui/pos-terminal/PosLookupPopup";
import { ContinenteHttpGateway } from "../../../continente/infrastructure/ContinenteHttpGateway";
import { PaisHttpGateway, PaisSearchResult } from "../../infrastructure/PaisHttpGateway";

/**
 * Administra Direcciones > Mantenedor de Países (pos.pais).
 * Consulta (lista paginada + búsqueda por nombre, código, ISO, SAAD o
 * continente) y alta.
 * Teclas: ↑↓ mueve, AvPág/RePág pagina, Inicio/Fin salta, F2 busca,
 * F3 nuevo, Esc/F9 vuelve. En el formulario de alta: Enter avanza al campo
 * siguiente (en Continente abre el pop-up de búsqueda; en el último graba),
 * F5 graba, Esc cancela. El código lo asigna el sistema. Edición y baja
 * vendrán en etapas siguientes.
 */
export interface PaisMaintenancePageProps {
  onBack: () => void;
}

const PAGE_SIZE = 15;
const DEBOUNCE_MS = 250;
const headerSpan = { fontWeight: "bold", color: "var(--pos-fg)" } as const;

const MAX = { nombre: 100, iso2: 3, saad: 8, saadDescripcion: 100 } as const;
/** Posición del campo Continente entre los campos enfocables del formulario (sin Código). */
const CONTINENTE_FIELD = 1;

interface Draft {
  nombre: string;
  continenteId: number | null;
  continente: string;
  iso2: string;
  saad: string;
  saadDescripcion: string;
}
const EMPTY: Draft = { nombre: "", continenteId: null, continente: "", iso2: "", saad: "", saadDescripcion: "" };

const gateway = new PaisHttpGateway();
const continentes = new ContinenteHttpGateway();

export function PaisMaintenancePage({ onBack }: PaisMaintenancePageProps) {
  const [result, setResult] = React.useState<PaisSearchResult | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const pendingSelect = React.useRef<"first" | "last" | null>(null);

  const [searching, setSearching] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [appliedQuery, setAppliedQuery] = React.useState("");

  // Alta: formulario en la misma ventana.
  const [creating, setCreating] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft>(EMPTY);
  const [saving, setSaving] = React.useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = React.useState(false);
  const [lookupOpen, setLookupOpen] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<{ title: string; message: string } | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const formRef = React.useRef<HTMLDivElement>(null);
  const lookupOrigin = React.useRef<HTMLInputElement | null>(null);

  // Clave fija: si cambiara al abrir el formulario, usePosFocus enfocaría el cuerpo
  // y le quitaría el foco al campo Nombre (autoFocus sólo actúa al montarse).
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
  }, [appliedQuery, page, reloadKey]);

  const items = result?.items ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  /** Campos enfocables del formulario, sin el Código (primero y de sólo lectura). */
  const fields = (): HTMLInputElement[] =>
    Array.from(formRef.current?.querySelectorAll("input") ?? []).slice(1) as HTMLInputElement[];

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const dirty = JSON.stringify(draft) !== JSON.stringify(EMPTY);

  const startCreate = () => {
    setDraft(EMPTY);
    setNote(null);
    setConfirmingDiscard(false);
    setCreating(true);
  };

  const cancelCreate = () => {
    setConfirmingDiscard(false);
    setCreating(false);
    setDraft(EMPTY);
    setTimeout(() => bodyRef.current?.focus(), 0);
  };

  const save = async () => {
    if (saving) return;
    if (draft.continenteId === null) {
      setFormError({ title: "No se pudo crear el país", message: "Continente es obligatorio. Elíjalo con Enter o F2." });
      return;
    }
    setSaving(true);
    try {
      const creado = await gateway.create({
        nombre: draft.nombre,
        continenteId: draft.continenteId,
        iso2: draft.iso2,
        saad: draft.saad,
        saadDescripcion: draft.saadDescripcion,
      });
      setCreating(false);
      setDraft(EMPTY);
      setNote(`País creado: ${creado.id} - ${creado.nombre}.`);
      // El nuevo debe verse en la lista: se filtra por su nombre.
      setSearchQuery(creado.nombre);
      setAppliedQuery(creado.nombre);
      setPage(1);
      setReloadKey((k) => k + 1);
      setTimeout(() => bodyRef.current?.focus(), 0);
    } catch (e) {
      setFormError({
        title: "No se pudo crear el país",
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSaving(false);
    }
  };

  const openContinenteLookup = () => {
    lookupOrigin.current = fields()[CONTINENTE_FIELD] ?? null;
    setLookupOpen(true);
  };

  const closeLookup = (advance: boolean) => {
    const origin = lookupOrigin.current;
    setLookupOpen(false);
    // El foco vuelve al campo Continente, o pasa al siguiente si se eligió un valor.
    setTimeout(() => {
      const all = fields();
      const i = origin ? all.indexOf(origin) : -1;
      (advance ? all[i + 1] ?? origin : origin)?.focus();
    }, 0);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (creating) {
      if (confirmingDiscard) {
        if (event.key === "Enter") {
          event.preventDefault();
          cancelCreate();
        } else if (event.key === "Escape") {
          event.preventDefault();
          setConfirmingDiscard(false);
        }
        return;
      }
      const all = fields();
      const idx = all.indexOf(document.activeElement as HTMLInputElement);
      switch (event.key) {
        case "Enter":
          event.preventDefault();
          if (idx === CONTINENTE_FIELD) openContinenteLookup();
          else if (idx >= 0 && idx < all.length - 1) all[idx + 1].focus();
          else void save();
          return;
        case "F2":
          event.preventDefault();
          if (idx === CONTINENTE_FIELD) openContinenteLookup();
          return;
        case "F5":
          event.preventDefault();
          void save();
          return;
        case "Escape":
          event.preventDefault();
          if (dirty) setConfirmingDiscard(true);
          else cancelCreate();
          return;
      }
      return;
    }

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

    // Los avisos de una acción anterior se van con la siguiente tecla.
    if (note) setNote(null);

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
      case "F3":
        event.preventDefault();
        startCreate();
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

        {note && <p style={{ color: "#e0c341" }}>{note}</p>}

        {creating && (
          <div ref={formRef} style={{ marginBottom: 12 }}>
            <p style={{ margin: "0 0 8px", color: "var(--pos-fg-highlight)" }}>NUEVO PAÍS</p>
            <PosField label="Código" value="(automático)" onChange={() => undefined} readOnly />
            <PosField
              label="Nombre"
              value={draft.nombre}
              onChange={(v) => set("nombre", v.slice(0, MAX.nombre))}
              autoFocus
            />
            <PosField
              label="Continente"
              value={draft.continenteId === null ? "" : `${draft.continenteId} - ${draft.continente}`}
              onChange={() => undefined}
              readOnly
            />
            <PosField label="ISO2" value={draft.iso2} onChange={(v) => set("iso2", v.toUpperCase().slice(0, MAX.iso2))} />
            <PosField
              label="SAAD código"
              value={draft.saad}
              onChange={(v) => set("saad", v.toUpperCase().slice(0, MAX.saad))}
            />
            <PosField
              label="SAAD descripción"
              value={draft.saadDescripcion}
              onChange={(v) => set("saadDescripcion", v.slice(0, MAX.saadDescripcion))}
            />
            <p style={{ color: "var(--pos-fg-dim)", margin: "4px 0" }}>
              SAAD descripción vacía = se usa el nombre. Continente: Enter o F2 para buscar.
            </p>
            {confirmingDiscard && (
              <p style={{ color: "var(--pos-fg-highlight)" }}>¿Descartar el país nuevo? Enter = Sí, Esc = No</p>
            )}
            {saving && <p>Grabando...</p>}
          </div>
        )}

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
          ...(creating
            ? [
                { key: "Enter", label: "Siguiente / Continente: buscar" },
                { key: "F5", label: "Grabar" },
                { key: "Esc", label: "Cancelar" },
              ]
            : [
                { key: "F2", label: searching ? "Enter=Confirma Esc=Cancela" : "Buscar" },
                { key: "F3", label: "Nuevo" },
                { key: "F9", label: "Volver" },
              ]),
        ]}
      />
      {lookupOpen && (
        <PosLookupPopup
          title="Continentes"
          currentId={draft.continenteId === null ? undefined : String(draft.continenteId)}
          fetchPage={async (q, p, size) => {
            const r = await continentes.search(q, p, size);
            return { items: r.items.map((c) => ({ id: String(c.id), name: c.nombre })), total: r.total };
          }}
          onSelect={(row) => {
            setDraft((d) => ({ ...d, continenteId: Number(row.id), continente: row.name }));
            closeLookup(true);
          }}
          onClose={() => closeLookup(false)}
        />
      )}
      {formError && (
        <PosErrorPopup title={formError.title} message={formError.message} onClose={() => setFormError(null)} />
      )}
    </PosTerminalShell>
  );
}
