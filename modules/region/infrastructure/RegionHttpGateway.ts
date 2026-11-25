import { httpJson } from "../../../shared/infrastructure/httpRequest";

/** Adaptador hacia ExpressRegionRouter. Los tipos espejan src/lib/Region/domain. */
export interface RegionListItem {
  id: number;
  nombre: string;
  paisId: number;
  pais: string;
  saad: string;
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

export class RegionHttpGateway {
  search(q: string, page: number, size: number): Promise<RegionSearchResult> {
    const params = new URLSearchParams({ q, page: String(page), size: String(size) });
    return httpJson("GET", `/regiones?${params.toString()}`);
  }
}
