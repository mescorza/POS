# Estado construido — Persistencia Postgres + UI de Usuarios/Empleados

Este documento registra, con fecha de corte, lo que efectivamente existe y funciona en el repositorio a partir de `POS_Registro_Venta_Arquitectura_Hexagonal_USUARIOS_V1.docx` y `_v_datos/modelo_usuarios.sql`. Complementa `docs/ARCHITECTURE.md` (que describe el patrón hexagonal en general) con el detalle de la conexión real a Postgres, el remapeo de dominio y el shell de UI. Se actualiza a medida que se construye más.

## 1. Resumen ejecutivo

- `User` y `Employe` dejaron de estar sólo en memoria: ambos tienen repositorio Postgres real, probado contra la base `POS`, y `ServiceContainer`/`ServiceEmployeContainer` los usan por defecto.
- El dominio de ambos módulos se remapeó **columna por columna** contra las tablas reales (`user_pos`, `employee`), verificadas por introspección directa de la base — no sólo contra `modelo_usuarios.sql`, que resultó estar desactualizado respecto a lo desplegado.
- Se encontró y corrigió un bug real en la base de datos (triggers de `updated_at`/`last_modified_at`) que bloqueaba todo `UPDATE` en 7 tablas.
- Existe un primer shell de frontend (React + TypeScript + Vite, sin Tauri todavía) con el formulario inicial de opciones (estilo COBOL) y las pantallas de Usuarios y Empleados: listar, crear y editar, ambas contra la API real.

## 2. Conexión a base de datos

- `src/lib/Shared/infrastructure/PostgresConnection.ts`: adaptador compartido con `Pool` de `pg`. Si la conexión falla al iniciar, no lanza excepción — loguea advertencia y `getPool()` devuelve `null` (mismo espíritu resiliente que el script Python de referencia que motivó esto). Aún no está consumido por ningún repositorio (`PostgresUserRepository`/`PostgresEmployeRepository` siguen creando su propio `Pool` vía `databaseUrl`, patrón heredado del código original); queda como candidato a unificar más adelante.
- `.env` (no versionado) / `.env.example`:
  ```
  DATABASE_URL="postgresql://postgres:<password>@localhost:5432/POS"
  PGHOST=localhost
  PGPORT=5432
  PGDATABASE=POS
  PGUSER=postgres
  PGPASSWORD=<password>
  ```
- **La base se llama `POS`, no `postgres`** (el default de PostgreSQL). Ahí ya existen las 10 tablas de `modelo_usuarios.sql`: `entity, subsidiary, department, role, permission, employee, user_pos, rolepermission, employeerole, employeedepartment`.

## 3. Hallazgo: `employee` real ≠ `modelo_usuarios.sql`

Al introspeccionar `information_schema.columns` de la base `POS`, la tabla `employee` real trae 14 columnas que el script SQL del proyecto no documenta — llegaron por otra vía (probablemente sincronización NetSuite, a juzgar por los nombres):

```
email_address_notif, gd_ch_tipo_documento_chile, gd_digito_de_verificacion,
ar_id_empleado, title, salesrole, phone, gd_documento, officephone,
mobilephone, middlename, initials, employeestatus, username
```

Tres son `NOT NULL` sin default: `gd_ch_tipo_documento_chile` (bigint), `gd_digito_de_verificacion` (varchar[]), `gd_documento` (varchar[]) — toda fila nueva debe traerlas. `user_pos`, en cambio, coincide 100% con el SQL.

Decisión tomada (explícita del usuario): **la base manda**. El dominio `Employe` se extendió para cubrir las 28 columnas reales sin quitar los campos que ya existían en el código (`name`, `initials`, `custentityGdDocumento`, `custentityGdDigitoDeVerificacion`, `username`), aunque varios de ellos no tengan columna propia confirmada — quedan como campos de dominio no persistidos por `PostgresEmployeRepository` hasta que se aclare su destino final.

## 4. Bug de base de datos encontrado y corregido

Las funciones trigger `set_updated_at()` y `set_app_user_last_modified()` (tal como están escritas en `modelo_usuarios.sql`, y así desplegadas en `POS`) referenciaban columnas con guión bajo (`updated_at`, `last_modified_at`) que no existen — las columnas reales son `updatedat`/`lastmodifiedat`, sin guión. Esto rompía **cualquier `UPDATE`** en `department, employee, entity, permission, role, subsidiary` (vía `set_updated_at`) y en `user_pos` (vía `set_app_user_last_modified`).

Se corrigió con `CREATE OR REPLACE FUNCTION` apuntando a los nombres reales — no se tocaron tablas ni datos. Si se vuelve a aplicar `modelo_usuarios.sql` desde cero en otra base, hay que aplicar el mismo fix o corregir el `.sql` fuente.

## 5. Dominio `User` ↔ `user_pos`

`src/lib/User/domain/entities/User.ts` mapea 1:1 las 14 columnas de `user_pos`: `id, externalid, employeeid, entityexternalid, username, email, passwordhash, passwordchangedat, createdat, lastloginat, lastmodifiedat, failedlogincount, lockeduntil, isinactive`.

- `employeeid` es la única relación con `Employe` — por id, nunca se embebe la entidad.
- `passwordhash` se excluye a propósito de `mapToPrimitives()` (el DTO que alimenta las respuestas HTTP): nunca debe salir por la API. Nada en la app lo setea todavía (login/auth sigue incompleto, ver ARCHITECTURE.md §10).
- `User.fromPrimitives(data)` es el único punto de construcción a partir de datos externos; lo usan `UserCreate`, `UserEdit` y `PostgresUserRepository.mapToDomain`.
- IDs (`UserId`, `EmployeId`) validan que sean enteros positivos (reflejando `bigint`), pero **no los genera Postgres todavía** — los sigue proveyendo quien llama (el frontend genera uno con `Date.now()`). Sigue pendiente decidir si se pasa a `GENERATED ALWAYS`/identity real.

Se dejaron sin usar (no se borraron; no hay git en este repo, borrar sería irreversible) los Value Objects huérfanos de una versión anterior del dominio `User` que no correspondían a `user_pos`: `UserFirstname`, `UserLastname`, `UserInitials`, `UserEntityid`, `UserCustentity_gd_documento`, `UserCustentity_gd_digito_de_verificacion`, `UserName`. Candidatos a limpieza futura junto con `User_mio.ts` y los demás duplicados que ya señalaba ARCHITECTURE.md §10.

## 6. Dominio `Employe` ↔ `employee`

`src/lib/Employe/domain/entities/Employe.ts` cubre las 28 columnas reales. Construcción vía objeto de props (`EmployeProps`) en vez de constructor posicional — con ~30 campos, posicional dejó de ser manejable.

Tres campos son obligatorios porque la columna es `NOT NULL` sin default: `gdChTipoDocumentoChile` (string), `gdDigitoDeVerificacion` (string[]), `gdDocumento` (string[]). El formulario POS todavía no captura RUT, así que `EmployeHttpGateway.create()` los completa con placeholders (`"1"`, `[]`, `[]`) — **pero al editar, la pantalla hace primero un `GET /employe/:id` y pasa esos valores de vuelta sin tocarlos**, para no pisar RUT real ya sincronizado desde NetSuite con un placeholder vacío. Mismo problema y mismo fix se aplicó en `User` (`employeeid`/`externalid`/etc. se preservan vía `GET /users/:id` antes de un `PUT`), porque ambos repositorios Postgres hacen `UPDATE` de todas las columnas, no parcial.

## 7. Repositorios Postgres y wiring

- `PostgresUserRepository` (`src/lib/User/infrastructure/`) y `PostgresEmployeRepository` (`src/lib/Employe/infrastructure/repositories/`, nuevo — no existía) implementan el CRUD completo contra las tablas reales.
- `ServiceContainer.ts` y `ServiceEmployeContainer.ts` (`src/lib/Shared/infrastructure/`): si `DATABASE_URL` está seteado usan el repositorio Postgres; si no, caen a `InMemory...` con una advertencia por consola (para que la app no se caiga sin base disponible). Ambos archivos cargan `dotenv.config()` al importarse, así funciona sin importar quién los requiera primero (app real o tests).
- Tests de integración reales contra `POS`: `tests/lib/User/infrastructure/PostgresUserRepository.test.ts` y `tests/lib/Employe/infrastructure/PostgresEmployeRepository.test.ts` — un solo `Pool` por archivo (`describe`), cerrado en `afterAll`.

## 8. Frontend — shell POS (React + TypeScript + Vite)

No existía nada de frontend antes de esto. Estructura nueva, paralela a `src/lib/` (backend hexagonal), siguiendo la organización que sugiere la Parte II del documento de arquitectura (`shared/ui`, `modules/<contexto>/ui|infrastructure`):

```
app/                          shell bootstrap (Vite entry point)
  main.tsx, App.tsx           composition root: decide qué pantalla mostrar
shared/ui/
  pos-terminal/                kit visual común (fondo negro, texto verde, monoespaciado)
    PosTerminalShell.tsx        marco de ventana
    PosOperationalHeader.tsx    tienda/terminal/usuario/conectividad (placeholder)
    PosFunctionKeyBar.tsx       barra de teclas F al pie
    PosField.tsx                campo de formulario etiquetado
    pos-terminal.css            tema (variables --pos-*)
  shell/
    MainMenuPage.tsx            formulario inicial de opciones (01-05), 100% hardcodeado
modules/
  user/
    infrastructure/UserHttpGateway.ts     fetch a /users (search/getById/create/edit)
    ui/react/UserMaintenancePage.tsx      pantalla de la opción 02
  employe/
    infrastructure/EmployeHttpGateway.ts  fetch a /employe (mismo patrón)
    ui/react/EmployeListPage.tsx          pantalla de la opción 03
```

- `vite.config.ts`: build separado en `dist-ui/` (el backend ya usa `dist/`), y proxy de dev de `/users`, `/employe`, `/departments`, `/subsidiaries` hacia `http://localhost:3000` (evita CORS, misma ruta relativa que usaría un reverse proxy en producción).
- `tsconfig.app.json`: config de tipos para el frontend (jsx, DOM lib); el `tsconfig.json` del backend excluye `app/`, `shared/`, `modules/` para no mezclar.
- El formulario inicial (`MainMenuPage`) sólo entrega la opción confirmada (regla 1A.2 del documento); `App.tsx` decide a qué pantalla navegar. Hoy sólo `02` y `03` tienen destino; `01/04/05` quedan sin implementar.
- Cada pantalla de módulo (`UserMaintenancePage`, `EmployeListPage`) maneja dos modos (35.3.1 del documento): **BROWSING** (lista, navegable con `↑↓`, con búsqueda incremental por `F2`) y **FORM**. Dentro de `FORM` hay tres sub-modos: `create` (F3, todo editable), `view` (Enter/F4 sobre un registro seleccionado — **modo consulta, solo lectura**, la barra sólo muestra `F4 Editar`) y `edit` (sólo se llega presionando `F4` dentro de la ventana de consulta; recién ahí los campos quedan editables y la barra cambia a `F5 Guardar`). `Esc` cancela y vuelve a `browsing`, `F9` vuelve al menú principal (funciona desde cualquier sub-modo). `F6` inactiva el seleccionado (con confirmación en pantalla, sin diálogos nativos) — implementado en `User` y `Employe`.
- Cada pantalla se autoenfoca al montar y en cada cambio de modo (`usePosFocus`), para que toda la navegación sea 100% por teclado sin requerir clic del mouse.
- El listado de `UserMaintenancePage` (opción 02) y `EmployeListPage` (opción 03) pagina en vez de hacer scroll: `PAGE_SIZE = 15` filas por página (ventana fija estilo pantalla COBOL de 24 líneas), `AvPág`/`RePág` saltan una página, `Inicio`/`Fin` saltan directo a la primera/última página, `↑↓` cruza el borde de página solos, y la búsqueda incremental siempre vuelve a la página 1. Así la barra de teclas F queda siempre a la vista sin importar cuántos registros haya (195 usuarios → 13 páginas; 195 empleados → 13 páginas).
- **Bugs de pérdida de datos corregidos** (encontrados al revisar el ciclo completo consultar/editar/grabar/borrar de `User`, y aplicados también a `Employe` por consistencia): (1) F5 dejaba un filtro de F2 pegado en segundo plano — si el campo editado ya no calzaba con la búsqueda vieja, el registro guardado desaparecía de la lista aunque seguía intacto en la base; ahora F5 siempre limpia el filtro en ambas pantallas. (2) F6 Inactivar (sólo existe en `User`) mandaba sólo `{id, username, email, isinactive}` al backend, que sobreescribe TODAS las columnas — borraba en silencio `externalid`/`entityexternalid`/`failedlogincount` y **rompía el vínculo `employeeid` con el Empleado**; ahora trae el registro completo primero (mismo patrón que `openRecord`/`save`).
- El campo "Iniciales" (`UserMaintenancePage`) es de `employe.initials` — sólo se habilita con F4 si el usuario ya tiene un Empleado vinculado; si no, muestra un aviso ("Enlace un empleado... para poder editar este campo") en vez de dejarlo editable sin dónde persistir. De los 195 usuarios reales, sólo 1 (`apalma`) tiene el vínculo hecho hoy.
- `EmployeListPage` tiene ahora el mismo encabezado de ventana que `UserMaintenancePage` (título "MANTENCIÓN DE EMPLEADOS" + estado dinámico ALTA/CREACIÓN, LECTURA, MANTENCIÓN en vez del `PosOperationalHeader` genérico de sesión) y la misma etiqueta "F4 Editar" en el listado, para que ambas pantallas ofrezcan exactamente las mismas funcionalidades F y la misma experiencia visual.

### Cómo correrlo

```bash
npm run dev      # backend, http://localhost:3000
npm run ui:dev   # frontend, http://localhost:5173
```

Requiere Postgres corriendo en `localhost:5432`, base `POS`, credenciales en `.env`.

## 10. Autenticación (`auth`) y log de accesos

- **Reemplazo, no reparación**: el esqueleto viejo (`AuthSignInUseCase`, `AuthToken`) usaba `findByEmail`/`user.password` en texto plano, que ya no existen en `User`/`UserRepository` (quedó documentado como deuda técnica). Se borró y se reconstruyó desde cero.
- **`login_log`** (tabla nueva en la base real, `public.login_log`): `id`, `username`, `userid` (FK a `user_pos.id`, nullable si el usuario no existe), `success`, `reason` (`unknown_username` | `inactive_user` | `no_password_set` | `invalid_password` | `null` si fue exitoso), `attemptedat`. Se registra **todo intento**, exitoso o fallido (decisión explícita del usuario).
- **`AuthSignIn`** (`src/lib/auth/application/use-cases/AuthSignIn/`): busca por `UserRepository.findByUsername` (puerto nuevo), valida `isinactive`, compara la contraseña con `bcryptjs` contra `user_pos.passwordhash`, registra el intento en `login_log` SIEMPRE (antes de responder), y si es exitoso actualiza `lastloginat` preservando el resto de las columnas (mismo patrón fetch-completo-antes-de-editar que `UserEdit`/F5/F6 en la UI). El error que ve el cliente es siempre el mismo mensaje genérico ("Usuario o contraseña incorrectos"), sin distinguir usuario inexistente de contraseña incorrecta, para no filtrar por enumeración.
- **`POST /auth/login`** (`ExpressAuthRouter`/`ExpressAuthController`): recibe `{username, password}`, responde `200 {id, username, employeeid}` (nunca el hash) o `401` genérico.
- **Contraseña inicial**: se le fijó una contraseña a `administracion` (hasheada con bcrypt, nunca guardada en texto plano en ningún archivo del repo).
- **F7 — Fijar/resetear contraseña** (`UserMaintenancePage`, opción 02): mismo patrón que F6 (mini-formulario dentro de la ventana, sin diálogos nativos; alcanza con tener el usuario seleccionado en la lista, no hace falta abrir el registro). Pide contraseña nueva + confirmación (no la anterior — es un admin reseteando la de otro usuario). `UserSetPassword` (`src/lib/User/application/use-cases/UserSetPassword/`) es un caso de uso separado de `UserEdit` a propósito (passwordhash nunca viaja por el flujo de edición general): trae el registro completo, hashea con bcrypt y sólo cambia `passwordhash`/`passwordchangedat`, preservando el resto (mismo patrón fetch-completo-antes-de-editar). Expuesto en `PUT /users/:id/password`, mínimo 6 caracteres. Verificado con un usuario de prueba: contraseñas que no coinciden dan error, contraseña válida se guarda y permite loguearse de inmediato.
- **Frontend**: `LoginPage` (`modules/auth/ui/react/LoginPage.tsx`) es ahora la pantalla de entrada — `App.tsx` sólo muestra `MainMenuPage` si hay una sesión activa (`AuthSession` en estado de React). El encabezado del menú principal (`PosOperationalHeader`, que ya tenía un prop `user` sin usar) ahora muestra el username real en vez de "sin sesión". La opción **05 (Cierre de sesión)** del menú ya tiene destino: limpia la sesión y vuelve al login.
- **Alcance de la sesión** (decisión explícita del usuario): sólo bloquea la pantalla. `/users`, `/employe`, etc. siguen sin exigir token — no se tocó ningún router existente. Si más adelante se necesita proteger el backend, falta agregar un middleware de sesión a esos routers.
- Verificado end-to-end contra la base real: login correcto, contraseña incorrecta, usuario inexistente, y `login_log` con las 4 filas esperadas; `Cierre de sesión` vuelve al login limpio. Suite de tests (`npx jest`) sigue en verde (21/21) después del cambio.
- **Bug corregido**: `LoginPage` usaba un `<form onSubmit>` nativo confiando en que Enter lo disparara. Con dos campos de texto y sin un `<button>` visible, la "implicit submission" del estándar HTML no dispara con Enter (sólo funciona nativamente si hay un único campo) — la ventana "no hacía nada" al ingresar usuario/contraseña. Las primeras pruebas automatizadas no lo detectaron porque disparaban el evento `submit` directamente por código, saltándose el comportamiento real del navegador. Se corrigió reemplazando el `<form>` por el mismo patrón `onKeyDown` que usa el resto de las pantallas (MainMenuPage, UserMaintenancePage, etc.), verificado esta vez con tecleo y Enter genuinos (evento de teclado real, no `submit` sintético).

## 11. Qué falta (pendiente, no implementado)

- Opción **04** (estado de sincronización) del menú principal — sin pantalla destino.
- **Fijar contraseña a los 194 usuarios restantes** — la pantalla (F7) ya existe; falta que alguien con acceso a `administracion` la use uno por uno (o se construya una carga masiva) para que el resto pueda loguearse.
- **Versionado optimista** (`expectedVersion` que pide el documento) — ninguna tabla tiene columna `version`.
- **Generación de `id`**: sigue sin resolverse si Postgres debe autogenerar el bigint identity o seguir recibiéndolo del cliente.
- **Orquestación de creación encadenada**: `employee.entityid` → `entity`, `user_pos.employeeid` → `employee` son FKs; no hay ningún caso de uso que cree la cadena completa todavía (hoy se crean por separado, con `entityid`/`employeeid` opcionales).
- **Captura de RUT** en el formulario de Empleados (hoy `gdChTipoDocumentoChile`/`gdDigitoDeVerificacion`/`gdDocumento` sólo se preservan al editar, pero no se pueden ingresar desde la UI).
- Limpieza de archivos huérfanos (`*_mio`, duplicados fuera de `use-cases/`, VOs de `User`/`Employe` sin columna) — no se borraron por no haber control de versiones en el repo.
- **Sesión sólo en frontend**: si más adelante se requiere proteger `/users`/`/employe`/etc. contra llamadas directas (no sólo ocultar la UI), falta middleware de sesión en los routers Express.
