import { Pool } from "pg";
import { ContinenteListItem, ContinenteRepository, ContinenteSearchResult } from "../domain/ContinenteRepository";

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

  async buscarPorNombre(nombre: string): Promise<ContinenteListItem | null> {
    const r = await this.client.query(
      `SELECT continente_id, nombre FROM pos.continente
       WHERE lower(btrim(nombre)) = lower(btrim($1)) AND continente_id IS NOT NULL
       ORDER BY continente_id LIMIT 1`,
      [nombre]
    );
    if (!r.rows.length) return null;
    return { id: Number(r.rows[0].continente_id), nombre: String(r.rows[0].nombre).trim(), paises: 0 };
  }

  async create(nombre: string): Promise<ContinenteListItem> {
    const tx = await this.client.connect();
    try {
      await tx.query("BEGIN");
      // Candado de transacción (se libera solo al terminar): serializa las altas
      // para que el "máximo + 1" no se repita. La clave es arbitraria pero fija.
      await tx.query("SELECT pg_advisory_xact_lock(hashtext('pos.continente.alta'))");
      const r = await tx.query(
        `INSERT INTO pos.continente (continente_id, nombre)
         SELECT COALESCE(max(continente_id), 0) + 1, $1 FROM pos.continente
         RETURNING continente_id, nombre`,
        [nombre]
      );
      await tx.query("COMMIT");
      return { id: Number(r.rows[0].continente_id), nombre: String(r.rows[0].nombre).trim(), paises: 0 };
    } catch (e) {
      await tx.query("ROLLBACK").catch(() => undefined);
      throw e;
    } finally {
      tx.release();
    }
  }
}
