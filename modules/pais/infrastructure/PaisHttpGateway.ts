import { httpJson } from "../../../shared/infrastructure/httpRequest";

/** Adaptador hacia ExpressPaisRouter. Los tipos espejan src/lib/Pais/domain. */
export interface PaisListItem {
  id: number;
  nombre: string;
  continenteId: number;
  continente: string;
  iso2: string;
  saad: string;
  regiones: number;
  proveedores: number;
}

export interface PaisSearchResult {
  items: PaisListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export class PaisHttpGateway {
  search(q: string, page: number, size: number): Promise<PaisSearchResult> {
    const params = new URLSearchParams({ q, page: String(page), size: String(size) });
    return httpJson("GET", `/paises?${params.toString()}`);
  }
}
