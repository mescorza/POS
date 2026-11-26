import { httpJson } from "../../../shared/infrastructure/httpRequest";

/** Adaptador hacia ExpressComunaRouter. Los tipos espejan src/lib/Comuna/domain. */
export interface ComunaListItem {
  id: number;
  nombre: string;
  ciudadId: number;
  ciudad: string;
  region: string;
  saad: string;
  saadDescripcion: string;
  localidades: number;
  proveedores: number;
}

export interface ComunaSearchResult {
  items: ComunaListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export class ComunaHttpGateway {
  search(q: string, page: number, size: number): Promise<ComunaSearchResult> {
    const params = new URLSearchParams({ q, page: String(page), size: String(size) });
    return httpJson("GET", `/comunas?${params.toString()}`);
  }
}
