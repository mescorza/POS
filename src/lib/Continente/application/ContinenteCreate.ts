import {
  ContinenteDuplicadoError,
  ContinenteInvalidError,
  ContinenteListItem,
  ContinenteRepository,
} from "../domain/ContinenteRepository";

/** Largo máximo de pos.continente.nombre (varchar(60)). */
export const NOMBRE_MAX = 60;

/**
 * Alta de un continente. El código lo asigna el sistema (máximo + 1). Única
 * validación de negocio: el nombre no puede repetirse (sin distinguir
 * mayúsculas ni espacios de borde -> 409); lo demás son límites técnicos de
 * la tabla (obligatorio, hasta 60 caracteres).
 */
export class ContinenteCreate {
  constructor(private readonly repository: ContinenteRepository) {}

  async run(input: { nombre: string }): Promise<ContinenteListItem> {
    const nombre = (input.nombre ?? "").trim().replace(/\s+/g, " ");
    if (!nombre) throw new ContinenteInvalidError("Nombre es obligatorio");
    if (nombre.length > NOMBRE_MAX) {
      throw new ContinenteInvalidError(`Nombre admite hasta ${NOMBRE_MAX} caracteres (tiene ${nombre.length})`);
    }

    const existente = await this.repository.buscarPorNombre(nombre);
    if (existente) {
      throw new ContinenteDuplicadoError(`El continente "${existente.nombre}" ya existe (código ${existente.id})`);
    }

    return this.repository.create(nombre);
  }
}
