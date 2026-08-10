import { User, UserPrimitives } from "../../../domain/entities/User";
import { UserRepository } from "../../../domain/repositories/UserRepository";

export class UserCreate {
  constructor(private repository: UserRepository) {}

  async run(data: UserPrimitives): Promise<User> {
    const user = User.fromPrimitives(data);

    await this.repository.create(user);

    return user;
  }
}
