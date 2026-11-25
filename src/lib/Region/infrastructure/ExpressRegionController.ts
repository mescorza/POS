import { NextFunction, Request, Response } from "express";
import * as dotenv from "dotenv";
dotenv.config();

import { RegionCreate } from "../application/RegionCreate";
import { RegionEdit } from "../application/RegionEdit";
import { RegionSearch } from "../application/RegionSearch";
import { RegionDuplicadaError, RegionInvalidError, RegionNotFoundError } from "../domain/RegionRepository";
import { PostgresRegionRepository } from "./PostgresRegionRepository";

const databaseUrl = process.env.DATABASE_URL;
const repository = databaseUrl ? new PostgresRegionRepository(databaseUrl) : null;
const search = repository ? new RegionSearch(repository) : null;
const create = repository ? new RegionCreate(repository) : null;
const edit = repository ? new RegionEdit(repository) : null;

const str = (v: unknown) => (typeof v === "string" ? v : v === undefined || v === null ? "" : String(v));

export class ExpressRegionController {
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      if (!search) return res.status(503).json({ message: "DATABASE_URL no configurado" });
      const q = typeof req.query.q === "string" ? req.query.q : "";
      return res.json(await search.run(q, Number(req.query.page ?? 1), Number(req.query.size ?? 15)));
    } catch (error) {
      next(error);
    }
  }

  private toInput(b: Record<string, unknown>) {
    return {
      nombre: str(b.nombre),
      paisId: Number(b.paisId),
      saad: str(b.saad),
      saadDescripcion: str(b.saadDescripcion),
    };
  }

  /** PUT /regiones/:id  { nombre, paisId, saad, saadDescripcion } -> 200 con la región guardada. */
  async edit(req: Request, res: Response, next: NextFunction) {
    try {
      if (!edit) return res.status(503).json({ message: "DATABASE_URL no configurado" });
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "id inválido" });
      return res.json(await edit.run(id, this.toInput(req.body ?? {})));
    } catch (error) {
      if (error instanceof RegionDuplicadaError) return res.status(409).json({ message: error.message });
      if (error instanceof RegionNotFoundError) return res.status(404).json({ message: error.message });
      if (error instanceof RegionInvalidError) return res.status(400).json({ message: error.message });
      next(error);
    }
  }

  /** POST /regiones  { nombre, paisId, saad, saadDescripcion } -> 201 con la región creada. */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!create) return res.status(503).json({ message: "DATABASE_URL no configurado" });
      return res.status(201).json(await create.run(this.toInput(req.body ?? {})));
    } catch (error) {
      if (error instanceof RegionDuplicadaError) return res.status(409).json({ message: error.message });
      if (error instanceof RegionInvalidError) return res.status(400).json({ message: error.message });
      next(error);
    }
  }
}
