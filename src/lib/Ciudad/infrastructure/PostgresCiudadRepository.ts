import { Pool } from "pg";
import { CiudadRepository, CiudadSearchResult } from "../domain/CiudadRepository";

const s = (v: unknown): string => (v === null || v === undefined ? "" : String(v).trim());

/** Consulta sobre pos.ciudad (esquema `pos`). */
export class PostgresCiudadRepository implements CiudadRepository {
  private client: Pool;

  constructor(databaseUrl: string) {
    this.client = new Pool({ connectionString: databaseUrl });
  }

  async search(q: string, page: number, pageSize: number): Promise<CiudadSearchResult> {
    const values: unknown[] = [];
    let where = "TRUE";

    if (q) {
      values.push(`%${q}%`);
      where = `(c.nombre ILIKE $1 OR c.ciudad_id::text LIKE $1 OR c.saad_codigo ILIKE $1
                OR c.saad_descripcion ILIKE $1 OR r.nombre ILIKE $1 OR p.nombre ILIKE $1)`;
    }
    values.push(pageSize, (page - 1) * pageSize);
    const limitIdx = values.length - 1;
    const offsetIdx = values.length;

    const result = await this.client.query({
      text: `
        SELECT c.ciudad_id, c.nombre, c.region_id, r.nombre AS region, p.nombre AS pais, c.saad_codigo,
               (SELECT count(*) FROM pos.comuna m WHERE m.ciudad_id = c.ciudad_id) AS comunas,
               (SELECT count(*) FROM pos.proveedor x WHERE x.ciudad_id = c.ciudad_id) AS proveedores,
               count(*) OVER() AS total
        FROM pos.ciudad c
        LEFT JOIN pos.region r ON r.region_id = c.region_id
        LEFT JOIN pos.pais p ON p.pais_id = r.pais_id
        WHERE ${where}
        ORDER BY p.nombre NULLS LAST, r.nombre NULLS LAST, c.region_id, c.nombre, c.ciudad_id
        LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      values,
    });

    return {
      items: result.rows.map((r) => ({
        id: Number(r.ciudad_id),
        nombre: s(r.nombre),
        regionId: Number(r.region_id),
        region: s(r.region),
        pais: s(r.pais),
        saad: s(r.saad_codigo),
        comunas: Number(r.comunas),
        proveedores: Number(r.proveedores),
      })),
      total: result.rows.length ? Number(result.rows[0].total) : 0,
      page,
      pageSize,
    };
  }
}
