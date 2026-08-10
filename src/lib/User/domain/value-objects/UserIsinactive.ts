export class UserIsinactive {
  // user_pos.isinactive: boolean NOT NULL DEFAULT false.
  // (antes esta VO envolvía un string sin relación con el tipo real de la columna)
  constructor(public readonly value: boolean) {}
}
