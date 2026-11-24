import * as React from "react";
import { PosTerminalShell } from "../../../../shared/ui/pos-terminal/PosTerminalShell";
import { PosFunctionKeyBar } from "../../../../shared/ui/pos-terminal/PosFunctionKeyBar";
import { PosField } from "../../../../shared/ui/pos-terminal/PosField";
import { usePosFocus } from "../../../../shared/ui/pos-terminal/usePosFocus";
import { PosLookupPopup, LookupRow } from "../../../../shared/ui/pos-terminal/PosLookupPopup";
import { MaestroHttpGateway, MaestroTipo } from "../../../../shared/infrastructure/MaestroHttpGateway";
import {
  ProveedorCreateInput,
  ProveedorDetalle,
  ProveedorEditInput,
  ProveedorHttpGateway,
  ProveedorSearchResult,
} from "../../infrastructure/ProveedorHttpGateway";

/**
 * Maestros Centrales > Mantenedor de Proveedores (spec:
 * docs/proveedores_mantenedor.md).
 *
 * BROWSING: lista paginada en servidor + búsqueda F2 por RUT/nombre/abrev.
 * FORM: dos páginas (AvPág/RePág): 1 = Identificación y Dirección, 2 =
 * Condiciones Comerciales. Sub-modos igual que Usuarios/Empleados:
 *   view  (lectura)  --F4-->  edit (mantención)  --F5-->  guarda y vuelve a view.
 *   F3 (desde la lista o la lectura) abre create (alta) con los valores por
 *   defecto precargados: Ubicación 0, Localidad 771, Provincia 725; F5 crea.
 * En edit, los campos con maestro (Ubicac., País, Región, ...) se eligen con
 * el pop-up (Enter / F2 / tipear sobre el campo); al cambiar un padre se
 * limpian sus hijos. La única validación de negocio es el dígito verificador
 * del RUT cuando el país es Chile (la hace el backend).
 * F6 (desde la lista o la lectura) da de baja LÓGICA al proveedor o lo
 * reactiva si ya está inactivo; confirma dentro de la ventana, nunca borra.
 * Campos sin columna en la
 * base (Categoría, Clasificación, Cuenta Contable) y Cond. Pago se muestran
 * pero no se editan.
 */
export interface ProveedorMaintenancePageProps {
  onBack: () => void;
  /** user_pos.id de la sesión; se guarda en modificado_por. */
  userId: string;
}

const gateway = new ProveedorHttpGateway();
const maestros = new MaestroHttpGateway();
const PAGE_SIZE = 15;
const DEBOUNCE_MS = 250;

type Mode = "browsing" | "form";
type FormMode = "view" | "edit" | "create";

const headerSpan = { fontWeight: "bold", color: "var(--pos-fg)" } as const;

/** Verdadero cuando el formulario está en modo edición (estilo de los campos). */
const EditingContext = React.createContext(false);

type FieldKind = "ro" | "edit" | "pick";

const inputStyle = (width: number | undefined, kind: FieldKind): React.CSSProperties => ({
  background: "var(--pos-bg)",
  color: kind === "ro" ? "var(--pos-fg-dim)" : "var(--pos-fg)",
  border: `1px solid ${kind === "ro" ? "var(--pos-fg-dim)" : "var(--pos-fg)"}`,
  fontFamily: "var(--pos-font)",
  padding: "2px 6px",
  width,
  flex: width ? undefined : 1,
  minWidth: 0,
});

/**
 * Campo con etiqueta de ancho fijo (mismo look que PosField). Editable si
 * recibe `onChange`; con `lookup` el código se elige por pop-up (readOnly
 * pero resaltado en modo edición).
 */
function Ro({
  label,
  value,
  width,
  lookup,
  onChange,
  maxLength,
  dataKey,
}: {
  label: string;
  value: string;
  width?: number;
  lookup?: MaestroTipo;
  onChange?: (v: string) => void;
  maxLength?: number;
  dataKey?: string;
}) {
  const editing = React.useContext(EditingContext);
  const kind: FieldKind = editing && onChange ? "edit" : editing && lookup ? "pick" : "ro";
  return (
    <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, flex: width ? undefined : 1 }}>
      <span style={{ width: 100, flexShrink: 0 }}>{label}</span>
      <input
        readOnly={!(editing && onChange)}
        value={value}
        maxLength={maxLength}
        data-lookup={lookup}
        data-key={dataKey}
        onChange={(e) => onChange?.(e.target.value)}
        style={inputStyle(width, kind)}
      />
    </label>
  );
}

/**
 * Código + descripción en una línea (País [ 1 ] [ CHILE ]). Con `lookup`, el
 * campo código abre el pop-up de ese maestro.
 */
function CodeDesc({
  label,
  code,
  desc,
  lookup,
}: {
  label: string;
  code: string;
  desc: string;
  lookup?: MaestroTipo;
}) {
  const editing = React.useContext(EditingContext);
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
      <span style={{ width: 100, flexShrink: 0 }}>{label}</span>
      <input
        readOnly
        value={code}
        data-lookup={lookup}
        style={inputStyle(70, editing && lookup ? "pick" : "ro")}
      />
      <input readOnly value={desc} tabIndex={-1} style={{ ...inputStyle(undefined, "ro"), maxWidth: 320 }} />
    </div>
  );
}

const Row = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>{children}</div>
);

interface LookupDef {
  title: string;
  /** Maestro padre por el que se filtra (jerarquía geográfica), si aplica. */
  parent?: { label: string; code: (d: ProveedorDetalle) => string; desc: (d: ProveedorDetalle) => string };
  current: (d: ProveedorDetalle) => string;
  /** Asigna la selección al borrador y limpia los hijos si cambió el padre. */
  apply: (d: ProveedorDetalle, row: LookupRow) => ProveedorDetalle;
}

const clearProvincia = { codProvincia: "", provincia: "" };
const clearLocalidad = { codLocalidad: "", localidad: "" };
const clearComuna = { codComuna: "", comuna: "", ...clearLocalidad };
const clearCiudad = { codCiudad: "", ciudad: "", ...clearComuna };
const clearRegion = { codRegion: "", region: "", ...clearCiudad, ...clearProvincia };

const LOOKUPS: Record<MaestroTipo, LookupDef> = {
  sucursal: {
    title: "Ubicaciones",
    current: (d) => d.codUbicacion,
    apply: (d, r) => ({ ...d, codUbicacion: r.id, descUbicacion: r.name }),
  },
  pais: {
    title: "Países",
    current: (d) => d.codPais,
    apply: (d, r) => ({
      ...d,
      ...(r.id !== d.codPais ? clearRegion : {}),
      codPais: r.id,
      pais: r.name,
    }),
  },
  region: {
    title: "Regiones",
    parent: { label: "País", code: (d) => d.codPais, desc: (d) => d.pais },
    current: (d) => d.codRegion,
    apply: (d, r) => ({
      ...d,
      ...(r.id !== d.codRegion ? { ...clearCiudad, ...clearProvincia } : {}),
      codRegion: r.id,
      region: r.name,
    }),
  },
  ciudad: {
    title: "Ciudades",
    parent: { label: "Región", code: (d) => d.codRegion, desc: (d) => d.region },
    current: (d) => d.codCiudad,
    apply: (d, r) => ({
      ...d,
      ...(r.id !== d.codCiudad ? clearComuna : {}),
      codCiudad: r.id,
      ciudad: r.name,
    }),
  },
  comuna: {
    title: "Comunas",
    parent: { label: "Ciudad", code: (d) => d.codCiudad, desc: (d) => d.ciudad },
    current: (d) => d.codComuna,
    apply: (d, r) => ({
      ...d,
      ...(r.id !== d.codComuna ? clearLocalidad : {}),
      codComuna: r.id,
      comuna: r.name,
    }),
  },
  localidad: {
    title: "Localidades",
    parent: { label: "Comuna", code: (d) => d.codComuna, desc: (d) => d.comuna },
    current: (d) => d.codLocalidad,
    apply: (d, r) => ({ ...d, codLocalidad: r.id, localidad: r.name }),
  },
  provincia: {
    title: "Provincias",
    parent: { label: "Región", code: (d) => d.codRegion, desc: (d) => d.region },
    current: (d) => d.codProvincia,
    apply: (d, r) => ({ ...d, codProvincia: r.id, provincia: r.name }),
  },
  moneda: {
    title: "Monedas",
    current: (d) => d.codMoneda,
    apply: (d, r) => ({ ...d, codMoneda: r.id, descMoneda: r.name }),
  },
};

function toEditInput(d: ProveedorDetalle, userId: string): ProveedorEditInput {
  return {
    nrorut: d.nrorut,
    verificador: d.verificador,
    nombre: d.nombre,
    codUbicacion: d.codUbicacion,
    codPais: d.codPais,
    codRegion: d.codRegion,
    codCiudad: d.codCiudad,
    codComuna: d.codComuna,
    codLocalidad: d.codLocalidad,
    codProvincia: d.codProvincia,
    codPostal: d.codPostal,
    direccion: d.direccion,
    fono: d.fono,
    fax: d.fax,
    contacto: d.contacto,
    cargo: d.cargo,
    codMoneda: d.codMoneda,
    esForwarder: d.esForwarder === "SI" ? "S" : d.esForwarder === "NO" ? "N" : "",
    alaOrdenDe: d.alaOrdenDe,
    email1: d.email1,
    email2: d.email2,
    modificadoPor: Number(userId),
  };
}

const hoy = () => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

/**
 * Borrador de un alta: todo vacío salvo los valores por defecto que la base
 * y el backend también aplican (Ubicación 0 = CENTRO DISTRIBUCION, Localidad
 * 771, Provincia 725). Se precargan para que el usuario los vea; el backend
 * los vuelve a aplicar si llegan vacíos.
 */
const emptyDraft = (): ProveedorDetalle => ({
  id: 0,
  nrorut: "",
  verificador: "",
  fechaIncorporacion: hoy(),
  nombre: "",
  abrev: "",
  inactivo: false,
  codUbicacion: "0",
  descUbicacion: "CENTRO DISTRIBUCION",
  categoria: "",
  descCategoria: "",
  clasificacion: "",
  descClasificacion: "",
  cuentaContable: "",
  descCuentaContable: "",
  codPais: "",
  pais: "",
  codRegion: "",
  region: "",
  codCiudad: "",
  ciudad: "",
  codComuna: "",
  comuna: "",
  codLocalidad: "771",
  localidad: "-SIN ASIGNAR-",
  codProvincia: "725",
  provincia: "SIN VALOR",
  codPostal: "",
  direccion: "",
  fono: "",
  fax: "",
  contacto: "",
  cargo: "",
  codCondPago: "",
  descCondPago: "",
  codMoneda: "",
  descMoneda: "",
  esForwarder: "",
  alaOrdenDe: "",
  email1: "",
  email2: "",
});

/** Inputs enfocables del formulario, en orden de pantalla (sin las descripciones). */
function focusables(root: HTMLElement | null): HTMLInputElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll("input")).filter((i) => i.tabIndex >= 0);
}

export function ProveedorMaintenancePage({ onBack, userId }: ProveedorMaintenancePageProps) {
  const [mode, setMode] = React.useState<Mode>("browsing");
  const [result, setResult] = React.useState<ProveedorSearchResult | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  // Al cambiar de página con ↑/↓ en el borde, la selección cae en la primera
  // o última fila de la página nueva, una vez que ésta carga.
  const pendingSelect = React.useRef<"first" | "last" | null>(null);
  // Tras guardar se recarga la lista y se vuelve a seleccionar ese proveedor.
  const keepId = React.useRef<number | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const [searching, setSearching] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [appliedQuery, setAppliedQuery] = React.useState("");

  // `detail` = lo que hay en la base; `draft` = lo que muestra/edita la pantalla.
  const [detail, setDetail] = React.useState<ProveedorDetalle | null>(null);
  const [draft, setDraft] = React.useState<ProveedorDetalle | null>(null);
  const [detailError, setDetailError] = React.useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = React.useState(false);
  const [formMode, setFormMode] = React.useState<FormMode>("view");
  const [formPage, setFormPage] = React.useState<1 | 2>(1);
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [note, setNote] = React.useState<string | null>(null);
  const [confirmingDiscard, setConfirmingDiscard] = React.useState(false);
  // F6: proveedor a desactivar/reactivar, pendiente de confirmación.
  const [toggleTarget, setToggleTarget] = React.useState<{
    id: number;
    nombre: string;
    inactivo: boolean;
  } | null>(null);

  // Pop-up de lookup abierto sobre el formulario y el campo que lo abrió,
  // para devolverle el foco al cerrar.
  const [lookup, setLookup] = React.useState<{ tipo: MaestroTipo; initial: string } | null>(null);
  const lookupOrigin = React.useRef<HTMLElement | null>(null);

  const bodyRef = usePosFocus<HTMLDivElement>(
    mode === "form" ? `form:${formPage}:${formMode}` : "browsing"
  );

  // En alta `detail` es el borrador inicial, así "dirty" = el usuario cambió algo.
  const dirty = formMode !== "view" && detail !== null && JSON.stringify(draft) !== JSON.stringify(detail);

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

  const requestId = React.useRef(0);
  React.useEffect(() => {
    const id = ++requestId.current;
    setLoadError(null);
    gateway
      .search(appliedQuery, page, PAGE_SIZE)
      .then((r) => {
        if (id !== requestId.current) return; // llegó una respuesta más nueva
        setResult(r);
        const last = Math.max(r.items.length - 1, 0);
        const kept = keepId.current !== null ? r.items.findIndex((p) => p.id === keepId.current) : -1;
        setSelectedIndex(kept >= 0 ? kept : pendingSelect.current === "last" ? last : 0);
        pendingSelect.current = null;
        keepId.current = null;
      })
      .catch((e) => {
        if (id !== requestId.current) return;
        setLoadError(e instanceof Error ? e.message : String(e));
      });
  }, [appliedQuery, page, reloadKey]);

  const items = result?.items ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const selected = items[selectedIndex] ?? null;

  const openRecord = async () => {
    if (!selected) return;
    setFormMode("view");
    setFormPage(1);
    setNote(null);
    setFormError(null);
    setConfirmingDiscard(false);
    setDetail(null);
    setDraft(null);
    setDetailError(null);
    setLoadingDetail(true);
    setMode("form");
    try {
      const d = await gateway.getById(selected.id);
      setDetail(d);
      setDraft(d);
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingDetail(false);
    }
  };

  const startSearch = () => {
    setMode("browsing");
    setSearchQuery("");
    setSearching(true);
  };

  const startEdit = () => {
    if (formMode !== "view" || !detail) return;
    setNote(null);
    setFormError(null);
    setDraft(detail);
    setFormMode("edit");
    // El primer campo editable (R.U.T.) recibe el foco una vez re-renderizado.
    setTimeout(() => {
      const first = focusables(bodyRef.current).find((i) => !i.readOnly);
      first?.focus();
    }, 0);
  };

  const startCreate = () => {
    if (formMode !== "view" && mode === "form") return;
    const blank = emptyDraft();
    setDetail(blank);
    setDraft(blank);
    setDetailError(null);
    setLoadingDetail(false);
    setNote(null);
    setFormError(null);
    setConfirmingDiscard(false);
    setFormPage(1);
    setFormMode("create");
    setMode("form");
    // El primer campo (R.U.T.) recibe el foco una vez montado el formulario.
    setTimeout(() => {
      focusables(bodyRef.current).find((i) => !i.readOnly)?.focus();
    }, 0);
  };

  // F6: pide confirmación (dentro de la ventana, sin diálogos nativos). Desde la
  // lista actúa sobre el seleccionado; desde la lectura, sobre el abierto.
  const requestToggle = () => {
    if (mode === "form") {
      if (formMode === "view" && detail) {
        setToggleTarget({ id: detail.id, nombre: detail.nombre, inactivo: detail.inactivo });
      }
    } else if (selected) {
      setToggleTarget({ id: selected.id, nombre: selected.nombre, inactivo: selected.inactivo });
    }
  };

  const confirmToggle = async () => {
    const t = toggleTarget;
    if (!t) return;
    setToggleTarget(null);
    setFormError(null);
    try {
      const saved = await gateway.setInactivo(t.id, !t.inactivo, Number(userId));
      keepId.current = t.id;
      setReloadKey((k) => k + 1);
      setNote(saved.inactivo ? "Proveedor desactivado." : "Proveedor reactivado.");
      if (mode === "form") {
        setDetail(saved);
        setDraft(saved);
      }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    }
  };

  const toggleQuestion = toggleTarget
    ? `¿Desea ${toggleTarget.inactivo ? "Reactivar" : "Desactivar"} Proveedor "${toggleTarget.nombre}"? Enter = Sí, Esc = No`
    : null;

  const discardEdit = () => {
    setConfirmingDiscard(false);
    setFormError(null);
    if (formMode === "create") {
      // Un alta descartada no tiene registro al que volver: regresa a la lista.
      setMode("browsing");
      return;
    }
    setDraft(detail);
    setFormMode("view");
  };

  const save = async () => {
    if (formMode === "view" || !draft || saving) return;
    setSaving(true);
    setFormError(null);
    try {
      const creating = formMode === "create";
      const saved = creating
        ? await gateway.create({ ...toEditInput(draft, userId), abrev: draft.abrev })
        : await gateway.update(draft.id, toEditInput(draft, userId));
      setDetail(saved);
      setDraft(saved);
      setFormMode("view");
      setNote(creating ? "Proveedor creado." : "Proveedor grabado.");
      keepId.current = saved.id;
      if (creating) {
        // El nuevo debe verse en la lista: se limpia cualquier filtro/página.
        setSearchQuery("");
        setAppliedQuery("");
        setPage(1);
      }
      setReloadKey((k) => k + 1);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const closeLookup = (advance: boolean) => {
    const origin = lookupOrigin.current;
    setLookup(null);
    // El foco vuelve al campo que abrió el pop-up (o pasa al siguiente si se
    // eligió un valor en edición); si ya no está, al cuerpo.
    setTimeout(() => {
      if (!origin?.isConnected) {
        bodyRef.current?.focus();
        return;
      }
      if (advance) {
        const all = focusables(bodyRef.current);
        const next = all[all.indexOf(origin as HTMLInputElement) + 1];
        (next ?? origin).focus();
      } else origin.focus();
    }, 0);
  };

  const set = <K extends keyof ProveedorDetalle>(key: K, value: ProveedorDetalle[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const handleBrowsingKeyDown = (event: React.KeyboardEvent) => {
    if (searching) {
      if (event.key === "Enter") {
        event.preventDefault();
        setSearching(false);
        setAppliedQuery(searchQuery); // aplica ya, sin esperar el debounce
        bodyRef.current?.focus();
        // Un único resultado: Enter lo abre directo en modo consulta.
        if (items.length === 1) void openRecord();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setSearching(false);
        setSearchQuery("");
        bodyRef.current?.focus();
        return;
      }
      return;
    }

    if (toggleTarget) {
      if (event.key === "Enter") {
        event.preventDefault();
        void confirmToggle();
      } else if (event.key === "Escape") {
        event.preventDefault();
        setToggleTarget(null);
      }
      return;
    }

    // Los avisos de una acción anterior se van con la siguiente tecla.
    if (note) setNote(null);
    if (formError) setFormError(null);

    switch (event.key) {
      case "F9":
      case "Escape":
        event.preventDefault();
        onBack();
        return;
      case "F2":
        event.preventDefault();
        startSearch();
        return;
      case "F3":
        event.preventDefault();
        startCreate();
        return;
      case "F6":
        event.preventDefault();
        requestToggle();
        return;
      case "Enter":
        event.preventDefault();
        void openRecord();
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

  const handleFormKeyDown = (event: React.KeyboardEvent) => {
    const target = event.target as HTMLElement;
    const tipo = target.dataset?.lookup as MaestroTipo | undefined;
    const editing = formMode !== "view"; // edición o alta

    // Confirmación de baja/reactivación (F6).
    if (toggleTarget) {
      if (event.key === "Enter") {
        event.preventDefault();
        void confirmToggle();
      } else if (event.key === "Escape") {
        event.preventDefault();
        setToggleTarget(null);
      }
      return;
    }

    // Confirmación de descarte (dentro de la ventana, sin diálogos nativos).
    if (confirmingDiscard) {
      if (event.key === "Enter") {
        event.preventDefault();
        discardEdit();
      } else if (event.key === "Escape") {
        event.preventDefault();
        setConfirmingDiscard(false);
      }
      return;
    }

    // Campo con maestro: Enter (y F2 / una tecla imprimible en edición) abre el pop-up.
    if (tipo && draft) {
      const printable = event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey;
      if (event.key === "Enter" || (editing && (event.key === "F2" || printable))) {
        event.preventDefault();
        lookupOrigin.current = target;
        setNote(null);
        setLookup({ tipo, initial: editing && printable ? event.key : "" });
        return;
      }
    }

    // Es Forwarder: S / N / Supr (sólo en edición).
    if (editing && target.dataset?.key === "forwarder" && draft) {
      const k = event.key.toLowerCase();
      if (k === "s" || k === "n" || event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        set("esForwarder", k === "s" ? "SI" : k === "n" ? "NO" : "");
        return;
      }
    }

    if (event.key === "Enter") {
      // En edición Enter avanza al campo siguiente, como en el resto de pantallas COBOL.
      if (editing && target.tagName === "INPUT") {
        event.preventDefault();
        const all = focusables(bodyRef.current);
        all[all.indexOf(target as HTMLInputElement) + 1]?.focus();
      }
      return;
    }

    switch (event.key) {
      case "F3":
        event.preventDefault();
        if (!editing) startCreate();
        return;
      case "F4":
        event.preventDefault();
        startEdit();
        return;
      case "F6":
        event.preventDefault();
        if (!editing) requestToggle();
        return;
      case "F5":
        event.preventDefault();
        void save();
        return;
      case "Escape":
        event.preventDefault();
        if (editing) {
          if (dirty) setConfirmingDiscard(true);
          else discardEdit();
        } else setMode("browsing");
        return;
      case "F9":
        event.preventDefault();
        if (editing) {
          if (dirty) setConfirmingDiscard(true);
          else discardEdit();
        } else onBack();
        return;
      case "F2":
        event.preventDefault();
        if (!editing) startSearch();
        return;
      case "PageDown":
      case "PageUp": {
        event.preventDefault();
        setFormPage(event.key === "PageDown" ? 2 : 1);
        if (editing) {
          // Al cambiar de página en edición, el foco va al primer campo editable.
          setTimeout(() => focusables(bodyRef.current).find((i) => !i.readOnly)?.focus(), 0);
        }
        return;
      }
    }
  };

  if (mode === "form") {
    const d = draft;
    const editing = formMode !== "view"; // edición o alta
    const creating = formMode === "create";
    return (
      <PosTerminalShell>
        <div className="pos-operational-header" style={{ alignItems: "flex-start" }}>
          <span style={{ fontWeight: "bold", fontSize: 16, color: "var(--pos-fg)" }}>ADRIAZOLA REPUESTOS</span>
          <span style={{ fontWeight: "bold", fontSize: 16, color: "var(--pos-fg)" }}>
            MANTENCIÓN DE PROVEEDORES
          </span>
          <span style={{ textAlign: "right" }}>
            <div style={{ fontWeight: "bold", color: "var(--pos-fg)" }}>POS TIENDA</div>
            <div style={{ color: "#e0c341" }}>
              {creating ? "ALTA / CREACIÓN" : editing ? "MANTENCIÓN" : "LECTURA"} · Pág. {formPage}/2
            </div>
          </span>
        </div>
        <div className="pos-terminal-body" tabIndex={0} onKeyDown={handleFormKeyDown} ref={bodyRef}>
          <EditingContext.Provider value={editing}>
            {loadingDetail && <p>Cargando proveedor...</p>}
            {detailError && <p style={{ color: "var(--pos-fg-highlight)" }}>{detailError}</p>}

            {confirmingDiscard && (
              <p style={{ color: "var(--pos-fg-highlight)", margin: "0 0 6px" }}>
                ¿Descartar los cambios? Enter = Sí, Esc = No
              </p>
            )}
            {toggleQuestion && (
              <p style={{ color: "var(--pos-fg-highlight)", margin: "0 0 6px" }}>{toggleQuestion}</p>
            )}
            {formError && <p style={{ color: "var(--pos-fg-highlight)", margin: "0 0 6px" }}>{formError}</p>}
            {saving && <p style={{ margin: "0 0 6px" }}>Guardando...</p>}
            {note && <p style={{ color: "#e0c341", margin: "0 0 6px" }}>{note}</p>}

            {d && d.inactivo && (
              <p style={{ color: "var(--pos-fg-highlight)", margin: "0 0 6px" }}>Proveedor está Inactivo</p>
            )}

            {d && formPage === 1 && (
              <>
                <Row>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <span style={{ width: 100, flexShrink: 0 }}>Nro R.U.T.</span>
                    <input
                      readOnly={!editing}
                      value={d.nrorut}
                      maxLength={9}
                      onChange={(e) => set("nrorut", e.target.value.replace(/\D/g, ""))}
                      style={inputStyle(110, editing ? "edit" : "ro")}
                    />
                    <span>-</span>
                    <input
                      readOnly={!editing}
                      value={d.verificador}
                      maxLength={1}
                      onChange={(e) => set("verificador", e.target.value.toUpperCase())}
                      style={inputStyle(36, editing ? "edit" : "ro")}
                    />
                  </label>
                  <Ro label="Ubicac." value={d.codUbicacion} width={60} lookup="sucursal" />
                  <Ro label="" value={d.descUbicacion} width={200} />
                  <Ro label="Fecha Incorp" value={d.fechaIncorporacion} width={110} />
                </Row>
                <Row>
                  <Ro label="Nombre" value={d.nombre} maxLength={40} onChange={(v) => set("nombre", v)} />
                  <Ro
                    label="Abrev"
                    value={d.abrev}
                    width={110}
                    maxLength={10}
                    onChange={creating ? (v) => set("abrev", v.toUpperCase()) : undefined}
                  />
                </Row>
                <CodeDesc label="Categoría" code={d.categoria} desc={d.descCategoria} />
                <CodeDesc label="Clasific." code={d.clasificacion} desc={d.descClasificacion} />
                <CodeDesc label="País" code={d.codPais} desc={d.pais} lookup="pais" />
                <CodeDesc label="Región" code={d.codRegion} desc={d.region} lookup="region" />
                <CodeDesc label="Ciudad" code={d.codCiudad} desc={d.ciudad} lookup="ciudad" />
                <CodeDesc label="Comuna" code={d.codComuna} desc={d.comuna} lookup="comuna" />
                <CodeDesc label="Localidad" code={d.codLocalidad} desc={d.localidad} lookup="localidad" />
                <CodeDesc label="Provincia" code={d.codProvincia} desc={d.provincia} lookup="provincia" />
                <Ro
                  label="C.Postal"
                  value={d.codPostal}
                  width={160}
                  maxLength={15}
                  onChange={(v) => set("codPostal", v)}
                />
                <Ro
                  label="Dirección"
                  value={d.direccion}
                  maxLength={30}
                  onChange={(v) => set("direccion", v)}
                />
                <Row>
                  <Ro label="Fono" value={d.fono} width={160} maxLength={15} onChange={(v) => set("fono", v)} />
                  <Ro label="Fax" value={d.fax} width={160} maxLength={15} onChange={(v) => set("fax", v)} />
                </Row>
                <Row>
                  <Ro
                    label="Contacto"
                    value={d.contacto}
                    maxLength={25}
                    onChange={(v) => set("contacto", v)}
                  />
                  <Ro
                    label="Cargo"
                    value={d.cargo}
                    width={200}
                    maxLength={20}
                    onChange={(v) => set("cargo", v)}
                  />
                </Row>
              </>
            )}

            {d && formPage === 2 && (
              <>
                <Row>
                  <Ro label="Nro R.U.T." value={`${d.nrorut} - ${d.verificador}`} width={150} />
                  <Ro label="" value={d.nombre} />
                </Row>
                <CodeDesc label="Cond.Pago" code={d.codCondPago} desc={d.descCondPago} />
                <CodeDesc label="Cod. Moneda" code={d.codMoneda} desc={d.descMoneda} lookup="moneda" />
                <Ro
                  label="Es Forwarder?"
                  value={d.esForwarder}
                  width={60}
                  dataKey="forwarder"
                  onChange={() => undefined}
                />
                <Ro
                  label="A la orden de"
                  value={d.alaOrdenDe}
                  maxLength={50}
                  onChange={(v) => set("alaOrdenDe", v)}
                />
                <Ro label="E-Mail 1" value={d.email1} maxLength={50} onChange={(v) => set("email1", v)} />
                <Ro label="E-Mail 2" value={d.email2} maxLength={50} onChange={(v) => set("email2", v)} />
                <CodeDesc label="Cta. Contable" code={d.cuentaContable} desc={d.descCuentaContable} />
              </>
            )}
          </EditingContext.Provider>
        </div>
        <PosFunctionKeyBar
          keys={
            editing
              ? [
                  { key: "Enter", label: "Siguiente / Maestro" },
                  { key: "AvPág/RePág", label: formPage === 1 ? "Cond. Comerciales" : "Identificación" },
                  { key: "F2", label: "Maestro" },
                  { key: "F5", label: "Guardar" },
                  { key: "Esc", label: "Cancelar" },
                ]
              : [
                  { key: "AvPág/RePág", label: formPage === 1 ? "Cond. Comerciales" : "Identificación" },
                  { key: "Tab", label: "Campo" },
                  { key: "Enter", label: "Maestro (en campo código)" },
                  { key: "F2", label: "Buscar" },
                  { key: "F3", label: "Nuevo" },
                  { key: "F4", label: "Editar" },
                  { key: "F6", label: detail?.inactivo ? "Reactivar" : "Desactivar" },
                  { key: "F9", label: "Volver" },
                  { key: "Esc", label: "Lista" },
                ]
          }
        />
        {d && lookup && (
          <PosLookupPopup
            title={LOOKUPS[lookup.tipo].title}
            subtitle={(() => {
              const p = LOOKUPS[lookup.tipo].parent;
              return p && p.code(d) ? `${p.label}: ${p.code(d)} ${p.desc(d)}`.trim() : undefined;
            })()}
            currentId={LOOKUPS[lookup.tipo].current(d)}
            initialQuery={lookup.initial}
            fetchPage={(q, pg, size) => {
              const p = LOOKUPS[lookup.tipo].parent;
              const parentId = p && p.code(d) ? p.code(d) : null;
              return maestros.search(lookup.tipo, q, parentId, pg, size);
            }}
            onSelect={(row: LookupRow) => {
              if (editing) {
                // En edición la selección se asigna al campo (y limpia sus hijos).
                setDraft((cur) => (cur ? LOOKUPS[lookup.tipo].apply(cur, row) : cur));
                closeLookup(true);
              } else {
                // En lectura el proveedor no se modifica: sólo se informa.
                setNote(
                  `Maestro consultado: ${LOOKUPS[lookup.tipo].title} ${row.id} - ${row.name} (modo lectura: no modifica el proveedor)`
                );
                closeLookup(false);
              }
            }}
            onClose={() => closeLookup(false)}
          />
        )}
      </PosTerminalShell>
    );
  }

  return (
    <PosTerminalShell>
      <div className="pos-operational-header">
        <span style={headerSpan}>ADRIAZOLA REPUESTOS</span>
        <span style={headerSpan}>MANTENCIÓN DE PROVEEDORES</span>
        <span style={headerSpan}>POS TIENDA</span>
      </div>
      <div className="pos-terminal-body" tabIndex={0} onKeyDown={handleBrowsingKeyDown} ref={bodyRef}>
        {loadError && (
          <p style={{ color: "var(--pos-fg-highlight)" }}>Error consultando /proveedores: {loadError}</p>
        )}

        {toggleQuestion && <p style={{ color: "var(--pos-fg-highlight)" }}>{toggleQuestion}</p>}
        {formError && <p style={{ color: "var(--pos-fg-highlight)" }}>{formError}</p>}
        {note && <p style={{ color: "#e0c341" }}>{note}</p>}

        {searching && (
          <PosField
            label="Buscar (RUT/nombre/abrev)"
            value={searchQuery}
            onChange={setSearchQuery}
            autoFocus
          />
        )}

        {!loadError && result === null && <p>Cargando proveedores...</p>}

        {!loadError && result !== null && items.length === 0 && (
          <p>{appliedQuery ? `Sin resultados para "${appliedQuery}".` : "No hay proveedores registrados."}</p>
        )}

        {!loadError && items.length > 0 && (
          <>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  {["Abrev", "R.U.T.", "Nombre", "País", "Estado"].map((h) => (
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
                        {p.abrev}
                      </td>
                      <td style={cell}>{p.rut}</td>
                      <td style={cell}>{p.nombre}</td>
                      <td style={cell}>{p.pais || "-"}</td>
                      <td style={cell}>{p.inactivo ? "INACTIVO" : "ACTIVO"}</td>
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
          { key: "F3", label: "Nuevo" },
          { key: "Enter", label: "Consultar" },
          { key: "F6", label: selected?.inactivo ? "Reactivar" : "Desactivar" },
          { key: "F9", label: "Volver" },
        ]}
      />
    </PosTerminalShell>
  );
}
