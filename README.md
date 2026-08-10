# POS / ERP — Adriazola Repuestos

Sistema POS/ERP para Adriazola Repuestos, construido con arquitectura
hexagonal (dominio/aplicación/infraestructura, puertos y adaptadores).
Backend en Node.js + TypeScript + Express + PostgreSQL; frontend en
React + Vite con una estética de terminal verde estilo COBOL (ventanas de
tamaño fijo, navegación 100% por teclado con teclas F, sin mouse).

La especificación funcional vive en
`POS_Registro_Venta_Arquitectura_Hexagonal_USUARIOS_V2.docx` (raíz del
repo). El estado real de lo construido, con detalle técnico y verificación,
está en [`docs/ESTADO_CONSTRUIDO.md`](docs/ESTADO_CONSTRUIDO.md); el mapa de
capas y deuda técnica conocida en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Qué hay construido

- **Login** (usuario + contraseña, hasheada con bcrypt) con log de auditoría
  de todos los intentos, exitosos y fallidos (`login_log`).
- **Menú principal** (formulario inicial de opciones), 100% por teclado.
- **Mantención de Usuarios** (opción 02): listado paginado, búsqueda
  incremental (F2), alta (F3), consulta/edición en dos pasos (F4 abre en
  modo lectura, F4 de nuevo habilita edición, F5 guarda), inactivar (F6) y
  fijar/resetear contraseña (F7) — todo con confirmación en pantalla, sin
  diálogos nativos del navegador.
- **Mantención de Empleados** (opción 03): mismo patrón (paginado,
  búsqueda, alta/consulta/edición, F6 inactivar).
- Dominios `User` (↔ `user_pos`) y `Employe` (↔ `employee`) mapeados 1:1
  contra el modelo de datos real, relacionados por `user_pos.employeeid`.

Pendiente y deuda técnica conocida: ver `docs/ESTADO_CONSTRUIDO.md` §11.

## Tech stack

- Backend: Node.js, Express, TypeScript, `pg` (PostgreSQL), `bcryptjs`
- Frontend: React, Vite, TypeScript
- Tests: Jest, Supertest

## Requisitos

- Node.js
- PostgreSQL (base `POS`) — **requerido**: no hay modo in-memory activo por
  defecto: `ServiceContainer`/`ServiceEmployeContainer`/`ServiceAuthContainer`
  usan los repositorios Postgres reales cuando `DATABASE_URL` está seteado
  (y avisan por consola si no lo está, cayendo a in-memory sin persistencia).

## Configuración

Copiar `.env.example` a `.env` y completar la conexión:

```ini
DATABASE_URL="postgresql://usuario:password@localhost:5432/POS"
```

## Instalar y correr

```bash
npm install

npm run dev      # backend, http://localhost:3000
npm run ui:dev   # frontend, http://localhost:5173 (proxea /users, /employe, /auth, etc. al backend)
```

## Tests

```bash
npx jest
```

Los tests de integración de los repositorios Postgres requieren
`DATABASE_URL` y una base accesible.

## Build

```bash
npm run build    # backend -> dist/
npm run ui:build # frontend -> dist-ui/
```
