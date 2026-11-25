import { Pool } from "pg";
import { PaisCreateValues, PaisListItem, PaisRepository, PaisSearchResult } from "../domain/PaisRepository";

const s = (v: unknown): string => (v === null || v === undefined ? "" : String(v).trim());

/** SELECT común de la lista y del detalle: continente + conteos de uso. */
const SELECT_PAIS = `
  SELECT p.pais_id, p.nombre, p.continente_id, c.nombre AS continente,
         p.codigo_iso2, p.saad_codigo, p.saad_descripcion,
         (SELECT count(*) FROM pos.region r WHERE r.pais_id = p.pais_id) AS regiones,
         (SELECT count(*) FROM pos.proveedor v WHERE v.pais_id = p.pais_id) AS proveedores`;

function toItem(r: Record<string, unknown>): PaisListItem {
  return {
    id: Number(r.pais_id),
    nombre: s(r.nombre),
    continenteId: Number(r.continente_id),
    continente: s(r.continente),
    iso2: s(r.codigo_iso2),
    saad: s(r.saad_codigo),
    saadDescripcion: s(r.saad_descripcion),
    regiones: Number(r.regiones),
    proveedores: Number(r.proveedores),
  };
}

/** Acceso a pos.pais (esquema `pos`). */
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
        ${SELECT_PAIS}, count(*) OVER() AS total
        FROM pos.pais p
        LEFT JOIN pos.continente c ON c.continente_id = p.continente_id
        WHERE ${where}
        ORDER BY p.nombre, p.pais_id
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

  async getById(id: number): Promise<PaisListItem | null> {
    const r = await this.client.query(
      `${SELECT_PAIS}
       FROM pos.pais p
       LEFT JOIN pos.continente c ON c.continente_id = p.continente_id
       WHERE p.pais_id = $1`,
      [id]
    );
    return r.rows.length ? toItem(r.rows[0]) : null;
  }

  async buscarPorNombre(nombre: string, excluirId?: number): Promise<PaisListItem | null> {
    const r = await this.client.query(
      `${SELECT_PAIS}
       FROM pos.pais p
       LEFT JOIN pos.continente c ON c.continente_id = p.continente_id
       WHERE lower(btrim(p.nombre)) = lower(btrim($1))
         AND ($2::int IS NULL OR p.pais_id <> $2)
       ORDER BY p.pais_id LIMIT 1`,
      [nombre, excluirId ?? null]
    );
    return r.rows.length ? toItem(r.rows[0]) : null;
  }

  async buscarPorIso2(iso2: string, excluirId?: number): Promise<PaisListItem | null> {
    const r = await this.client.query(
      `${SELECT_PAIS}
       FROM pos.pais p
       LEFT JOIN pos.continente c ON c.continente_id = p.continente_id
       WHERE upper(btrim(p.codigo_iso2)) = upper(btrim($1))
         AND ($2::int IS NULL OR p.pais_id <> $2)
       ORDER BY p.pais_id LIMIT 1`,
      [iso2, excluirId ?? null]
    );
    return r.rows.length ? toItem(r.rows[0]) : null;
  }

  /** Sólo las 5 columnas editables; pais_id y externalid no se tocan. */
  async update(id: number, v: PaisCreateValues): Promise<void> {
    await this.client.query(
      `UPDATE pos.pais
          SET nombre = $2, continente_id = $3, saad_codigo = $4, saad_descripcion = $5, codigo_iso2 = $6
        WHERE pais_id = $1`,
      [id, v.nombre, v.continenteId, v.saad, v.saadDescripcion, v.iso2]
    );
  }

  async continenteExiste(continenteId: number): Promise<boolean> {
    const r = await this.client.query("SELECT 1 FROM pos.continente WHERE continente_id = $1 LIMIT 1", [
      continenteId,
    ]);
    return r.rows.length > 0;
  }

  async create(v: PaisCreateValues): Promise<number> {
    const tx = await this.client.connect();
    try {
      await tx.query("BEGIN");
      // Candado de transacción (se libera solo al terminar): serializa las altas
      // para que el "máximo + 1" no se repita. pos.pais tiene PK, así que un
      // choque se vería como error, pero así ni siquiera ocurre.
      await tx.query("SELECT pg_advisory_xact_lock(hashtext('pos.pais.alta'))");
      const r = await tx.query(
        `INSERT INTO pos.pais (pais_id, nombre, continente_id, saad_codigo, saad_descripcion, externalid, codigo_iso2)
         SELECT COALESCE(max(pais_id), 0) + 1, $1, $2, $3, $4, NULL, $5 FROM pos.pais
         RETURNING pais_id`,
        [v.nombre, v.continenteId, v.saad, v.saadDescripcion, v.iso2]
      );
      await tx.query("COMMIT");
      return Number(r.rows[0].pais_id);
    } catch (e) {
      await tx.query("ROLLBACK").catch(() => undefined);
      throw e;
    } finally {
      tx.release();
    }
  }
}
