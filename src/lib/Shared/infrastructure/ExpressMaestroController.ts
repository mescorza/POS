import { NextFunction, Request, Response } from "express";
import * as dotenv from "dotenv";
dotenv.config();

import { isMaestroTipo, MaestroRepository } from "./MaestroRepository";

const databaseUrl = process.env.DATABASE_URL;
const repository = databaseUrl ? new MaestroRepository(databaseUrl) : null;

export class ExpressMaestroController {
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      if (!repository) return res.status(503).json({ message: "DATABASE_URL no configurado" });
      const tipo = req.params.tipo;
      if (!isMaestroTipo(tipo)) return res.status(404).json({ message: `Maestro "${tipo}" desconocido` });

      let parent: number | null = null;
      if (req.query.parent !== undefined && req.query.parent !== "") {
        parent = Number(req.query.parent);
        if (!Number.isInteger(parent) || parent < 0) {
          return res.status(400).json({ message: "parent inválido" });
        }
      }

      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
      const pageN = Number(req.query.page ?? 1);
      const sizeN = Number(req.query.size ?? 8);
      const page = Number.isInteger(pageN) && pageN > 0 ? pageN : 1;
      const size = Number.isInteger(sizeN) && sizeN > 0 ? Math.min(sizeN, 100) : 8;

      return res.json(await repository.search(tipo, q, parent, page, size));
    } catch (error) {
      next(error);
    }
  }
}
