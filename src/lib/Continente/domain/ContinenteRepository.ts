/**
 * Maestro de continentes (esquema `pos`, tabla pos.continente). La tabla no
 * tiene PK ni restricciones: continente_id y nombre son NULLables y pos.pais
 * la referencia por continente_id sin FK; por eso las reglas (código único,
 * nombre único) las aplica la aplicación, no la base.
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
  /**
   * Inserta el continente con el siguiente código (máximo + 1), todo dentro de
   * una transacción con un candado, para que dos altas simultáneas no reciban
   * el mismo código. Devuelve el registro creado.
   */
  create(nombre: string): Promise<ContinenteListItem>;
  /**
   * Continente con ese nombre (sin distinguir mayúsculas ni espacios de borde),
   * si existe. `excluirId` ignora ese continente (para la edición: no choca
   * consigo mismo).
   */
  buscarPorNombre(nombre: string, excluirId?: number): Promise<ContinenteListItem | null>;
  getById(id: number): Promise<ContinenteListItem | null>;
  update(id: number, nombre: string): Promise<void>;
}

/** Datos inválidos (nombre vacío o demasiado largo). Responde 400. */
export class ContinenteInvalidError extends Error {}

/** No existe el continente pedido. Responde 404. */
export class ContinenteNotFoundError extends Error {
  constructor(id: number) {
    super(`Continente ${id} no encontrado`);
  }
}

/** El nombre ya existe en otro continente. Responde 409. */
export class ContinenteDuplicadoError extends ContinenteInvalidError {}
