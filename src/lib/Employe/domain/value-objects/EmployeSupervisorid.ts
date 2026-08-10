export class EmployeSupervisorid {
  value: string;

  constructor(value: string) {
    this.value = value;
    this.ensureIsValid();
  }

  // employee.supervisorid: bigint NULL, FK auto-referencial hacia employee(id)
  // (fk_employee_supervisor); CHECK supervisorid <> id se valida al persistir.
  private ensureIsValid() {
    if (!/^[0-9]+$/.test(this.value)) {
      throw new Error("EmployeSupervisorid must be a positive integer (references employee.id)");
    }
  }
}
