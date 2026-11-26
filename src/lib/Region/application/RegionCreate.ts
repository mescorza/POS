import {
  RegionDuplicadaError,
  RegionListItem,
  RegionNotFoundError,
  RegionRepository,
} from "../domain/RegionRepository";
import { normalizarEntrada, RegionEntrada } from "./RegionEntrada";

export type RegionCreateInput = RegionEntrada;

/**
 * Alta de una región. El código lo genera la identity de la tabla.
 * Regla de negocio: el nombre no puede repetirse dentro del mismo país (409,
 * sin distinguir mayúsculas). Lo demás son límites técnicos de la tabla (ver
 * normalizarEntrada). externalid queda sin valor.
 */
export class RegionCreate {
  constructor(private readonly repository: RegionRepository) {}

  async run(input: RegionCreateInput): Promise<RegionListItem> {
    const valores = await normalizarEntrada(this.repository, input);

    const existente = await this.repository.buscarPorNombreEnPais(valores.nombre, valores.paisId);
    if (existente) {
      throw new RegionDuplicadaError(
        `La región "${existente.nombre}" ya existe en ese país (código ${existente.id})`
      );
    }

    const id = await this.repository.create(valores);

    const creada = await this.repository.getById(id);
    if (!creada) throw new RegionNotFoundError(id);
    return creada;
  }
}
