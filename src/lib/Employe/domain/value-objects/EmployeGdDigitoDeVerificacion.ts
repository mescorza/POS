export class EmployeGdDigitoDeVerificacion {
  value: string;

  constructor(value: string) {
    this.value = value;
    this.ensureIsValid();
  }

  // employee.gd_digito_de_verificacion: character varying(1) NOT NULL, sin
  // default (verificado por introspección de la base real "POS"; el modelo
  // en _v_datos/modelo_usuarios.sql no la documenta y la había modelado
  // antes como arreglo por error). Dígito verificador del RUT.
  private ensureIsValid() {
    if (this.value.length > 1) {
      throw new Error("EmployeGdDigitoDeVerificacion must be at most 1 character");
    }
  }
}
