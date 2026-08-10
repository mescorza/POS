import { Router } from "express";
import { ExpressAuthController } from "./ExpressAuthController";

const controller = new ExpressAuthController();

const ExpressAuthRouter = Router();

ExpressAuthRouter.post("/auth/login/", controller.login);

export { ExpressAuthRouter };
