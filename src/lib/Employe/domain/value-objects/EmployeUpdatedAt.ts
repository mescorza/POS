export class EmployeUpdatedAt {
  // employee.updatedat: timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
  // (el trigger trg_employee_updated_at la actualiza en cada UPDATE).
  constructor(public readonly value: Date) {}
}
