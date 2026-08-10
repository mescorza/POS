export class EmployeSubsidiaryid {
  value: string;

  constructor(value: string) {
    this.value = value;
    this.ensureIsValid();
  }

  // employee.subsidiaryid: bigint NULL, FK hacia subsidiary(id) (fk_employee_subsidiary).
  // La tabla subsidiary aún no tiene bounded context propio en el dominio.
  private ensureIsValid() {
    if (!/^[0-9]+$/.test(this.value)) {
      throw new Error("EmployeSubsidiaryid must be a positive integer (references subsidiary.id)");
    }
  }
}
