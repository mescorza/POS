import { User } from "../domain/entities/User";
import { UserId } from "../domain/value-objects/UserId";
import { UserRepository } from "../domain/repositories/UserRepository";

export class InMemoryUserRepository implements UserRepository {
  private users: User[] = [];

  async create(user: User): Promise<void> {
    this.users.push(user);
  }

  async getAll(): Promise<User[]> {
    return this.users;
  }

  async getOneById(id: UserId): Promise<User | null> {
    return this.users.find((user) => user.id.value === id.value) || null;
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.users.find((user) => user.username.value === username) || null;
  }

  async edit(user: User): Promise<void> {
    const index = this.users.findIndex((u) => u.id.value == user.id.value);
    this.users[index] = user;
  }

  async delete(id: UserId): Promise<void> {
    this.users = this.users.filter((user) => user.id.value !== id.value);
  }
}
