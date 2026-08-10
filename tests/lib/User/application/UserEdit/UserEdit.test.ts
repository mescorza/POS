import { UserEdit } from "src/lib/User/application/use-cases/UserEdit/UserEdit";
import { InMemoryUserRepository } from "../../__mocks__/InMemoryUserRepository";
import { UserStub } from "../../domain/UserStub";

describe("UserEdit should", () => {
  test("edit a user", async () => {
    const user = UserStub.create();

    const repository = new InMemoryUserRepository([user]);
    const editUseCase = new UserEdit(repository);

    const usersBefore = await repository.getAll();

    expect(usersBefore).toHaveLength(1);

    const newUser = UserStub.create();

    const newUsername = newUser.username.value;
    const newEmail = newUser.email?.value;

    await editUseCase.run({
      id: user.id.value,
      username: newUsername,
      isinactive: user.isinactive.value,
      email: newEmail,
      createdAt: user.createdAt.value,
    });

    const usersAfter = await repository.getAll();

    expect(usersAfter).toHaveLength(1);

    const editedUser = usersAfter[0];

    expect(editedUser.id.value).toBe(user.id.value);
    expect(editedUser.username.value).toBe(newUsername);
    expect(editedUser.email?.value).toBe(newEmail);
  });
});
