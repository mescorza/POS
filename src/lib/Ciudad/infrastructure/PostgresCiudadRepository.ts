import { Pool } from "pg";
import {
  CiudadCreateValues,
  CiudadListItem,
  CiudadRepository,
  CiudadSearchResult,
} from "../domain/CiudadRepository";

const s = (v: unknown): string => (v === null || v === undefined ? "" : String(v).trim());

const SELECT_CIUDAD = `
  SELECT c.ciudad_id, c.nombre, c.region_id, r.nombre AS region, p.nombre AS pais, c.saad_codigo,
         c.saad_descripcion,
         (SELECT count(*) FROM pos.comuna m WHERE m.ciudad_id = c.ciudad_id) AS comunas,
         (SELECT count(*) FROM pos.proveedor x WHERE x.ciudad_id = c.ciudad_id) AS proveedores`;

const toItem = (r: any): CiudadListItem => ({
  id: Number(r.ciudad_id),
  nombre: s(r.nombre),
  regionId: Number(r.region_id),
  region: s(r.region),
  pais: s(r.pais),
  saad: s(r.saad_codigo),
  saadDescripcion: s(r.saad_descripcion),
  comunas: Number(r.comunas),
  proveedores: Number(r.proveedores),
});

/** Consulta sobre pos.ciudad (esquema `pos`). */
export class PostgresCiudadRepository implements CiudadRepository {
  private client: Pool;

  constructor(databaseUrl: string) {
    this.client = new Pool({ connectionString: databaseUrl });
  }

  async getById(id: number): Promise<CiudadListItem | null> {
    const r = await this.client.query(
      `${SELECT_CIUDAD}
       FROM pos.ciudad c
       LEFT JOIN pos.region r ON r.region_id = c.region_id
       LEFT JOIN pos.pais p ON p.pais_id = r.pais_id
       WHERE c.ciudad_id = $1`,
      [id]
    );
    return r.rows.length ? toItem(r.rows[0]) : null;
  }

  async buscarPorNombreEnRegion(nombre: string, regionId: number, excluirId?: number): Promise<CiudadListItem | null> {
    const r = await this.client.query(
      `${SELECT_CIUDAD}
       FROM pos.ciudad c
       LEFT JOIN pos.region r ON r.region_id = c.region_id
       LEFT JOIN pos.pais p ON p.pais_id = r.pais_id
       WHERE c.region_id = $2 AND lower(btrim(c.nombre)) = lower(btrim($1))
         AND ($3::int IS NULL OR c.ciudad_id <> $3)
       ORDER BY c.ciudad_id LIMIT 1`,
      [nombre, regionId, excluirId ?? null]
    );
    return r.rows.length ? toItem(r.rows[0]) : null;
  }

  /** Sólo las 4 columnas editables; ciudad_id y externalid no se tocan. */
  async update(id: number, v: CiudadCreateValues): Promise<void> {
    await this.client.query(
      `UPDATE pos.ciudad
          SET nombre = $2, region_id = $3, saad_codigo = $4, saad_descripcion = $5
        WHERE ciudad_id = $1`,
      [id, v.nombre, v.regionId, v.saad, v.saadDescripcion]
    );
  }

  async regionExiste(regionId: number): Promise<boolean> {
    const r = await this.client.query("SELECT 1 FROM pos.region WHERE region_id = $1 LIMIT 1", [regionId]);
    return r.rows.length > 0;
  }

  /** ciudad_id lo genera la identity (GENERATED ALWAYS): no se informa. externalid queda NULL. */
  async create(v: CiudadCreateValues): Promise<number> {
    const r = await this.client.query(
      `INSERT INTO pos.ciudad (nombre, region_id, saad_codigo, saad_descripcion, externalid)
       VALUES ($1, $2, $3, $4, NULL)
       RETURNING ciudad_id`,
      [v.nombre, v.regionId, v.saad, v.saadDescripcion]
    );
    return Number(r.rows[0].ciudad_id);
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
        SELECT c.ciudad_id, c.nombre, c.region_id, r.nombre AS region, p.nombre AS pais, c.saad_codigo, c.saad_descripcion,
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
        saadDescripcion: s(r.saad_descripcion),
        comunas: Number(r.comunas),
        proveedores: Number(r.proveedores),
      })),
      total: result.rows.length ? Number(result.rows[0].total) : 0,
      page,
      pageSize,
    };
  }
}
