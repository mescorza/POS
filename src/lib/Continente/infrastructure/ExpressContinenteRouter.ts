import { Router } from "express";
import { ExpressContinenteController } from "./ExpressContinenteController";

const controller = new ExpressContinenteController();

const ExpressContinenteRouter = Router();

ExpressContinenteRouter.get("/continentes", controller.search.bind(controller));
ExpressContinenteRouter.post("/continentes", controller.create.bind(controller));
ExpressContinenteRouter.put("/continentes/:id", controller.edit.bind(controller));

export { ExpressContinenteRouter };
