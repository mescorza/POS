import { Pool } from "pg";
import {
  ProveedorDetalle,
  ProveedorEditInputNormalizado,
  ProveedorListItem,
  ProveedorRepository,
  ProveedorSearchResult,
} from "../domain/ProveedorRepository";

const s = (v: unknown): string => (v === null || v === undefined ? "" : String(v).trim());

/**
 * Consulta sobre pos.proveedor (esquema `pos`, no `public`). La jerarquía
 * geográfica se resuelve igual que la consulta original de ESP_PRV_001
 * (región por país, ciudad por región, ...). Si un código apunta a un registro
 * que no existe (88 países y 258 regiones huérfanos en datos reales), la
 * descripción queda en blanco pero el código se muestra igual.
 */
export class PostgresProveedorRepository implements ProveedorRepository {
  private client: Pool;

  constructor(databaseUrl: string) {
    this.client = new Pool({ connectionString: databaseUrl });
  }

  async search(q: string, page: number, pageSize: number): Promise<ProveedorSearchResult> {
    const values: unknown[] = [];
    let where = "TRUE";

    if (q) {
      const clean = q.replace(/[.\s]/g, "");
      const rutConDv = /^(\d{1,9})-([0-9kK])$/.exec(clean);
      const soloDigitos = /^\d{1,9}$/.test(clean);

      values.push(`%${q}%`);
      const conds = ["p.razonsocial ILIKE $1", "p.codproveedor ILIKE $1"];

      if (rutConDv) {
        values.push(rutConDv[1], rutConDv[2].toUpperCase());
        conds.push("(p.nrorut = $2::numeric AND upper(p.verificador) = $3)");
      } else if (soloDigitos) {
        values.push(`${clean}%`);
        conds.push("p.nrorut::text LIKE $2");
      }
      where = conds.join(" OR ");
    }

    const filterValues = [...values];
    values.push(pageSize, (page - 1) * pageSize);
    const limitIdx = values.length - 1;
    const offsetIdx = values.length;

    const result = await this.client.query({
      text: `
        SELECT p.proveedor_id, p.nrorut, p.verificador,
               p.razonsocial, p.codproveedor,
               (SELECT max(x.nombre) FROM pos.pais x WHERE x.pais_id = p.pais_id) AS pais,
               COALESCE(p.esinactivo, false) AS inactivo,
               count(*) OVER() AS total
        FROM pos.proveedor p
        WHERE ${where}
        ORDER BY p.razonsocial, p.proveedor_id
        LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      values,
    });

    const items: ProveedorListItem[] = result.rows.map((r) => ({
      id: Number(r.proveedor_id),
      rut: `${s(r.nrorut)}-${s(r.verificador)}`,
      nombre: s(r.razonsocial),
      abrev: s(r.codproveedor),
      pais: s(r.pais),
      inactivo: Boolean(r.inactivo),
    }));

    // Página fuera de rango => count(*) OVER() no devuelve filas; se recalcula.
    let total = result.rows.length ? Number(result.rows[0].total) : 0;
    if (!result.rows.length && page > 1) {
      const c = await this.client.query({
        text: `SELECT count(*) AS total FROM pos.proveedor p WHERE ${where}`,
        values: filterValues,
      });
      total = Number(c.rows[0].total);
    }

    return { items, total, page, pageSize };
  }

  async esPaisChile(paisId: number): Promise<boolean> {
    const r = await this.client.query({
      text: "SELECT 1 FROM pos.pais WHERE pais_id = $1 AND upper(trim(nombre)) = 'CHILE'",
      values: [paisId],
    });
    return r.rows.length > 0;
  }

  /** La baja es lógica, nunca física: sólo se marca `esinactivo`. */
  async setInactivo(id: number, inactivo: boolean, modificadoPor: number): Promise<boolean> {
    const r = await this.client.query({
      text: `UPDATE pos.proveedor
             SET esinactivo = $2, fecha_ultima_modificacion = now(), modificado_por = $3
             WHERE proveedor_id = $1`,
      values: [id, inactivo, modificadoPor],
    });
    return (r.rowCount ?? 0) > 0;
  }

  private async buscarDuplicado(where: string, valor: unknown, excluirId: number | null) {
    const r = await this.client.query({
      text: `SELECT proveedor_id, trim(razonsocial) AS nombre, trim(codproveedor) AS abrev,
                    nrorut::text || '-' || trim(verificador) AS rut
             FROM pos.proveedor
             WHERE ${where} AND ($2::int IS NULL OR proveedor_id <> $2)
             ORDER BY proveedor_id LIMIT 1`,
      values: [valor, excluirId],
    });
    const row = r.rows[0];
    return row
      ? { id: Number(row.proveedor_id), nombre: row.nombre, abrev: row.abrev, rut: row.rut }
      : null;
  }

  buscarPorRut(nrorut: string, excluirId: number | null) {
    return this.buscarDuplicado("nrorut = $1::numeric", nrorut, excluirId);
  }

  buscarPorAbrev(abrev: string, excluirId: number | null) {
    return this.buscarDuplicado("upper(trim(codproveedor)) = upper(trim($1))", abrev, excluirId);
  }

  /**
   * UPDATE parcial: sólo las columnas que edita el formulario. No toca
   * codproveedor, cond. de pago, contactos/fonos 2 y 3, anexos, nrodepto,
   * fecha_creacion, propietario, estado ni esinactivo. `nrocalle` se deja en
   * NULL porque la dirección completa va en `calle`.
   */
  async update(id: number, v: ProveedorEditInputNormalizado): Promise<boolean> {
    const r = await this.client.query({
      text: `
        UPDATE pos.proveedor SET
          nrorut = $2, verificador = $3, razonsocial = $4, codsucursal = $5,
          pais_id = $6, region_id = $7, ciudad_id = $8, comuna_id = $9,
          localidad_id = $10, provincia_id = $11, codpostal = $12,
          calle = $13, nrocalle = NULL,
          fono1 = $14, fax1 = $15, contacto1 = $16, cargo1 = $17,
          codmoneda = $18, indforwarder = $19, alaorden = $20,
          email1 = $21, email2 = $22,
          fecha_ultima_modificacion = now(), modificado_por = $23
        WHERE proveedor_id = $1`,
      values: [
        id, v.nrorut, v.verificador, v.nombre, v.codsucursal,
        v.paisId, v.regionId, v.ciudadId, v.comunaId,
        v.localidadId, v.provinciaId, v.codpostal,
        v.calle,
        v.fono1, v.fax1, v.contacto1, v.cargo1,
        v.codmoneda, v.indforwarder, v.alaorden,
        v.email1, v.email2, v.modificadoPor,
      ],
    });
    return (r.rowCount ?? 0) > 0;
  }

  /**
   * INSERT. `proveedor_id` es identity (ALWAYS): lo asigna la base. Quedan en
   * NULL las columnas que el formulario no captura (cond. de pago, contactos
   * y fonos 2/3, anexos, nrodepto). Auditoría: fechas = now(), propietario y
   * modificado_por = usuario de la sesión, estado = 0, esinactivo = false.
   */
  async create(v: ProveedorEditInputNormalizado & { codproveedor: string }): Promise<number> {
    const r = await this.client.query({
      text: `
        INSERT INTO pos.proveedor (
          nrorut, verificador, razonsocial, codproveedor, codsucursal,
          pais_id, region_id, ciudad_id, comuna_id, localidad_id, provincia_id,
          codpostal, calle, fono1, fax1, contacto1, cargo1,
          codmoneda, indforwarder, alaorden, email1, email2,
          esinactivo, estado, fecha_creacion, fecha_ultima_modificacion,
          modificado_por, propietario
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16, $17,
          $18, $19, $20, $21, $22,
          false, 0, now(), now(),
          $23, $23
        ) RETURNING proveedor_id`,
      values: [
        v.nrorut, v.verificador, v.nombre, v.codproveedor, v.codsucursal,
        v.paisId, v.regionId, v.ciudadId, v.comunaId, v.localidadId, v.provinciaId,
        v.codpostal, v.calle, v.fono1, v.fax1, v.contacto1, v.cargo1,
        v.codmoneda, v.indforwarder, v.alaorden, v.email1, v.email2,
        v.modificadoPor,
      ],
    });
    return Number(r.rows[0].proveedor_id);
  }

  async getById(id: number): Promise<ProveedorDetalle | null> {
    const result = await this.client.query({
      text: `
        SELECT
          p.proveedor_id, p.nrorut, p.verificador,
          to_char(p.fecha_creacion, 'DD/MM/YYYY') AS fecha_incorporacion,
          p.razonsocial, p.codproveedor, COALESCE(p.esinactivo, false) AS inactivo,
          p.codsucursal,
          (SELECT max(su.descsucursal) FROM pos.sucursal su
            WHERE su.codsucursal = p.codsucursal AND su.esinactiva = false) AS desc_ubicacion,
          p.pais_id,
          (SELECT max(x.nombre) FROM pos.pais x WHERE x.pais_id = p.pais_id) AS pais,
          p.region_id,
          (SELECT max(x.nombre) FROM pos.region x
            WHERE x.region_id = p.region_id AND x.pais_id = p.pais_id) AS region,
          p.ciudad_id,
          (SELECT max(x.nombre) FROM pos.ciudad x
            WHERE x.ciudad_id = p.ciudad_id AND x.region_id = p.region_id) AS ciudad,
          p.comuna_id,
          (SELECT max(x.nombre) FROM pos.comuna x
            WHERE x.comuna_id = p.comuna_id AND x.ciudad_id = p.ciudad_id) AS comuna,
          p.localidad_id,
          -- 771 "-SIN ASIGNAR-" y 725 "SIN VALOR" son los valores por defecto
          -- del mantenedor y cuelgan de comuna 0 / región 710, no del padre del
          -- proveedor: se resuelven sin filtrar por padre.
          (SELECT max(x.nombre) FROM pos.localidad x
            WHERE x.localidad_id = CASE WHEN trim(p.localidad_id) ~ '^[0-9]+$'
                                        THEN trim(p.localidad_id)::int END
              AND (x.comuna_id = p.comuna_id OR x.localidad_id = 771)) AS localidad,
          p.provincia_id,
          (SELECT max(x.nombre) FROM pos.provincia x
            WHERE x.provincia_id = p.provincia_id
              AND (x.region_id::text = (SELECT r.externalid FROM pos.region r WHERE r.region_id = p.region_id)
                   OR x.provincia_id = 725)) AS provincia,
          p.codpostal,
          trim(coalesce(trim(p.calle), '') || ' ' || coalesce(trim(p.nrocalle), '')) AS direccion,
          p.fono1, p.fax1, p.contacto1, p.cargo1,
          p.codcondpago, p.condicionpago, p.codmoneda,
          (SELECT max(m.nombre) FROM pos.moneda m
            WHERE m.moneda_id::text = trim(p.codmoneda)) AS desc_moneda,
          CASE WHEN trim(p.indforwarder) IN ('S', '1') THEN 'SI'
               WHEN trim(p.indforwarder) IN ('N', '0') THEN 'NO'
               ELSE '' END AS es_forwarder,
          p.alaorden, p.email1, p.email2
        FROM pos.proveedor p
        WHERE p.proveedor_id = $1`,
      values: [id],
    });

    const r = result.rows[0];
    if (!r) return null;

    return {
      id: Number(r.proveedor_id),
      nrorut: s(r.nrorut),
      verificador: s(r.verificador),
      fechaIncorporacion: s(r.fecha_incorporacion),
      nombre: s(r.razonsocial),
      abrev: s(r.codproveedor),
      inactivo: Boolean(r.inactivo),
      codUbicacion: s(r.codsucursal),
      descUbicacion: s(r.desc_ubicacion),
      categoria: "",
      descCategoria: "",
      clasificacion: "",
      descClasificacion: "",
      cuentaContable: "",
      descCuentaContable: "",
      codPais: s(r.pais_id),
      pais: s(r.pais),
      codRegion: s(r.region_id),
      region: s(r.region),
      codCiudad: s(r.ciudad_id),
      ciudad: s(r.ciudad),
      codComuna: s(r.comuna_id),
      comuna: s(r.comuna),
      codLocalidad: s(r.localidad_id),
      localidad: s(r.localidad),
      codProvincia: s(r.provincia_id),
      provincia: s(r.provincia),
      codPostal: s(r.codpostal),
      direccion: s(r.direccion),
      fono: s(r.fono1),
      fax: s(r.fax1),
      contacto: s(r.contacto1),
      cargo: s(r.cargo1),
      codCondPago: s(r.codcondpago),
      descCondPago: s(r.condicionpago),
      codMoneda: s(r.codmoneda),
      descMoneda: s(r.desc_moneda),
      esForwarder: s(r.es_forwarder),
      alaOrdenDe: s(r.alaorden),
      email1: s(r.email1),
      email2: s(r.email2),
    };
  }
}
