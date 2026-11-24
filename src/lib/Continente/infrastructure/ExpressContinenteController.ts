import { NextFunction, Request, Response } from "express";
import * as dotenv from "dotenv";
dotenv.config();

import { ContinenteSearch } from "../application/ContinenteSearch";
import { PostgresContinenteRepository } from "./PostgresContinenteRepository";

const databaseUrl = process.env.DATABASE_URL;
const search = databaseUrl ? new ContinenteSearch(new PostgresContinenteRepository(databaseUrl)) : null;

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
}
