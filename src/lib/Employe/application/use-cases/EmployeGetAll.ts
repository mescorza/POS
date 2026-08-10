import { Employe } from "../../../Employe/domain/entities/Employe";
import { EmployeRepository } from "../../../Employe/domain/repositories/EmployeRepository";

export class EmployeGetAll {
  constructor(private repository: EmployeRepository) {}

  async run(): Promise<Employe[]> {
    return this.repository.getAll();
  }
}
