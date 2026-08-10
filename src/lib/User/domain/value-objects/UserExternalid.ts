export class UserExternalid {
  value: string;

  constructor(value: string) {
    this.value = value;
    this.ensureIsValid();
  }

  // user_pos.externalid: bigint NULL. Sólo se instancia cuando hay valor
  // (correlación con NetSuite); la nulidad se maneja en la entidad (externalid | null).
  private ensureIsValid() {
    if (!/^[0-9]+$/.test(this.value)) {
      throw new Error("UserExternalid must be a positive integer (NetSuite internal id)");
    }
  }
}
