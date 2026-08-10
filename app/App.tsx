import * as React from "react";
import { MainMenuPage } from "../shared/ui/shell/MainMenuPage";
import { UserMaintenancePage } from "../modules/user/ui/react/UserMaintenancePage";
import { EmployeListPage } from "../modules/employe/ui/react/EmployeListPage";
import { LoginPage } from "../modules/auth/ui/react/LoginPage";
import { AuthSession } from "../modules/auth/infrastructure/AuthHttpGateway";

type Screen = "menu" | "users" | "employees";

// Composition root del shell POS. El formulario inicial sólo entrega la
// opción confirmada (regla 1A.2); este componente decide qué pantalla
// mostrar. 02 (User) y 03 (Employe) ya tienen destino real; 04 queda
// pendiente de su propia ventana; 05 cierra la sesión y vuelve al login.
//
// La sesión (AuthSignIn) sólo bloquea esta pantalla: mientras no hay
// `session`, lo único que se puede ver es LoginPage. No hay token exigido
// en /users, /employe, etc. todavía -- decisión explícita para no tocar
// todos los routers existentes en esta primera etapa.
export function App() {
  const [session, setSession] = React.useState<AuthSession | null>(null);
  const [screen, setScreen] = React.useState<Screen>("menu");

  if (!session) {
    return <LoginPage onSuccess={setSession} />;
  }

  if (screen === "users") {
    return <UserMaintenancePage onBack={() => setScreen("menu")} />;
  }

  if (screen === "employees") {
    return <EmployeListPage onBack={() => setScreen("menu")} />;
  }

  return (
    <MainMenuPage
      user={session.username}
      onOptionConfirmed={(option) => {
        if (option.code === "02") {
          setScreen("users");
        } else if (option.code === "03") {
          setScreen("employees");
        } else if (option.code === "05") {
          setSession(null);
        }
      }}
    />
  );
}
