import { ProveedorDetalle, ProveedorRepository } from "../domain/ProveedorRepository";

export class ProveedorGetOneById {
  constructor(private readonly repository: ProveedorRepository) {}

  async run(id: number): Promise<ProveedorDetalle | null> {
    return this.repository.getById(id);
  }
}
