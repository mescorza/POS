import * as React from "react";
import { PosTerminalShell } from "../pos-terminal/PosTerminalShell";
import { PosOperationalHeader } from "../pos-terminal/PosOperationalHeader";
import { PosFunctionKeyBar } from "../pos-terminal/PosFunctionKeyBar";
import { usePosFocus } from "../pos-terminal/usePosFocus";

/**
 * Formulario inicial de opciones (Parte I, sección 1A del documento de
 * arquitectura). Ventana-formulario estilo COBOL: una opción editable,
 * descripción de la opción seleccionada, contexto de sesión y teclas de
 * función. No es un menú web: se opera enteramente por teclado.
 *
 * Etapa actual: opciones EN DURO (hardcodeadas), sin wiring a los routers
 * ni casos de uso reales todavía. Sólo selecciona una capacidad y muestra su
 * destino; no contiene lógica de negocio de ningún módulo (regla 1A.2).
 */
export interface MainMenuOption {
  code: string;
  /** Identificador estable de la acción; no cambia al renumerar. */
  action: string;
  label: string;
  boundedContext: string;
  entryUseCase: string;
  /** Si existe, la opción abre un submenú con estas opciones. */
  children?: MainMenuOption[];
}

const MAIN_MENU_OPTIONS: MainMenuOption[] = [
  {
    code: "00",
    action: "admin",
    label: "Administración del Sistema",
    boundedContext: "Administración",
    entryUseCase: "Submenú: usuarios y empleados",
    children: [
      {
        code: "01",
        action: "users",
        label: "Consulta y mantención de usuarios",
        boundedContext: "User",
        entryUseCase:
          "UserGetAll / UserGetOneById / UserCreate / UserEdit / UserDelete",
      },
      {
        code: "02",
        action: "employees",
        label: "Consulta y mantención de empleados",
        boundedContext: "Employe",
        entryUseCase:
          "EmployeGetAll / EmployeGetOneById / EmployeCreate / EmployeEdit / EmployeDelete",
      },
    ],
  },
  {
    code: "01",
    action: "masters",
    label: "Maestros Centrales",
    boundedContext: "Catálogo / Maestros",
    entryUseCase: "Submenú: proveedores, items/productos y clientes",
    children: [
      {
        code: "01",
        action: "suppliers",
        label: "Mantenedor de Proveedores",
        boundedContext: "Supplier",
        entryUseCase: "Pendiente",
      },
      {
        code: "02",
        action: "items",
        label: "Mantenedor de Items/Productos",
        boundedContext: "Item / Producto",
        entryUseCase: "Pendiente",
      },
      {
        code: "03",
        action: "customers",
        label: "Mantenedor de Clientes",
        boundedContext: "Customer",
        entryUseCase: "Pendiente",
      },
    ],
  },
  {
    code: "02",
    action: "sales",
    label: "Registro de Venta",
    boundedContext: "Sales / SalesHeader",
    entryUseCase: "OpenSalesHeaderForm",
  },
  {
    code: "03",
    action: "sync",
    label: "Estado de sincronización",
    boundedContext: "Shared / Integration",
    entryUseCase: "GetIntegrationStatus",
  },
  {
    code: "04",
    action: "signout",
    label: "Cierre de sesión",
    boundedContext: "auth / application shell",
    entryUseCase: "SignOut / CloseOperationalSession",
  },
  {
    code: "05",
    action: "informes",
    label: "Informes",
    boundedContext: "Shared / Informes",
    entryUseCase: "InformesMenu / Estructura de tablas",
  },
];

export interface MainMenuPageProps {
  /**
   * El formulario inicial sólo selecciona una capacidad y entrega contexto
   * de sesión (regla 1A.2); no navega directamente. Quien lo monte decide
   * qué hacer con la opción confirmada (por ahora puede quedar sin usar).
   */
  onOptionConfirmed?: (option: MainMenuOption) => void;
  /** Username de la sesión activa (AuthSignIn); se muestra en el encabezado. */
  user?: string;
}

export function MainMenuPage({ onOptionConfirmed, user }: MainMenuPageProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [typedCode, setTypedCode] = React.useState("");
  const [statusMessage, setStatusMessage] = React.useState<string | null>(
    null
  );

  const [submenu, setSubmenu] = React.useState<MainMenuOption | null>(null);
  const options = submenu?.children ?? MAIN_MENU_OPTIONS;
  const selectedOption = options[selectedIndex];
  const bodyRef = usePosFocus<HTMLDivElement>("menu");

  const selectByCode = (code: string) => {
    const index = options.findIndex((o) => o.code === code);
    if (index !== -1) {
      setSelectedIndex(index);
    }
  };

  const confirmSelection = () => {
    if (selectedOption.children) {
      setSubmenu(selectedOption);
      setSelectedIndex(0);
      setTypedCode("");
      setStatusMessage(null);
      return;
    }
    setStatusMessage(
      `Abriendo opción ${selectedOption.code} - ${selectedOption.label}  (destino aún no implementado)`
    );
    onOptionConfirmed?.(selectedOption);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setTypedCode("");
      setSelectedIndex((i) => (i + 1) % options.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setTypedCode("");
      setSelectedIndex(
        (i) => (i - 1 + options.length) % options.length
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      confirmSelection();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setTypedCode("");
      setStatusMessage(null);
      if (submenu) {
        setSelectedIndex(MAIN_MENU_OPTIONS.indexOf(submenu));
        setSubmenu(null);
      }
      return;
    }

    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      const next = (typedCode + event.key).slice(-2);
      setTypedCode(next);
      if (next.length === 2) {
        selectByCode(next);
      }
      return;
    }
  };

  return (
    <PosTerminalShell>
      <PosOperationalHeader user={user} />
      <div
        className="pos-terminal-body"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        ref={bodyRef}
      >
        <p style={{ margin: "0 0 16px" }}>
          {submenu
            ? `POS - ${submenu.code} ${submenu.label.toUpperCase()}`
            : "POS - FORMULARIO INICIAL DE OPCIONES"}
        </p>

        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <tbody>
            {options.map((option, index) => {
              const isSelected = index === selectedIndex;
              return (
                <tr key={option.code}>
                  <td style={{ padding: "2px 12px 2px 0", width: 40 }}>
                    {isSelected ? "»" : " "} {option.code}
                  </td>
                  <td
                    style={{
                      padding: "2px 0",
                      background: isSelected ? "var(--pos-selection-bg)" : "transparent",
                      color: isSelected ? "var(--pos-fg-highlight)" : "var(--pos-fg)",
                    }}
                  >
                    {option.label}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ marginTop: 24 }}>
          <div>
            Opción: <span style={{ color: "var(--pos-fg-highlight)" }}>{typedCode || selectedOption.code}</span>
            <span style={{ opacity: 0.6 }}>_</span>
          </div>
          <div style={{ marginTop: 4 }}>
            Descripción: {selectedOption.label} ({selectedOption.boundedContext})
          </div>
        </div>

        {statusMessage && (
          <div style={{ marginTop: 16, color: "var(--pos-fg-highlight)" }}>
            {statusMessage}
          </div>
        )}
      </div>
      <PosFunctionKeyBar
        keys={[
          { key: "↑↓", label: "Mover selección" },
          { key: "0-9", label: "Ir a opción" },
          { key: "Enter", label: "Seleccionar" },
          { key: "Esc", label: submenu ? "Volver" : "Cancelar" },
        ]}
      />
    </PosTerminalShell>
  );
}
