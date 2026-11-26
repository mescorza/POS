import { NextFunction, Request, Response } from "express";
import { ServiceProveedorContainer } from "../../Shared/infrastructure/ServiceProveedorContainer";
import {
  ProveedorDuplicadoError,
  ProveedorEditInput,
  ProveedorInvalidError,
  ProveedorNotFoundError,
} from "../domain/ProveedorRepository";

export class ExpressProveedorController {
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      if (!ServiceProveedorContainer) {
        return res.status(503).json({ message: "DATABASE_URL no configurado" });
      }
      const q = typeof req.query.q === "string" ? req.query.q : "";
      const page = Number(req.query.page ?? 1);
      const size = Number(req.query.size ?? 15);
      return res.json(await ServiceProveedorContainer.proveedor.search.run(q, page, size));
    } catch (error) {
      next(error);
    }
  }

  private toEditInput(b: Record<string, unknown>): ProveedorEditInput {
    const str = (v: unknown) => (typeof v === "string" ? v : v === undefined || v === null ? "" : String(v));
    return {
      nrorut: str(b.nrorut),
      verificador: str(b.verificador),
      nombre: str(b.nombre),
      codUbicacion: str(b.codUbicacion),
      codPais: str(b.codPais),
      codRegion: str(b.codRegion),
      codCiudad: str(b.codCiudad),
      codComuna: str(b.codComuna),
      codLocalidad: str(b.codLocalidad),
      codProvincia: str(b.codProvincia),
      codPostal: str(b.codPostal),
      direccion: str(b.direccion),
      fono: str(b.fono),
      fax: str(b.fax),
      contacto: str(b.contacto),
      cargo: str(b.cargo),
      codMoneda: str(b.codMoneda),
      esForwarder: str(b.esForwarder),
      alaOrdenDe: str(b.alaOrdenDe),
      email1: str(b.email1),
      email2: str(b.email2),
      modificadoPor: Number(b.modificadoPor),
    };
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!ServiceProveedorContainer) {
        return res.status(503).json({ message: "DATABASE_URL no configurado" });
      }
      const b = req.body ?? {};
      const creado = await ServiceProveedorContainer.proveedor.create.run({
        ...this.toEditInput(b),
        abrev: typeof b.abrev === "string" ? b.abrev : "",
      });
      return res.status(201).json(creado);
    } catch (error) {
      if (error instanceof ProveedorDuplicadoError) return res.status(409).json({ message: error.message });
      if (error instanceof ProveedorInvalidError) return res.status(400).json({ message: error.message });
      next(error);
    }
  }

  /** PUT /proveedores/:id/estado  { inactivo: boolean, modificadoPor: number } */
  async setInactivo(req: Request, res: Response, next: NextFunction) {
    try {
      if (!ServiceProveedorContainer) {
        return res.status(503).json({ message: "DATABASE_URL no configurado" });
      }
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "id inválido" });
      }
      const b = req.body ?? {};
      if (typeof b.inactivo !== "boolean") {
        return res.status(400).json({ message: "inactivo debe ser true o false" });
      }
      const actualizado = await ServiceProveedorContainer.proveedor.setInactivo.run(
        id,
        b.inactivo,
        Number(b.modificadoPor)
      );
      return res.json(actualizado);
    } catch (error) {
      if (error instanceof ProveedorNotFoundError) return res.status(404).json({ message: error.message });
      if (error instanceof ProveedorInvalidError) return res.status(400).json({ message: error.message });
      next(error);
    }
  }

  async edit(req: Request, res: Response, next: NextFunction) {
    try {
      if (!ServiceProveedorContainer) {
        return res.status(503).json({ message: "DATABASE_URL no configurado" });
      }
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "id inválido" });
      }
      const guardado = await ServiceProveedorContainer.proveedor.edit.run(id, this.toEditInput(req.body ?? {}));
      return res.json(guardado);
    } catch (error) {
      if (error instanceof ProveedorDuplicadoError) return res.status(409).json({ message: error.message });
      if (error instanceof ProveedorNotFoundError) return res.status(404).json({ message: error.message });
      if (error instanceof ProveedorInvalidError) return res.status(400).json({ message: error.message });
      next(error);
    }
  }

  async getOneById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!ServiceProveedorContainer) {
        return res.status(503).json({ message: "DATABASE_URL no configurado" });
      }
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "id inválido" });
      }
      const proveedor = await ServiceProveedorContainer.proveedor.getOneById.run(id);
      if (!proveedor) {
        return res.status(404).json({ message: "Proveedor no encontrado" });
      }
      return res.json(proveedor);
    } catch (error) {
      next(error);
    }
  }
}
