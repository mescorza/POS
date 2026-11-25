import { CiudadCreateValues, CiudadInvalidError, CiudadRepository } from "../domain/CiudadRepository";

/** Largos máximos de las columnas de pos.ciudad. */
export const MAX = { nombre: 100, saad: 8, saadDescripcion: 100 } as const;

export interface CiudadEntrada {
  nombre: string;
  regionId: number;
  saad: string;
  saadDescripcion: string;
}

const limpiar = (v: unknown) => (typeof v === "string" ? v : "").trim().replace(/\s+/g, " ");

function largo(valor: string, max: number, etiqueta: string) {
  if (valor.length > max) {
    throw new CiudadInvalidError(`${etiqueta} admite hasta ${max} caracteres (tiene ${valor.length})`);
  }
}

/**
 * Limpia y valida lo común al alta y a la edición: nombre, región y SAAD código
 * obligatorios; la región debe existir en pos.region; SAAD código en
 * mayúsculas; SAAD descripción = nombre si viene vacía.
 */
export async function normalizarEntrada(
  repository: CiudadRepository,
  input: CiudadEntrada
): Promise<CiudadCreateValues> {
  const nombre = limpiar(input.nombre);
  if (!nombre) throw new CiudadInvalidError("Nombre es obligatorio");
  largo(nombre, MAX.nombre, "Nombre");

  const regionId = Number(input.regionId);
  if (!Number.isInteger(regionId) || regionId <= 0) throw new CiudadInvalidError("Región es obligatoria");

  const saad = limpiar(input.saad).toUpperCase();
  if (!saad) throw new CiudadInvalidError("SAAD código es obligatorio");
  largo(saad, MAX.saad, "SAAD código");

  const saadDescripcion = limpiar(input.saadDescripcion) || nombre;
  largo(saadDescripcion, MAX.saadDescripcion, "SAAD descripción");

  if (!(await repository.regionExiste(regionId))) {
    throw new CiudadInvalidError(`La región ${regionId} no existe`);
  }

  return { nombre, regionId, saad, saadDescripcion };
}
