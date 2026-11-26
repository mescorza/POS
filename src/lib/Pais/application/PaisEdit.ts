import { PaisDuplicadoError, PaisListItem, PaisNotFoundError, PaisRepository } from "../domain/PaisRepository";
import { normalizarEntrada, PaisEntrada } from "./PaisEntrada";

const mismo = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Edición de un país. El código no se cambia (lo referencian pos.region,
 * pos.proveedor y pos.pais_respa). Mismas validaciones que el alta, con una
 * diferencia a propósito: el duplicado de nombre / ISO2 sólo se controla
 * cuando ese dato CAMBIA. Así los registros que ya venían duplicados de los
 * datos originales (p. ej. INDONESIA 1016 / 1017) se pueden seguir editando
 * sin quedar bloqueados, pero no se puede crear un duplicado nuevo.
 */
export class PaisEdit {
  constructor(private readonly repository: PaisRepository) {}

  async run(id: number, input: PaisEntrada): Promise<PaisListItem> {
    const actual = await this.repository.getById(id);
    if (!actual) throw new PaisNotFoundError(id);

    const valores = await normalizarEntrada(this.repository, input);

    if (!mismo(valores.nombre, actual.nombre)) {
      const otro = await this.repository.buscarPorNombre(valores.nombre, id);
      if (otro) throw new PaisDuplicadoError(`El país "${otro.nombre}" ya existe (código ${otro.id})`);
    }
    if (valores.iso2 && !mismo(valores.iso2, actual.iso2)) {
      const otro = await this.repository.buscarPorIso2(valores.iso2, id);
      if (otro) {
        throw new PaisDuplicadoError(`El ISO2 ${valores.iso2} ya lo tiene el país "${otro.nombre}" (código ${otro.id})`);
      }
    }

    await this.repository.update(id, valores);

    const guardado = await this.repository.getById(id);
    if (!guardado) throw new PaisNotFoundError(id);
    return guardado;
  }
}
