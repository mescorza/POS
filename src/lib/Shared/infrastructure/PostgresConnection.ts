import * as dotenv from "dotenv";
import { Pool, PoolConfig } from "pg";

dotenv.config();

/**
 * Adaptador compartido de conexión a PostgreSQL.
 *
 * Punto único (composition root) desde el que cualquier repositorio
 * `Postgres<Entidad>Repository` (User, Employe, ...) obtiene su `Pool`,
 * en vez de crear uno propio por repositorio.
 *
 * Réplica en TypeScript del comportamiento del script Python de referencia:
 * si la base no está disponible, NO se lanza una excepción que tumbe la app.
 * Se registra una advertencia y `getPool()` devuelve `null`, para que cada
 * adaptador decida cómo degradar (p. ej. seguir usando el repositorio
 * in-memory) hasta que la base vuelva a estar disponible.
 */
export class PostgresConnection {
  private static pool: Pool | null = null;
  private static connecting: Promise<Pool | null> | null = null;

  private constructor() {}

  private static buildConfig(): PoolConfig {
    if (process.env.DATABASE_URL) {
      return { connectionString: process.env.DATABASE_URL };
    }

    return {
      host: process.env.PGHOST || "localhost",
      database: process.env.PGDATABASE || "postgres",
      user: process.env.PGUSER || "postgres",
      password: process.env.PGPASSWORD,
      port: Number(process.env.PGPORT) || 5432,
    };
  }

  /**
   * Inicializa (una sola vez) el pool de conexiones y verifica que se puede
   * conectar. Llamadas concurrentes reutilizan la misma promesa en curso.
   */
  static async init(): Promise<Pool | null> {
    if (this.pool) return this.pool;
    if (this.connecting) return this.connecting;

    this.connecting = this.connect();
    const pool = await this.connecting;
    this.connecting = null;

    return pool;
  }

  private static async connect(): Promise<Pool | null> {
    const candidate = new Pool(this.buildConfig());

    // pg.Pool es "perezoso": no conecta hasta la primera query. Forzamos una
    // conexión de prueba ahora para detectar el fallo de forma temprana,
    // igual que el connect() explícito del script Python.
    try {
      const client = await candidate.connect();
      client.release();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.warn(
        `ADVERTENCIA: no se pudo conectar a PostgreSQL (${message}). PostgresConnection queda sin pool disponible.`
      );
      await candidate.end().catch(() => undefined);
      this.pool = null;
      return null;
    }

    candidate.on("error", (err) => {
      // Errores async de clientes ociosos del pool (p. ej. se cae la red).
      // No relanzamos: solo lo dejamos registrado.
      console.error("Error inesperado en el pool de PostgreSQL:", err);
    });

    this.pool = candidate;
    return this.pool;
  }

  /** Devuelve el pool ya inicializado, o `null` si aún no se llamó a `init()` o si falló la conexión. */
  static getPool(): Pool | null {
    return this.pool;
  }

  static async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
    this.connecting = null;
  }
}
