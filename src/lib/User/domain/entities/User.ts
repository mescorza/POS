import { UserId } from "../value-objects/UserId";
import { UserExternalid } from "../value-objects/UserExternalid";
import { UserEmployeeid } from "../value-objects/UserEmployeeid";
import { UserEntityexternalid } from "../value-objects/UserEntityexternalid";
import { UserUserName } from "../value-objects/UserUserName";
import { UserEmail } from "../value-objects/UserEmail";
import { UserPasswordhash } from "../value-objects/UserPasswordhash";
import { UserPasswordchangedat } from "../value-objects/UserPasswordchangedat";
import { UserCreatedAt } from "../value-objects/UserCreatedAt";
import { UserLastloginat } from "../value-objects/UserLastloginat";
import { UserLastmodifiedat } from "../value-objects/UserLastmodifiedat";
import { UserFailedlogincount } from "../value-objects/UserFailedlogincount";
import { UserLockeduntil } from "../value-objects/UserLockeduntil";
import { UserIsinactive } from "../value-objects/UserIsinactive";

/**
 * Entidad de dominio mapeada 1:1 contra la tabla public.user_pos
 * (ver _v_datos/modelo_usuarios.sql). Es la cuenta/identidad de acceso al
 * POS; NO contiene datos de persona (nombre, RUT, etc.) — esos viven en
 * Employe (mapeada contra public.employee). La única relación es
 * `employeeid`, una referencia por id: User nunca embebe un Employe.
 */
export interface UserPrimitives {
  id: string;
  username: string;
  isinactive?: boolean;
  externalid?: string | null;
  employeeid?: string | null;
  entityexternalid?: string | null;
  email?: string | null;
  passwordhash?: string | null;
  passwordchangedat?: Date | null;
  createdAt?: Date;
  lastloginat?: Date | null;
  lastmodifiedat?: Date;
  failedlogincount?: number;
  lockeduntil?: Date | null;
}

export class User {
  constructor(
    public readonly id: UserId,
    public readonly username: UserUserName,
    public readonly isinactive: UserIsinactive,
    public readonly externalid: UserExternalid | null = null,
    public readonly employeeid: UserEmployeeid | null = null,
    public readonly entityexternalid: UserEntityexternalid | null = null,
    public readonly email: UserEmail | null = null,
    public readonly passwordhash: UserPasswordhash | null = null,
    public readonly passwordchangedat: UserPasswordchangedat | null = null,
    public readonly createdAt: UserCreatedAt = new UserCreatedAt(new Date()),
    public readonly lastloginat: UserLastloginat | null = null,
    public readonly lastmodifiedat: UserLastmodifiedat = new UserLastmodifiedat(new Date()),
    public readonly failedlogincount: UserFailedlogincount = new UserFailedlogincount(0),
    public readonly lockeduntil: UserLockeduntil | null = null
  ) {}

  static fromPrimitives(data: UserPrimitives): User {
    return new User(
      new UserId(data.id),
      new UserUserName(data.username),
      new UserIsinactive(data.isinactive ?? false),
      data.externalid ? new UserExternalid(data.externalid) : null,
      data.employeeid ? new UserEmployeeid(data.employeeid) : null,
      data.entityexternalid ? new UserEntityexternalid(data.entityexternalid) : null,
      data.email ? new UserEmail(data.email) : null,
      data.passwordhash ? new UserPasswordhash(data.passwordhash) : null,
      data.passwordchangedat ? new UserPasswordchangedat(data.passwordchangedat) : null,
      data.createdAt ? new UserCreatedAt(data.createdAt) : new UserCreatedAt(new Date()),
      data.lastloginat ? new UserLastloginat(data.lastloginat) : null,
      data.lastmodifiedat ? new UserLastmodifiedat(data.lastmodifiedat) : new UserLastmodifiedat(new Date()),
      data.failedlogincount !== undefined ? new UserFailedlogincount(data.failedlogincount) : new UserFailedlogincount(0),
      data.lockeduntil ? new UserLockeduntil(data.lockeduntil) : null
    );
  }

  /**
   * DTO público para respuestas HTTP. `passwordhash` se omite a propósito:
   * este método alimenta directo el JSON que devuelve ExpressUserController,
   * y el hash de clave nunca debe salir por la API.
   */
  public mapToPrimitives() {
    return {
      id: this.id.value,
      username: this.username.value,
      isinactive: this.isinactive.value,
      externalid: this.externalid?.value ?? null,
      employeeid: this.employeeid?.value ?? null,
      entityexternalid: this.entityexternalid?.value ?? null,
      email: this.email?.value ?? null,
      passwordchangedat: this.passwordchangedat?.value ?? null,
      createdAt: this.createdAt.value,
      lastloginat: this.lastloginat?.value ?? null,
      lastmodifiedat: this.lastmodifiedat.value,
      failedlogincount: this.failedlogincount.value,
      lockeduntil: this.lockeduntil?.value ?? null,
    };
  }
}
