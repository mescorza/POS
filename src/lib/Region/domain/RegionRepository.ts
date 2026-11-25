/**
 * Maestro de regiones (esquema `pos`, tabla pos.region; PK region_id, identity).
 * Cuelga de un país (pais_id) y lo referencian pos.ciudad, pos.provincia y
 * pos.proveedor por region_id (sin FK declarada). Etapa 1: sólo consulta.
 */
export interface RegionListItem {
  id: number;
  nombre: string;
  paisId: number;
  /** Nombre del país; vacío si pais_id no existe en pos.pais (hay regiones huérfanas en los datos). */
  pais: string;
  /** Código SAAD (saad_codigo). */
  saad: string;
  /** Ciudades de pos.ciudad que cuelgan de esta región. */
  ciudades: number;
  /**
   * Provincias de pos.provincia de esta región. OJO: pos.provincia.region_id
   * referencia pos.region.externalid (no region_id): p. ej. provincias con
   * region_id 206 pertenecen a la región cuyo externalid es 206 (Valparaíso).
   */
  provincias: number;
  /** Proveedores de pos.proveedor que usan esta región. */
  proveedores: number;
}

export interface RegionSearchResult {
  items: RegionListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RegionRepository {
  search(q: string, page: number, pageSize: number): Promise<RegionSearchResult>;
}
