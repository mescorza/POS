export class UserEntityexternalid {
  // user_pos.entityexternalid: character varying(300) NULL.
  // A diferencia de externalid/employeeid, esta columna es texto libre
  // (no bigint) en el esquema actual, por eso no se valida como numérica.
  constructor(public readonly value: string) {}
}
