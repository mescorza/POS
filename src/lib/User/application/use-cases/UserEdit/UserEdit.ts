import { User, UserPrimitives } from "../../../domain/entities/User";
import { UserNotFoundError } from "../../../domain/UserNotFoundError";
import { UserRepository } from "../../../domain/repositories/UserRepository";

export class UserEdit {
  constructor(private repository: UserRepository) {}

  async run(data: UserPrimitives): Promise<void> {
    const user = User.fromPrimitives(data);

    const userExists = await this.repository.getOneById(user.id);

    if (!userExists) throw new UserNotFoundError("User not found");

    return this.repository.edit(user);
  }
}
