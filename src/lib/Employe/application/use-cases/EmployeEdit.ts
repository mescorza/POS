import { Employe, EmployePrimitives } from '../../domain/entities/Employe';
import { EmployeRepository } from '../../domain/repositories/EmployeRepository';
import { EmployeNotFoundError } from "../../domain/EmployeNotFoundError";

export class EmployeEdit {
  constructor(private repository: EmployeRepository) {}

  async run(data: EmployePrimitives): Promise<void> {
    const entity = Employe.fromPrimitives(data);

    const employeExists = await this.repository.getOneById(entity.id);

    if (!employeExists) throw new EmployeNotFoundError("Employe not found");

    return this.repository.edit(entity);
  }
}
