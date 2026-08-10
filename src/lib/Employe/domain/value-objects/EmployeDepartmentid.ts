export class EmployeDepartmentid {
  value: string;

  constructor(value: string) {
    this.value = value;
    this.ensureIsValid();
  }

  // employee.departmentid: bigint NULL, FK hacia department(id) (fk_employee_department).
  // La tabla department aún no tiene bounded context propio en el dominio.
  private ensureIsValid() {
    if (!/^[0-9]+$/.test(this.value)) {
      throw new Error("EmployeDepartmentid must be a positive integer (references department.id)");
    }
  }
}
