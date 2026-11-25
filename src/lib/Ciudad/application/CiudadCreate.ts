import {
  CiudadDuplicadaError,
  CiudadListItem,
  CiudadNotFoundError,
  CiudadRepository,
} from "../domain/CiudadRepository";
import { CiudadEntrada, normalizarEntrada } from "./CiudadEntrada";

/**
 * Alta de una ciudad. El código lo genera la identity de la tabla. Regla de
 * negocio: el nombre no puede repetirse dentro de la misma región (409, sin
 * distinguir mayúsculas). externalid queda sin valor.
 */
export class CiudadCreate {
  constructor(private readonly repository: CiudadRepository) {}

  async run(input: CiudadEntrada): Promise<CiudadListItem> {
    const valores = await normalizarEntrada(this.repository, input);

    const existente = await this.repository.buscarPorNombreEnRegion(valores.nombre, valores.regionId);
    if (existente) {
      throw new CiudadDuplicadaError(`La ciudad "${existente.nombre}" ya existe en esa región (código ${existente.id})`);
    }

    const id = await this.repository.create(valores);
    const creada = await this.repository.getById(id);
    if (!creada) throw new CiudadNotFoundError(id);
    return creada;
  }
}
