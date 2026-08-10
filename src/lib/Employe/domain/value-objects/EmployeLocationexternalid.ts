export class EmployeLocationexternalid {
  value: string;

  constructor(value: string) {
    this.value = value;
    this.ensureIsValid();
  }

  // employee.locationexternalid: bigint NULL. Correlación con la ubicación
  // en NetSuite; no hay tabla local de ubicaciones en este modelo todavía.
  private ensureIsValid() {
    if (!/^[0-9]+$/.test(this.value)) {
      throw new Error("EmployeLocationexternalid must be a positive integer");
    }
  }
}
