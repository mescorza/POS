import { NextFunction, Request, Response } from "express";
import * as dotenv from "dotenv";
dotenv.config();

import { LookupRepository } from "./LookupRepository";

const databaseUrl = process.env.DATABASE_URL;
const repository = databaseUrl ? new LookupRepository(databaseUrl) : null;

/**
 * Adaptador de entrada de sólo lectura para Department/Subsidiary — ver
 * LookupRepository. Si no hay DATABASE_URL configurado responde 503 en vez
 * de reventar, igual que el fallback in-memory de los demás módulos.
 */
export class ExpressLookupController {
  async getDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      if (!repository) {
        return res.status(503).json({ message: "DATABASE_URL no configurado" });
      }

      const department = await repository.getDepartmentById(req.params.id);

      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }

      return res.json(department);
    } catch (error) {
      next(error);
    }
  }

  async getSubsidiary(req: Request, res: Response, next: NextFunction) {
    try {
      if (!repository) {
        return res.status(503).json({ message: "DATABASE_URL no configurado" });
      }

      const subsidiary = await repository.getSubsidiaryById(req.params.id);

      if (!subsidiary) {
        return res.status(404).json({ message: "Subsidiary not found" });
      }

      return res.json(subsidiary);
    } catch (error) {
      next(error);
    }
  }
}
