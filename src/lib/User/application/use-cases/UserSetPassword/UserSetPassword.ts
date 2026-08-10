import * as bcrypt from "bcryptjs";
import { User } from "../../../domain/entities/User";
import { UserId } from "../../../domain/value-objects/UserId";
import { UserNotFoundError } from "../../../domain/UserNotFoundError";
import { InvalidPasswordError } from "../../../domain/InvalidPasswordError";
import { UserRepository } from "../../../domain/repositories/UserRepository";

const MIN_PASSWORD_LENGTH = 6;

/**
 * Fijar/resetear la contraseña de un usuario (pantalla de administración,
 * no el login). Separado de UserEdit a propósito: passwordhash nunca debe
 * viajar por el flujo de edición general (ver User.mapToPrimitives, que lo
 * excluye siempre de las respuestas HTTP).
 */
export class UserSetPassword {
  constructor(private repository: UserRepository) {}

  async run(id: string, newPassword: string): Promise<void> {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new InvalidPasswordError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
    }

    const user = await this.repository.getOneById(new UserId(id));

    if (!user) {
      throw new UserNotFoundError("User not found");
    }

    const passwordhash = await bcrypt.hash(newPassword, 10);

    // edit() reescribe TODAS las columnas -- se parte del registro completo
    // ya cargado (mismo patrón que AuthSignIn/F5/F6) y sólo se cambian
    // passwordhash/passwordchangedat.
    const updated = User.fromPrimitives({
      id: user.id.value,
      username: user.username.value,
      isinactive: user.isinactive.value,
      externalid: user.externalid?.value ?? null,
      employeeid: user.employeeid?.value ?? null,
      entityexternalid: user.entityexternalid?.value ?? null,
      email: user.email?.value ?? null,
      passwordhash,
      passwordchangedat: new Date(),
      createdAt: user.createdAt.value,
      lastloginat: user.lastloginat?.value ?? null,
      lastmodifiedat: user.lastmodifiedat.value,
      failedlogincount: user.failedlogincount.value,
      lockeduntil: user.lockeduntil?.value ?? null,
    });

    await this.repository.edit(updated);
  }
}
