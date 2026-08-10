import { User } from "../../domain/entities/User";
import { UserId } from "../value-objects/UserId";

export interface UserRepository {
  create(user: User): Promise<void>;
  getAll(): Promise<User[]>;
  getOneById(id: UserId): Promise<User | null>;
  /** Usado por el login (AuthSignIn): busca por username, no por id. */
  findByUsername(username: string): Promise<User | null>;
  edit(user: User): Promise<void>;
  delete(id: UserId): Promise<void>;
}

