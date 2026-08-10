import { User } from "src/lib/User/domain/entities/User";
import { randEmail, randNumber, randUserName } from "@ngneat/falso";

export class UserStub {
  static create(): User {
    return User.fromPrimitives({
      id: String(randNumber({ min: 1, max: 999999999 })),
      username: this.createSafeUsername(),
      isinactive: false,
      email: randEmail(),
      createdAt: new Date(),
    });
  }

  static createSafeUsername(): string {
    const username = randUserName();
    if (username.length < 3) return this.createSafeUsername();
    return username;
  }
}
