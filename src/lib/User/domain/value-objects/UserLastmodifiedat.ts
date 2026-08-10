export class UserLastmodifiedat {
  // user_pos.lastmodifiedat: timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
  // (el trigger trg_app_user_last_modified la actualiza en cada UPDATE).
  constructor(public readonly value: Date) {}
}
