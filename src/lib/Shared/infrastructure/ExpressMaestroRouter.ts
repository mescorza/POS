import { Router } from "express";
import { ExpressMaestroController } from "./ExpressMaestroController";

const controller = new ExpressMaestroController();

const ExpressMaestroRouter = Router();

ExpressMaestroRouter.get("/maestros/:tipo", controller.search.bind(controller));

export { ExpressMaestroRouter };
