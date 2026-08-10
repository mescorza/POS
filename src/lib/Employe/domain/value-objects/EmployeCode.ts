export class EmployeCode {
  // employee.employeecode: varchar(300) NULL, UNIQUE (uq_employee_code).
  // Es el "Código vendedor" del formulario POS (35.2.2).
  constructor(public readonly value: string) {}
}
