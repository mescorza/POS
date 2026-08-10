export class EmployeGdChTipoDocumentoChile {
  value: string;

  constructor(value: string) {
    this.value = value;
    this.ensureIsValid();
  }

  // employee.gd_ch_tipo_documento_chile: bigint NOT NULL, sin default.
  // Campo NetSuite (custentity_gd_ch_tipo_documento_chile): tipo de documento
  // de identidad chileno, referenciado como id de lista NetSuite.
  private ensureIsValid() {
    if (!/^[0-9]+$/.test(this.value)) {
      throw new Error("EmployeGdChTipoDocumentoChile must be a positive integer");
    }
  }
}
