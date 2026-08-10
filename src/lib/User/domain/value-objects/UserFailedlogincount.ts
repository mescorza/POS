export class UserFailedlogincount {
  value: number;

  constructor(value: number) {
    this.value = value;
    this.ensureIsValid();
  }

  // user_pos.failedlogincount: integer NOT NULL DEFAULT 0,
  // CHECK (failedlogincount >= 0) (ck_app_user_failed_login_count).
  private ensureIsValid() {
    if (!Number.isInteger(this.value) || this.value < 0) {
      throw new Error("UserFailedlogincount must be an integer >= 0");
    }
  }
}
