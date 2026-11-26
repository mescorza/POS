import { PaisDuplicadoError, PaisListItem, PaisNotFoundError, PaisRepository } from "../domain/PaisRepository";
import { normalizarEntrada, PaisEntrada } from "./PaisEntrada";

export type PaisCreateInput = PaisEntrada;

/**
 * Alta de un país. El código lo asigna el sistema (máximo + 1).
 * Regla de negocio: el nombre no puede repetirse y, si se informa, el ISO2
 * tampoco (409, sin distinguir mayúsculas). Lo demás son límites técnicos de
 * la tabla (ver normalizarEntrada). externalid queda sin valor.
 */
export class PaisCreate {
  constructor(private readonly repository: PaisRepository) {}

  async run(input: PaisCreateInput): Promise<PaisListItem> {
    const valores = await normalizarEntrada(this.repository, input);

    const mismoNombre = await this.repository.buscarPorNombre(valores.nombre);
    if (mismoNombre) {
      throw new PaisDuplicadoError(`El país "${mismoNombre.nombre}" ya existe (código ${mismoNombre.id})`);
    }
    if (valores.iso2) {
      const mismoIso = await this.repository.buscarPorIso2(valores.iso2);
      if (mismoIso) {
        throw new PaisDuplicadoError(
          `El ISO2 ${valores.iso2} ya lo tiene el país "${mismoIso.nombre}" (código ${mismoIso.id})`
        );
      }
    }

    const id = await this.repository.create(valores);

    const creado = await this.repository.getById(id);
    if (!creado) throw new PaisNotFoundError(id);
    return creado;
  }
}
