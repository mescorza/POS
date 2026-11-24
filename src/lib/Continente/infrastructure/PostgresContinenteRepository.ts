import { Pool } from "pg";
import { ContinenteRepository, ContinenteSearchResult } from "../domain/ContinenteRepository";

/** Consulta sobre pos.continente (esquema `pos`). */
export class PostgresContinenteRepository implements ContinenteRepository {
  private client: Pool;

  constructor(databaseUrl: string) {
    this.client = new Pool({ connectionString: databaseUrl });
  }

  async search(q: string, page: number, pageSize: number): Promise<ContinenteSearchResult> {
    const values: unknown[] = [];
    let where = "c.continente_id IS NOT NULL";

    if (q) {
      values.push(`%${q}%`);
      where += " AND (c.nombre ILIKE $1 OR c.continente_id::text LIKE $1)";
    }
    values.push(pageSize, (page - 1) * pageSize);
    const limitIdx = values.length - 1;
    const offsetIdx = values.length;

    const result = await this.client.query({
      text: `
        SELECT c.continente_id, c.nombre,
               (SELECT count(*) FROM pos.pais p WHERE p.continente_id = c.continente_id) AS paises,
               count(*) OVER() AS total
        FROM pos.continente c
        WHERE ${where}
        ORDER BY c.continente_id
        LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      values,
    });

    return {
      items: result.rows.map((r) => ({
        id: Number(r.continente_id),
        nombre: String(r.nombre ?? "").trim(),
        paises: Number(r.paises),
      })),
      total: result.rows.length ? Number(result.rows[0].total) : 0,
      page,
      pageSize,
    };
  }
}
