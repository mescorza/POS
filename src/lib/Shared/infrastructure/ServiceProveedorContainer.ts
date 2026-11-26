import * as dotenv from "dotenv";
dotenv.config();

import { ProveedorSearch } from "../../Proveedor/application/ProveedorSearch";
import { ProveedorGetOneById } from "../../Proveedor/application/ProveedorGetOneById";
import { ProveedorEdit } from "../../Proveedor/application/ProveedorEdit";
import { ProveedorCreate } from "../../Proveedor/application/ProveedorCreate";
import { ProveedorSetInactivo } from "../../Proveedor/application/ProveedorSetInactivo";
import { PostgresProveedorRepository } from "../../Proveedor/infrastructure/PostgresProveedorRepository";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn("ADVERTENCIA: DATABASE_URL no está configurado; /proveedores responderá 503.");
}

// Sin repositorio in-memory a propósito: el maestro es de sólo lectura sobre
// pos.proveedor (datos reales); sin base no hay nada útil que mostrar.
const repository = databaseUrl ? new PostgresProveedorRepository(databaseUrl) : null;

export const ServiceProveedorContainer = repository
  ? {
      proveedor: {
        search: new ProveedorSearch(repository),
        getOneById: new ProveedorGetOneById(repository),
        edit: new ProveedorEdit(repository),
        create: new ProveedorCreate(repository),
        setInactivo: new ProveedorSetInactivo(repository),
      },
    }
  : null;
