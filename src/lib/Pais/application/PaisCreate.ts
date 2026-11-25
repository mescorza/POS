import {
  PaisDuplicadoError,
  PaisInvalidError,
  PaisListItem,
  PaisNotFoundError,
  PaisRepository,
} from "../domain/PaisRepository";

/** Largos máximos de las columnas de pos.pais. */
export const MAX = { nombre: 100, iso2: 3, saad: 8, saadDescripcion: 100 } as const;

export interface PaisCreateInput {
  nombre: string;
  continenteId: number;
  iso2: string;
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
 * Alta de un país. El código lo asigna el sistema (máximo + 1).
 * Reglas de negocio: el nombre no puede repetirse y, si se informa, el ISO2
 * tampoco (409, sin distinguir mayúsculas). El resto son límites técnicos de
 * la tabla: nombre, continente y SAAD código son obligatorios; el continente
 * debe existir; SAAD descripción se completa con el nombre si viene vacía;
 * ISO2 y SAAD código se guardan en mayúsculas. externalid queda sin valor.
 */
export class PaisCreate {
  constructor(private readonly repository: PaisRepository) {}

  async run(input: PaisCreateInput): Promise<PaisListItem> {
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

    if (!(await this.repository.continenteExiste(continenteId))) {
      throw new PaisInvalidError(`El continente ${continenteId} no existe`);
    }

    // Control de duplicados.
    const mismoNombre = await this.repository.buscarPorNombre(nombre);
    if (mismoNombre) {
      throw new PaisDuplicadoError(`El país "${mismoNombre.nombre}" ya existe (código ${mismoNombre.id})`);
    }
    if (iso2) {
      const mismoIso = await this.repository.buscarPorIso2(iso2);
      if (mismoIso) {
        throw new PaisDuplicadoError(
          `El ISO2 ${iso2} ya lo tiene el país "${mismoIso.nombre}" (código ${mismoIso.id})`
        );
      }
    }

    const id = await this.repository.create({
      nombre,
      continenteId,
      iso2: iso2 || null,
      saad,
      saadDescripcion,
    });

    const creado = await this.repository.getById(id);
    if (!creado) throw new PaisNotFoundError(id);
    return creado;
  }
}
