import { Router } from "express";
import { ExpressRegionController } from "./ExpressRegionController";

const controller = new ExpressRegionController();

const ExpressRegionRouter = Router();

ExpressRegionRouter.get("/regiones", controller.search.bind(controller));

export { ExpressRegionRouter };
