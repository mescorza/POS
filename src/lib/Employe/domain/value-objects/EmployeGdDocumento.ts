export class EmployeGdDocumento {
  value: string;

  constructor(value: string) {
    this.value = value;
    this.ensureIsValid();
  }

  // employee.gd_documento: character varying(10) NOT NULL, sin default
  // (verificado por introspección de la base real "POS"). Número de RUT
  // sin dígito verificador.
  private ensureIsValid() {
    if (this.value.length > 10) {
      throw new Error("EmployeGdDocumento must be at most 10 characters");
    }
  }
}
