import * as dotenv from "dotenv";
dotenv.config();

import { UserGetAll } from "../../User/application/use-cases/UserGetAll/UserGetAll";
import { UserGetOneById } from "../../User/application/use-cases/UserGetOneById/UserGetOneById";
import { UserCreate } from "../../User/application/use-cases/UserCreate/UserCreate";
import { UserEdit } from "../../User/application/use-cases/UserEdit/UserEdit";
import { UserDelete } from "../../User/application/use-cases/UserDelete/UserDelete";
import { UserSetPassword } from "../../User/application/use-cases/UserSetPassword/UserSetPassword";
import { UserRepository } from "../../User/domain/repositories/UserRepository";
import { InMemoryUserRepository } from "../../User/infrastructure/InMemoryUserRepository";
import { PostgresUserRepository } from "../../User/infrastructure/PostgresUserRepository";

function buildUserRepository(): UserRepository {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn(
      "ADVERTENCIA: DATABASE_URL no está configurado; ServiceContainer.user queda en InMemoryUserRepository (los datos NO persisten)."
    );
    return new InMemoryUserRepository();
  }

  return new PostgresUserRepository(databaseUrl);
}

const userRepository = buildUserRepository();

export const ServiceContainer = {
  user: {
    getAll: new UserGetAll(userRepository),
    getOneById: new UserGetOneById(userRepository),
    create: new UserCreate(userRepository),
    edit: new UserEdit(userRepository),
    delete: new UserDelete(userRepository),
    setPassword: new UserSetPassword(userRepository),
  },
};
