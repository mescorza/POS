import { Employe, EmployePrimitives } from '../../domain/entities/Employe';
import { EmployeRepository } from '../../domain/repositories/EmployeRepository';

export type CreateEmployeInput = EmployePrimitives;

export class CreateEmploye {
  constructor(private readonly repository: EmployeRepository) {}

  async run(data: CreateEmployeInput): Promise<Employe> {
    const entity = Employe.fromPrimitives(data);

    await this.repository.create(entity);
    return entity;
  }
}
