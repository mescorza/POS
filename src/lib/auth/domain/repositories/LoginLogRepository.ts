/**
 * Mapeado 1:1 contra public.login_log. Se registra CADA intento de ingreso
 * (exitoso o fallido) — es la traza de auditoría de acceso al POS, no sólo
 * de los logins que resultaron bien.
 */
export interface LoginLogEntry {
  username: string;
  userId: string | null;
  success: boolean;
  reason: string | null;
}

export interface LoginLogRepository {
  record(entry: LoginLogEntry): Promise<void>;
}
