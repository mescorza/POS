import { UserCreate } from "src/lib/User/application/use-cases/UserCreate/UserCreate";
import { InMemoryUserRepository } from "../../__mocks__/InMemoryUserRepository";
import { UserStub } from "../../domain/UserStub";

describe("UserCreate should", () => {
  test("create a user", async () => {
    const repository = new InMemoryUserRepository();
    const useCase = new UserCreate(repository);

    const user = UserStub.create();

    await useCase.run({
      id: user.id.value,
      username: user.username.value,
      isinactive: user.isinactive.value,
      email: user.email?.value,
      createdAt: user.createdAt.value,
    });

    const users = await repository.getAll();

    expect(users).toHaveLength(1);

    const createdUser = users[0];

    expect(createdUser.id.value).toBe(user.id.value);
    expect(createdUser.username.value).toBe(user.username.value);
    expect(createdUser.email?.value).toBe(user.email?.value);
  });
});
