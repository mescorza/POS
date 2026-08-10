import * as dotenv from "dotenv";
dotenv.config();

import { EmployeGetAll } from "../../Employe/application/use-cases/EmployeGetAll";
import { EmployeGetOneById } from "../../Employe/application/use-cases/EmployeGetOneById";
import { CreateEmploye } from "../../Employe/application/use-cases/CreateEmploye";
import { EmployeEdit } from "../../Employe/application/use-cases/EmployeEdit";
import { EmployeDelete } from "../../Employe/application/use-cases/EmployeDelete";
import { EmployeRepository } from "../../Employe/domain/repositories/EmployeRepository";
import { InMemoryEmployeRepository } from "../../Employe/infrastructure/repositories/InMemoryEmployeRepository";
import { PostgresEmployeRepository } from "../../Employe/infrastructure/repositories/PostgresEmployeRepository";

function buildEmployeRepository(): EmployeRepository {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn(
      "ADVERTENCIA: DATABASE_URL no está configurado; ServiceEmployeContainer.employe queda en InMemoryEmployeRepository (los datos NO persisten)."
    );
    return new InMemoryEmployeRepository();
  }

  return new PostgresEmployeRepository(databaseUrl);
}

const employeRepository = buildEmployeRepository();

export const ServiceEmployeContainer = {
  employe: {
    getAll: new EmployeGetAll(employeRepository),
    getOneById: new EmployeGetOneById(employeRepository),
    create: new CreateEmploye(employeRepository),
    edit: new EmployeEdit(employeRepository),
    delete: new EmployeDelete(employeRepository),
  },
};
