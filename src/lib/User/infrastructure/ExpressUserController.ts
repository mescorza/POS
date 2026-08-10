import { NextFunction, Request, Response } from "express";
import { ServiceContainer } from "../../Shared/infrastructure/ServiceContainer";
import { UserNotFoundError } from "../domain/UserNotFoundError";
import { InvalidPasswordError } from "../domain/InvalidPasswordError";
import { UserPrimitives } from "../domain/entities/User";

export class ExpressUserController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await ServiceContainer.user.getAll.run();

      return res.json(users.map((user) =>  user.mapToPrimitives())).status(200);
    } catch (error) {
      next(error);
    }
  }

  async getOneById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await ServiceContainer.user.getOneById.run(req.params.id);

      return res.json(user.mapToPrimitives()).status(200);
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as UserPrimitives;

      const user = await ServiceContainer.user.create.run(body);

      return res.status(201).json(user.mapToPrimitives());
    } catch (error) {
      next(error);
    }
  }

  async edit(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as UserPrimitives;

      await ServiceContainer.user.edit.run(body);

      return res.status(204).send();
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      next(error);
    }
  }

  async setPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { password } = req.body as { password?: string };

      if (!password) {
        return res.status(400).json({ message: "password es obligatorio" });
      }

      await ServiceContainer.user.setPassword.run(req.params.id, password);

      return res.status(204).send();
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        return res.status(404).json({ message: error.message });
      }
      if (error instanceof InvalidPasswordError) {
        return res.status(400).json({ message: error.message });
      }

      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await ServiceContainer.user.delete.run(req.params.id);

      return res.status(204).send();
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      next(error);
    }
  }
}
