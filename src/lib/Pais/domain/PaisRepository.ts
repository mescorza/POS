/**
 * Maestro de países (esquema `pos`, tabla pos.pais; PK pais_id). Lo referencian
 * pos.region, pos.proveedor y pos.pais_respa por pais_id (sin FK declarada).
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

/** Datos ya normalizados que se insertan en un alta (pais_id lo asigna el repositorio). */
export interface PaisCreateValues {
  nombre: string;
  continenteId: number;
  /** null cuando no se informa (columna opcional). */
  iso2: string | null;
  saad: string;
  saadDescripcion: string;
}

export interface PaisRepository {
  search(q: string, page: number, pageSize: number): Promise<PaisSearchResult>;
  getById(id: number): Promise<PaisListItem | null>;
  /**
   * Inserta el país con el siguiente código (máximo + 1) dentro de una
   * transacción con candado, para que dos altas simultáneas no reciban el
   * mismo código. Devuelve el id asignado.
   */
  create(values: PaisCreateValues): Promise<number>;
  /** País con ese nombre (sin distinguir mayúsculas ni espacios de borde), si existe. */
  buscarPorNombre(nombre: string): Promise<PaisListItem | null>;
  /** País con ese código ISO2 (sin distinguir mayúsculas), si existe. */
  buscarPorIso2(iso2: string): Promise<PaisListItem | null>;
  continenteExiste(continenteId: number): Promise<boolean>;
}

/** Datos inválidos (obligatorios vacíos, largos excedidos, continente inexistente). Responde 400. */
export class PaisInvalidError extends Error {}

/** El nombre o el ISO2 ya existen en otro país. Responde 409. */
export class PaisDuplicadoError extends PaisInvalidError {}

/** No existe el país pedido. Responde 404. */
export class PaisNotFoundError extends Error {
  constructor(id: number) {
    super(`País ${id} no encontrado`);
  }
}
