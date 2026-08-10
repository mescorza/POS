import { Pool } from "pg";
import { LoginLogEntry, LoginLogRepository } from "../domain/repositories/LoginLogRepository";

export class PostgresLoginLogRepository implements LoginLogRepository {
  client: Pool;

  constructor(databaseUrl: string) {
    this.client = new Pool({
      connectionString: databaseUrl,
    });
  }

  async record(entry: LoginLogEntry): Promise<void> {
    await this.client.query({
      text: `INSERT INTO login_log (username, userid, success, reason)
        VALUES ($1, $2, $3, $4)`,
      values: [entry.username, entry.userId, entry.success, entry.reason],
    });
  }
}
