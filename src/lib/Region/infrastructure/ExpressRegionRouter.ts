import { Router } from "express";
import { ExpressRegionController } from "./ExpressRegionController";

const controller = new ExpressRegionController();

const ExpressRegionRouter = Router();

ExpressRegionRouter.get("/regiones", controller.search.bind(controller));
ExpressRegionRouter.post("/regiones", controller.create.bind(controller));

export { ExpressRegionRouter };
