import { PostgresEmployeRepository } from "src/lib/Employe/infrastructure/repositories/PostgresEmployeRepository";
import { Employe } from "src/lib/Employe/domain/entities/Employe";

import * as dotenv from "dotenv";
import { EmployeStub } from "../domain/EmployeStub";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

describe("PostgresEmployeRepository should", () => {
  const repository = new PostgresEmployeRepository(DATABASE_URL);

  afterAll(async () => {
    await repository.client.end();
  });

  it("create", async () => {
    const employe = EmployeStub.create();

    await repository.create(employe);

    const findedEmploye = await repository.getOneById(employe.id);

    expect(findedEmploye).not.toBeNull();

    expect(findedEmploye?.id.value).toBe(employe.id.value);
    expect(findedEmploye?.firstname?.value).toBe(employe.firstname?.value);
    expect(findedEmploye?.lastname?.value).toBe(employe.lastname?.value);

    await repository.delete(employe.id);
  });

  it("get all", async () => {
    const employe = EmployeStub.create();
    const employe2 = EmployeStub.create();

    await repository.create(employe);
    await repository.create(employe2);

    const employees = await repository.getAll();

    expect(employees.length).toBeGreaterThanOrEqual(2);

    await repository.delete(employe.id);
    await repository.delete(employe2.id);
  });

  it("get one by id", async () => {
    const employe = EmployeStub.create();

    await repository.create(employe);

    const employeFound = await repository.getOneById(employe.id);

    expect(employeFound).not.toBeNull();
    expect(employeFound?.id.value).toBe(employe.id.value);
    expect(employeFound?.firstname?.value).toBe(employe.firstname?.value);
    expect(employeFound?.lastname?.value).toBe(employe.lastname?.value);

    await repository.delete(employe.id);
  });

  it("edit", async () => {
    const employe = EmployeStub.create();

    await repository.create(employe);

    const newEmploye = Employe.fromPrimitives({
      ...EmployeStub.create().mapToPrimitives(),
      id: employe.id.value,
    });

    await repository.edit(newEmploye);

    const findedEmploye = await repository.getOneById(employe.id);

    expect(findedEmploye).not.toBeNull();
    expect(findedEmploye?.id.value).toBe(newEmploye.id.value);
    expect(findedEmploye?.firstname?.value).toBe(newEmploye.firstname?.value);
    expect(findedEmploye?.lastname?.value).toBe(newEmploye.lastname?.value);

    await repository.delete(employe.id);
  });

  it("delete", async () => {
    const employe = EmployeStub.create();

    await repository.create(employe);

    const employeesBefore = await repository.getAll();

    expect(employeesBefore.length).toBeGreaterThan(0);

    await repository.delete(employe.id);

    const finedEmploye = await repository.getOneById(employe.id);

    expect(finedEmploye).toBeNull();
  });
});
