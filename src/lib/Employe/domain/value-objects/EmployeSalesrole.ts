export class EmployeSalesrole {
  value: string;

  constructor(value: string) {
    this.value = value;
    this.ensureIsValid();
  }

  // employee.salesrole: bigint NULL. Correlación NetSuite (custentity_salesrole).
  private ensureIsValid() {
    if (!/^[0-9]+$/.test(this.value)) {
      throw new Error("EmployeSalesrole must be a positive integer");
    }
  }
}
