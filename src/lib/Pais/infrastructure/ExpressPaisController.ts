import { NextFunction, Request, Response } from "express";
import * as dotenv from "dotenv";
dotenv.config();

import { PaisCreate } from "../application/PaisCreate";
import { PaisSearch } from "../application/PaisSearch";
import { PaisDuplicadoError, PaisInvalidError } from "../domain/PaisRepository";
import { PostgresPaisRepository } from "./PostgresPaisRepository";

const databaseUrl = process.env.DATABASE_URL;
const repository = databaseUrl ? new PostgresPaisRepository(databaseUrl) : null;
const search = repository ? new PaisSearch(repository) : null;
const create = repository ? new PaisCreate(repository) : null;

const str = (v: unknown) => (typeof v === "string" ? v : v === undefined || v === null ? "" : String(v));

export class ExpressPaisController {
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      if (!search) return res.status(503).json({ message: "DATABASE_URL no configurado" });
      const q = typeof req.query.q === "string" ? req.query.q : "";
      return res.json(await search.run(q, Number(req.query.page ?? 1), Number(req.query.size ?? 15)));
    } catch (error) {
      next(error);
    }
  }

  /** POST /paises  { nombre, continenteId, iso2, saad, saadDescripcion } -> 201 con el país creado. */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!create) return res.status(503).json({ message: "DATABASE_URL no configurado" });
      const b = req.body ?? {};
      const creado = await create.run({
        nombre: str(b.nombre),
        continenteId: Number(b.continenteId),
        iso2: str(b.iso2),
        saad: str(b.saad),
        saadDescripcion: str(b.saadDescripcion),
      });
      return res.status(201).json(creado);
    } catch (error) {
      if (error instanceof PaisDuplicadoError) return res.status(409).json({ message: error.message });
      if (error instanceof PaisInvalidError) return res.status(400).json({ message: error.message });
      next(error);
    }
  }
}
