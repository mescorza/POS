import { NextFunction, Request, Response } from "express";
import * as dotenv from "dotenv";
dotenv.config();

import { InformesRepository, TableStructure } from "./InformesRepository";
import { buildEstructuraTablasWorkbook } from "./InformesXlsxBuilder";

const databaseUrl = process.env.DATABASE_URL;
const repository = databaseUrl ? new InformesRepository(databaseUrl) : null;

// "TODAS" (sin distinguir mayúsculas) o el parámetro table ausente/vacío
// significa "todas las tablas del esquema" — mismo criterio en JSON y XLSX.
function isAllTables(table: unknown): boolean {
  if (typeof table !== "string") return true;
  const trimmed = table.trim();
  return trimmed.length === 0 || trimmed.toUpperCase() === "TODAS";
}

/**
 * Adaptador de entrada de sólo lectura para el informe "Estructura de
 * tablas" (opción Informes del menú principal) — consulta el catálogo real
 * de PostgreSQL (information_schema/pg_catalog) vía InformesRepository, sin
 * capa de aplicación propia, mismo espíritu minimalista que
 * ExpressLookupController ("Sólo Consulta").
 */
export class ExpressInformesController {
  async listSchemas(req: Request, res: Response, next: NextFunction) {
    try {
      if (!repository) {
        return res.status(503).json({ message: "DATABASE_URL no configurado" });
      }

      const schemas = await repository.listSchemas();
      return res.json(schemas);
    } catch (error) {
      next(error);
    }
  }

  async listTables(req: Request, res: Response, next: NextFunction) {
    try {
      if (!repository) {
        return res.status(503).json({ message: "DATABASE_URL no configurado" });
      }

      const tables = await repository.listTables(req.params.schema);
      return res.json(tables);
    } catch (error) {
      next(error);
    }
  }

  private async loadStructures(schema: string, table: unknown): Promise<TableStructure[]> {
    if (!repository) {
      throw new Error("DATABASE_URL no configurado");
    }

    if (isAllTables(table)) {
      return repository.getAllTableStructures(schema);
    }

    return [await repository.getTableStructure(schema, table as string)];
  }

  async getEstructura(req: Request, res: Response, next: NextFunction) {
    try {
      if (!repository) {
        return res.status(503).json({ message: "DATABASE_URL no configurado" });
      }

      const schema = (req.query.schema as string) || "public";
      const structures = await this.loadStructures(schema, req.query.table);
      return res.json(structures);
    } catch (error) {
      next(error);
    }
  }

  async getEstructuraXlsx(req: Request, res: Response, next: NextFunction) {
    try {
      if (!repository) {
        return res.status(503).json({ message: "DATABASE_URL no configurado" });
      }

      const schema = (req.query.schema as string) || "public";
      const table = req.query.table;
      const structures = await this.loadStructures(schema, table);

      if (structures.length === 0) {
        return res.status(404).json({ message: `Sin tablas para el esquema "${schema}"` });
      }

      const workbook = buildEstructuraTablasWorkbook(structures);
      const fileLabel = isAllTables(table) ? "TODAS" : (table as string);

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="Estructura_${schema}_${fileLabel}.xlsx"`
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      next(error);
    }
  }
}
