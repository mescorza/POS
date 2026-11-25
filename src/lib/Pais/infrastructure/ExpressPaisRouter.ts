import { Router } from "express";
import { ExpressPaisController } from "./ExpressPaisController";

const controller = new ExpressPaisController();

const ExpressPaisRouter = Router();

ExpressPaisRouter.get("/paises", controller.search.bind(controller));

export { ExpressPaisRouter };
