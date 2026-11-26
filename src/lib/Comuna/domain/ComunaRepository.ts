/**
 * Maestro de comunas (esquema `pos`, tabla pos.comuna; PK comuna_id, identity).
 * Cuelga de una ciudad (ciudad_id) y la referencia pos.localidad por comuna_id.
 * pos.proveedor la referencia por comuna_id. Etapa 1: sólo consulta.
 */
export interface ComunaListItem {
  id: number;
  nombre: string;
  ciudadId: number;
  /** Nombre de la ciudad; vacío si ciudad_id no existe en pos.ciudad (hay una comuna huérfana). */
  ciudad: string;
  /** Región de la ciudad; vacío si no se puede resolver. */
  region: string;
  /** Código SAAD (saad_codigo). */
  saad: string;
  saadDescripcion: string;
  /** Localidades de pos.localidad que cuelgan de esta comuna. */
  localidades: number;
  /** Proveedores de pos.proveedor que usan esta comuna (comuna_id). */
  proveedores: number;
}

export interface ComunaSearchResult {
  items: ComunaListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ComunaRepository {
  search(q: string, page: number, pageSize: number): Promise<ComunaSearchResult>;
}
