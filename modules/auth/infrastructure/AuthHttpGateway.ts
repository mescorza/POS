/**
 * Adaptador de entrada del módulo auth hacia POST /auth/login
 * (ExpressAuthRouter -> ServiceAuthContainer.auth.signIn), mismo patrón que
 * UserHttpGateway/EmployeHttpGateway.
 */
export interface AuthSession {
  id: string;
  username: string;
  employeeid: string | null;
}

export class AuthInvalidCredentialsHttpError extends Error {}

export class AuthHttpGateway {
  async login(username: string, password: string): Promise<AuthSession> {
    const response = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (response.status === 401) {
      const body = await response.json().catch(() => null);
      throw new AuthInvalidCredentialsHttpError(body?.message ?? "Usuario o contraseña incorrectos");
    }

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.message ?? `No se pudo iniciar sesión (HTTP ${response.status})`);
    }

    return response.json();
  }
}
