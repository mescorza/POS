import { httpJson } from "../../../shared/infrastructure/httpRequest";

/** Adaptador hacia ExpressCiudadRouter. Los tipos espejan src/lib/Ciudad/domain. */
export interface CiudadListItem {
  id: number;
  nombre: string;
  regionId: number;
  region: string;
  pais: string;
  saad: string;
  comunas: number;
  proveedores: number;
}

export interface CiudadSearchResult {
  items: CiudadListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export class CiudadHttpGateway {
  search(q: string, page: number, size: number): Promise<CiudadSearchResult> {
    const params = new URLSearchParams({ q, page: String(page), size: String(size) });
    return httpJson("GET", `/ciudades?${params.toString()}`);
  }
}
