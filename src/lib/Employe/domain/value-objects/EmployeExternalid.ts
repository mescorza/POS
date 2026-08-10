export class EmployeExternalid {
  value: string;

  constructor(value: string) {
    this.value = value;
    this.ensureIsValid();
  }

  // employee.externalid: bigint NULL (correlación con NetSuite).
  private ensureIsValid() {
    if (!/^[0-9]+$/.test(this.value)) {
      throw new Error("EmployeExternalid must be a positive integer (NetSuite internal id)");
    }
  }
}
