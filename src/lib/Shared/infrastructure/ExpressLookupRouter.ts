import { Router } from "express";
import { ExpressLookupController } from "./ExpressLookupController";

const controller = new ExpressLookupController();

const ExpressLookupRouter = Router();

ExpressLookupRouter.get("/departments/:id", controller.getDepartment.bind(controller));
ExpressLookupRouter.get("/subsidiaries/:id", controller.getSubsidiary.bind(controller));

export { ExpressLookupRouter };
