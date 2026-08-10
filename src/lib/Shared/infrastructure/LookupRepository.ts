import { Pool } from "pg";

export interface LookupItem {
  id: string;
  name: string;
}

/**
 * Consulta de sólo lectura para `department` y `subsidiary` — se usan
 * únicamente para mostrar "Tienda" y el encabezado de subsidiaria en el
 * formulario de Usuarios (campos 1 y 3 del mapeo V2). No son bounded
 * contexts propios (no tienen domain/VOs/casos de uso): es deliberadamente
 * mínimo, como pide el documento ("Sólo Consulta").
 */
export class LookupRepository {
  private client: Pool;

  constructor(databaseUrl: string) {
    this.client = new Pool({ connectionString: databaseUrl });
  }

  async getDepartmentById(id: string): Promise<LookupItem | null> {
    const result = await this.client.query<{ id: string; name: string }>({
      text: "SELECT id, name FROM department WHERE id = $1",
      values: [id],
    });

    return result.rows[0] ?? null;
  }

  async getSubsidiaryById(id: string): Promise<LookupItem | null> {
    const result = await this.client.query<{ id: string; name: string }>({
      text: "SELECT id, name FROM subsidiary WHERE id = $1",
      values: [id],
    });

    return result.rows[0] ?? null;
  }
}
