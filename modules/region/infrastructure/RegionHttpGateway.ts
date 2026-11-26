import { httpJson } from "../../../shared/infrastructure/httpRequest";

/** Adaptador hacia ExpressRegionRouter. Los tipos espejan src/lib/Region/domain. */
export interface RegionListItem {
  id: number;
  nombre: string;
  paisId: number;
  pais: string;
  saad: string;
  saadDescripcion: string;
  ciudades: number;
  provincias: number;
  proveedores: number;
}

export interface RegionSearchResult {
  items: RegionListItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** Campos del alta (POST /regiones). El código lo genera la base. */
export interface RegionCreateInput {
  nombre: string;
  paisId: number;
  saad: string;
  /** Vacío = el servidor usa el nombre. */
  saadDescripcion: string;
}

export class RegionHttpGateway {
  /** Cambia los datos de la región (el código no cambia); devuelve el registro guardado. */
  update(id: number, input: RegionCreateInput): Promise<RegionListItem> {
    return httpJson("PUT", `/regiones/${id}`, input);
  }

  /** Devuelve la región creada, con el código que asignó la base. */
  create(input: RegionCreateInput): Promise<RegionListItem> {
    return httpJson("POST", "/regiones", input);
  }

  search(q: string, page: number, size: number): Promise<RegionSearchResult> {
    const params = new URLSearchParams({ q, page: String(page), size: String(size) });
    return httpJson("GET", `/regiones?${params.toString()}`);
  }
}
