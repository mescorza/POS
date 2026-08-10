# Arquitectura hexagonal de este proyecto

Este documento describe cómo está implementada la arquitectura hexagonal (puertos y adaptadores) en este repositorio, basándose en el código real bajo `src/`.

## 1. Idea general

La arquitectura hexagonal separa el código en tres capas concéntricas, con una regla de dependencia estricta: **las capas externas dependen de las internas, nunca al revés**.

```
        ┌─────────────────────────────┐
        │      infrastructure         │  Express, Postgres, InMemory...
        │  ┌───────────────────────┐  │
        │  │      application      │  │  Casos de uso
        │  │  ┌─────────────────┐  │  │
        │  │  │      domain      │  │  │  Entidades, VOs, reglas
        │  │  └─────────────────┘  │  │
        │  └───────────────────────┘  │
        └─────────────────────────────┘
```

- **`domain`**: entidades, value objects y errores de negocio. No importa nada de `application` ni `infrastructure`, ni frameworks (sin Express, sin `pg`).
- **`application`**: casos de uso (un caso de uso = una clase con `run()`). Depende del `domain` y de interfaces (puertos) definidas en el propio `domain`, nunca de una implementación concreta.
- **`infrastructure`**: adaptadores que conectan el mundo exterior con la aplicación: controladores HTTP (Express), routers, y repositorios concretos (in-memory, Postgres).

## 2. Módulos (bounded contexts)

El código está organizado por módulo de negocio bajo `src/lib/`, y cada módulo repite la misma estructura de 3 capas:

```
src/lib/
├── User/
│   ├── domain/
│   │   ├── entities/User.ts
│   │   ├── value-objects/ (UserId, UserName, UserEmail, UserCreatedAt, ...)
│   │   ├── repositories/UserRepository.ts   <- puerto (interfaz)
│   │   └── UserNotFoundError.ts
│   ├── application/use-cases/
│   │   ├── UserCreate/UserCreate.ts
│   │   ├── UserEdit/UserEdit.ts
│   │   ├── UserDelete/UserDelete.ts
│   │   ├── UserGetAll/UserGetAll.ts
│   │   ├── UserGetOneById/UserGetOneById.ts
│   │   └── UserFindByEmailUseCase/UserFindByEmailUseCase.ts
│   └── infrastructure/
│       ├── ExpressUserController.ts          <- adaptador de entrada (driving)
│       ├── ExpressUserRouter.ts
│       ├── InMemoryUserRepository.ts         <- adaptador de salida (driven)
│       └── PostgresUserRepository.ts         <- adaptador de salida (driven)
│
├── Employe/               (misma estructura que User: domain / application / infrastructure)
│
├── auth/
│   ├── domain/ (AuthToken.ts, AuthInvalidCredentialsError.ts)
│   └── application/AuthSignInUseCase.ts
│
└── Shared/infrastructure/
    ├── ServiceContainer.ts          <- composición/DI del módulo User
    └── ServiceEmployeContainer.ts   <- composición/DI del módulo Employe
```

Cada módulo (`User`, `Employe`) es independiente: define su propia entidad, sus propios value objects y su propio puerto de repositorio. No hay dependencias cruzadas entre `User` y `Employe`.

## 3. Puertos y adaptadores

Un **puerto** es una interfaz definida en `domain/repositories`. Ejemplo (`UserRepository.ts`):

```ts
export interface UserRepository {
  create(user: User): Promise<void>;
  getAll(): Promise<User[]>;
  getOneById(id: UserId): Promise<User | null>;
  edit(user: User): Promise<void>;
  delete(id: UserId): Promise<void>;
}
```

Los **adaptadores** (`infrastructure`) implementan ese puerto:

- `InMemoryUserRepository`: guarda usuarios en un array/mapa en memoria. Se usa en desarrollo y en tests.
- `PostgresUserRepository`: implementa el mismo puerto contra una base Postgres real usando `pg`.

Los casos de uso (`application`) sólo conocen el puerto (`UserRepository`), nunca una implementación concreta:

```ts
export class UserCreate {
  constructor(private repository: UserRepository) {}
  async run(id, name, email, createdAt) { ... }
}
```

Esto permite cambiar de `InMemoryUserRepository` a `PostgresUserRepository` sin tocar ni un caso de uso ni el dominio: solo cambia lo que se inyecta en el contenedor de servicios.

## 4. Composición e inyección de dependencias

`src/lib/Shared/infrastructure/ServiceContainer.ts` y `ServiceEmployeContainer.ts` son el "punto de cableado" (composition root) de cada módulo: instancian el repositorio concreto y se lo pasan a cada caso de uso.

```ts
const userRepository = new InMemoryUserRepository();

export const ServiceContainer = {
  user: {
    getAll: new UserGetAll(userRepository),
    getOneById: new UserGetOneById(userRepository),
    create: new UserCreate(userRepository),
    edit: new UserEdit(userRepository),
    delete: new UserDelete(userRepository),
  },
};
```

> **Estado actual (actualizado):** ambos contenedores usan Postgres real cuando `DATABASE_URL` está configurado (`PostgresUserRepository` / `PostgresEmployeRepository`), con fallback silencioso a `InMemory...Repository` si no lo está. El dominio de ambos módulos fue remapeado columna por columna contra las tablas reales de la base `POS` (que difieren en varios campos de `_v_datos/modelo_usuarios.sql`). Detalle completo, incluyendo un bug de triggers de base de datos que se corrigió en el camino, en `docs/ESTADO_CONSTRUIDO.md`.

Los controladores (`ExpressUserController`, `ExpressEmployeController`) importan directamente el `ServiceContainer`/`ServiceEmployeContainer` correspondiente y delegan en el caso de uso.

## 5. Flujo de una petición HTTP

Ejemplo: `POST /users`

```
Cliente
  │  HTTP POST /users
  ▼
ExpressUserRouter            (infrastructure) — enruta a controller.create
  ▼
ExpressUserController.create (infrastructure) — parsea req.body, maneja errores → status code
  ▼
ServiceContainer.user.create (infrastructure/composition) — resuelve el caso de uso ya cableado
  ▼
UserCreate.run()             (application) — orquesta: construye entidad y llama al puerto
  ▼
new User(new UserId(...), new UserName(...), ...)   (domain) — valida invariantes en el constructor
  ▼
UserRepository.create()      (puerto, domain)
  ▼
InMemoryUserRepository.create()  (infrastructure) — adaptador concreto que persiste
```

Puntos clave:

- La validación de negocio (`UserId` debe tener ≥5 caracteres, `UserEmail` debe contener `@` y `.`, etc.) vive en los **value objects** del dominio, no en el controlador. Si el dato es inválido, el `new UserXxx(...)` lanza un `Error` dentro del `try/catch` del controlador.
- Los errores de "no encontrado" (`UserNotFoundError`, `EmployeNotFoundError`) se lanzan desde el caso de uso y el controlador los traduce a `404`. Cualquier otro error cae al middleware de errores de `main.ts`, que responde `500`.

## 6. Punto de entrada (`src/main.ts`)

```ts
const app = express();
app.use(express.json());
app.use(ExpressUserRouter);
app.use(ExpressEmployeRouter);
app.use(errorHandlingMiddleware);
app.listen(3000);
```

`main.ts` es infraestructura pura: monta los routers de cada módulo y un middleware de errores genérico. No conoce reglas de negocio.

## 7. Reglas de dependencia (resumen)

| Capa | Puede importar de | No puede importar de |
|---|---|---|
| `domain` | nada (solo TS estándar) | `application`, `infrastructure`, Express, `pg` |
| `application` | `domain` (entidades, VOs, puertos) | `infrastructure` (routers, controllers, repos concretos) |
| `infrastructure` | `domain`, `application` | otro módulo de `infrastructure` de forma directa (usa el `ServiceContainer` del propio módulo) |

Esto es lo que permite: (a) testear casos de uso y dominio sin levantar Express ni una base de datos real (ver `tests/lib/User/application/*`, que usan un mock de repositorio), y (b) sustituir un adaptador (in-memory ↔ Postgres) sin tocar reglas de negocio.

## 8. Tests y arquitectura

- `tests/lib/User/domain/UserStub.ts`: builder de entidades `User` para tests.
- `tests/lib/User/__mocks__/InMemoryUserRepository.ts`: doble de prueba del puerto `UserRepository`.
- `tests/lib/User/application/**`: testean cada caso de uso contra el repositorio en memoria (sin HTTP, sin DB).
- `tests/lib/User/infrastructure/ExpressUserRouter.test.ts`: test de integración HTTP con Supertest.
- `tests/lib/User/infrastructure/PostgresUserRepository.test.ts`: test de integración contra Postgres real (requiere `DATABASE_URL`).

Esta pirámide (dominio/aplicación sin infraestructura, infraestructura aparte) es una consecuencia directa de la separación hexagonal: los casos de uso son fáciles de testear porque dependen de una interfaz, no de Express ni de `pg`.

## 9. Cómo añadir un nuevo módulo (bounded context)

Siguiendo el patrón de `User`/`Employe`:

1. `src/lib/<Modulo>/domain/entities/<Entidad>.ts` + value objects con validación en el constructor.
2. `src/lib/<Modulo>/domain/repositories/<Entidad>Repository.ts`: puerto con las operaciones necesarias.
3. `src/lib/<Modulo>/domain/<Entidad>NotFoundError.ts` (si aplica).
4. `src/lib/<Modulo>/application/use-cases/...`: un caso de uso por acción (`Create`, `Edit`, `Delete`, `GetAll`, `GetOneById`, ...), cada uno recibiendo el puerto por constructor.
5. `src/lib/<Modulo>/infrastructure/InMemory<Entidad>Repository.ts`: adaptador de salida para desarrollo/tests.
6. `src/lib/<Modulo>/infrastructure/Express<Entidad>Controller.ts` + `Express<Entidad>Router.ts`: adaptador de entrada HTTP.
7. `src/lib/Shared/infrastructure/Service<Entidad>Container.ts`: cablea el adaptador concreto con los casos de uso.
8. Montar el router en `src/main.ts`.

## 10. Deuda técnica / inconsistencias detectadas

Para que la documentación sea honesta con el estado real del código:

- ~~**Módulo `auth` incompleto**~~ — **Resuelto.** `AuthSignInUseCase`/`AuthToken` (basados en `findByEmail`/`user.password`, inexistentes) se reemplazaron por `AuthSignIn` (`src/lib/auth/application/use-cases/AuthSignIn/`), que usa `UserRepository.findByUsername` + `bcryptjs` contra `user_pos.passwordhash`, registra cada intento (éxito o fallo) en `login_log` vía `LoginLogRepository`, y está montado en `ExpressAuthRouter` (`POST /auth/login`). `UserFindByEmailUseCase` (application/use-cases) sigue sin usarse — no se tocó, no tiene relación con el login por username. Ver `docs/ESTADO_CONSTRUIDO.md` §10.
- **Archivos duplicados/heredados**: `User_mio.ts`, `UserCreate_mio.ts`, `UserEdit_mio.ts` y las copias de `UserEdit`/`UserGetOneById` fuera de `application/use-cases/` (`src/lib/User/application/UserEdit/` y `.../UserGetOneById/`) no se usan desde `ServiceContainer.ts`. Parecen versiones de trabajo/backup; conviene eliminarlas o consolidarlas para no confundir con las versiones activas dentro de `use-cases/`.
- ~~**Repositorio Postgres sin cablear**~~ — **Resuelto.** `ServiceContainer.ts` y `ServiceEmployeContainer.ts` usan `PostgresUserRepository`/`PostgresEmployeRepository` cuando `DATABASE_URL` está configurado. Ver `docs/ESTADO_CONSTRUIDO.md`.
- ~~**`Employe` no tiene adaptador Postgres**~~ — **Resuelto.** Existe `PostgresEmployeRepository` (`src/lib/Employe/infrastructure/repositories/`), probado contra la base real `POS`.
- **VOs huérfanos de `User`** (`UserFirstname`, `UserLastname`, `UserInitials`, `UserEntityid`, `UserCustentity_gd_documento`, `UserCustentity_gd_digito_de_verificacion`, `UserName`): quedaron sin usar tras remapear `User` contra `user_pos` (esos campos no son de esa tabla). No se borraron por no haber control de versiones en el repo; candidatos a limpieza junto con los `*_mio`.
- **Falta F6 (inactivar), búsqueda incremental, versionado optimista y captura de RUT en el formulario de Empleados** — pendientes, ver `docs/ESTADO_CONSTRUIDO.md` §9.
