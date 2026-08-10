export class EmployeCreatedAt {
  value: Date;

  constructor(value: Date) {
    this.value = value;
    this.ensureIsValid();
  }

  // employee.createdat: timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP.
  private ensureIsValid() {
    if (this.value > new Date()) {
      throw new Error("EmployeCreatedAt must be in the past");
    }
  }
}
