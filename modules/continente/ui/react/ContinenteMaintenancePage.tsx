import * as React from "react";
import { PosTerminalShell } from "../../../../shared/ui/pos-terminal/PosTerminalShell";
import { PosFunctionKeyBar } from "../../../../shared/ui/pos-terminal/PosFunctionKeyBar";
import { PosField } from "../../../../shared/ui/pos-terminal/PosField";
import { usePosFocus } from "../../../../shared/ui/pos-terminal/usePosFocus";
import { PosErrorPopup } from "../../../../shared/ui/pos-terminal/PosErrorPopup";
import { ContinenteHttpGateway, ContinenteSearchResult } from "../../infrastructure/ContinenteHttpGateway";

/**
 * Administra Direcciones > Mantenedor de Continentes (pos.continente).
 * Consulta (lista paginada + búsqueda por código o nombre) y alta.
 * Teclas: ↑↓ mueve, AvPág/RePág pagina, Inicio/Fin salta, F2 busca,
 * F3 nuevo, F4 editar, Esc/F9 vuelve. En el formulario: Enter/F5 graba, Esc
 * cancela. El código lo asigna el sistema y no se cambia; el nombre no puede
 * repetirse. La baja vendrá en una etapa siguiente.
 */
export interface ContinenteMaintenancePageProps {
  onBack: () => void;
}

const NOMBRE_MAX = 60;
const PAGE_SIZE = 15;
const DEBOUNCE_MS = 250;
const headerSpan = { fontWeight: "bold", color: "var(--pos-fg)" } as const;

const gateway = new ContinenteHttpGateway();

export function ContinenteMaintenancePage({ onBack }: ContinenteMaintenancePageProps) {
  const [result, setResult] = React.useState<ContinenteSearchResult | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const pendingSelect = React.useRef<"first" | "last" | null>(null);

  const [searching, setSearching] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [appliedQuery, setAppliedQuery] = React.useState("");

  // Alta: formulario en la misma ventana, con el nombre del nuevo continente.
  // `creating` indica formulario abierto (alta o edición); `editingId` distingue la edición.
  const [creating, setCreating] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [newName, setNewName] = React.useState("");
  const originalName = React.useRef("");
  const [saving, setSaving] = React.useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<{ title: string; message: string } | null>(null);
  // Tras crear se recarga la lista y se deja seleccionado el nuevo.
  const keepId = React.useRef<number | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

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
        const keep = keepId.current !== null ? r.items.findIndex((x) => x.id === keepId.current) : -1;
        keepId.current = null;
        setSelectedIndex(keep >= 0 ? keep : pendingSelect.current === "last" ? last : 0);
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

  const startEdit = () => {
    const c = items[selectedIndex];
    if (!c) return;
    originalName.current = c.nombre;
    setNewName(c.nombre);
    setEditingId(c.id);
    setNote(null);
    setConfirmingDiscard(false);
    setCreating(true);
  };

  const startCreate = () => {
    originalName.current = "";
    setEditingId(null);
    setNewName("");
    setNote(null);
    setConfirmingDiscard(false);
    setCreating(true);
  };

  const cancelCreate = () => {
    setConfirmingDiscard(false);
    setCreating(false);
    setEditingId(null);
    setNewName("");
    setTimeout(() => bodyRef.current?.focus(), 0);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    const editing = editingId !== null;
    try {
      if (editing) {
        const guardado = await gateway.update(editingId, newName);
        setNote(`Continente grabado: ${guardado.id} - ${guardado.nombre}.`);
        // Se queda en la misma página y filtro; sólo se recarga y se reselecciona.
        keepId.current = guardado.id;
      } else {
        const creado = await gateway.create(newName);
        setNote(`Continente creado: ${creado.id} - ${creado.nombre}.`);
        // El nuevo debe verse en la lista: se limpia el filtro y se va a su página.
        keepId.current = creado.id;
        setSearchQuery("");
        setAppliedQuery("");
        setPage(Math.max(Math.ceil((total + 1) / PAGE_SIZE), 1));
      }
      setCreating(false);
      setEditingId(null);
      setNewName("");
      setReloadKey((k) => k + 1);
      setTimeout(() => bodyRef.current?.focus(), 0);
    } catch (e) {
      setFormError({
        title: editing ? "No se pudo guardar el continente" : "No se pudo crear el continente",
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSaving(false);
    }
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
      if (event.key === "Enter" || event.key === "F5") {
        event.preventDefault();
        void save();
      } else if (event.key === "Escape") {
        event.preventDefault();
        if (newName.trim() !== originalName.current.trim()) setConfirmingDiscard(true);
        else cancelCreate();
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
      case "F4":
        event.preventDefault();
        startEdit();
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
        <span style={headerSpan}>MANTENCIÓN DE CONTINENTES</span>
        <span style={headerSpan}>POS TIENDA</span>
      </div>
      <div className="pos-terminal-body" tabIndex={0} onKeyDown={handleKeyDown} ref={bodyRef}>
        {loadError && <p style={{ color: "var(--pos-fg-highlight)" }}>Error consultando /continentes: {loadError}</p>}

        {note && <p style={{ color: "#e0c341" }}>{note}</p>}

        {creating && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ margin: "0 0 8px", color: "var(--pos-fg-highlight)" }}>
              {editingId !== null ? "EDITAR CONTINENTE" : "NUEVO CONTINENTE"}
            </p>
            <PosField
              label="Código"
              value={editingId !== null ? String(editingId) : "(automático)"}
              onChange={() => undefined}
              readOnly
            />
            <PosField
              label="Nombre"
              value={newName}
              onChange={(v) => setNewName(v.slice(0, NOMBRE_MAX))}
              autoFocus
            />
            {confirmingDiscard && (
              <p style={{ color: "var(--pos-fg-highlight)" }}>¿Descartar los cambios? Enter = Sí, Esc = No</p>
            )}
            {saving && <p>Grabando...</p>}
          </div>
        )}

        {searching && (
          <PosField label="Buscar (código/nombre)" value={searchQuery} onChange={setSearchQuery} autoFocus />
        )}

        {!loadError && result === null && <p>Cargando continentes...</p>}

        {!loadError && result !== null && items.length === 0 && (
          <p>{appliedQuery ? `Sin resultados para "${appliedQuery}".` : "No hay continentes registrados."}</p>
        )}

        {!loadError && items.length > 0 && (
          <>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  {["Cód", "Nombre", "Países"].map((h) => (
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
                      <td style={cell}>{c.paises}</td>
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
                { key: "Enter/F5", label: "Grabar" },
                { key: "Esc", label: "Cancelar" },
              ]
            : [
                { key: "F2", label: searching ? "Enter=Confirma Esc=Cancela" : "Buscar" },
                { key: "F3", label: "Nuevo" },
                { key: "F4", label: "Editar" },
                { key: "F9", label: "Volver" },
              ]),
        ]}
      />
      {formError && (
        <PosErrorPopup title={formError.title} message={formError.message} onClose={() => setFormError(null)} />
      )}
    </PosTerminalShell>
  );
}
