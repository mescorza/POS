import { User } from "../../domain/User";
import { UserCreatedAt } from "../../../domain/value-objects/UserCreatedAt";
import { UserEmail } from "../../../domain/value-objects/UserEmail";
import { UserId } from "../../../domain/value-objects/UserId";
import { UserName } from "../../../domain/value-objects/UserName";
import { UserNotFoundError } from "../../../domain/UserNotFoundError";
import { UserRepository } from "../../../domain/repositories/UserRepository";

export class UserEdit {
  constructor(private repository: UserRepository) {}

  async run(
    id: string,
    name: string,
    email: string,
    createdAt: Date
  ): Promise<void> {
    const user = new User(
      new UserId(id),
      new UserName(name),
      new UserEmail(email),
      new UserCreatedAt(createdAt)
    );

    const userExists = await this.repository.getOneById(user.id);

    if (!userExists) throw new UserNotFoundError("User not found");

    return this.repository.edit(user);
  }
}
