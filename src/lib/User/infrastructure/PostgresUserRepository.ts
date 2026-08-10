import { Pool } from "pg";
import { UserRepository } from "../domain/repositories/UserRepository";
import { User } from "../domain/entities/User";
import { UserId } from "../domain/value-objects/UserId";

type PostgresUserPosRow = {
  id: string;
  externalid: string | null;
  employeeid: string | null;
  entityexternalid: string | null;
  username: string;
  email: string | null;
  passwordhash: string | null;
  passwordchangedat: Date | null;
  createdat: Date;
  lastloginat: Date | null;
  lastmodifiedat: Date;
  failedlogincount: number;
  lockeduntil: Date | null;
  isinactive: boolean;
};

export class PostgresUserRepository implements UserRepository {
  client: Pool;

  constructor(databaseUrl: string) {
    this.client = new Pool({
      connectionString: databaseUrl,
    });
  }

  async create(user: User): Promise<void> {
    const query = {
      text: `INSERT INTO user_pos
        (id, externalid, employeeid, entityexternalid, username, email, passwordhash,
         passwordchangedat, createdat, lastloginat, lastmodifiedat, failedlogincount,
         lockeduntil, isinactive)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      values: [
        user.id.value,
        user.externalid?.value ?? null,
        user.employeeid?.value ?? null,
        user.entityexternalid?.value ?? null,
        user.username.value,
        user.email?.value ?? null,
        user.passwordhash?.value ?? null,
        user.passwordchangedat?.value ?? null,
        user.createdAt.value,
        user.lastloginat?.value ?? null,
        user.lastmodifiedat.value,
        user.failedlogincount.value,
        user.lockeduntil?.value ?? null,
        user.isinactive.value,
      ],
    };

    await this.client.query(query);
  }

  async getAll(): Promise<User[]> {
    const result = await this.client.query<PostgresUserPosRow>({
      text: "SELECT * FROM user_pos",
    });

    return result.rows.map((row) => this.mapToDomain(row));
  }

  async getOneById(id: UserId): Promise<User | null> {
    const result = await this.client.query<PostgresUserPosRow>({
      text: "SELECT * FROM user_pos WHERE id = $1",
      values: [id.value],
    });

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToDomain(result.rows[0]);
  }

  async findByUsername(username: string): Promise<User | null> {
    const result = await this.client.query<PostgresUserPosRow>({
      text: "SELECT * FROM user_pos WHERE username = $1",
      values: [username],
    });

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToDomain(result.rows[0]);
  }

  async edit(user: User): Promise<void> {
    const query = {
      text: `UPDATE user_pos SET
        externalid = $1, employeeid = $2, entityexternalid = $3, username = $4,
        email = $5, passwordhash = $6, passwordchangedat = $7, lastloginat = $8,
        lastmodifiedat = $9, failedlogincount = $10, lockeduntil = $11, isinactive = $12
        WHERE id = $13`,
      values: [
        user.externalid?.value ?? null,
        user.employeeid?.value ?? null,
        user.entityexternalid?.value ?? null,
        user.username.value,
        user.email?.value ?? null,
        user.passwordhash?.value ?? null,
        user.passwordchangedat?.value ?? null,
        user.lastloginat?.value ?? null,
        user.lastmodifiedat.value,
        user.failedlogincount.value,
        user.lockeduntil?.value ?? null,
        user.isinactive.value,
        user.id.value,
      ],
    };

    await this.client.query(query);
  }

  async delete(id: UserId): Promise<void> {
    const query = {
      text: "DELETE FROM user_pos WHERE id = $1",
      values: [id.value],
    };

    await this.client.query(query);
  }

  private mapToDomain(row: PostgresUserPosRow): User {
    return User.fromPrimitives({
      id: String(row.id),
      username: row.username,
      isinactive: row.isinactive,
      externalid: row.externalid !== null ? String(row.externalid) : null,
      employeeid: row.employeeid !== null ? String(row.employeeid) : null,
      entityexternalid: row.entityexternalid,
      email: row.email,
      passwordhash: row.passwordhash,
      passwordchangedat: row.passwordchangedat,
      createdAt: row.createdat,
      lastloginat: row.lastloginat,
      lastmodifiedat: row.lastmodifiedat,
      failedlogincount: row.failedlogincount,
      lockeduntil: row.lockeduntil,
    });
  }
}
