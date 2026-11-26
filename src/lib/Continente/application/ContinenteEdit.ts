import {
  ContinenteDuplicadoError,
  ContinenteInvalidError,
  ContinenteListItem,
  ContinenteNotFoundError,
  ContinenteRepository,
} from "../domain/ContinenteRepository";
import { NOMBRE_MAX } from "./ContinenteCreate";

/**
 * Edición del nombre de un continente. El código no se cambia (lo referencia
 * pos.pais.continente_id, sin FK). Misma regla que el alta: el nombre no puede
 * repetirse en OTRO continente (409); guardar el mismo nombre u otra grafía
 * del propio continente (p. ej. cambiar mayúsculas) es válido.
 */
export class ContinenteEdit {
  constructor(private readonly repository: ContinenteRepository) {}

  async run(id: number, input: { nombre: string }): Promise<ContinenteListItem> {
    const actual = await this.repository.getById(id);
    if (!actual) throw new ContinenteNotFoundError(id);

    const nombre = (input.nombre ?? "").trim().replace(/\s+/g, " ");
    if (!nombre) throw new ContinenteInvalidError("Nombre es obligatorio");
    if (nombre.length > NOMBRE_MAX) {
      throw new ContinenteInvalidError(`Nombre admite hasta ${NOMBRE_MAX} caracteres (tiene ${nombre.length})`);
    }

    const otro = await this.repository.buscarPorNombre(nombre, id);
    if (otro) {
      throw new ContinenteDuplicadoError(`El continente "${otro.nombre}" ya existe (código ${otro.id})`);
    }

    await this.repository.update(id, nombre);
    const guardado = await this.repository.getById(id);
    if (!guardado) throw new ContinenteNotFoundError(id);
    return guardado;
  }
}
