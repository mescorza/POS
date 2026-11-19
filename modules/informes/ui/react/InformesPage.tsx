import * as React from "react";
import { PosTerminalShell } from "../../../../shared/ui/pos-terminal/PosTerminalShell";
import { PosFunctionKeyBar } from "../../../../shared/ui/pos-terminal/PosFunctionKeyBar";
import { PosField } from "../../../../shared/ui/pos-terminal/PosField";
import { PosSectionHeader } from "../../../../shared/ui/pos-terminal/PosSectionHeader";
import { usePosFocus } from "../../../../shared/ui/pos-terminal/usePosFocus";
import { InformesHttpGateway } from "../../infrastructure/InformesHttpGateway";

/**
 * Opción del menú principal "Informes": sub-menú propio (mismo patrón de
 * ventana-formulario de opciones que MainMenuPage) con, por ahora, un único
 * informe: "Listado de estructura de tablas". Mismos modos/teclas que el
 * resto de la UI (docs/POS_Documentacion_UIUX_Frontend_V1.docx §10):
 * PosTerminalShell + encabezado de 3 columnas + PosFunctionKeyBar,
 * autoenfoque por teclado (usePosFocus), F9/Esc siempre disponibles.
 */
export interface InformesPageProps {
  onBack: () => void;
}

interface ReportOption {
  code: string;
  label: string;
}

const REPORT_OPTIONS: ReportOption[] = [
  { code: "01", label: "Listado de estructura de tablas" },
];

type Mode = "menu" | "estructura-tablas";

const gateway = new InformesHttpGateway();

export function InformesPage({ onBack }: InformesPageProps) {
  const [mode, setMode] = React.useState<Mode>("menu");
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const bodyRef = usePosFocus<HTMLDivElement>(mode);

  const handleMenuKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((i) => (i + 1) % REPORT_OPTIONS.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((i) => (i - 1 + REPORT_OPTIONS.length) % REPORT_OPTIONS.length);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (REPORT_OPTIONS[selectedIndex].code === "01") {
        setMode("estructura-tablas");
      }
      return;
    }
    if (event.key === "F9" || event.key === "Escape") {
      event.preventDefault();
      onBack();
      return;
    }
  };

  if (mode === "estructura-tablas") {
    return <EstructuraTablasReportPage onBack={() => setMode("menu")} />;
  }

  return (
    <PosTerminalShell>
      <div className="pos-operational-header">
        <span style={{ fontWeight: "bold", color: "var(--pos-fg)" }}>ADRIAZOLA REPUESTOS</span>
        <span style={{ fontWeight: "bold", color: "var(--pos-fg)" }}>INFORMES</span>
        <span style={{ fontWeight: "bold", color: "var(--pos-fg)" }}>POS TIENDA</span>
      </div>
      <div className="pos-terminal-body" tabIndex={0} onKeyDown={handleMenuKeyDown} ref={bodyRef}>
        <p style={{ margin: "0 0 16px" }}>Seleccione un informe:</p>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <tbody>
            {REPORT_OPTIONS.map((option, index) => {
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
      </div>
      <PosFunctionKeyBar
        keys={[
          { key: "↑↓", label: "Mover selección" },
          { key: "Enter", label: "Abrir" },
          { key: "F9", label: "Volver" },
          { key: "Esc", label: "Volver" },
        ]}
      />
    </PosTerminalShell>
  );
}

interface EstructuraTablasReportPageProps {
  onBack: () => void;
}

function EstructuraTablasReportPage({ onBack }: EstructuraTablasReportPageProps) {
  const [schema, setSchema] = React.useState("public");
  const [table, setTable] = React.useState("");
  const [generating, setGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  // Buscador de tablas del esquema actual (F2), mismo patrón que el
  // buscador de empleado de UserMaintenancePage: lista filtrable en pantalla,
  // sin diálogos nativos.
  const [showPicker, setShowPicker] = React.useState(false);
  const [pickerQuery, setPickerQuery] = React.useState("");
  const [tablesCatalog, setTablesCatalog] = React.useState<string[] | null>(null);

  const bodyRef = usePosFocus<HTMLDivElement>(showPicker ? "picker" : "form");

  const openPicker = async () => {
    setShowPicker(true);
    setPickerQuery("");
    setTablesCatalog(null);
    setError(null);
    try {
      const tables = await gateway.listTables(schema.trim() || "public");
      setTablesCatalog(tables);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setShowPicker(false);
    }
  };

  const closePicker = () => {
    setShowPicker(false);
    bodyRef.current?.focus();
  };

  const pickTable = (name: string) => {
    setTable(name);
    setShowPicker(false);
    bodyRef.current?.focus();
  };

  const filteredCatalog = React.useMemo(() => {
    if (!tablesCatalog) return [];
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return tablesCatalog.slice(0, 30);
    return tablesCatalog.filter((t) => t.toLowerCase().includes(q)).slice(0, 30);
  }, [tablesCatalog, pickerQuery]);

  const generate = async () => {
    if (!schema.trim()) {
      setError("Ingrese un esquema.");
      return;
    }

    setGenerating(true);
    setError(null);
    setStatusMessage("Generando informe...");

    try {
      await gateway.downloadEstructuraXlsx(schema.trim(), table);
      setStatusMessage("Informe generado. Revise las descargas del navegador.");
    } catch (e) {
      setStatusMessage(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (showPicker) {
      if (event.key === "Escape") {
        event.preventDefault();
        closePicker();
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
      openPicker();
      return;
    }
    if (event.key === "F5") {
      event.preventDefault();
      generate();
      return;
    }
  };

  return (
    <PosTerminalShell>
      <div className="pos-operational-header" style={{ alignItems: "flex-start" }}>
        <span style={{ fontWeight: "bold", fontSize: 16, color: "var(--pos-fg)" }}>ADRIAZOLA REPUESTOS</span>
        <span style={{ fontWeight: "bold", fontSize: 16, color: "var(--pos-fg)" }}>
          INFORMES — ESTRUCTURA DE TABLAS
        </span>
        <span style={{ textAlign: "right" }}>
          <div style={{ fontWeight: "bold", color: "var(--pos-fg)" }}>POS TIENDA</div>
          <div style={{ color: "#e0c341" }}>GENERACIÓN</div>
        </span>
      </div>
      <div className="pos-terminal-body" tabIndex={0} onKeyDown={handleKeyDown} ref={bodyRef}>
        <PosSectionHeader>PARÁMETROS DEL INFORME</PosSectionHeader>
        <PosField label="Esquema" value={schema} onChange={setSchema} autoFocus />
        <PosField label="Tabla" value={table} onChange={setTable} />
        <p style={{ margin: "0 0 12px", color: "var(--pos-fg-dim)", fontSize: 12 }}>
          Deje "Tabla" en blanco (o escriba TODAS) para incluir todas las tablas del esquema.
          F2 abre un buscador de tablas del esquema indicado.
        </p>

        {showPicker && (
          <div>
            <PosField label="Buscar tabla" value={pickerQuery} onChange={setPickerQuery} autoFocus />
            <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid var(--pos-fg-dim)" }}>
              {tablesCatalog === null && <p style={{ padding: "2px 6px" }}>Cargando tablas...</p>}
              {tablesCatalog !== null && filteredCatalog.length === 0 && (
                <p style={{ padding: "2px 6px" }}>Sin resultados.</p>
              )}
              {filteredCatalog.map((name) => (
                <div
                  key={name}
                  style={{ padding: "2px 6px", cursor: "pointer" }}
                  onClick={() => pickTable(name)}
                >
                  {name}
                </div>
              ))}
            </div>
            <button type="button" onClick={closePicker}>
              Cancelar búsqueda
            </button>
          </div>
        )}

        {error && <p style={{ color: "var(--pos-fg-highlight)", marginTop: 12 }}>{error}</p>}
        {statusMessage && !error && (
          <p style={{ color: "var(--pos-fg-highlight)", marginTop: 12 }}>{statusMessage}</p>
        )}
      </div>
      <PosFunctionKeyBar
        keys={[
          { key: "F2", label: "Buscar tabla" },
          { key: "F5", label: generating ? "Generando..." : "Generar informe (.xlsx)" },
          { key: "F9", label: "Volver" },
          { key: "Esc", label: "Volver" },
        ]}
      />
    </PosTerminalShell>
  );
}
