import { Employe } from '../entities/Employe';
import { EmployeId } from "../value-objects/EmployeId";

/*export interface EmployeRepository {
  save(entity: Employe): Promise<void>;
}
*/

export interface EmployeRepository {
  create(employe: Employe): Promise<void>;
  getAll(): Promise<Employe[]>;
  getOneById(id: EmployeId): Promise<Employe | null>;
  edit(employe: Employe): Promise<void>;
  delete(id: EmployeId): Promise<void>;
}