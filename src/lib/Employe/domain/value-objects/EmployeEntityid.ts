export class EmployeEntityid {
  value: string;

  constructor(value: string) {
    this.value = value;
    this.ensureIsValid();
  }

  // employee.entityid: bigint, FK única hacia entity(id) (fk_employee_entity).
  private ensureIsValid() {
    if (!/^[0-9]+$/.test(this.value)) {
      throw new Error("EmployeEntityid must be a positive integer (references entity.id)");
    }
  }
}
