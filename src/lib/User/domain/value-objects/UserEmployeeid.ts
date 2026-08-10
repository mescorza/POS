export class UserEmployeeid {
  value: string;

  constructor(value: string) {
    this.value = value;
    this.ensureIsValid();
  }

  // user_pos.employeeid: bigint, FK única hacia employee(id) (fk_app_user_employee).
  // Es una referencia por id; User nunca embebe la entidad Employe.
  private ensureIsValid() {
    if (!/^[0-9]+$/.test(this.value)) {
      throw new Error("UserEmployeeid must be a positive integer (references employee.id)");
    }
  }
}
