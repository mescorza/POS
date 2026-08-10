import * as dotenv from "dotenv";
dotenv.config();

import { AuthSignIn } from "../../auth/application/use-cases/AuthSignIn/AuthSignIn";
import { LoginLogRepository } from "../../auth/domain/repositories/LoginLogRepository";
import { InMemoryLoginLogRepository } from "../../auth/infrastructure/InMemoryLoginLogRepository";
import { PostgresLoginLogRepository } from "../../auth/infrastructure/PostgresLoginLogRepository";
import { UserRepository } from "../../User/domain/repositories/UserRepository";
import { InMemoryUserRepository } from "../../User/infrastructure/InMemoryUserRepository";
import { PostgresUserRepository } from "../../User/infrastructure/PostgresUserRepository";

// Mismo patrón que ServiceContainer/ServiceEmployeContainer: cada container
// arma su propia instancia de repositorio (no comparten Pool entre sí),
// consistente con el resto del código aunque implique una segunda conexión.
function buildUserRepository(): UserRepository {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn(
      "ADVERTENCIA: DATABASE_URL no está configurado; ServiceAuthContainer queda en InMemoryUserRepository (sin usuarios reales para autenticar)."
    );
    return new InMemoryUserRepository();
  }

  return new PostgresUserRepository(databaseUrl);
}

function buildLoginLogRepository(): LoginLogRepository {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn(
      "ADVERTENCIA: DATABASE_URL no está configurado; ServiceAuthContainer queda en InMemoryLoginLogRepository (el log de accesos NO persiste)."
    );
    return new InMemoryLoginLogRepository();
  }

  return new PostgresLoginLogRepository(databaseUrl);
}

const userRepository = buildUserRepository();
const loginLogRepository = buildLoginLogRepository();

export const ServiceAuthContainer = {
  auth: {
    signIn: new AuthSignIn(userRepository, loginLogRepository),
  },
};
