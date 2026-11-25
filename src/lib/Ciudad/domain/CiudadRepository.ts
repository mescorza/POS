/**
 * Maestro de ciudades (esquema `pos`, tabla pos.ciudad; PK ciudad_id, identity).
 * Cuelga de una región (region_id) y lo referencian pos.comuna y pos.proveedor
 * por ciudad_id (sin FK declarada). Etapa 1: sólo consulta.
 */
export interface CiudadListItem {
  id: number;
  nombre: string;
  regionId: number;
  /** Nombre de la región; vacío si region_id no existe en pos.region (hay ciudades huérfanas en los datos). */
  region: string;
  /** País de la región (resuelto a través de ella); vacío si no se puede resolver. */
  pais: string;
  /** Código SAAD (saad_codigo). */
  saad: string;
  /** Comunas de pos.comuna que cuelgan de esta ciudad. */
  comunas: number;
  /** Proveedores de pos.proveedor que usan esta ciudad. */
  proveedores: number;
}

export interface CiudadSearchResult {
  items: CiudadListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CiudadRepository {
  search(q: string, page: number, pageSize: number): Promise<CiudadSearchResult>;
}
