import { User } from "../../../domain/entities/User";
import { UserRepository } from "../../../domain/repositories/UserRepository";

export class UserGetAll {
  constructor(private repository: UserRepository) {}

  async run(): Promise<User[]> {
    return this.repository.getAll();
  }
}
