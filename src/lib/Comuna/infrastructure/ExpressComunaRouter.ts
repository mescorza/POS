import { Router } from "express";
import { ExpressComunaController } from "./ExpressComunaController";

const controller = new ExpressComunaController();

const ExpressComunaRouter = Router();

ExpressComunaRouter.get("/comunas", controller.search.bind(controller));

export { ExpressComunaRouter };
