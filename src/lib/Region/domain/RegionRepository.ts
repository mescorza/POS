/**
 * Maestro de regiones (esquema `pos`, tabla pos.region; PK region_id, identity
 * ALWAYS). Cuelga de un país (pais_id) y lo referencian pos.ciudad,
 * pos.provincia y pos.proveedor (sin FK declarada).
 */
export interface RegionListItem {
  id: number;
  nombre: string;
  paisId: number;
  /** Nombre del país; vacío si pais_id no existe en pos.pais (hay regiones huérfanas en los datos). */
  pais: string;
  /** Código SAAD (saad_codigo). */
  saad: string;
  /** Descripción SAAD (saad_descripcion). */
  saadDescripcion: string;
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

/** Datos ya normalizados que se guardan en un alta o edición (region_id lo genera/conserva la base). */
export interface RegionCreateValues {
  nombre: string;
  paisId: number;
  saad: string;
  saadDescripcion: string;
}

export interface RegionRepository {
  search(q: string, page: number, pageSize: number): Promise<RegionSearchResult>;
  getById(id: number): Promise<RegionListItem | null>;
  /**
   * Inserta la región; region_id lo asigna la identity de la tabla (no hay que
   * calcularlo ni bloquear). externalid queda NULL. Devuelve el id asignado.
   */
  create(values: RegionCreateValues): Promise<number>;
  /**
   * Cambia nombre, país, SAAD código y SAAD descripción. No toca region_id ni
   * externalid.
   */
  update(id: number, values: RegionCreateValues): Promise<void>;
  /**
   * Región de ese país con ese nombre (sin distinguir mayúsculas ni espacios de
   * borde), si existe. `excluirId` ignora esa región (para la edición: no
   * choca consigo misma).
   */
  buscarPorNombreEnPais(nombre: string, paisId: number, excluirId?: number): Promise<RegionListItem | null>;
  paisExiste(paisId: number): Promise<boolean>;
}

/** Datos inválidos (obligatorios vacíos, largos excedidos, país inexistente). Responde 400. */
export class RegionInvalidError extends Error {}

/** Ya existe una región con ese nombre en ese país. Responde 409. */
export class RegionDuplicadaError extends RegionInvalidError {}

/** No existe la región pedida. Responde 404. */
export class RegionNotFoundError extends Error {
  constructor(id: number) {
    super(`Región ${id} no encontrada`);
  }
}
