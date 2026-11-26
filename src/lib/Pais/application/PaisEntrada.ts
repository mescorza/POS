import { PaisInvalidError, PaisRepository } from "../domain/PaisRepository";

/** Largos máximos de las columnas de pos.pais. */
export const MAX = { nombre: 100, iso2: 3, saad: 8, saadDescripcion: 100 } as const;

/** Campos editables de un país (alta y edición comparten la misma entrada). */
export interface PaisEntrada {
  nombre: string;
  continenteId: number;
  iso2: string;
  saad: string;
  saadDescripcion: string;
}

/** Entrada ya limpia y lista para guardar. */
export interface PaisNormalizado {
  nombre: string;
  continenteId: number;
  /** null cuando no se informa (columna opcional). */
  iso2: string | null;
  saad: string;
  saadDescripcion: string;
}

const limpiar = (v: unknown) => (typeof v === "string" ? v : "").trim().replace(/\s+/g, " ");

function largo(valor: string, max: number, etiqueta: string) {
  if (valor.length > max) {
    throw new PaisInvalidError(`${etiqueta} admite hasta ${max} caracteres (tiene ${valor.length})`);
  }
}

/**
 * Limpia y valida lo común al alta y a la edición (sólo límites técnicos de la
 * tabla): nombre, continente y SAAD código obligatorios; continente existente;
 * ISO2 y SAAD código en mayúsculas; SAAD descripción = nombre si viene vacía.
 * Los duplicados (regla de negocio) los controla cada caso de uso.
 */
export async function normalizarEntrada(repository: PaisRepository, input: PaisEntrada): Promise<PaisNormalizado> {
  const nombre = limpiar(input.nombre);
  if (!nombre) throw new PaisInvalidError("Nombre es obligatorio");
  largo(nombre, MAX.nombre, "Nombre");

  const continenteId = Number(input.continenteId);
  if (!Number.isInteger(continenteId) || continenteId <= 0) {
    throw new PaisInvalidError("Continente es obligatorio");
  }

  const saad = limpiar(input.saad).toUpperCase();
  if (!saad) throw new PaisInvalidError("SAAD código es obligatorio");
  largo(saad, MAX.saad, "SAAD código");

  const iso2 = limpiar(input.iso2).toUpperCase();
  largo(iso2, MAX.iso2, "ISO2");

  const saadDescripcion = limpiar(input.saadDescripcion) || nombre;
  largo(saadDescripcion, MAX.saadDescripcion, "SAAD descripción");

  if (!(await repository.continenteExiste(continenteId))) {
    throw new PaisInvalidError(`El continente ${continenteId} no existe`);
  }

  return { nombre, continenteId, iso2: iso2 || null, saad, saadDescripcion };
}
