import { Pool } from "pg";
import { RegionRepository, RegionSearchResult } from "../domain/RegionRepository";

const s = (v: unknown): string => (v === null || v === undefined ? "" : String(v).trim());

/** Consulta sobre pos.region (esquema `pos`). */
export class PostgresRegionRepository implements RegionRepository {
  private client: Pool;

  constructor(databaseUrl: string) {
    this.client = new Pool({ connectionString: databaseUrl });
  }

  async search(q: string, page: number, pageSize: number): Promise<RegionSearchResult> {
    const values: unknown[] = [];
    let where = "TRUE";

    if (q) {
      values.push(`%${q}%`);
      where = `(r.nombre ILIKE $1 OR r.region_id::text LIKE $1 OR r.saad_codigo ILIKE $1
                OR r.saad_descripcion ILIKE $1 OR p.nombre ILIKE $1 OR r.pais_id::text = btrim(replace($1, '%', '')))`;
    }
    values.push(pageSize, (page - 1) * pageSize);
    const limitIdx = values.length - 1;
    const offsetIdx = values.length;

    const result = await this.client.query({
      text: `
        SELECT r.region_id, r.nombre, r.pais_id, p.nombre AS pais, r.saad_codigo,
               (SELECT count(*) FROM pos.ciudad c WHERE c.region_id = r.region_id) AS ciudades,
               (SELECT count(*) FROM pos.provincia v WHERE v.region_id::text = r.externalid) AS provincias,
               (SELECT count(*) FROM pos.proveedor x WHERE x.region_id = r.region_id) AS proveedores,
               count(*) OVER() AS total
        FROM pos.region r
        LEFT JOIN pos.pais p ON p.pais_id = r.pais_id
        WHERE ${where}
        ORDER BY p.nombre NULLS LAST, r.pais_id, r.nombre, r.region_id
        LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      values,
    });

    return {
      items: result.rows.map((r) => ({
        id: Number(r.region_id),
        nombre: s(r.nombre),
        paisId: Number(r.pais_id),
        pais: s(r.pais),
        saad: s(r.saad_codigo),
        ciudades: Number(r.ciudades),
        provincias: Number(r.provincias),
        proveedores: Number(r.proveedores),
      })),
      total: result.rows.length ? Number(result.rows[0].total) : 0,
      page,
      pageSize,
    };
  }
}
