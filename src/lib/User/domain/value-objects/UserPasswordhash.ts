export class UserPasswordhash {
  value: string;

  constructor(value: string) {
    this.value = value;
    this.ensureIsValid();
  }

  // user_pos.passwordhash: varchar(255) NULL. Debe llegar ya hasheado
  // (bcrypt/argon2, etc.) desde la capa de seguridad; el dominio no conoce
  // el algoritmo, sólo exige que no esté vacío cuando se instancia.
  private ensureIsValid() {
    if (this.value.trim().length === 0) {
      throw new Error("UserPasswordhash cannot be empty");
    }
  }
}
