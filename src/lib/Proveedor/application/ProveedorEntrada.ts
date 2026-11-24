import { esRutChileValido, calcularDvChile } from "../domain/Rut";
import {
  ProveedorDuplicadoError,
  ProveedorEditInput,
  ProveedorEditInputNormalizado,
  ProveedorInvalidError,
  ProveedorRepository,
} from "../domain/ProveedorRepository";

// Largos máximos de las columnas char(n)/varchar de pos.proveedor.
export const MAX = {
  nombre: 40,
  abrev: 10,
  codpostal: 15,
  calle: 30,
  fono: 15,
  fax: 15,
  contacto: 25,
  cargo: 20,
  alaorden: 50,
  email: 50,
  localidad: 3,
} as const;

export const opt = (v: string): string | null => {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
};

function codigo(v: string, etiqueta: string): number | null {
  const t = (v ?? "").trim();
  if (t === "") return null;
  if (!/^\d{1,9}$/.test(t)) throw new ProveedorInvalidError(`${etiqueta}: código inválido`);
  return Number(t);
}

/**
 * Control de duplicados: NroRut y CodProveedor (Abrev) son únicos entre
 * proveedores. `excluirId` = el propio proveedor al editar. Lanza
 * ProveedorDuplicadoError (409) nombrando al proveedor que ya lo usa.
 */
export async function validarRutUnico(
  repository: ProveedorRepository,
  nrorut: string,
  excluirId: number | null
) {
  const otro = await repository.buscarPorRut(nrorut, excluirId);
  if (otro) {
    throw new ProveedorDuplicadoError(
      `R.U.T. ${nrorut} ya existe: ${otro.nombre} (Abrev ${otro.abrev})`
    );
  }
}

export async function validarAbrevUnica(
  repository: ProveedorRepository,
  abrev: string,
  excluirId: number | null
) {
  const otro = await repository.buscarPorAbrev(abrev, excluirId);
  if (otro) {
    throw new ProveedorDuplicadoError(
      `Abrev ${abrev} ya existe: ${otro.nombre} (R.U.T. ${otro.rut})`
    );
  }
}

export function largo(valor: string | null, max: number, etiqueta: string) {
  if (valor !== null && valor.length > max) {
    throw new ProveedorInvalidError(`${etiqueta}: máximo ${max} caracteres`);
  }
}

/**
 * Validación y normalización COMÚN a alta y edición.
 *
 * La ÚNICA regla de negocio es el dígito verificador (módulo 11), y sólo si
 * el país es Chile (docs/proveedores_mantenedor.md §0). El resto son
 * restricciones técnicas de la tabla: columnas NOT NULL (nombre, RUT, DV,
 * ubicación) y largos máximos. Los strings vacíos pasan a null.
 */
export async function normalizarEntrada(
  repository: ProveedorRepository,
  input: ProveedorEditInput
): Promise<ProveedorEditInputNormalizado> {
  const nrorut = (input.nrorut ?? "").trim();
  const verificador = (input.verificador ?? "").trim().toUpperCase();
  const nombre = (input.nombre ?? "").trim();

  if (!/^\d{1,9}$/.test(nrorut)) throw new ProveedorInvalidError("R.U.T.: debe ser numérico (hasta 9 dígitos)");
  if (!/^[0-9A-Z]$/.test(verificador)) throw new ProveedorInvalidError("Dígito verificador: un carácter");
  if (!nombre) throw new ProveedorInvalidError("Nombre es obligatorio");
  largo(nombre, MAX.nombre, "Nombre");

  const codsucursal = codigo(input.codUbicacion, "Ubicación");
  if (codsucursal === null) throw new ProveedorInvalidError("Ubicación es obligatoria");

  const paisId = codigo(input.codPais, "País");

  // Única validación de negocio: DV chileno, sólo si el país es Chile.
  if (paisId !== null && (await repository.esPaisChile(paisId))) {
    if (!esRutChileValido(nrorut, verificador)) {
      throw new ProveedorInvalidError(
        `R.U.T. inválido: el dígito verificador de ${nrorut} debe ser ${calcularDvChile(nrorut)}`
      );
    }
  }

  const localidad = opt(input.codLocalidad);
  if (localidad !== null && !/^\d+$/.test(localidad)) throw new ProveedorInvalidError("Localidad: código inválido");
  largo(localidad, MAX.localidad, "Localidad");

  const forwarder = (input.esForwarder ?? "").trim().toUpperCase();
  if (forwarder !== "" && forwarder !== "S" && forwarder !== "N") {
    throw new ProveedorInvalidError("Es Forwarder: use S o N");
  }

  const valores: ProveedorEditInputNormalizado = {
    nrorut,
    verificador,
    nombre,
    codsucursal,
    paisId,
    regionId: codigo(input.codRegion, "Región"),
    ciudadId: codigo(input.codCiudad, "Ciudad"),
    comunaId: codigo(input.codComuna, "Comuna"),
    localidadId: localidad,
    provinciaId: codigo(input.codProvincia, "Provincia"),
    codpostal: opt(input.codPostal),
    calle: opt(input.direccion),
    fono1: opt(input.fono),
    fax1: opt(input.fax),
    contacto1: opt(input.contacto),
    cargo1: opt(input.cargo),
    codmoneda: opt(input.codMoneda),
    indforwarder: forwarder === "" ? null : forwarder,
    alaorden: opt(input.alaOrdenDe),
    email1: opt(input.email1),
    email2: opt(input.email2),
    modificadoPor: input.modificadoPor,
  };

  largo(valores.codpostal, MAX.codpostal, "C.Postal");
  largo(valores.calle, MAX.calle, "Dirección");
  largo(valores.fono1, MAX.fono, "Fono");
  largo(valores.fax1, MAX.fax, "Fax");
  largo(valores.contacto1, MAX.contacto, "Contacto");
  largo(valores.cargo1, MAX.cargo, "Cargo");
  largo(valores.codmoneda, 2, "Moneda");
  largo(valores.alaorden, MAX.alaorden, "A la orden de");
  largo(valores.email1, MAX.email, "E-Mail 1");
  largo(valores.email2, MAX.email, "E-Mail 2");

  if (!Number.isInteger(valores.modificadoPor) || valores.modificadoPor <= 0) {
    throw new ProveedorInvalidError("Usuario que modifica inválido");
  }

  return valores;
}
