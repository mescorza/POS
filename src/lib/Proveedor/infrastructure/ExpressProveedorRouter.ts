import { Router } from "express";
import { ExpressProveedorController } from "./ExpressProveedorController";

const controller = new ExpressProveedorController();

const ExpressProveedorRouter = Router();

ExpressProveedorRouter.get("/proveedores", controller.search.bind(controller));
ExpressProveedorRouter.get("/proveedores/:id", controller.getOneById.bind(controller));
ExpressProveedorRouter.post("/proveedores", controller.create.bind(controller));
ExpressProveedorRouter.put("/proveedores/:id/estado", controller.setInactivo.bind(controller));
ExpressProveedorRouter.put("/proveedores/:id", controller.edit.bind(controller));

export { ExpressProveedorRouter };
