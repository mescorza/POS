
import { Employe } from '../../domain/entities/Employe';
import { EmployeId } from '../../domain/value-objects/EmployeId';
import { EmployeNotFoundError } from "../../domain/EmployeNotFoundError";
import { EmployeRepository } from '../../domain/repositories/EmployeRepository';




export class EmployeGetOneById {
  constructor(private repository: EmployeRepository) {}

  async run(id: string): Promise<Employe> {
    const Employe = await this.repository.getOneById(new EmployeId(id));

    if (!Employe) throw new EmployeNotFoundError("User not found"); // retorna 404

    return Employe;
  }
}
