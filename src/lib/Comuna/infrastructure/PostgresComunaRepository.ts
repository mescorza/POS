import { Pool } from "pg";
import { ComunaRepository, ComunaSearchResult } from "../domain/ComunaRepository";

const s = (v: unknown): string => (v === null || v === undefined ? "" : String(v).trim());

/** Consulta sobre pos.comuna (esquema `pos`). */
export class PostgresComunaRepository implements ComunaRepository {
  private client: Pool;

  constructor(databaseUrl: string) {
    this.client = new Pool({ connectionString: databaseUrl });
  }

  async search(q: string, page: number, pageSize: number): Promise<ComunaSearchResult> {
    const values: unknown[] = [];
    let where = "TRUE";

    if (q) {
      values.push(`%${q}%`);
      where = `(m.nombre ILIKE $1 OR m.comuna_id::text LIKE $1 OR m.saad_codigo ILIKE $1
                OR m.saad_descripcion ILIKE $1 OR c.nombre ILIKE $1 OR r.nombre ILIKE $1)`;
    }
    values.push(pageSize, (page - 1) * pageSize);
    const limitIdx = values.length - 1;
    const offsetIdx = values.length;

    const result = await this.client.query({
      text: `
        SELECT m.comuna_id, m.nombre, m.ciudad_id, c.nombre AS ciudad, r.nombre AS region,
               m.saad_codigo, m.saad_descripcion,
               (SELECT count(*) FROM pos.localidad l WHERE l.comuna_id = m.comuna_id) AS localidades,
               (SELECT count(*) FROM pos.proveedor x WHERE x.comuna_id = m.comuna_id) AS proveedores,
               count(*) OVER() AS total
        FROM pos.comuna m
        LEFT JOIN pos.ciudad c ON c.ciudad_id = m.ciudad_id
        LEFT JOIN pos.region r ON r.region_id = c.region_id
        WHERE ${where}
        ORDER BY r.nombre NULLS LAST, c.nombre NULLS LAST, m.ciudad_id, m.nombre, m.comuna_id
        LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      values,
    });

    return {
      items: result.rows.map((r) => ({
        id: Number(r.comuna_id),
        nombre: s(r.nombre),
        ciudadId: Number(r.ciudad_id),
        ciudad: s(r.ciudad),
        region: s(r.region),
        saad: s(r.saad_codigo),
        saadDescripcion: s(r.saad_descripcion),
        localidades: Number(r.localidades),
        proveedores: Number(r.proveedores),
      })),
      total: result.rows.length ? Number(result.rows[0].total) : 0,
      page,
      pageSize,
    };
  }
}
