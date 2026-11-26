import { Router } from "express";
import { ExpressPaisController } from "./ExpressPaisController";

const controller = new ExpressPaisController();

const ExpressPaisRouter = Router();

ExpressPaisRouter.get("/paises", controller.search.bind(controller));
ExpressPaisRouter.post("/paises", controller.create.bind(controller));
ExpressPaisRouter.put("/paises/:id", controller.edit.bind(controller));

export { ExpressPaisRouter };
