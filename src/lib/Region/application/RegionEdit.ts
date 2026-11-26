import {
  RegionDuplicadaError,
  RegionInvalidError,
  RegionListItem,
  RegionNotFoundError,
  RegionRepository,
} from "../domain/RegionRepository";
import { normalizarEntrada, RegionEntrada } from "./RegionEntrada";

const mismo = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Edición de una región. El código no se cambia (lo referencian pos.ciudad y
 * pos.proveedor por region_id) ni tampoco externalid (lo usa pos.provincia).
 * Mismas validaciones que el alta, con dos diferencias:
 *  - el duplicado de nombre dentro del país sólo se controla cuando el nombre
 *    o el país CAMBIAN (así un registro ya existente nunca queda bloqueado);
 *  - el país sólo se puede cambiar si la región no tiene ciudades ni
 *    proveedores: de lo contrario esos registros quedarían con un país que no
 *    coincide con el de su región.
 */
export class RegionEdit {
  constructor(private readonly repository: RegionRepository) {}

  async run(id: number, input: RegionEntrada): Promise<RegionListItem> {
    const actual = await this.repository.getById(id);
    if (!actual) throw new RegionNotFoundError(id);

    const valores = await normalizarEntrada(this.repository, input);

    const cambiaPais = valores.paisId !== actual.paisId;
    if (cambiaPais && (actual.ciudades > 0 || actual.proveedores > 0)) {
      const usos = [
        actual.ciudades > 0 ? `${actual.ciudades} ciudad${actual.ciudades === 1 ? "" : "es"}` : "",
        actual.proveedores > 0 ? `${actual.proveedores} proveedor${actual.proveedores === 1 ? "" : "es"}` : "",
      ]
        .filter(Boolean)
        .join(" y ");
      throw new RegionInvalidError(
        `No se puede cambiar el país de la región "${actual.nombre}": tiene ${usos} asociados que quedarían con un país distinto al de su región.`
      );
    }

    if (cambiaPais || !mismo(valores.nombre, actual.nombre)) {
      const otra = await this.repository.buscarPorNombreEnPais(valores.nombre, valores.paisId, id);
      if (otra) {
        throw new RegionDuplicadaError(`La región "${otra.nombre}" ya existe en ese país (código ${otra.id})`);
      }
    }

    await this.repository.update(id, valores);

    const guardada = await this.repository.getById(id);
    if (!guardada) throw new RegionNotFoundError(id);
    return guardada;
  }
}
