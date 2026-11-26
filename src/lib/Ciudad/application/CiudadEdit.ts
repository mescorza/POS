import {
  CiudadDuplicadaError,
  CiudadInvalidError,
  CiudadListItem,
  CiudadNotFoundError,
  CiudadRepository,
} from "../domain/CiudadRepository";
import { CiudadEntrada, normalizarEntrada } from "./CiudadEntrada";

const mismo = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Edición de una ciudad. El código no se cambia (lo referencian pos.comuna y
 * pos.proveedor por ciudad_id) ni tampoco externalid. Mismas validaciones que
 * el alta, con dos diferencias:
 *  - el duplicado de nombre dentro de la región sólo se controla cuando el
 *    nombre o la región CAMBIAN (un registro existente nunca queda bloqueado);
 *  - la región sólo se puede cambiar si la ciudad no tiene comunas ni
 *    proveedores: de lo contrario quedarían colgando de otra región.
 */
export class CiudadEdit {
  constructor(private readonly repository: CiudadRepository) {}

  async run(id: number, input: CiudadEntrada): Promise<CiudadListItem> {
    const actual = await this.repository.getById(id);
    if (!actual) throw new CiudadNotFoundError(id);

    const valores = await normalizarEntrada(this.repository, input);

    const cambiaRegion = valores.regionId !== actual.regionId;
    if (cambiaRegion && (actual.comunas > 0 || actual.proveedores > 0)) {
      const usos = [
        actual.comunas > 0 ? `${actual.comunas} comuna${actual.comunas === 1 ? "" : "s"}` : "",
        actual.proveedores > 0 ? `${actual.proveedores} proveedor${actual.proveedores === 1 ? "" : "es"}` : "",
      ]
        .filter(Boolean)
        .join(" y ");
      throw new CiudadInvalidError(
        `No se puede cambiar la región de la ciudad "${actual.nombre}": tiene ${usos} asociados que quedarían con una región distinta a la de su ciudad.`
      );
    }

    if (cambiaRegion || !mismo(valores.nombre, actual.nombre)) {
      const otra = await this.repository.buscarPorNombreEnRegion(valores.nombre, valores.regionId, id);
      if (otra) {
        throw new CiudadDuplicadaError(`La ciudad "${otra.nombre}" ya existe en esa región (código ${otra.id})`);
      }
    }

    await this.repository.update(id, valores);

    const guardada = await this.repository.getById(id);
    if (!guardada) throw new CiudadNotFoundError(id);
    return guardada;
  }
}
