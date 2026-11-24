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

export class ProveedorHttpGateway {
  /** Baja lógica (inactivo = true) o reactivación (false). Devuelve el proveedor actualizado. */
  async setInactivo(id: number, inactivo: boolean, modificadoPor: number): Promise<ProveedorDetalle> {
    const response = await fetch(`/proveedores/${id}/estado`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inactivo, modificadoPor }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.message ?? `No se pudo cambiar el estado del proveedor (${response.status})`);
    }
    return response.json();
  }

  /** Devuelve el proveedor ya creado, releído desde la base. */
  async create(input: ProveedorCreateInput): Promise<ProveedorDetalle> {
    const response = await fetch("/proveedores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.message ?? `No se pudo crear el proveedor (${response.status})`);
    }
    return response.json();
  }

  /** Devuelve el proveedor ya guardado, releído desde la base. */
  async update(id: number, input: ProveedorEditInput): Promise<ProveedorDetalle> {
    const response = await fetch(`/proveedores/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.message ?? `No se pudo guardar el proveedor (${response.status})`);
    }
    return response.json();
  }

  async search(q: string, page: number, size: number): Promise<ProveedorSearchResult> {
    const params = new URLSearchParams({ q, page: String(page), size: String(size) });
    const response = await fetch(`/proveedores?${params.toString()}`);
    if (!response.ok) throw new Error(`No se pudo consultar proveedores (${response.status})`);
    return response.json();
  }

  async getById(id: number): Promise<ProveedorDetalle> {
    const response = await fetch(`/proveedores/${id}`);
    if (!response.ok) throw new Error(`No se pudo obtener el proveedor ${id} (${response.status})`);
    return response.json();
  }
}
