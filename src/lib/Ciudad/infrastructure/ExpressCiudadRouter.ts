import { Router } from "express";
import { ExpressCiudadController } from "./ExpressCiudadController";

const controller = new ExpressCiudadController();

const ExpressCiudadRouter = Router();

ExpressCiudadRouter.get("/ciudades", controller.search.bind(controller));
ExpressCiudadRouter.post("/ciudades", controller.create.bind(controller));
ExpressCiudadRouter.put("/ciudades/:id", controller.edit.bind(controller));

export { ExpressCiudadRouter };
