/**
 * Gateway compartido de sólo lectura para Department/Subsidiary
 * (ExpressLookupRouter -> LookupRepository). No pertenece a User ni a
 * Employe: ambos módulos lo consultan sólo para mostrar nombres.
 */
export interface LookupItem {
  id: string;
  name: string;
}

export class LookupHttpGateway {
  async getDepartment(id: string): Promise<LookupItem | null> {
    const response = await fetch(`/departments/${id}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`No se pudo obtener el departamento ${id}`);
    return response.json();
  }

  async getSubsidiary(id: string): Promise<LookupItem | null> {
    const response = await fetch(`/subsidiaries/${id}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`No se pudo obtener la subsidiaria ${id}`);
    return response.json();
  }
}
