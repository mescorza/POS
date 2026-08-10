import { EmployeId } from "../../../Employe/domain/value-objects/EmployeId";
import { EmployeRepository } from "../../../Employe/domain/repositories/EmployeRepository";

export class EmployeDelete {
  constructor(private repository: EmployeRepository) {}

  async run(id: string): Promise<void> {
    await this.repository.delete(new EmployeId(id));
  }
}
