import {
  ProveedorCreateInput,
  ProveedorDetalle,
  ProveedorInvalidError,
  ProveedorNotFoundError,
  ProveedorRepository,
} from "../domain/ProveedorRepository";
import { largo, MAX, normalizarEntrada, validarAbrevUnica, validarRutUnico } from "./ProveedorEntrada";

/** Valores por defecto al grabar un alta (docs/proveedores_mantenedor.md §0 #4). */
export const DEFAULT_LOCALIDAD = "771"; // pos.localidad "-SIN ASIGNAR-"
export const DEFAULT_PROVINCIA = "725"; // pos.provincia "SIN VALOR"
/** C.Postal, Fax y Cargo: "un par de blancos" cuando vienen vacíos. */
export const DEFAULT_BLANCOS = "  ";

/**
 * Alta de un proveedor. Mismas validaciones que la edición (DV chileno +
 * restricciones técnicas de la tabla) y, además: la abreviación es
 * obligatoria (columna NOT NULL) y NroRut y CodProveedor no pueden estar
 * duplicados (409). No se valida el formato de la abreviación.
 *
 * Los campos obligatorios que vengan vacíos se completan con valores por
 * defecto: Localidad = 771, Provincia = 725, y C.Postal, Fax y Cargo = un par
 * de blancos.
 */
export class ProveedorCreate {
  constructor(private readonly repository: ProveedorRepository) {}

  async run(input: ProveedorCreateInput): Promise<ProveedorDetalle> {
    const abrev = (input.abrev ?? "").trim().toUpperCase();
    if (!abrev) throw new ProveedorInvalidError("Abrev es obligatoria");
    largo(abrev, MAX.abrev, "Abrev");

    const conDefaults: ProveedorCreateInput = {
      ...input,
      codLocalidad: (input.codLocalidad ?? "").trim() || DEFAULT_LOCALIDAD,
      codProvincia: (input.codProvincia ?? "").trim() || DEFAULT_PROVINCIA,
    };

    const valores = await normalizarEntrada(this.repository, conDefaults);

    // Control de duplicados: NroRut y CodProveedor no pueden repetirse.
    await validarRutUnico(this.repository, valores.nrorut, null);
    await validarAbrevUnica(this.repository, abrev, null);
    valores.codpostal = valores.codpostal ?? DEFAULT_BLANCOS;
    valores.fax1 = valores.fax1 ?? DEFAULT_BLANCOS;
    valores.cargo1 = valores.cargo1 ?? DEFAULT_BLANCOS;

    const id = await this.repository.create({ ...valores, codproveedor: abrev });

    const creado = await this.repository.getById(id);
    if (!creado) throw new ProveedorNotFoundError(id);
    return creado;
  }
}
