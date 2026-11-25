/**
 * Maestro de ciudades (esquema `pos`, tabla pos.ciudad; PK ciudad_id, identity).
 * Cuelga de una región (region_id) y lo referencian pos.comuna y pos.proveedor
 * por ciudad_id (sin FK declarada).
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
  saadDescripcion: string;
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

/** Datos ya normalizados que se guardan en un alta (ciudad_id lo genera la base). */
export interface CiudadCreateValues {
  nombre: string;
  regionId: number;
  saad: string;
  saadDescripcion: string;
}

export interface CiudadRepository {
  search(q: string, page: number, pageSize: number): Promise<CiudadSearchResult>;
  getById(id: number): Promise<CiudadListItem | null>;
  /** Inserta la ciudad; ciudad_id lo asigna la identity. externalid queda NULL. Devuelve el id. */
  create(values: CiudadCreateValues): Promise<number>;
  /** Cambia nombre, región, SAAD código y SAAD descripción. No toca ciudad_id ni externalid. */
  update(id: number, values: CiudadCreateValues): Promise<void>;
  /**
   * Ciudad de esa región con ese nombre (sin distinguir mayúsculas ni espacios de
   * borde), si existe. `excluirId` ignora esa ciudad (la edición no choca consigo misma).
   */
  buscarPorNombreEnRegion(nombre: string, regionId: number, excluirId?: number): Promise<CiudadListItem | null>;
  regionExiste(regionId: number): Promise<boolean>;
}

/** Datos inválidos (obligatorios vacíos, largos excedidos, región inexistente). Responde 400. */
export class CiudadInvalidError extends Error {}

/** Ya existe una ciudad con ese nombre en esa región. Responde 409. */
export class CiudadDuplicadaError extends CiudadInvalidError {}

export class CiudadNotFoundError extends Error {
  constructor(id: number) {
    super(`Ciudad ${id} no encontrada`);
  }
}
