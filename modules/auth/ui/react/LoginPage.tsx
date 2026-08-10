import * as React from "react";
import { PosTerminalShell } from "../../../../shared/ui/pos-terminal/PosTerminalShell";
import { PosFunctionKeyBar } from "../../../../shared/ui/pos-terminal/PosFunctionKeyBar";
import { PosField } from "../../../../shared/ui/pos-terminal/PosField";
import {
  AuthHttpGateway,
  AuthInvalidCredentialsHttpError,
  AuthSession,
} from "../../infrastructure/AuthHttpGateway";

/**
 * Pantalla de ingreso al sistema: usuario + contraseña, paso previo al
 * formulario inicial de opciones. POST /auth/login (AuthSignIn) valida
 * contra user_pos.passwordhash y deja constancia SIEMPRE en login_log
 * (éxito o fallo). La sesión resultante sólo bloquea la pantalla (no hay
 * token exigido en el resto de los endpoints todavía) -- "Cierre de sesión"
 * (opción 05 del menú) vuelve acá.
 *
 * Enter se maneja a mano vía onKeyDown en el contenedor (NO con un <form
 * onSubmit> nativo): con dos campos de texto y sin un <button> visible, la
 * "implicit submission" del estándar HTML no dispara con Enter (sólo
 * funciona nativamente si hay un único campo). Mismo patrón que el resto de
 * las pantallas (MainMenuPage, UserMaintenancePage, etc.), que tampoco usan
 * formularios nativos, sólo onKeyDown.
 */
export interface LoginPageProps {
  onSuccess: (session: AuthSession) => void;
}

const gateway = new AuthHttpGateway();

export function LoginPage({ onSuccess }: LoginPageProps) {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const bodyRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bodyRef.current?.focus();
  }, []);

  const submit = async () => {
    if (!username.trim() || !password) {
      setError("Ingrese usuario y contraseña.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const session = await gateway.login(username.trim(), password);
      onSuccess(session);
    } catch (e) {
      setPassword("");
      if (e instanceof AuthInvalidCredentialsHttpError) {
        setError(e.message);
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  };

  return (
    <PosTerminalShell>
      <div className="pos-operational-header">
        <span style={{ fontWeight: "bold", color: "var(--pos-fg)" }}>ADRIAZOLA REPUESTOS</span>
        <span style={{ fontWeight: "bold", color: "var(--pos-fg)" }}>INGRESO AL SISTEMA</span>
        <span style={{ fontWeight: "bold", color: "var(--pos-fg)" }}>POS TIENDA</span>
      </div>
      <div className="pos-terminal-body" tabIndex={0} onKeyDown={handleKeyDown} ref={bodyRef}>
        <p style={{ margin: "0 0 16px" }}>Ingrese usuario y contraseña para continuar.</p>

        <PosField label="Usuario" value={username} onChange={setUsername} autoFocus />
        <PosField label="Contraseña" value={password} onChange={setPassword} type="password" />

        {error && <p style={{ color: "var(--pos-fg-highlight)", marginTop: 12 }}>{error}</p>}
        {submitting && <p style={{ marginTop: 12 }}>Verificando...</p>}
      </div>
      <PosFunctionKeyBar keys={[{ key: "Enter", label: "Ingresar" }]} />
    </PosTerminalShell>
  );
}
