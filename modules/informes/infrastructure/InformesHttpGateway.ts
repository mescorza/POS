/**
 * Adaptador de entrada del módulo Informes hacia la API Express existente
 * (ExpressInformesRouter -> InformesRepository), mismo patrón que
 * UserHttpGateway/EmployeHttpGateway/LookupHttpGateway: fetch nativo, sin
 * librería de estado global.
 */
export class InformesHttpGateway {
  async listSchemas(): Promise<string[]> {
    const response = await fetch("/informes/schemas");
    if (!response.ok) {
      throw new Error(`No se pudo obtener la lista de esquemas (HTTP ${response.status})`);
    }
    return response.json();
  }

  async listTables(schema: string): Promise<string[]> {
    const response = await fetch(`/informes/schemas/${encodeURIComponent(schema)}/tables`);
    if (!response.ok) {
      throw new Error(`No se pudo obtener las tablas del esquema "${schema}" (HTTP ${response.status})`);
    }
    return response.json();
  }

  /**
   * Descarga el .xlsx del informe "Estructura de tablas" y dispara la
   * descarga en el navegador (sin diálogos nativos: un <a download> temporal,
   * igual de espíritu que el resto de la UI que evita APIs nativas
   * intrusivas). `table` vacío o "TODAS" trae todas las tablas del esquema.
   */
  async downloadEstructuraXlsx(schema: string, table: string): Promise<void> {
    const params = new URLSearchParams({ schema });
    if (table.trim()) {
      params.set("table", table.trim());
    }

    const response = await fetch(`/informes/estructura.xlsx?${params.toString()}`);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.message ?? `No se pudo generar el informe (HTTP ${response.status})`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const fileLabel = table.trim() || "TODAS";
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `Estructura_${schema}_${fileLabel}.xlsx`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}
