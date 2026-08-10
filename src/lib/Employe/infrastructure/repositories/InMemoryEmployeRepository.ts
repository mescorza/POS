import { Employe } from '../../domain/entities/Employe';
import { EmployeId } from "../../domain/value-objects/EmployeId";
import { EmployeRepository } from '../../domain/repositories/EmployeRepository';


export class InMemoryEmployeRepository implements EmployeRepository {
  private employe: Employe[] = [];

  async create(employe: Employe): Promise<void> {
    this.employe.push(employe);
  }

  async getAll(): Promise<Employe[]> {
    return this.employe;
  }

  async getOneById(id: EmployeId): Promise<Employe | null> {
    return this.employe.find((employe) => employe.id.value === id.value) || null;
  }

  async edit(employe: Employe): Promise<void> {
    const index = this.employe.findIndex((u) => u.id.value == employe.id.value);
    this.employe[index] = employe;
  }

  async delete(id: EmployeId): Promise<void> {
    this.employe = this.employe.filter((employe) => employe.id.value !== id.value);
  }
}