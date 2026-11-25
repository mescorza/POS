import { RegionCreateValues, RegionInvalidError, RegionRepository } from "../domain/RegionRepository";

/** Largos máximos de las columnas de pos.region. */
export const MAX = { nombre: 100, saad: 8, saadDescripcion: 100 } as const;

/** Campos editables de una región (alta y, más adelante, edición). */
export interface RegionEntrada {
  nombre: string;
  paisId: number;
  saad: string;
  saadDescripcion: string;
}

const limpiar = (v: unknown) => (typeof v === "string" ? v : "").trim().replace(/\s+/g, " ");

function largo(valor: string, max: number, etiqueta: string) {
  if (valor.length > max) {
    throw new RegionInvalidError(`${etiqueta} admite hasta ${max} caracteres (tiene ${valor.length})`);
  }
}

/**
 * Limpia y valida lo común al alta y a la edición (sólo límites técnicos de la
 * tabla): nombre, país y SAAD código obligatorios; el país debe existir en
 * pos.pais; SAAD código en mayúsculas; SAAD descripción = nombre si viene
 * vacía. El duplicado (regla de negocio) lo controla cada caso de uso.
 */
export async function normalizarEntrada(
  repository: RegionRepository,
  input: RegionEntrada
): Promise<RegionCreateValues> {
  const nombre = limpiar(input.nombre);
  if (!nombre) throw new RegionInvalidError("Nombre es obligatorio");
  largo(nombre, MAX.nombre, "Nombre");

  const paisId = Number(input.paisId);
  if (!Number.isInteger(paisId) || paisId <= 0) throw new RegionInvalidError("País es obligatorio");

  const saad = limpiar(input.saad).toUpperCase();
  if (!saad) throw new RegionInvalidError("SAAD código es obligatorio");
  largo(saad, MAX.saad, "SAAD código");

  const saadDescripcion = limpiar(input.saadDescripcion) || nombre;
  largo(saadDescripcion, MAX.saadDescripcion, "SAAD descripción");

  if (!(await repository.paisExiste(paisId))) {
    throw new RegionInvalidError(`El país ${paisId} no existe`);
  }

  return { nombre, paisId, saad, saadDescripcion };
}
