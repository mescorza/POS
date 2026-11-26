import { httpJson } from "../../../shared/infrastructure/httpRequest";

/**
 * Adaptador de entrada del módulo Proveedor hacia la API Express
 * (ExpressProveedorRouter). Etapa 1: sólo consulta.
 * Los tipos espejan src/lib/Proveedor/domain/ProveedorRepository.ts.
 */
export interface ProveedorListItem {
  id: number;
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

/** Campos que el modo edición envía al guardar (PUT /proveedores/:id). */
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
  /** user_pos.id de la sesión (columna modificado_por). */
  modificadoPor: number;
}

/** Alta (POST /proveedores): los mismos campos que la edición más la abreviación. */
export interface ProveedorCreateInput extends ProveedorEditInput {
  abrev: string;
}

/**
 * Todas las llamadas pasan por httpJson: un fallo llega a la pantalla con un
 * mensaje que explica la causa (backend desactualizado, sin conexión, regla
 * de negocio del servidor, ...), no sólo un código HTTP.
 */
export class ProveedorHttpGateway {
  /** Baja lógica (inactivo = true) o reactivación (false). Devuelve el proveedor actualizado. */
  setInactivo(id: number, inactivo: boolean, modificadoPor: number): Promise<ProveedorDetalle> {
    return httpJson("PUT", `/proveedores/${id}/estado`, { inactivo, modificadoPor });
  }

  /** Devuelve el proveedor ya creado, releído desde la base. */
  create(input: ProveedorCreateInput): Promise<ProveedorDetalle> {
    return httpJson("POST", "/proveedores", input);
  }

  /** Devuelve el proveedor ya guardado, releído desde la base. */
  update(id: number, input: ProveedorEditInput): Promise<ProveedorDetalle> {
    return httpJson("PUT", `/proveedores/${id}`, input);
  }

  search(q: string, page: number, size: number): Promise<ProveedorSearchResult> {
    const params = new URLSearchParams({ q, page: String(page), size: String(size) });
    return httpJson("GET", `/proveedores?${params.toString()}`);
  }

  getById(id: number): Promise<ProveedorDetalle> {
    return httpJson("GET", `/proveedores/${id}`);
  }
}
