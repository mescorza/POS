import * as React from "react";
import { PosTerminalShell } from "../../../../shared/ui/pos-terminal/PosTerminalShell";
import { PosFunctionKeyBar } from "../../../../shared/ui/pos-terminal/PosFunctionKeyBar";
import { PosField } from "../../../../shared/ui/pos-terminal/PosField";
import { PosSectionHeader } from "../../../../shared/ui/pos-terminal/PosSectionHeader";
import { usePosFocus } from "../../../../shared/ui/pos-terminal/usePosFocus";
import { SaveUserInput, UserHttpGateway, UserListItem } from "../../infrastructure/UserHttpGateway";
import { EmployeHttpGateway, EmployeListItem, SaveEmployeInput } from "../../../employe/infrastructure/EmployeHttpGateway";
import { LookupHttpGateway } from "../../../../shared/infrastructure/LookupHttpGateway";

/**
 * Opción 02: Consulta y mantención de usuarios — versión combinada según
 * el mapeo "campos por formulario en BD" de
 * POS_Registro_Venta_Arquitectura_Hexagonal_USUARIOS_V2. Presenta datos de
 * User + Employe + Department (Tienda) + Subsidiary (encabezado) en una
 * sola pantalla, pero cada guardado escribe en el módulo dueño del dato:
 * los campos de User van por UserHttpGateway, los de Employe por
 * EmployeHttpGateway — nunca se fusionan las entidades.
 *
 * Estados de pantalla (35.3.1): BROWSING / FORM (view/create/edit). F2 abre
 * búsqueda incremental, F3 crea, F6 inactiva, F7 fija/resetea la contraseña
 * del seleccionado (admin, sin pedir la clave anterior), F9 vuelve al menú,
 * Esc cancela. Enter o F4 sobre la lista abren el registro en modo CONSULTA
 * (sólo lectura); recién ahí F4 lo pasa a edición y F5 guarda — "F4: entrar
 * en edición sólo con registro cargado" (documento) es literal: primero se
 * carga/consulta, después se edita.
 */
export interface UserMaintenancePageProps {
  onBack: () => void;
}

const userGateway = new UserHttpGateway();
const employeGateway = new EmployeHttpGateway();
const lookupGateway = new LookupHttpGateway();

type Mode = "browsing" | "form";
// "view" = modo consulta (todo de sólo lectura, recién cargado); F4 lo pasa
// a "edit". "create" siempre nace editable. Ver 35.3.1 del documento:
// BROWSING/CREATING/EDITING/SAVING/ERROR — acá se suma VIEWING explícito
// porque "F4: entrar en edición sólo con registro cargado" implica que
// cargar el registro y habilitar su edición son dos pasos distintos.
type FormMode = "create" | "view" | "edit";

interface FormState {
  user: SaveUserInput;
  employe: SaveEmployeInput | null; // null = sin empleado vinculado todavía
  subsidiaryName: string | null;
  departmentName: string | null;
  createdAt: string | null;
  lastSync: string | null;
}

const emptyUserForm = (): SaveUserInput => ({
  id: String(Date.now()).slice(-9),
  username: "",
  email: "",
  isinactive: false,
});

// Filas visibles por página en la lista (35.3.1 del documento): la ventana
// es de tamaño fijo, como una pantalla COBOL de 24 líneas -- no se hace
// scroll, se pagina, para que la barra de teclas F siempre quede a la vista.
const PAGE_SIZE = 15;

export function UserMaintenancePage({ onBack }: UserMaintenancePageProps) {
  const [users, setUsers] = React.useState<UserListItem[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const [mode, setMode] = React.useState<Mode>("browsing");
  const [formMode, setFormMode] = React.useState<FormMode>("create");
  const [form, setForm] = React.useState<FormState>({
    user: emptyUserForm(),
    employe: null,
    subsidiaryName: null,
    departmentName: null,
    createdAt: null,
    lastSync: null,
  });
  const [saving, setSaving] = React.useState(false);
  const [loadingDetail, setLoadingDetail] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [confirmingInactivate, setConfirmingInactivate] = React.useState<UserListItem | null>(null);

  // F7: fijar/resetear contraseña (pantalla de administración, separada del
  // login). No pide la contraseña anterior -- es un admin reseteando la de
  // otro usuario, no un cambio de clave propia.
  const [settingPasswordFor, setSettingPasswordFor] = React.useState<UserListItem | null>(null);
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [passwordFormError, setPasswordFormError] = React.useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = React.useState(false);

  // F2: búsqueda incremental (35.3.2 del documento: "Abrir búsqueda
  // incremental; Enter selecciona registro").
  const [searching, setSearching] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Buscador de empleado (RUT o nombre) para enlazar con el usuario.
  const [linkQuery, setLinkQuery] = React.useState("");
  const [employeCatalog, setEmployeCatalog] = React.useState<EmployeListItem[] | null>(null);
  const [showLinkPicker, setShowLinkPicker] = React.useState(false);

  const load = React.useCallback(() => {
    setUsers(null);
    setLoadError(null);
    userGateway
      .search()
      .then((result) => {
        setUsers(result);
        setSelectedIndex((i) => Math.min(i, Math.max(result.length - 1, 0)));
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : String(e)));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const visibleUsers = React.useMemo(() => {
    if (!users) return users;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.id, u.username, u.email].filter(Boolean).some((v) => (v as string).toLowerCase().includes(q))
    );
  }, [users, searchQuery]);

  // Cada letra tipeada en la búsqueda incremental recalcula visibleUsers, y
  // la lista filtrada puede quedar más corta que el índice/página en que
  // estaba parado el usuario -- vuelve siempre a la página 1 (primer
  // resultado) para que la selección nunca quede apuntando fuera de rango.
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  const selectedUser =
    visibleUsers && visibleUsers.length > 0 ? visibleUsers[selectedIndex] : null;

  // Página actual derivada de la selección (no hay estado de página aparte):
  // moverse con ↑↓ más allá del borde de la página la cambia sola, y
  // AvPág/RePág saltan PAGE_SIZE filas de una vez. Sólo se muestran (y se
  // renderizan) las filas de la página actual -- el resto no existe en el
  // DOM, así la ventana nunca crece más allá del tamaño fijo.
  const totalUserCount = visibleUsers?.length ?? 0;
  const currentPage = Math.floor(selectedIndex / PAGE_SIZE);
  const totalPages = Math.max(Math.ceil(totalUserCount / PAGE_SIZE), 1);
  const pageStart = currentPage * PAGE_SIZE;
  const pageUsers = visibleUsers ? visibleUsers.slice(pageStart, pageStart + PAGE_SIZE) : null;

  /**
   * Se llama al elegir un empleado del buscador RUT/nombre/username para
   * enlazarlo al usuario. Trae el registro COMPLETO por id (no arma uno a
   * mano desde el resumen de la lista, que sólo trae un subconjunto de
   * columnas) para no perder datos al guardar más adelante.
   */
  const applyEmployeToForm = async (employe: EmployeListItem) => {
    setShowLinkPicker(false);
    bodyRef.current?.focus();
    setLoadingDetail(true);

    try {
      const full = await employeGateway.getById(employe.id);
      setForm((f) => ({ ...f, employe: full }));

      const [department, subsidiary] = await Promise.all([
        full.departmentid ? lookupGateway.getDepartment(full.departmentid) : Promise.resolve(null),
        full.subsidiaryid ? lookupGateway.getSubsidiary(full.subsidiaryid) : Promise.resolve(null),
      ]);

      setForm((f) => ({
        ...f,
        departmentName: department?.name ?? null,
        subsidiaryName: subsidiary?.name ?? null,
      }));
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingDetail(false);
    }
  };

  const openLinkPicker = async () => {
    setShowLinkPicker(true);
    if (!employeCatalog) {
      try {
        const all = await employeGateway.search();
        setEmployeCatalog(all);
      } catch (e) {
        setFormError(e instanceof Error ? e.message : String(e));
      }
    }
  };

  const filteredCatalog = React.useMemo(() => {
    if (!employeCatalog) return [];
    const q = linkQuery.trim().toLowerCase();
    if (!q) return employeCatalog.slice(0, 20);
    return employeCatalog
      .filter((e) =>
        // Hoy la mayoría de los 195 empleados reales no tienen firstname/
        // lastname cargados todavía (es justo lo que este formulario ayuda
        // a completar) — por eso username/id también cuentan como criterio,
        // no sólo RUT/nombre.
        [e.id, e.gdDocumento, e.firstname, e.lastname, e.employeecode, e.username]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(q))
      )
      .slice(0, 20);
  }, [employeCatalog, linkQuery]);

  const startCreate = () => {
    setForm({
      user: emptyUserForm(),
      employe: null,
      subsidiaryName: null,
      departmentName: null,
      createdAt: null,
      lastSync: null,
    });
    setFormMode("create");
    setFormError(null);
    setShowLinkPicker(false);
    setMode("form");
  };

  /** Abre el registro seleccionado en modo CONSULTA (sólo lectura). F4
   * dentro del formulario (ver enableEditing) lo pasa a edición. */
  const openRecord = async () => {
    if (!selectedUser) return;

    setFormMode("view");
    setFormError(null);
    setShowLinkPicker(false);
    setMode("form");
    setLoadingDetail(true);

    try {
      const detail = await userGateway.getById(selectedUser.id);
      const userForm: SaveUserInput = {
        id: detail.id,
        username: detail.username,
        email: detail.email ?? "",
        isinactive: detail.isinactive,
        externalid: detail.externalid,
        employeeid: detail.employeeid,
        entityexternalid: detail.entityexternalid,
        passwordchangedat: detail.passwordchangedat,
        lastloginat: detail.lastloginat,
        failedlogincount: detail.failedlogincount,
        lockeduntil: detail.lockeduntil,
      };

      let employeForm: SaveEmployeInput | null = null;
      let departmentName: string | null = null;
      let subsidiaryName: string | null = null;

      if (detail.employeeid) {
        // Registro COMPLETO, igual que en applyEmployeToForm — nunca un
        // subconjunto de campos, para no perder columnas al guardar.
        const employeDetail = await employeGateway.getById(detail.employeeid);
        employeForm = employeDetail;

        const [department, subsidiary] = await Promise.all([
          employeDetail.departmentid ? lookupGateway.getDepartment(employeDetail.departmentid) : Promise.resolve(null),
          employeDetail.subsidiaryid ? lookupGateway.getSubsidiary(employeDetail.subsidiaryid) : Promise.resolve(null),
        ]);
        departmentName = department?.name ?? null;
        subsidiaryName = subsidiary?.name ?? null;
      }

      setForm({
        user: userForm,
        employe: employeForm,
        departmentName,
        subsidiaryName,
        createdAt: detail.createdAt,
        lastSync: detail.lastmodifiedat,
      });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingDetail(false);
    }
  };

  /** F4 dentro del formulario: pasa de CONSULTA a EDICIÓN sin recargar
   * (los datos ya están cargados por openRecord). */
  const enableEditing = () => {
    if (formMode === "view") {
      setFormMode("edit");
    }
  };

  const save = async () => {
    if (formMode === "view") return; // defensivo: F5 no debería llegar acá en consulta.
    if (form.user.username.trim().length < 3) {
      setFormError("El username debe tener al menos 3 caracteres.");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      // 1. Employe primero (si hay uno vinculado), para tener su id
      //    disponible al guardar el User. Esta pantalla nunca CREA un
      //    Employe nuevo -- sólo enlaza uno existente (buscador RUT/nombre)
      //    y opcionalmente edita sus campos; crear empleados vive en la
      //    opción 03 (EmployeMaintenancePage).
      if (form.employe) {
        const employeInput: SaveEmployeInput = {
          ...form.employe,
          firstname: form.employe.firstname?.trim() || null,
          lastname: form.employe.lastname?.trim() || null,
          initials: form.employe.initials?.trim() || null,
        };

        await employeGateway.edit(employeInput);
      }

      const userInput: SaveUserInput = {
        ...form.user,
        email: form.user.email?.trim() ? form.user.email.trim() : null,
        employeeid: form.employe?.id ?? form.user.employeeid ?? null,
      };

      if (formMode === "create") {
        await userGateway.create(userInput);
      } else {
        await userGateway.edit(userInput);
      }

      setMode("browsing");
      // Limpia un filtro de F2 que haya quedado pegado desde antes de entrar
      // a editar: si el campo editado (username/email/id) ya no calza con
      // ese filtro viejo, el registro recién guardado desaparecería de la
      // lista aunque en la base sigue intacto -- parece un borrado y no lo
      // es. Grabar siempre vuelve a la lista completa.
      setSearchQuery("");
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  // F6 pide confirmación DENTRO de la ventana (35.3.2 del documento: "F6
  // Solicitar inactivación con confirmación"), no con un diálogo nativo del
  // navegador — coherente con que esta pantalla nunca usa cards/dialogs
  // nativos, sólo la ventana verde.
  const requestInactivate = () => {
    if (!selectedUser) return;
    setConfirmingInactivate(selectedUser);
  };

  const confirmInactivate = async () => {
    if (!confirmingInactivate) return;
    const target = confirmingInactivate;
    setConfirmingInactivate(null);

    try {
      // Igual que openRecord/save: PostgresUserRepository.edit() reescribe
      // TODAS las columnas, así que mandar sólo {id, username, email,
      // isinactive} borraba en silencio externalid/employeeid (rompiendo el
      // vínculo con Employe)/entityexternalid/failedlogincount/etc. Se trae
      // el registro completo y sólo se le cambia isinactive.
      const full = await userGateway.getById(target.id);
      await userGateway.edit({ ...full, isinactive: true });
      setSearchQuery("");
      load();
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  };

  // F7 abre un mini-formulario DENTRO de la ventana (mismo patrón que F6:
  // sin diálogos nativos). No requiere abrir el registro primero -- alcanza
  // con tenerlo seleccionado en la lista, igual que Inactivar.
  const requestSetPassword = () => {
    if (!selectedUser) return;
    setNewPassword("");
    setConfirmPassword("");
    setPasswordFormError(null);
    setSettingPasswordFor(selectedUser);
  };

  const cancelSetPassword = () => {
    setSettingPasswordFor(null);
    bodyRef.current?.focus();
  };

  const submitSetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!settingPasswordFor) return;

    if (newPassword.length < 6) {
      setPasswordFormError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFormError("Las contraseñas no coinciden.");
      return;
    }

    setPasswordSaving(true);
    setPasswordFormError(null);

    try {
      await userGateway.setPassword(settingPasswordFor.id, newPassword);
      setSettingPasswordFor(null);
      bodyRef.current?.focus();
    } catch (e) {
      setPasswordFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleBrowsingKeyDown = (event: React.KeyboardEvent) => {
    // F2: búsqueda incremental. Mientras se busca, Enter confirma la
    // selección actual y Esc la cancela (vuelve a la lista completa);
    // cualquier otra tecla se deja pasar para que llegue al campo de texto.
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

    if (settingPasswordFor) {
      // Enter lo maneja el <form onSubmit> nativo (dos campos, como
      // LoginPage); acá sólo se intercepta Esc para cancelar.
      if (event.key === "Escape") {
        event.preventDefault();
        cancelSetPassword();
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
      // Seleccionar un registro (Enter) o F4 desde la lista abren la misma
      // ventana de CONSULTA; recién dentro, F4 la pasa a edición (ver
      // handleFormKeyDown). Así "F4: entrar en edición sólo con registro
      // cargado" queda literal: primero se carga, después se edita.
      event.preventDefault();
      openRecord();
      return;
    }
    if (event.key === "F6") {
      event.preventDefault();
      requestInactivate();
      return;
    }
    if (event.key === "F7") {
      event.preventDefault();
      requestSetPassword();
      return;
    }
    if (!visibleUsers || visibleUsers.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((i) => (i + 1) % visibleUsers.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((i) => (i - 1 + visibleUsers.length) % visibleUsers.length);
      return;
    }
    // AvPág/RePág: saltan una página entera (PAGE_SIZE filas) de una vez,
    // sin recorrer fila por fila -- la contraparte de ↑↓ para listas largas
    // (195 usuarios reales / PAGE_SIZE = 13 páginas).
    if (event.key === "PageDown") {
      event.preventDefault();
      setSelectedIndex((i) => Math.min(i + PAGE_SIZE, visibleUsers.length - 1));
      return;
    }
    if (event.key === "PageUp") {
      event.preventDefault();
      setSelectedIndex((i) => Math.max(i - PAGE_SIZE, 0));
      return;
    }
    // Inicio/Fin: saltan directo a la primera/última página, sin recorrer
    // el listado -- para las 195 filas reales evita 13 PageDown seguidos.
    if (event.key === "Home") {
      event.preventDefault();
      setSelectedIndex(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setSelectedIndex(visibleUsers.length - 1);
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
    // F9 vuelve al menú principal (regla del documento: siempre disponible,
    // no sólo desde la lista). F2/F3 salen del formulario hacia la lista
    // para buscar o partir un registro nuevo, sin obligar a pasar por Esc.
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

  const fullName = [form.employe?.firstname, form.employe?.lastname].filter(Boolean).join(" ") || "-";
  const origen = form.user.externalid || form.employe?.entityid ? "NETSUITE" : "POS";
  const estadoText = form.user.isinactive ? "INACTIVO" : "ACTIVO";
  const inactivoText = form.user.isinactive ? "SI" : "NO";
  const isViewOnly = formMode === "view";

  // Enfoca el contenedor con teclado (F2-F9/flechas) cada vez que cambia de
  // pantalla, para que el usuario nunca tenga que hacer clic primero. No
  // incluye showLinkPicker a propósito: mientras el buscador está abierto,
  // el foco debe quedar en su campo de texto, no en el contenedor (ver
  // applyEmployeToForm / "Cancelar búsqueda", que lo devuelven a mano).
  const bodyRef = usePosFocus<HTMLDivElement>(mode === "form" ? `form:${formMode}` : "browsing");

  // Fila de dos campos lado a lado, como en el mockup (Figuras V6-2/V9-1 de
  // POS_..._USUARIOS_V2): "ID Usuario ... External ID", etc.
  const FieldRow = ({ children }: { children: React.ReactNode }) => (
    <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>{children}</div>
  );

  if (mode === "form") {
    return (
      <PosTerminalShell>
        <div className="pos-operational-header" style={{ alignItems: "flex-start" }}>
          <span style={{ fontWeight: "bold", fontSize: 16, color: "var(--pos-fg)" }}>
            {form.subsidiaryName ?? "ADRIAZOLA REPUESTOS"}
          </span>
          <span style={{ fontWeight: "bold", fontSize: 16, color: "var(--pos-fg)" }}>
            MANTENCIÓN DE USUARIOS
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
            <p>Cargando datos...</p>
          ) : (
            <>
              <PosSectionHeader>IDENTIDAD Y CUENTA</PosSectionHeader>
              <FieldRow>
                <PosField label="ID Usuario" value={form.user.id} onChange={() => undefined} readOnly />
                <PosField
                  label="External ID"
                  value={form.user.externalid ?? ""}
                  onChange={(v) => setForm((f) => ({ ...f, user: { ...f.user, externalid: v || null } }))}
                  readOnly={isViewOnly || formMode === "edit"}
                />
              </FieldRow>
              <FieldRow>
                <PosField label="Nombre cuenta" value={fullName} onChange={() => undefined} readOnly />
                <PosField label="Estado" value={estadoText} onChange={() => undefined} readOnly />
              </FieldRow>
              <PosField
                label="E-mail"
                value={form.user.email ?? ""}
                onChange={(v) => setForm((f) => ({ ...f, user: { ...f.user, email: v } }))}
                readOnly={isViewOnly}
              />
              <FieldRow>
                <PosField
                  label="Username"
                  value={form.user.username}
                  onChange={(v) => setForm((f) => ({ ...f, user: { ...f.user, username: v } }))}
                  readOnly={isViewOnly}
                />
                <div>
                  <PosField
                    label="Iniciales"
                    value={form.employe?.initials ?? ""}
                    onChange={(v) =>
                      form.employe && setForm((f) => ({ ...f, employe: { ...f.employe!, initials: v } }))
                    }
                    readOnly={isViewOnly || !form.employe}
                  />
                  {/* "Iniciales" es un campo de Employe (employe.initials);
                      sin un Empleado enlazado no hay dónde guardarlo, así
                      que se avisa en vez de dejarlo editable sin destino. */}
                  {!isViewOnly && !form.employe && (
                    <p style={{ margin: "0 0 6px 148px", color: "var(--pos-fg-dim)", fontSize: 12 }}>
                      Enlace un empleado (más abajo) para poder editar este campo.
                    </p>
                  )}
                </div>
              </FieldRow>

              <PosSectionHeader>DATOS PERSONALES / NETSUITE</PosSectionHeader>

              {!form.employe && !showLinkPicker && (
                <p>
                  Sin empleado enlazado.{" "}
                  {!isViewOnly && (
                    <button type="button" onClick={openLinkPicker}>
                      Buscar empleado (RUT, nombre o username)...
                    </button>
                  )}
                </p>
              )}

              {showLinkPicker && (
                <div>
                  <PosField label="Buscar" value={linkQuery} onChange={setLinkQuery} autoFocus />
                  <div style={{ maxHeight: 160, overflowY: "auto", border: "1px solid var(--pos-fg-dim)" }}>
                    {filteredCatalog.map((e) => (
                      <div
                        key={e.id}
                        style={{ padding: "2px 6px", cursor: "pointer" }}
                        onClick={() => applyEmployeToForm(e)}
                      >
                        {e.id} — {e.username ?? "(sin username)"} —{" "}
                        {[e.firstname, e.lastname].filter(Boolean).join(" ") || "(sin nombre)"} — RUT{" "}
                        {e.gdDocumento || "-"}
                      </div>
                    ))}
                    {employeCatalog === null && <p>Cargando empleados...</p>}
                    {employeCatalog !== null && filteredCatalog.length === 0 && <p>Sin resultados.</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLinkPicker(false);
                      bodyRef.current?.focus();
                    }}
                  >
                    Cancelar búsqueda
                  </button>
                </div>
              )}

              {form.employe && !showLinkPicker && (
                <>
                  <FieldRow>
                    <PosField
                      label="Nombres"
                      value={form.employe.firstname ?? ""}
                      onChange={(v) => setForm((f) => ({ ...f, employe: { ...f.employe!, firstname: v } }))}
                      readOnly={isViewOnly}
                    />
                    <PosField
                      label="Apellido"
                      value={form.employe.lastname ?? ""}
                      onChange={(v) => setForm((f) => ({ ...f, employe: { ...f.employe!, lastname: v } }))}
                      readOnly={isViewOnly}
                    />
                  </FieldRow>
                  <FieldRow>
                    <PosField
                      label="RUT"
                      value={form.employe.gdDocumento ?? ""}
                      onChange={(v) => setForm((f) => ({ ...f, employe: { ...f.employe!, gdDocumento: v } }))}
                      readOnly={isViewOnly}
                    />
                    <PosField
                      label="DV"
                      value={form.employe.gdDigitoDeVerificacion ?? ""}
                      onChange={(v) =>
                        setForm((f) => ({ ...f, employe: { ...f.employe!, gdDigitoDeVerificacion: v } }))
                      }
                      readOnly={isViewOnly}
                    />
                  </FieldRow>
                  <FieldRow>
                    <PosField
                      label="Entity ID"
                      value={form.employe.entityid ?? ""}
                      onChange={(v) =>
                        setForm((f) => ({ ...f, employe: { ...f.employe!, entityid: v || null } }))
                      }
                      readOnly={isViewOnly}
                    />
                    <PosField label="Inactivo" value={inactivoText} onChange={() => undefined} readOnly />
                  </FieldRow>
                  {!isViewOnly && (
                    <button type="button" onClick={openLinkPicker}>
                      Cambiar empleado enlazado...
                    </button>
                  )}
                </>
              )}

              <PosSectionHeader>CONTROL</PosSectionHeader>
              <FieldRow>
                <PosField
                  label="Creado"
                  value={form.createdAt ? new Date(form.createdAt).toLocaleString() : "-"}
                  onChange={() => undefined}
                  readOnly
                />
                <PosField label="Repositorio" value="POSTGRES / LOCAL" onChange={() => undefined} readOnly />
              </FieldRow>
              <FieldRow>
                <PosField
                  label="Ult. Sync"
                  value={form.lastSync ? new Date(form.lastSync).toLocaleString() : "-"}
                  onChange={() => undefined}
                  readOnly
                />
                <PosField label="Origen" value={origen} onChange={() => undefined} readOnly />
              </FieldRow>
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
        <span style={{ fontWeight: "bold", color: "var(--pos-fg)" }}>MANTENCIÓN DE USUARIOS</span>
        <span style={{ fontWeight: "bold", color: "var(--pos-fg)" }}>POS TIENDA</span>
      </div>
      <div className="pos-terminal-body" tabIndex={0} onKeyDown={handleBrowsingKeyDown} ref={bodyRef}>

        {confirmingInactivate && (
          <p style={{ color: "var(--pos-fg-highlight)" }}>
            ¿Inactivar a "{confirmingInactivate.username}"? Enter = Sí, Esc = No
          </p>
        )}

        {settingPasswordFor && (
          <form onSubmit={submitSetPassword} style={{ marginBottom: 16 }}>
            <p style={{ color: "var(--pos-fg-highlight)" }}>
              Fijar contraseña de "{settingPasswordFor.username}":
            </p>
            <PosField
              label="Contraseña nueva"
              value={newPassword}
              onChange={setNewPassword}
              type="password"
              autoFocus
            />
            <PosField
              label="Confirmar"
              value={confirmPassword}
              onChange={setConfirmPassword}
              type="password"
            />
            {passwordFormError && (
              <p style={{ color: "var(--pos-fg-highlight)" }}>{passwordFormError}</p>
            )}
            {passwordSaving && <p>Guardando...</p>}
          </form>
        )}

        {loadError && (
          <p style={{ color: "var(--pos-fg-highlight)" }}>Error consultando /users: {loadError}</p>
        )}

        {searching && (
          <PosField
            label="Buscar (ID/username/email)"
            value={searchQuery}
            onChange={setSearchQuery}
            autoFocus
          />
        )}

        {!loadError && users === null && <p>Cargando usuarios...</p>}
        {!loadError && users !== null && users.length === 0 && <p>No hay usuarios registrados.</p>}
        {!loadError &&
          users !== null &&
          users.length > 0 &&
          visibleUsers !== null &&
          visibleUsers.length === 0 && <p>Sin resultados para "{searchQuery}".</p>}

        {!loadError && pageUsers !== null && pageUsers.length > 0 && (
          <>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "2px 12px 6px 0" }}>ID</th>
                  <th style={{ textAlign: "left", padding: "2px 12px 6px 0" }}>Username</th>
                  <th style={{ textAlign: "left", padding: "2px 12px 6px 0" }}>Email</th>
                  <th style={{ textAlign: "left", padding: "2px 12px 6px 0" }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {pageUsers.map((user, rowIndex) => {
                  const isSelected = pageStart + rowIndex === selectedIndex;
                  const cellStyle = {
                    padding: "2px 12px 2px 0",
                    background: isSelected ? "var(--pos-selection-bg)" : "transparent",
                    color: isSelected ? "var(--pos-fg-highlight)" : "var(--pos-fg)",
                  };
                  return (
                    <tr key={user.id}>
                      <td style={cellStyle}>
                        {isSelected ? "» " : "  "}
                        {user.id}
                      </td>
                      <td style={cellStyle}>{user.username}</td>
                      <td style={cellStyle}>{user.email ?? "-"}</td>
                      <td style={cellStyle}>{user.isinactive ? "INACTIVO" : "ACTIVO"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ marginTop: 8, color: "var(--pos-fg-dim)" }}>
              Página {currentPage + 1} de {totalPages} — {totalUserCount} registro
              {totalUserCount === 1 ? "" : "s"}
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
          { key: "F7", label: "Contraseña" },
          { key: "F9", label: "Volver" },
        ]}
      />
    </PosTerminalShell>
  );
}
