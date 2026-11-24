/**
 * Maestro de continentes (esquema `pos`, tabla pos.continente). La tabla no
 * tiene PK ni restricciones: continente_id y nombre son NULLables y pos.pais
 * la referencia por continente_id sin FK. Etapa 1: sólo consulta.
 */
export interface ContinenteListItem {
  id: number;
  nombre: string;
  /** Cuántos países de pos.pais pertenecen a este continente. */
  paises: number;
}

export interface ContinenteSearchResult {
  items: ContinenteListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ContinenteRepository {
  search(q: string, page: number, pageSize: number): Promise<ContinenteSearchResult>;
}
