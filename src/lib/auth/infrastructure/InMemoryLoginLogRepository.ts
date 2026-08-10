import { LoginLogEntry, LoginLogRepository } from "../domain/repositories/LoginLogRepository";

/** Fallback cuando no hay DATABASE_URL (mismo patrón que InMemoryUserRepository). */
export class InMemoryLoginLogRepository implements LoginLogRepository {
  entries: LoginLogEntry[] = [];

  async record(entry: LoginLogEntry): Promise<void> {
    this.entries.push(entry);
  }
}
