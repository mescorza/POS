import { NextFunction, Request, Response } from "express";
import * as dotenv from "dotenv";
dotenv.config();

import { RegionCreate } from "../application/RegionCreate";
import { RegionSearch } from "../application/RegionSearch";
import { RegionDuplicadaError, RegionInvalidError } from "../domain/RegionRepository";
import { PostgresRegionRepository } from "./PostgresRegionRepository";

const databaseUrl = process.env.DATABASE_URL;
const repository = databaseUrl ? new PostgresRegionRepository(databaseUrl) : null;
const search = repository ? new RegionSearch(repository) : null;
const create = repository ? new RegionCreate(repository) : null;

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
