import { httpJson } from "../../../shared/infrastructure/httpRequest";

/** Adaptador hacia ExpressContinenteRouter. Los tipos espejan src/lib/Continente/domain. */
export interface ContinenteListItem {
  id: number;
  nombre: string;
  paises: number;
}

export interface ContinenteSearchResult {
  items: ContinenteListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export class ContinenteHttpGateway {
  /** Cambia el nombre del continente; devuelve el registro guardado. */
  update(id: number, nombre: string): Promise<ContinenteListItem> {
    return httpJson("PUT", `/continentes/${id}`, { nombre });
  }

  /** Devuelve el continente creado, con el código que asignó el sistema. */
  create(nombre: string): Promise<ContinenteListItem> {
    return httpJson("POST", "/continentes", { nombre });
  }

  search(q: string, page: number, size: number): Promise<ContinenteSearchResult> {
    const params = new URLSearchParams({ q, page: String(page), size: String(size) });
    return httpJson("GET", `/continentes?${params.toString()}`);
  }
}
