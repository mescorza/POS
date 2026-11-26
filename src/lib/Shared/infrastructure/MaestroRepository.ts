import { Pool } from "pg";

/**
 * Maestros de SOLO LECTURA para los pop-ups de lookup del Mantenedor de
 * Proveedores (docs/proveedores_mantenedor.md §6): se buscan y se
 * seleccionan. Su mantención (altas/cambios) vive en otras opciones del menú
 * principal, no aquí. Un único repositorio parametrizado por tipo: todos
 * siguen el mismo patrón (código + descripción, opcionalmente hijo de otro).
 */
export type MaestroTipo =
  | "sucursal"
  | "pais"
  | "region"
  | "ciudad"
  | "comuna"
  | "localidad"
  | "provincia"
  | "moneda";

export interface MaestroItem {
  id: string;
  name: string;
}

export interface MaestroSearchResult {
  items: MaestroItem[];
  total: number;
  page: number;
  pageSize: number;
}

interface MaestroConfig {
  table: string;
  idCol: string;
  nameCol: string;
  /** Columna FK al maestro padre (jerarquía geográfica). */
  parentCol?: string;
  /**
   * Filtro por padre a medida, para cuando la relación NO es `parentCol = id`.
   * Recibe el marcador del parámetro (p. ej. "$2") con el id del padre.
   */
  parentCond?: (param: string) => string;
  /** Filtro fijo (p. ej. sólo sucursales activas). */
  where?: string;
  orderBy: string;
}

const CONFIG: Record<MaestroTipo, MaestroConfig> = {
  sucursal: {
    table: "pos.sucursal",
    idCol: "codsucursal",
    nameCol: "descsucursal",
    where: "esinactiva = false",
    orderBy: "codsucursal",
  },
  pais: { table: "pos.pais", idCol: "pais_id", nameCol: "nombre", orderBy: "nombre" },
  moneda: { table: "pos.moneda", idCol: "moneda_id", nameCol: "nombre", orderBy: "moneda_id" },
  region: { table: "pos.region", idCol: "region_id", nameCol: "nombre", parentCol: "pais_id", orderBy: "nombre" },
  ciudad: { table: "pos.ciudad", idCol: "ciudad_id", nameCol: "nombre", parentCol: "region_id", orderBy: "nombre" },
  comuna: { table: "pos.comuna", idCol: "comuna_id", nameCol: "nombre", parentCol: "ciudad_id", orderBy: "nombre" },
  localidad: {
    table: "pos.localidad",
    idCol: "localidad_id",
    nameCol: "nombre",
    parentCol: "comuna_id",
    orderBy: "nombre",
  },
  // OJO: pos.provincia.region_id NO referencia pos.region.region_id sino
  // pos.region.externalid (p. ej. las provincias con region_id 206 son las de la
  // región cuyo externalid es 206, Valparaíso). La provincia 725 "SIN VALOR" es
  // un comodín válido para cualquier región, igual que en el detalle del proveedor.
  provincia: {
    table: "pos.provincia",
    idCol: "provincia_id",
    nameCol: "nombre",
    parentCond: (p) =>
      `(region_id::text = (SELECT r.externalid FROM pos.region r WHERE r.region_id = ${p}) OR provincia_id = 725)`,
    orderBy: "nombre",
  },
};

export function isMaestroTipo(v: string): v is MaestroTipo {
  return Object.prototype.hasOwnProperty.call(CONFIG, v);
}

export class MaestroRepository {
  private client: Pool;

  constructor(databaseUrl: string) {
    this.client = new Pool({ connectionString: databaseUrl });
  }

  async search(
    tipo: MaestroTipo,
    q: string,
    parentId: number | null,
    page: number,
    pageSize: number
  ): Promise<MaestroSearchResult> {
    const c = CONFIG[tipo];
    const values: unknown[] = [];
    const conds: string[] = [];

    if (c.where) conds.push(c.where);
    if ((c.parentCol || c.parentCond) && parentId !== null) {
      values.push(parentId);
      conds.push(c.parentCond ? c.parentCond(`$${values.length}`) : `${c.parentCol} = $${values.length}`);
    }
    if (q) {
      values.push(`%${q}%`);
      const likeIdx = values.length;
      values.push(`${q}%`);
      conds.push(`(${c.nameCol} ILIKE $${likeIdx} OR ${c.idCol}::text LIKE $${values.length})`);
    }
    const where = conds.length ? conds.join(" AND ") : "TRUE";

    const filterValues = [...values];
    values.push(pageSize, (page - 1) * pageSize);

    const result = await this.client.query({
      text: `SELECT ${c.idCol}::text AS id, trim(${c.nameCol}) AS name, count(*) OVER() AS total
             FROM ${c.table}
             WHERE ${where}
             ORDER BY ${c.orderBy}, ${c.idCol}
             LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    });

    let total = result.rows.length ? Number(result.rows[0].total) : 0;
    if (!result.rows.length && page > 1) {
      const t = await this.client.query({
        text: `SELECT count(*) AS total FROM ${c.table} WHERE ${where}`,
        values: filterValues,
      });
      total = Number(t.rows[0].total);
    }

    return {
      items: result.rows.map((r) => ({ id: r.id, name: r.name })),
      total,
      page,
      pageSize,
    };
  }
}
