import { Pool } from "pg";
import { PaisRepository, PaisSearchResult } from "../domain/PaisRepository";

const s = (v: unknown): string => (v === null || v === undefined ? "" : String(v).trim());

/** Consulta sobre pos.pais (esquema `pos`). */
export class PostgresPaisRepository implements PaisRepository {
  private client: Pool;

  constructor(databaseUrl: string) {
    this.client = new Pool({ connectionString: databaseUrl });
  }

  async search(q: string, page: number, pageSize: number): Promise<PaisSearchResult> {
    const values: unknown[] = [];
    let where = "TRUE";

    if (q) {
      values.push(`%${q}%`);
      where = `(p.nombre ILIKE $1 OR p.pais_id::text LIKE $1 OR p.codigo_iso2 ILIKE $1
                OR p.saad_codigo ILIKE $1 OR c.nombre ILIKE $1)`;
    }
    values.push(pageSize, (page - 1) * pageSize);
    const limitIdx = values.length - 1;
    const offsetIdx = values.length;

    const result = await this.client.query({
      text: `
        SELECT p.pais_id, p.nombre, p.continente_id, c.nombre AS continente,
               p.codigo_iso2, p.saad_codigo,
               (SELECT count(*) FROM pos.region r WHERE r.pais_id = p.pais_id) AS regiones,
               (SELECT count(*) FROM pos.proveedor v WHERE v.pais_id = p.pais_id) AS proveedores,
               count(*) OVER() AS total
        FROM pos.pais p
        LEFT JOIN pos.continente c ON c.continente_id = p.continente_id
        WHERE ${where}
        ORDER BY p.nombre, p.pais_id
        LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      values,
    });

    return {
      items: result.rows.map((r) => ({
        id: Number(r.pais_id),
        nombre: s(r.nombre),
        continenteId: Number(r.continente_id),
        continente: s(r.continente),
        iso2: s(r.codigo_iso2),
        saad: s(r.saad_codigo),
        regiones: Number(r.regiones),
        proveedores: Number(r.proveedores),
      })),
      total: result.rows.length ? Number(result.rows[0].total) : 0,
      page,
      pageSize,
    };
  }
}
