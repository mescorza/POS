import { httpJson } from "../../../shared/infrastructure/httpRequest";

/** Adaptador hacia ExpressPaisRouter. Los tipos espejan src/lib/Pais/domain. */
export interface PaisListItem {
  id: number;
  nombre: string;
  continenteId: number;
  continente: string;
  iso2: string;
  saad: string;
  saadDescripcion: string;
  regiones: number;
  proveedores: number;
}

export interface PaisSearchResult {
  items: PaisListItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** Campos del alta (POST /paises). El código lo asigna el servidor. */
export interface PaisCreateInput {
  nombre: string;
  continenteId: number;
  iso2: string;
  saad: string;
  /** Vacío = el servidor usa el nombre. */
  saadDescripcion: string;
}

export class PaisHttpGateway {
  /** Cambia los datos del país (el código no cambia); devuelve el registro guardado. */
  update(id: number, input: PaisCreateInput): Promise<PaisListItem> {
    return httpJson("PUT", `/paises/${id}`, input);
  }

  /** Devuelve el país creado, con el código que asignó el sistema. */
  create(input: PaisCreateInput): Promise<PaisListItem> {
    return httpJson("POST", "/paises", input);
  }

  search(q: string, page: number, size: number): Promise<PaisSearchResult> {
    const params = new URLSearchParams({ q, page: String(page), size: String(size) });
    return httpJson("GET", `/paises?${params.toString()}`);
  }
}
