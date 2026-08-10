import * as React from "react";
import { PosTerminalShell } from "../../../../shared/ui/pos-terminal/PosTerminalShell";
import { PosFunctionKeyBar } from "../../../../shared/ui/pos-terminal/PosFunctionKeyBar";
import { PosField } from "../../../../shared/ui/pos-terminal/PosField";
import { usePosFocus } from "../../../../shared/ui/pos-terminal/usePosFocus";
import {
  EmployeHttpGateway,
  EmployeListItem,
  SaveEmployeInput,
} from "../../infrastructure/EmployeHttpGateway";

/**
 * Opción 03 del formulario inicial: Consulta y mantención de empleados.
 * Mismo patrón que UserMaintenancePage: modos BROWSING/FORM (35.3.1), F3
 * crea, Enter/F4 sobre un empleado abre modo CONSULTA (solo lectura); dentro
 * de esa ventana F4 recién ahí habilita la edición (F5 guarda), Esc cancela,
 * F9 vuelve. RUT/tipo de documento (columnas NetSuite NOT NULL) no se
 * capturan aún en el formulario; al editar se preservan con getById para no
 * perderlos.
 */
export interface EmployeListPageProps {
  onBack: () => void;
}

const gateway = new EmployeHttpGateway();

type Mode = "browsing" | "form";
// "view" = modo consulta (solo lectura, recién llegado desde la lista);
// F4 dentro de esa ventana recién habilita "edit".
type FormMode = "create" | "view" | "edit";

const emptyForm = (): SaveEmployeInput => ({
  id: String(Date.now()).slice(-9),
  firstname: "",
  lastname: "",
  employeecode: "",
  email: "",
  isinactive: false,
});

// Filas visibles por página en la lista (35.3.1 del documento): la ventana
// es de tamaño fijo, como una pantalla COBOL de 24 líneas -- no se hace
// scroll, se pagina, para que la barra de teclas F siempre quede a la vista.
// Mismo valor que UserMaintenancePage, por consistencia entre pantallas.
const PAGE_SIZE = 15;

export function EmployeListPage({ onBack }: EmployeListPageProps) {
  const [employees, setEmployees] = React.useState<EmployeListItem[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const [mode, setMode] = React.useState<Mode>("browsing");
  const [formMode, setFormMode] = React.useState<FormMode>("create");
  const [form, setForm] = React.useState<SaveEmployeInput>(emptyForm());
  const [saving, setSaving] = React.useState(false);
  // Enfoca el contenedor con teclado cada vez que cambia de pantalla, para
  // que F2-F9/flechas funcionen sin que el usuario tenga que hacer clic.
  const bodyRef = usePosFocus<HTMLDivElement>(mode === "form" ? `form:${formMode}` : "browsing");
  const [loadingDetail, setLoadingDetail] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [confirmingInactivate, setConfirmingInactivate] = React.useState<EmployeListItem | null>(null);

  // F2: búsqueda incremental (35.3.2 del documento).
  const [searching, setSearching] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const load = React.useCallback(() => {
    setEmployees(null);
    setLoadError(null);
    gateway
      .search()
      .then((result) => {
        setEmployees(result);
        setSelectedIndex((i) => Math.min(i, Math.max(result.length - 1, 0)));
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : String(e)));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const visibleEmployees = React.useMemo(() => {
    if (!employees) return employees;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      [e.id, e.firstname, e.lastname, e.employeecode, e.email, e.username, e.gdDocumento]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q))
    );
  }, [employees, searchQuery]);

  // Cada letra tipeada en la búsqueda incremental recalcula visibleEmployees,
  // y la lista filtrada puede quedar más corta que el índice/página en que
  // estaba parado el usuario -- vuelve siempre a la página 1 (primer
  // resultado) para que la selección nunca quede apuntando fuera de rango.
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  const selectedEmploye =
    visibleEmployees && visibleEmployees.length > 0 ? visibleEmployees[selectedIndex] : null;

  // Página actual derivada de la selección (ver UserMaintenancePage): sólo
  // se muestran (y renderizan) las filas de la página actual.
  const totalEmployeeCount = visibleEmployees?.length ?? 0;
  const currentPage = Math.floor(selectedIndex / PAGE_SIZE);
  const totalPages = Math.max(Math.ceil(totalEmployeeCount / PAGE_SIZE), 1);
  const pageStart = currentPage * PAGE_SIZE;
  const pageEmployees = visibleEmployees ? visibleEmployees.slice(pageStart, pageStart + PAGE_SIZE) : null;

  const startCreate = () => {
    setForm(emptyForm());
    setFormMode("create");
    setFormError(null);
    setMode("form");
  };

  const openRecord = async () => {
    if (!selectedEmploye) return;

    // Aterriza siempre en modo consulta (solo lectura); recién dentro de esa
    // ventana F4 habilita la edición (ver enableEditing).
    setFormMode("view");
    setFormError(null);
    setMode("form");
    setLoadingDetail(true);

    try {
      // Trae el registro COMPLETO (las 28 columnas, no sólo las que muestra
      // el formulario) y lo guarda tal cual en el estado: EmployeEdit
      // reescribe todas las columnas, así que cualquier campo que no viaje
      // de vuelta se pierde en silencio (bug real que esto corrige — ver
      // EmployeFullRecord en EmployeHttpGateway.ts).
      const detail = await gateway.getById(selectedEmploye.id);
      setForm(detail);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingDetail(false);
    }
  };

  const enableEditing = () => {
    if (formMode === "view") {
      setFormMode("edit");
    }
  };

  const save = async () => {
    if (formMode === "view") return;

    if (!form.firstname?.trim() && !form.lastname?.trim()) {
      setFormError("Debe indicar al menos nombres o apellidos.");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const input: SaveEmployeInput = {
        ...form,
        firstname: form.firstname?.trim() || null,
        lastname: form.lastname?.trim() || null,
        employeecode: form.employeecode?.trim() || null,
        email: form.email?.trim() || null,
      };

      if (formMode === "create") {
        await gateway.create(input);
      } else {
        await gateway.edit(input);
      }

      setMode("browsing");
      // Igual que en UserMaintenancePage: limpia un filtro de F2 que haya
      // quedado pegado desde antes de entrar a editar, para que el registro
      // recién guardado no desaparezca de la lista si ya no calza con esa
      // búsqueda vieja.
      setSearchQuery("");
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  // F6 pide confirmación DENTRO de la ventana (35.3.2 del documento), no con
  // un diálogo nativo del navegador -- mismo patrón que UserMaintenancePage.
  const requestInactivate = () => {
    if (!selectedEmploye) return;
    setConfirmingInactivate(selectedEmploye);
  };

  const confirmInactivate = async () => {
    if (!confirmingInactivate) return;
    const target = confirmingInactivate;
    setConfirmingInactivate(null);

    try {
      // PostgresEmployeRepository.edit() reescribe TODAS las columnas (28),
      // así que mandar sólo {id, isinactive} borraría en silencio
      // employeecode/externalid/username/RUT/etc. -- se trae el registro
      // completo primero y sólo se le cambia isinactive (mismo patrón que
      // openRecord/save y que el fix ya aplicado en UserMaintenancePage).
      const full = await gateway.getById(target.id);
      await gateway.edit({ ...full, isinactive: true });
      setSearchQuery("");
      load();
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleBrowsingKeyDown = (event: React.KeyboardEvent) => {
    if (searching) {
      if (event.key === "Enter") {
        event.preventDefault();
        setSearching(false);
        setSelectedIndex(0);
        bodyRef.current?.focus();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setSearching(false);
        setSearchQuery("");
        setSelectedIndex(0);
        bodyRef.current?.focus();
        return;
      }
      return;
    }

    if (confirmingInactivate) {
      if (event.key === "Enter") {
        event.preventDefault();
        confirmInactivate();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setConfirmingInactivate(null);
        return;
      }
      return;
    }

    if (event.key === "F9" || event.key === "Escape") {
      event.preventDefault();
      onBack();
      return;
    }

    if (event.key === "F2") {
      event.preventDefault();
      load();
      setSearchQuery("");
      setSearching(true);
      return;
    }

    if (event.key === "F3") {
      event.preventDefault();
      startCreate();
      return;
    }

    if (event.key === "F4" || event.key === "Enter") {
      event.preventDefault();
      openRecord();
      return;
    }

    if (event.key === "F6") {
      event.preventDefault();
      requestInactivate();
      return;
    }

    if (!visibleEmployees || visibleEmployees.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((i) => (i + 1) % visibleEmployees.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((i) => (i - 1 + visibleEmployees.length) % visibleEmployees.length);
      return;
    }

    // AvPág/RePág: saltan una página entera (PAGE_SIZE filas) de una vez.
    // Inicio/Fin: saltan directo a la primera/última página.
    if (event.key === "PageDown") {
      event.preventDefault();
      setSelectedIndex((i) => Math.min(i + PAGE_SIZE, visibleEmployees.length - 1));
      return;
    }

    if (event.key === "PageUp") {
      event.preventDefault();
      setSelectedIndex((i) => Math.max(i - PAGE_SIZE, 0));
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setSelectedIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setSelectedIndex(visibleEmployees.length - 1);
      return;
    }
  };

  const handleFormKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setMode("browsing");
      return;
    }

    if (event.key === "F4") {
      event.preventDefault();
      enableEditing();
      return;
    }

    if (event.key === "F5") {
      event.preventDefault();
      save();
      return;
    }

    if (event.key === "F9") {
      event.preventDefault();
      onBack();
      return;
    }

    if (event.key === "F2") {
      event.preventDefault();
      setMode("browsing");
      load();
      setSearchQuery("");
      setSearching(true);
      return;
    }

    if (event.key === "F3") {
      event.preventDefault();
      startCreate();
      return;
    }
  };

  if (mode === "form") {
    const isViewOnly = formMode === "view";

    return (
      <PosTerminalShell>
        <div className="pos-operational-header" style={{ alignItems: "flex-start" }}>
          <span style={{ fontWeight: "bold", fontSize: 16, color: "var(--pos-fg)" }}>
            ADRIAZOLA REPUESTOS
          </span>
          <span style={{ fontWeight: "bold", fontSize: 16, color: "var(--pos-fg)" }}>
            MANTENCIÓN DE EMPLEADOS
          </span>
          <span style={{ textAlign: "right" }}>
            <div style={{ fontWeight: "bold", color: "var(--pos-fg)" }}>POS TIENDA</div>
            <div style={{ color: "#e0c341" }}>
              {formMode === "create" && "ALTA / CREACIÓN"}
              {formMode === "view" && "LECTURA"}
              {formMode === "edit" && "MANTENCIÓN"}
            </div>
          </span>
        </div>
        <div className="pos-terminal-body" tabIndex={0} onKeyDown={handleFormKeyDown} ref={bodyRef}>
          {loadingDetail ? (
            <p>Cargando datos del empleado...</p>
          ) : (
            <>
              <PosField label="ID" value={form.id} onChange={() => undefined} readOnly />
              <PosField
                label="Nombres"
                value={form.firstname ?? ""}
                onChange={(v) => setForm((f) => ({ ...f, firstname: v }))}
                readOnly={isViewOnly}
              />
              <PosField
                label="Apellidos"
                value={form.lastname ?? ""}
                onChange={(v) => setForm((f) => ({ ...f, lastname: v }))}
                readOnly={isViewOnly}
              />
              <PosField
                label="Código vendedor"
                value={form.employeecode ?? ""}
                onChange={(v) => setForm((f) => ({ ...f, employeecode: v }))}
                readOnly={isViewOnly}
              />
              <PosField
                label="Email"
                value={form.email ?? ""}
                onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                readOnly={isViewOnly}
              />
              <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                <span style={{ width: 140, flexShrink: 0 }}>Inactivo</span>
                <input
                  type="checkbox"
                  checked={form.isinactive ?? false}
                  disabled={isViewOnly}
                  onChange={(e) => setForm((f) => ({ ...f, isinactive: e.target.checked }))}
                />
              </label>
            </>
          )}

          {formError && (
            <p style={{ color: "var(--pos-fg-highlight)", marginTop: 12 }}>{formError}</p>
          )}
          {saving && <p style={{ marginTop: 12 }}>Guardando...</p>}
        </div>
        <PosFunctionKeyBar
          keys={[
            { key: "F2", label: "Buscar" },
            { key: "F3", label: "Nuevo" },
            ...(isViewOnly ? [{ key: "F4", label: "Editar" }] : [{ key: "F5", label: "Guardar" }]),
            { key: "F9", label: "Volver" },
            { key: "Esc", label: "Cancelar" },
          ]}
        />
      </PosTerminalShell>
    );
  }

  return (
    <PosTerminalShell>
      <div className="pos-operational-header">
        <span style={{ fontWeight: "bold", color: "var(--pos-fg)" }}>ADRIAZOLA REPUESTOS</span>
        <span style={{ fontWeight: "bold", color: "var(--pos-fg)" }}>MANTENCIÓN DE EMPLEADOS</span>
        <span style={{ fontWeight: "bold", color: "var(--pos-fg)" }}>POS TIENDA</span>
      </div>
      <div className="pos-terminal-body" tabIndex={0} onKeyDown={handleBrowsingKeyDown} ref={bodyRef}>

        {confirmingInactivate && (
          <p style={{ color: "var(--pos-fg-highlight)" }}>
            ¿Inactivar a "
            {[confirmingInactivate.firstname, confirmingInactivate.lastname].filter(Boolean).join(" ") ||
              confirmingInactivate.id}
            "? Enter = Sí, Esc = No
          </p>
        )}

        {loadError && (
          <p style={{ color: "var(--pos-fg-highlight)" }}>
            Error consultando /employe: {loadError}
          </p>
        )}

        {searching && (
          <PosField
            label="Buscar (ID/RUT/nombre/username)"
            value={searchQuery}
            onChange={setSearchQuery}
            autoFocus
          />
        )}

        {!loadError && employees === null && <p>Cargando empleados...</p>}

        {!loadError && employees !== null && employees.length === 0 && (
          <p>No hay empleados registrados.</p>
        )}

        {!loadError &&
          employees !== null &&
          employees.length > 0 &&
          visibleEmployees !== null &&
          visibleEmployees.length === 0 && <p>Sin resultados para "{searchQuery}".</p>}

        {!loadError && pageEmployees !== null && pageEmployees.length > 0 && (
          <>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "2px 12px 6px 0" }}>ID</th>
                  <th style={{ textAlign: "left", padding: "2px 12px 6px 0" }}>Nombre</th>
                  <th style={{ textAlign: "left", padding: "2px 12px 6px 0" }}>Código</th>
                  <th style={{ textAlign: "left", padding: "2px 12px 6px 0" }}>Email</th>
                  <th style={{ textAlign: "left", padding: "2px 12px 6px 0" }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {pageEmployees.map((employe, rowIndex) => {
                  const isSelected = pageStart + rowIndex === selectedIndex;
                  const cellStyle = {
                    padding: "2px 12px 2px 0",
                    background: isSelected ? "var(--pos-selection-bg)" : "transparent",
                    color: isSelected ? "var(--pos-fg-highlight)" : "var(--pos-fg)",
                  };
                  const fullName = [employe.firstname, employe.lastname].filter(Boolean).join(" ") || "-";

                  return (
                    <tr key={employe.id}>
                      <td style={cellStyle}>
                        {isSelected ? "» " : "  "}
                        {employe.id}
                      </td>
                      <td style={cellStyle}>{fullName}</td>
                      <td style={cellStyle}>{employe.employeecode ?? "-"}</td>
                      <td style={cellStyle}>{employe.email ?? "-"}</td>
                      <td style={cellStyle}>{employe.isinactive ? "INACTIVO" : "ACTIVO"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ marginTop: 8, color: "var(--pos-fg-dim)" }}>
              Página {currentPage + 1} de {totalPages} — {totalEmployeeCount} registro
              {totalEmployeeCount === 1 ? "" : "s"}
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
          { key: "F3", label: "Nuevo" },
          { key: "F4", label: "Editar" },
          { key: "F6", label: "Inactivar" },
          { key: "F9", label: "Volver" },
        ]}
      />
    </PosTerminalShell>
  );
}
