import { Router } from "express";
import { ExpressInformesController } from "./ExpressInformesController";

const controller = new ExpressInformesController();

const ExpressInformesRouter = Router();

ExpressInformesRouter.get("/informes/schemas", controller.listSchemas.bind(controller));
ExpressInformesRouter.get("/informes/schemas/:schema/tables", controller.listTables.bind(controller));
ExpressInformesRouter.get("/informes/estructura", controller.getEstructura.bind(controller));
ExpressInformesRouter.get("/informes/estructura.xlsx", controller.getEstructuraXlsx.bind(controller));

export { ExpressInformesRouter };
