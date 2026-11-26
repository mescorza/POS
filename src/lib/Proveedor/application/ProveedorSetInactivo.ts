import {
  ProveedorDetalle,
  ProveedorInvalidError,
  ProveedorNotFoundError,
  ProveedorRepository,
} from "../domain/ProveedorRepository";

/**
 * Baja lógica (desactivar) y reactivación de un proveedor
 * (docs/proveedores_mantenedor.md §8.2). Nunca borra: sólo cambia `esinactivo`.
 * Es idempotente: pedir el estado que ya tiene no falla.
 */
export class ProveedorSetInactivo {
  constructor(private readonly repository: ProveedorRepository) {}

  async run(id: number, inactivo: boolean, modificadoPor: number): Promise<ProveedorDetalle> {
    if (!Number.isInteger(modificadoPor) || modificadoPor <= 0) {
      throw new ProveedorInvalidError("Usuario que modifica inválido");
    }

    const ok = await this.repository.setInactivo(id, inactivo, modificadoPor);
    if (!ok) throw new ProveedorNotFoundError(id);

    const actualizado = await this.repository.getById(id);
    if (!actualizado) throw new ProveedorNotFoundError(id);
    return actualizado;
  }
}
