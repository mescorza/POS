import { Router } from "express";
import { ExpressContinenteController } from "./ExpressContinenteController";

const controller = new ExpressContinenteController();

const ExpressContinenteRouter = Router();

ExpressContinenteRouter.get("/continentes", controller.search.bind(controller));
ExpressContinenteRouter.post("/continentes", controller.create.bind(controller));

export { ExpressContinenteRouter };
