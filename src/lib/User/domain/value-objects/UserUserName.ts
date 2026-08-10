export class UserUserName {
  value: string;

  constructor(value: string) {
    this.value = value;
    this.ensureIsValid();
  }

  // user_pos.username: varchar(100) NOT NULL, UNIQUE (case-insensitive vía índice).
  private ensureIsValid() {
    if (this.value.trim().length < 3) {
      throw new Error("UserUserName must be at least 3 characters long");
    }
  }
}
