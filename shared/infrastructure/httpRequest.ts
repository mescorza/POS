/**
 * Cliente HTTP mínimo para los gateways del frontend. Su objetivo es que un
 * fallo llegue a la pantalla con un mensaje que EXPLIQUE la causa, no un
 * "(404)" pelado:
 *  - si el backend respondió con { message }, se muestra ese mensaje (es una
 *    regla de negocio o una validación, p. ej. "R.U.T. inválido…");
 *  - si no (p. ej. el 404 HTML de Express cuando la ruta no existe), se
 *    traduce el código HTTP a una explicación y una acción sugerida;
 *  - si ni siquiera hubo respuesta, se explica que no hay conexión.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

function explain(status: number, method: string, path: string): string {
  const ruta = `${method} ${path.split("?")[0]}`;
  switch (status) {
    case 404:
      return (
        `El servidor no reconoce la ruta ${ruta} (404). ` +
        "Casi siempre significa que el backend que está corriendo es una versión anterior, sin esta función. " +
        "Deténgalo (Ctrl+C) y vuelva a iniciarlo con «npm run dev»."
      );
    case 400:
      return `El servidor rechazó la solicitud ${ruta} por datos inválidos (400).`;
    case 401:
    case 403:
      return `El servidor no autorizó la solicitud ${ruta} (${status}).`;
    case 503:
      return "El backend no tiene conexión con la base de datos (503). Revise DATABASE_URL en el archivo .env y que Postgres esté corriendo.";
    default:
      return status >= 500
        ? `Error interno del servidor al ejecutar ${ruta} (${status}). El detalle está en la consola donde corre el backend.`
        : `El servidor respondió ${status} a la solicitud ${ruta}.`;
  }
}

export async function httpJson<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new HttpError(
      0,
      "No se pudo conectar con el servidor. Verifique que el backend esté corriendo (npm run dev, puerto 3000)."
    );
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message = typeof data?.message === "string" && data.message ? data.message : explain(response.status, method, path);
    throw new HttpError(response.status, message);
  }

  return response.json() as Promise<T>;
}
