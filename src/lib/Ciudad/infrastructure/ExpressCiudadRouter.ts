import { Router } from "express";
import { ExpressCiudadController } from "./ExpressCiudadController";

const controller = new ExpressCiudadController();

const ExpressCiudadRouter = Router();

ExpressCiudadRouter.get("/ciudades", controller.search.bind(controller));

export { ExpressCiudadRouter };
