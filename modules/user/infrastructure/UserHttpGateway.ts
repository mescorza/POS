/**
 * Adaptador de entrada del módulo User hacia la API Express existente
 * (ExpressUserRouter -> ServiceContainer.user), tal como recomienda 35.3.3
 * del documento de arquitectura: React consume la API HTTP ya cableada en
 * vez de duplicar casos de uso en el proceso de UI.
 */
export interface UserListItem {
  id: string;
  username: string;
  isinactive: boolean;
  email: string | null;
  createdAt: string;
}

export interface SaveUserInput {
  id: string;
  username: string;
  email?: string | null;
  isinactive?: boolean;
  // Preservados desde getById al editar, para no pisarlos con undefined
  // (PostgresUserRepository.edit() actualiza TODAS las columnas). No incluye
  // passwordhash: la API nunca lo devuelve y hoy nada en la app lo setea.
  externalid?: string | null;
  employeeid?: string | null;
  entityexternalid?: string | null;
  passwordchangedat?: string | null;
  lastloginat?: string | null;
  failedlogincount?: number;
  lockeduntil?: string | null;
}

export type UserDetail = UserListItem & Pick<
  SaveUserInput,
  "externalid" | "employeeid" | "entityexternalid" | "passwordchangedat" | "lastloginat" | "failedlogincount" | "lockeduntil"
> & {
  lastmodifiedat: string;
};

export class UserHttpGateway {
  async search(): Promise<UserListItem[]> {
    const response = await fetch("/users");

    if (!response.ok) {
      throw new Error(`No se pudo obtener la lista de usuarios (HTTP ${response.status})`);
    }

    return response.json();
  }

  /** GET /users/:id -> UserGetOneById. Trae el registro completo (salvo passwordhash). */
  async getById(id: string): Promise<UserDetail> {
    const response = await fetch(`/users/${id}`);

    if (!response.ok) {
      throw new Error(`No se pudo obtener el usuario ${id} (HTTP ${response.status})`);
    }

    return response.json();
  }

  /** POST /users -> UserCreate. */
  async create(input: SaveUserInput): Promise<UserListItem> {
    const response = await fetch("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.message ?? `No se pudo crear el usuario (HTTP ${response.status})`);
    }

    return response.json();
  }

  /** PUT /users -> UserEdit. El id va en el body (el router no usa :id en PUT). */
  async edit(input: SaveUserInput): Promise<void> {
    const response = await fetch("/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.message ?? `No se pudo editar el usuario (HTTP ${response.status})`);
    }
  }

  /**
   * PUT /users/:id/password -> UserSetPassword. Endpoint separado de edit()
   * a propósito: passwordhash nunca viaja por el flujo de edición general.
   */
  async setPassword(id: string, password: string): Promise<void> {
    const response = await fetch(`/users/${id}/password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.message ?? `No se pudo fijar la contraseña (HTTP ${response.status})`);
    }
  }
}
