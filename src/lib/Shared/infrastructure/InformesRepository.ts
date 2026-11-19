import { Pool } from "pg";

export interface TableColumnInfo {
  columnName: string;
  description: string | null;
  dataType: string;
  length: number | null;
  notNull: boolean;
}

export interface TableStructure {
  schema: string;
  tableName: string;
  columns: TableColumnInfo[];
}

/**
 * Consulta de sólo lectura contra el catálogo de PostgreSQL
 * (information_schema / pg_catalog) — no es un bounded context propio (sin
 * domain/VOs/casos de uso), mismo espíritu minimalista que LookupRepository:
 * sirve únicamente para alimentar el informe "Estructura de tablas"
 * (opción Informes del menú principal).
 */
export class InformesRepository {
  private client: Pool;

  constructor(databaseUrl: string) {
    this.client = new Pool({ connectionString: databaseUrl });
  }

  async listSchemas(): Promise<string[]> {
    const result = await this.client.query<{ schema_name: string }>(
      `SELECT schema_name
       FROM information_schema.schemata
       WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
         AND schema_name NOT LIKE 'pg_toast%'
         AND schema_name NOT LIKE 'pg_temp%'
       ORDER BY schema_name`
    );

    return result.rows.map((r) => r.schema_name);
  }

  async listTables(schema: string): Promise<string[]> {
    const result = await this.client.query<{ table_name: string }>({
      text: `SELECT table_name
             FROM information_schema.tables
             WHERE table_schema = $1 AND table_type = 'BASE TABLE'
             ORDER BY table_name`,
      values: [schema],
    });

    return result.rows.map((r) => r.table_name);
  }

  /**
   * Columna por columna, con descripción (COMMENT ON COLUMN, si existe),
   * tipo de dato, longitud (sólo aplica a tipos de caracteres) y NOT NULL.
   */
  async getTableStructure(schema: string, tableName: string): Promise<TableStructure> {
    const result = await this.client.query<{
      column_name: string;
      data_type: string;
      character_maximum_length: number | null;
      is_nullable: string;
      description: string | null;
    }>({
      text: `SELECT
               c.column_name,
               c.data_type,
               c.character_maximum_length,
               c.is_nullable,
               d.description
             FROM information_schema.columns c
             LEFT JOIN pg_catalog.pg_namespace ns ON ns.nspname = c.table_schema
             LEFT JOIN pg_catalog.pg_class cls ON cls.relname = c.table_name AND cls.relnamespace = ns.oid
             LEFT JOIN pg_catalog.pg_description d ON d.objoid = cls.oid AND d.objsubid = c.ordinal_position
             WHERE c.table_schema = $1 AND c.table_name = $2
             ORDER BY c.ordinal_position`,
      values: [schema, tableName],
    });

    const columns: TableColumnInfo[] = result.rows.map((row) => ({
      columnName: row.column_name,
      description: row.description,
      dataType: row.data_type,
      length: row.character_maximum_length,
      notNull: row.is_nullable === "NO",
    }));

    return { schema, tableName, columns };
  }

  /** schema completo: una estructura por cada tabla base, en orden alfabético. */
  async getAllTableStructures(schema: string): Promise<TableStructure[]> {
    const tables = await this.listTables(schema);
    const structures: TableStructure[] = [];

    for (const tableName of tables) {
      structures.push(await this.getTableStructure(schema, tableName));
    }

    return structures;
  }
}
