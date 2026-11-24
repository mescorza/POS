import { httpJson } from "./httpRequest";

/**
 * Gateway compartido de sólo lectura para los maestros que alimentan los
 * pop-ups de lookup (GET /maestros/:tipo). Los maestros se buscan y se
 * seleccionan; su mantención vive en otras opciones del menú principal.
 */
export type MaestroTipo =
  | "sucursal"
  | "pais"
  | "region"
  | "ciudad"
  | "comuna"
  | "localidad"
  | "provincia"
  | "moneda";

export interface MaestroItem {
  id: string;
  name: string;
}

export interface MaestroSearchResult {
  items: MaestroItem[];
  total: number;
  page: number;
  pageSize: number;
}

export class MaestroHttpGateway {
  search(
    tipo: MaestroTipo,
    q: string,
    parentId: string | null,
    page: number,
    size: number
  ): Promise<MaestroSearchResult> {
    const params = new URLSearchParams({ q, page: String(page), size: String(size) });
    if (parentId) params.set("parent", parentId);
    return httpJson("GET", `/maestros/${tipo}?${params.toString()}`);
  }
}
