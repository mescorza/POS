export class EmployeEmployeestatus {
  value: string;

  constructor(value: string) {
    this.value = value;
    this.ensureIsValid();
  }

  // employee.employeestatus: bigint NULL. Correlación NetSuite (lista de estados).
  private ensureIsValid() {
    if (!/^[0-9]+$/.test(this.value)) {
      throw new Error("EmployeEmployeestatus must be a positive integer");
    }
  }
}
