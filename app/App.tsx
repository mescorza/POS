import * as React from "react";
import { MainMenuPage } from "../shared/ui/shell/MainMenuPage";
import { UserMaintenancePage } from "../modules/user/ui/react/UserMaintenancePage";
import { EmployeListPage } from "../modules/employe/ui/react/EmployeListPage";
import { LoginPage } from "../modules/auth/ui/react/LoginPage";
import { AuthSession } from "../modules/auth/infrastructure/AuthHttpGateway";
import { InformesPage } from "../modules/informes/ui/react/InformesPage";

import { ProveedorMaintenancePage } from "../modules/proveedor/ui/react/ProveedorMaintenancePage";

type Screen = "menu" | "users" | "employees" | "informes" | "suppliers";

// Composition root del shell POS. El formulario inicial sólo entrega la
// opción confirmada (regla 1A.2); este componente decide qué pantalla
// mostrar. Usuarios y Empleados cuelgan de 00 Administración del Sistema;
// Estado de sincronización queda pendiente de su propia ventana; Cierre de
// sesión vuelve al login. Las opciones se identifican por `action`, no por
// código, para que renumerar el menú no rompa el ruteo.
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

  if (screen === "informes") {
    return <InformesPage onBack={() => setScreen("menu")} />;
  }

  if (screen === "suppliers") {
    return <ProveedorMaintenancePage onBack={() => setScreen("menu")} userId={session.id} />;
  }

  return (
    <MainMenuPage
      user={session.username}
      onOptionConfirmed={(option) => {
        if (option.action === "users") {
          setScreen("users");
        } else if (option.action === "employees") {
          setScreen("employees");
        } else if (option.action === "suppliers") {
          setScreen("suppliers");
        } else if (option.action === "signout") {
          setSession(null);
        } else if (option.action === "informes") {
          setScreen("informes");
        }
      }}
    />
  );
}
