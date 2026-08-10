export class UserLockeduntil {
  // user_pos.lockeduntil: timestamptz NULL (bloqueo temporal por intentos fallidos).
  constructor(public readonly value: Date) {}
}
