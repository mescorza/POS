import { NextFunction, Request, Response } from "express";
import * as dotenv from "dotenv";
dotenv.config();

import { CiudadCreate } from "../application/CiudadCreate";
import { CiudadSearch } from "../application/CiudadSearch";
import { CiudadDuplicadaError, CiudadInvalidError } from "../domain/CiudadRepository";
import { PostgresCiudadRepository } from "./PostgresCiudadRepository";

const databaseUrl = process.env.DATABASE_URL;
const repository = databaseUrl ? new PostgresCiudadRepository(databaseUrl) : null;
const search = repository ? new CiudadSearch(repository) : null;
const create = repository ? new CiudadCreate(repository) : null;

const str = (v: unknown) => (typeof v === "string" ? v : v === undefined || v === null ? "" : String(v));

export class ExpressCiudadController {
  /** POST /ciudades  { nombre, regionId, saad, saadDescripcion } -> 201 con la ciudad creada. */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!create) return res.status(503).json({ message: "DATABASE_URL no configurado" });
      const b = req.body ?? {};
      const creada = await create.run({
        nombre: str(b.nombre),
        regionId: Number(b.regionId),
        saad: str(b.saad),
        saadDescripcion: str(b.saadDescripcion),
      });
      return res.status(201).json(creada);
    } catch (error) {
      if (error instanceof CiudadDuplicadaError) return res.status(409).json({ message: error.message });
      if (error instanceof CiudadInvalidError) return res.status(400).json({ message: error.message });
      next(error);
    }
  }

  async search(req: Request, res: Response, next: NextFunction) {
    try {
      if (!search) return res.status(503).json({ message: "DATABASE_URL no configurado" });
      const q = typeof req.query.q === "string" ? req.query.q : "";
      return res.json(await search.run(q, Number(req.query.page ?? 1), Number(req.query.size ?? 15)));
    } catch (error) {
      next(error);
    }
  }
}
