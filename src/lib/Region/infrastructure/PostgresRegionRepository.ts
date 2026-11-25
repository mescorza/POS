import { Pool } from "pg";
import {
  RegionCreateValues,
  RegionListItem,
  RegionRepository,
  RegionSearchResult,
} from "../domain/RegionRepository";

const s = (v: unknown): string => (v === null || v === undefined ? "" : String(v).trim());

/** SELECT común de la lista y del detalle: país + conteos de uso. */
const SELECT_REGION = `
  SELECT r.region_id, r.nombre, r.pais_id, p.nombre AS pais, r.saad_codigo, r.saad_descripcion,
         (SELECT count(*) FROM pos.ciudad c WHERE c.region_id = r.region_id) AS ciudades,
         (SELECT count(*) FROM pos.provincia v WHERE v.region_id::text = r.externalid) AS provincias,
         (SELECT count(*) FROM pos.proveedor x WHERE x.region_id = r.region_id) AS proveedores`;

function toItem(r: Record<string, unknown>): RegionListItem {
  return {
    id: Number(r.region_id),
    nombre: s(r.nombre),
    paisId: Number(r.pais_id),
    pais: s(r.pais),
    saad: s(r.saad_codigo),
    saadDescripcion: s(r.saad_descripcion),
    ciudades: Number(r.ciudades),
    provincias: Number(r.provincias),
    proveedores: Number(r.proveedores),
  };
}

/** Acceso a pos.region (esquema `pos`). */
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
        ${SELECT_REGION}, count(*) OVER() AS total
        FROM pos.region r
        LEFT JOIN pos.pais p ON p.pais_id = r.pais_id
        WHERE ${where}
        ORDER BY p.nombre NULLS LAST, r.pais_id, r.nombre, r.region_id
        LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      values,
    });

    return {
      items: result.rows.map(toItem),
      total: result.rows.length ? Number(result.rows[0].total) : 0,
      page,
      pageSize,
    };
  }

  async getById(id: number): Promise<RegionListItem | null> {
    const r = await this.client.query(
      `${SELECT_REGION}
       FROM pos.region r
       LEFT JOIN pos.pais p ON p.pais_id = r.pais_id
       WHERE r.region_id = $1`,
      [id]
    );
    return r.rows.length ? toItem(r.rows[0]) : null;
  }

  async buscarPorNombreEnPais(nombre: string, paisId: number): Promise<RegionListItem | null> {
    const r = await this.client.query(
      `${SELECT_REGION}
       FROM pos.region r
       LEFT JOIN pos.pais p ON p.pais_id = r.pais_id
       WHERE r.pais_id = $2 AND lower(btrim(r.nombre)) = lower(btrim($1))
       ORDER BY r.region_id LIMIT 1`,
      [nombre, paisId]
    );
    return r.rows.length ? toItem(r.rows[0]) : null;
  }

  async paisExiste(paisId: number): Promise<boolean> {
    const r = await this.client.query("SELECT 1 FROM pos.pais WHERE pais_id = $1 LIMIT 1", [paisId]);
    return r.rows.length > 0;
  }

  /** region_id lo genera la identity (GENERATED ALWAYS): no se informa. externalid queda NULL. */
  async create(v: RegionCreateValues): Promise<number> {
    const r = await this.client.query(
      `INSERT INTO pos.region (nombre, pais_id, saad_codigo, saad_descripcion, externalid)
       VALUES ($1, $2, $3, $4, NULL)
       RETURNING region_id`,
      [v.nombre, v.paisId, v.saad, v.saadDescripcion]
    );
    return Number(r.rows[0].region_id);
  }
}
