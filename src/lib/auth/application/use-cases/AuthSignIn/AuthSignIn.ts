import * as bcrypt from "bcryptjs";
import { UserRepository } from "../../../../User/domain/repositories/UserRepository";
import { User } from "../../../../User/domain/entities/User";
import { LoginLogRepository } from "../../../domain/repositories/LoginLogRepository";
import { AuthInvalidCredentialsError } from "../../../domain/AuthInvalidCredentialsError";

export interface AuthSignInResult {
  id: string;
  username: string;
  employeeid: string | null;
}

/**
 * Login por username + password (35.3 del documento: "se ingresará con
 * usuario 'administracion'"). Registra SIEMPRE un intento en login_log,
 * exitoso o fallido -- el motivo del rechazo (usuario inexistente, inactivo,
 * sin password seteado, password incorrecta) queda en el log para auditoría,
 * pero nunca se lo decimos al cliente (siempre el mismo error genérico) para
 * no filtrar por enumeración si un username existe o no.
 */
export class AuthSignIn {
  constructor(
    private userRepository: UserRepository,
    private loginLogRepository: LoginLogRepository
  ) {}

  async run(username: string, password: string): Promise<AuthSignInResult> {
    const user = await this.userRepository.findByUsername(username);

    if (!user) {
      await this.loginLogRepository.record({
        username,
        userId: null,
        success: false,
        reason: "unknown_username",
      });
      throw new AuthInvalidCredentialsError();
    }

    if (user.isinactive.value) {
      await this.loginLogRepository.record({
        username,
        userId: user.id.value,
        success: false,
        reason: "inactive_user",
      });
      throw new AuthInvalidCredentialsError();
    }

    if (!user.passwordhash) {
      await this.loginLogRepository.record({
        username,
        userId: user.id.value,
        success: false,
        reason: "no_password_set",
      });
      throw new AuthInvalidCredentialsError();
    }

    const matches = await bcrypt.compare(password, user.passwordhash.value);

    if (!matches) {
      await this.loginLogRepository.record({
        username,
        userId: user.id.value,
        success: false,
        reason: "invalid_password",
      });
      throw new AuthInvalidCredentialsError();
    }

    await this.loginLogRepository.record({
      username,
      userId: user.id.value,
      success: true,
      reason: null,
    });

    // edit() reescribe TODAS las columnas (mismo patrón que UserEdit/F5 en
    // la UI): se parte del registro completo ya cargado -- incluido el
    // propio passwordhash -- y sólo se cambia lastloginat, para no perder
    // nada al dejar constancia del último ingreso.
    const updated = User.fromPrimitives({
      id: user.id.value,
      username: user.username.value,
      isinactive: user.isinactive.value,
      externalid: user.externalid?.value ?? null,
      employeeid: user.employeeid?.value ?? null,
      entityexternalid: user.entityexternalid?.value ?? null,
      email: user.email?.value ?? null,
      passwordhash: user.passwordhash.value,
      passwordchangedat: user.passwordchangedat?.value ?? null,
      createdAt: user.createdAt.value,
      lastloginat: new Date(),
      lastmodifiedat: user.lastmodifiedat.value,
      failedlogincount: user.failedlogincount.value,
      lockeduntil: user.lockeduntil?.value ?? null,
    });

    await this.userRepository.edit(updated);

    return {
      id: user.id.value,
      username: user.username.value,
      employeeid: user.employeeid?.value ?? null,
    };
  }
}
