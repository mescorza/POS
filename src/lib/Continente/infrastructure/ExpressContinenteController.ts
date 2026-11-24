import { NextFunction, Request, Response } from "express";
import * as dotenv from "dotenv";
dotenv.config();

import { ContinenteCreate } from "../application/ContinenteCreate";
import { ContinenteSearch } from "../application/ContinenteSearch";
import { ContinenteDuplicadoError, ContinenteInvalidError } from "../domain/ContinenteRepository";
import { PostgresContinenteRepository } from "./PostgresContinenteRepository";

const databaseUrl = process.env.DATABASE_URL;
const repository = databaseUrl ? new PostgresContinenteRepository(databaseUrl) : null;
const search = repository ? new ContinenteSearch(repository) : null;
const create = repository ? new ContinenteCreate(repository) : null;

export class ExpressContinenteController {
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      if (!search) return res.status(503).json({ message: "DATABASE_URL no configurado" });
      const q = typeof req.query.q === "string" ? req.query.q : "";
      return res.json(await search.run(q, Number(req.query.page ?? 1), Number(req.query.size ?? 15)));
    } catch (error) {
      next(error);
    }
  }

  /** POST /continentes  { nombre } -> 201 con el continente creado. */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!create) return res.status(503).json({ message: "DATABASE_URL no configurado" });
      const nombre = typeof req.body?.nombre === "string" ? req.body.nombre : "";
      return res.status(201).json(await create.run({ nombre }));
    } catch (error) {
      if (error instanceof ContinenteDuplicadoError) return res.status(409).json({ message: error.message });
      if (error instanceof ContinenteInvalidError) return res.status(400).json({ message: error.message });
      next(error);
    }
  }
}
