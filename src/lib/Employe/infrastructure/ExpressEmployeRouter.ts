import { Router } from "express";
import { ExpressEmployeController } from "./ExpressEmployeController";

const controller = new ExpressEmployeController();

const ExpressEmployeRouter = Router();

ExpressEmployeRouter.get("/employe/", controller.getAll);
ExpressEmployeRouter.get("/employe/:id/", controller.getOneById);
ExpressEmployeRouter.post("/employe/", controller.create);
ExpressEmployeRouter.put("/employe/", controller.edit);
ExpressEmployeRouter.delete("/employe/:id", controller.delete);

export { ExpressEmployeRouter };
