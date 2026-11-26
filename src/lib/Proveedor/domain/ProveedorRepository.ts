/**
 * Dominio Proveedor (spec: docs/proveedores_mantenedor.md).
 * Etapa 1: sólo consulta. Los datos vienen de pos.proveedor y sus maestros
 * (pos.pais, pos.region, ...). Todo se entrega ya "trimmeado": las columnas
 * char(n) de la base vienen rellenas con espacios.
 */
export interface ProveedorListItem {
  id: number;
  /** "76123456-7" */
  rut: string;
  nombre: string;
  abrev: string;
  pais: string;
  inactivo: boolean;
}

export interface ProveedorSearchResult {
  items: ProveedorListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProveedorDetalle {
  id: number;
  nrorut: string;
  verificador: string;
  fechaIncorporacion: string;
  nombre: string;
  abrev: string;
  inactivo: boolean;

  codUbicacion: string;
  descUbicacion: string;

  // Sin columna ni tabla en la base: se devuelven en blanco (spec §12 #3, #6).
  categoria: string;
  descCategoria: string;
  clasificacion: string;
  descClasificacion: string;
  cuentaContable: string;
  descCuentaContable: string;

  codPais: string;
  pais: string;
  codRegion: string;
  region: string;
  codCiudad: string;
  ciudad: string;
  codComuna: string;
  comuna: string;
  codLocalidad: string;
  localidad: string;
  codProvincia: string;
  provincia: string;
  codPostal: string;
  direccion: string;
  fono: string;
  fax: string;
  contacto: string;
  cargo: string;

  codCondPago: string;
  descCondPago: string;
  codMoneda: string;
  descMoneda: string;
  esForwarder: string;
  alaOrdenDe: string;
  email1: string;
  email2: string;
}

/**
 * Campos que el formulario puede modificar (modo edición). Todo lo demás de
 * pos.proveedor (abreviación, cond. de pago, contactos/fonos 2 y 3, anexos,
 * nrodepto, fecha de creación, ...) NO se toca al guardar. Los códigos
 * llegan como texto ("" = sin valor).
 */
export interface ProveedorEditInput {
  nrorut: string;
  verificador: string;
  nombre: string;
  codUbicacion: string;
  codPais: string;
  codRegion: string;
  codCiudad: string;
  codComuna: string;
  codLocalidad: string;
  codProvincia: string;
  codPostal: string;
  /** Va entera en `calle` (nrocalle no se usa en los datos reales). */
  direccion: string;
  fono: string;
  fax: string;
  contacto: string;
  cargo: string;
  codMoneda: string;
  /** "S" | "N" | "" */
  esForwarder: string;
  alaOrdenDe: string;
  email1: string;
  email2: string;
  /** user_pos.id de quien guarda (columna modificado_por). */
  modificadoPor: number;
}

/** Alta: los mismos campos que la edición más la abreviación (Código Proveedor AR). */
export interface ProveedorCreateInput extends ProveedorEditInput {
  abrev: string;
}

export class ProveedorNotFoundError extends Error {
  constructor(id: number) {
    super(`Proveedor ${id} no encontrado`);
  }
}

export class ProveedorInvalidError extends Error {}

/** NroRut o CodProveedor (Abrev) ya existen en otro proveedor. Responde 409. */
export class ProveedorDuplicadoError extends ProveedorInvalidError {}

/** Proveedor existente que choca con un RUT o una abreviación. */
export interface ProveedorDuplicado {
  id: number;
  nombre: string;
  abrev: string;
  rut: string;
}

export interface ProveedorRepository {
  /** `q` busca por RUT (con o sin DV), razón social o abreviación. */
  search(q: string, page: number, pageSize: number): Promise<ProveedorSearchResult>;
  getById(id: number): Promise<ProveedorDetalle | null>;
  /** true si el país (pos.pais) se llama CHILE. */
  esPaisChile(paisId: number): Promise<boolean>;
  /** Actualiza sólo las columnas de ProveedorEditInput. false si no existe. */
  update(id: number, valores: ProveedorEditInputNormalizado): Promise<boolean>;
  /**
   * Baja/reactivación lógica: sólo cambia `esinactivo` (+ fecha de última
   * modificación y modificado_por). false si el proveedor no existe.
   */
  setInactivo(id: number, inactivo: boolean, modificadoPor: number): Promise<boolean>;
  /** Otro proveedor con el mismo NroRut (se compara sólo el número, no el DV). */
  buscarPorRut(nrorut: string, excluirId: number | null): Promise<ProveedorDuplicado | null>;
  /** Otro proveedor con el mismo CodProveedor (sin distinguir mayúsculas ni espacios). */
  buscarPorAbrev(abrev: string, excluirId: number | null): Promise<ProveedorDuplicado | null>;
  /** Inserta un proveedor nuevo y devuelve su proveedor_id (lo asigna la base). */
  create(valores: ProveedorEditInputNormalizado & { codproveedor: string }): Promise<number>;
}

/** ProveedorEditInput ya validado y convertido a tipos de columna. */
export interface ProveedorEditInputNormalizado {
  nrorut: string;
  verificador: string;
  nombre: string;
  codsucursal: number;
  paisId: number | null;
  regionId: number | null;
  ciudadId: number | null;
  comunaId: number | null;
  localidadId: string | null;
  provinciaId: number | null;
  codpostal: string | null;
  calle: string | null;
  fono1: string | null;
  fax1: string | null;
  contacto1: string | null;
  cargo1: string | null;
  codmoneda: string | null;
  indforwarder: string | null;
  alaorden: string | null;
  email1: string | null;
  email2: string | null;
  modificadoPor: number;
}
