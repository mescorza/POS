import { NextFunction, Request, Response } from "express";
import * as dotenv from "dotenv";
dotenv.config();

import { PaisCreate } from "../application/PaisCreate";
import { PaisSearch } from "../application/PaisSearch";
import { PaisEdit } from "../application/PaisEdit";
import { PaisDuplicadoError, PaisInvalidError, PaisNotFoundError } from "../domain/PaisRepository";
import { PostgresPaisRepository } from "./PostgresPaisRepository";

const databaseUrl = process.env.DATABASE_URL;
const repository = databaseUrl ? new PostgresPaisRepository(databaseUrl) : null;
const search = repository ? new PaisSearch(repository) : null;
const create = repository ? new PaisCreate(repository) : null;
const edit = repository ? new PaisEdit(repository) : null;

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

  private toInput(b: Record<string, unknown>) {
    return {
      nombre: str(b.nombre),
      continenteId: Number(b.continenteId),
      iso2: str(b.iso2),
      saad: str(b.saad),
      saadDescripcion: str(b.saadDescripcion),
    };
  }

  /** PUT /paises/:id  { nombre, continenteId, iso2, saad, saadDescripcion } -> 200 con el país guardado. */
  async edit(req: Request, res: Response, next: NextFunction) {
    try {
      if (!edit) return res.status(503).json({ message: "DATABASE_URL no configurado" });
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "id inválido" });
      return res.json(await edit.run(id, this.toInput(req.body ?? {})));
    } catch (error) {
      if (error instanceof PaisDuplicadoError) return res.status(409).json({ message: error.message });
      if (error instanceof PaisNotFoundError) return res.status(404).json({ message: error.message });
      if (error instanceof PaisInvalidError) return res.status(400).json({ message: error.message });
      next(error);
    }
  }

  /** POST /paises  { nombre, continenteId, iso2, saad, saadDescripcion } -> 201 con el país creado. */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!create) return res.status(503).json({ message: "DATABASE_URL no configurado" });
      const creado = await create.run(this.toInput(req.body ?? {}));
      return res.status(201).json(creado);
    } catch (error) {
      if (error instanceof PaisDuplicadoError) return res.status(409).json({ message: error.message });
      if (error instanceof PaisInvalidError) return res.status(400).json({ message: error.message });
      next(error);
    }
  }
}
