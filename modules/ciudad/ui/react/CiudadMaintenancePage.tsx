import * as React from "react";
import { PosTerminalShell } from "../../../../shared/ui/pos-terminal/PosTerminalShell";
import { PosFunctionKeyBar } from "../../../../shared/ui/pos-terminal/PosFunctionKeyBar";
import { PosField } from "../../../../shared/ui/pos-terminal/PosField";
import { usePosFocus } from "../../../../shared/ui/pos-terminal/usePosFocus";
import { PosErrorPopup } from "../../../../shared/ui/pos-terminal/PosErrorPopup";
import { PosLookupPopup } from "../../../../shared/ui/pos-terminal/PosLookupPopup";
import { RegionHttpGateway } from "../../../region/infrastructure/RegionHttpGateway";
import { CiudadHttpGateway, CiudadSearchResult } from "../../infrastructure/CiudadHttpGateway";

/**
 * Administra Direcciones > Mantenedor de Ciudades (pos.ciudad).
 * Consulta (lista paginada + búsqueda por nombre, código, SAAD, región o país)
 * y alta.
 * Teclas: ↑↓ mueve, AvPág/RePág pagina, Inicio/Fin salta, F2 busca,
 * F3 nuevo, Esc/F9 vuelve. En el formulario de alta: Enter avanza al campo
 * siguiente (en Región abre el pop-up de búsqueda; en el último graba), F5
 * graba, Esc cancela. El código lo genera la base. Edición y baja vendrán en
 * etapas siguientes.
 */
export interface CiudadMaintenancePageProps {
  onBack: () => void;
}

const PAGE_SIZE = 15;
const DEBOUNCE_MS = 250;
const MAX = { nombre: 100, saad: 8, saadDescripcion: 100 } as const;
/** Posición del campo Región entre los campos enfocables del formulario (sin Código). */
const REGION_FIELD = 0;
const headerSpan = { fontWeight: "bold", color: "var(--pos-fg)" } as const;

interface Draft {
  regionId: number | null;
  region: string;
  nombre: string;
  saad: string;
  saadDescripcion: string;
}
const EMPTY: Draft = { regionId: null, region: "", nombre: "", saad: "", saadDescripcion: "" };

const gateway = new CiudadHttpGateway();
const regiones = new RegionHttpGateway();

export function CiudadMaintenancePage({ onBack }: CiudadMaintenancePageProps) {
  const [result, setResult] = React.useState<CiudadSearchResult | null>(null);
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
  // y le quitaría el foco al primer campo (autoFocus sólo actúa al montarse).
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
    const title = "No se pudo crear la ciudad";
    if (draft.regionId === null) {
      setFormError({ title, message: "Región es obligatoria. Elíjala con Enter o F2." });
      return;
    }
    setSaving(true);
    try {
      const creada = await gateway.create({
        nombre: draft.nombre,
        regionId: draft.regionId,
        saad: draft.saad,
        saadDescripcion: draft.saadDescripcion,
      });
      setCreating(false);
      setDraft(EMPTY);
      setNote(`Ciudad creada: ${creada.id} - ${creada.nombre} (${creada.region}).`);
      // La nueva debe verse en la lista: se filtra por su nombre.
      setSearchQuery(creada.nombre);
      setAppliedQuery(creada.nombre);
      setPage(1);
      setReloadKey((k) => k + 1);
      setTimeout(() => bodyRef.current?.focus(), 0);
    } catch (e) {
      setFormError({ title, message: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  const openRegionLookup = () => {
    lookupOrigin.current = fields()[REGION_FIELD] ?? null;
    setLookupOpen(true);
  };

  const closeLookup = (advance: boolean) => {
    const origin = lookupOrigin.current;
    setLookupOpen(false);
    // El foco vuelve al campo Región, o pasa al siguiente si se eligió un valor.
    setTimeout(() => {
      const all = fields();
      const i = origin ? all.indexOf(origin) : -1;
      (advance ? (all[i + 1] ?? origin) : origin)?.focus();
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
          if (idx === REGION_FIELD) openRegionLookup();
          else if (idx >= 0 && idx < all.length - 1) all[idx + 1].focus();
          else void save();
          return;
        case "F2":
          event.preventDefault();
          if (idx === REGION_FIELD) openRegionLookup();
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
        <span style={headerSpan}>MANTENCIÓN DE CIUDADES</span>
        <span style={headerSpan}>POS TIENDA</span>
      </div>
      <div className="pos-terminal-body" tabIndex={0} onKeyDown={handleKeyDown} ref={bodyRef}>
        {loadError && <p style={{ color: "var(--pos-fg-highlight)" }}>Error consultando /ciudades: {loadError}</p>}

        {note && <p style={{ color: "#e0c341" }}>{note}</p>}

        {creating && (
          <div ref={formRef} style={{ marginBottom: 12 }}>
            <p style={{ margin: "0 0 8px", color: "var(--pos-fg-highlight)" }}>NUEVA CIUDAD</p>
            <PosField label="Código" value="(automático)" onChange={() => undefined} readOnly />
            <PosField
              label="Región"
              value={draft.regionId === null ? "" : `${draft.regionId} - ${draft.region}`}
              onChange={() => undefined}
              readOnly
              autoFocus
            />
            <PosField label="Nombre" value={draft.nombre} onChange={(v) => set("nombre", v.slice(0, MAX.nombre))} />
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
              SAAD descripción vacía = se usa el nombre. Región: Enter o F2 para buscar.
            </p>
            {confirmingDiscard && (
              <p style={{ color: "var(--pos-fg-highlight)" }}>¿Descartar la ciudad nueva? Enter = Sí, Esc = No</p>
            )}
            {saving && <p>Grabando...</p>}
          </div>
        )}

        {searching && (
          <PosField label="Buscar (nombre/cód/región)" value={searchQuery} onChange={setSearchQuery} autoFocus />
        )}

        {!loadError && result === null && <p>Cargando ciudades...</p>}

        {!loadError && result !== null && items.length === 0 && (
          <p>{appliedQuery ? `Sin resultados para "${appliedQuery}".` : "No hay ciudades registradas."}</p>
        )}

        {!loadError && items.length > 0 && (
          <>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  {["Cód", "Nombre", "Región", "País", "SAAD", "Comunas", "Proveedores"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "2px 12px 6px 0" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((c, i) => {
                  const isSelected = i === selectedIndex;
                  const cell = {
                    padding: "2px 12px 2px 0",
                    background: isSelected ? "var(--pos-selection-bg)" : "transparent",
                    color: isSelected ? "var(--pos-fg-highlight)" : "var(--pos-fg)",
                  };
                  return (
                    <tr key={c.id}>
                      <td style={cell}>
                        {isSelected ? "» " : "  "}
                        {c.id}
                      </td>
                      <td style={cell}>{c.nombre || "-"}</td>
                      {/* Región huérfana (region_id sin registro en pos.region): se muestra el código. */}
                      <td style={cell}>{c.region || `(${c.regionId})`}</td>
                      <td style={cell}>{c.pais || "-"}</td>
                      <td style={cell}>{c.saad || "-"}</td>
                      <td style={cell}>{c.comunas}</td>
                      <td style={cell}>{c.proveedores}</td>
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
                { key: "Enter", label: "Siguiente / Región: buscar" },
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
          title="Regiones"
          currentId={draft.regionId === null ? undefined : String(draft.regionId)}
          fetchPage={async (q, p, size) => {
            const r = await regiones.search(q, p, size);
            return {
              items: r.items.map((x) => ({ id: String(x.id), name: x.pais ? `${x.nombre} (${x.pais})` : x.nombre })),
              total: r.total,
            };
          }}
          onSelect={(row) => {
            setDraft((d) => ({ ...d, regionId: Number(row.id), region: row.name }));
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
