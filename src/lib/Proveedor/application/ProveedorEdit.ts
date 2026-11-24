import {
  ProveedorDetalle,
  ProveedorEditInput,
  ProveedorNotFoundError,
  ProveedorRepository,
} from "../domain/ProveedorRepository";
import { normalizarEntrada, validarRutUnico } from "./ProveedorEntrada";

/**
 * Edición de un proveedor. Validación común en ProveedorEntrada (única regla
 * de negocio: DV chileno si el país es Chile). No toca la abreviación.
 */
export class ProveedorEdit {
  constructor(private readonly repository: ProveedorRepository) {}

  async run(id: number, input: ProveedorEditInput): Promise<ProveedorDetalle> {
    const actual = await this.repository.getById(id);
    if (!actual) throw new ProveedorNotFoundError(id);

    const valores = await normalizarEntrada(this.repository, input);

    // Sólo si el RUT cambió: así un proveedor antiguo no queda bloqueado por
    // datos históricos. La abreviación no se edita, no se vuelve a controlar.
    if (Number(valores.nrorut) !== Number(actual.nrorut)) {
      await validarRutUnico(this.repository, valores.nrorut, id);
    }

    const ok = await this.repository.update(id, valores);
    if (!ok) throw new ProveedorNotFoundError(id);

    const guardado = await this.repository.getById(id);
    if (!guardado) throw new ProveedorNotFoundError(id);
    return guardado;
  }
}
