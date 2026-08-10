import { NextFunction, Request, Response } from "express";
import { ServiceEmployeContainer } from "../../Shared/infrastructure/ServiceEmployeContainer";
import { EmployeNotFoundError } from "../domain/EmployeNotFoundError";
import { EmployePrimitives } from "../domain/entities/Employe";

export class ExpressEmployeController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const employe = await ServiceEmployeContainer.employe.getAll.run();

      return res.json(employe.map((employe) =>  employe.mapToPrimitives())).status(200);
    } catch (error) {
      next(error);
    }
  }

  async getOneById(req: Request, res: Response, next: NextFunction) {
    try {
      const employe = await ServiceEmployeContainer.employe.getOneById.run(req.params.id);

      return res.json(employe.mapToPrimitives()).status(200);
    } catch (error) {
      if (error instanceof EmployeNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      next(error);
    }
  }



  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as EmployePrimitives;

      const employe = await ServiceEmployeContainer.employe.create.run(body);

      return res.status(201).json(employe.mapToPrimitives());
    } catch (error) {
      next(error);
    }
  }

  async edit(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as EmployePrimitives;

      await ServiceEmployeContainer.employe.edit.run(body);

      return res.status(204).send();
    } catch (error) {
      if (error instanceof EmployeNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await ServiceEmployeContainer.employe.delete.run(req.params.id);

      return res.status(204).send();
    } catch (error) {
      if (error instanceof EmployeNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      next(error);
    }
  }
}
