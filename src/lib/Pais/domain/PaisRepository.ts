/**
 * Maestro de países (esquema `pos`, tabla pos.pais; PK pais_id). Lo referencian
 * pos.region, pos.proveedor y pos.pais_respa por pais_id (sin FK declarada).
 * Etapa 1: sólo consulta.
 */
export interface PaisListItem {
  id: number;
  nombre: string;
  continenteId: number;
  /** Nombre del continente; vacío si el código no existe en pos.continente. */
  continente: string;
  /** Código ISO de 2 letras (puede venir vacío en datos antiguos). */
  iso2: string;
  /** Código SAAD de 3 letras (saad_codigo). */
  saad: string;
  /** Regiones de pos.region que cuelgan de este país. */
  regiones: number;
  /** Proveedores de pos.proveedor que usan este país. */
  proveedores: number;
}

export interface PaisSearchResult {
  items: PaisListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PaisRepository {
  search(q: string, page: number, pageSize: number): Promise<PaisSearchResult>;
}
