import { NextFunction, Request, Response } from "express";
import { ServiceAuthContainer } from "../../Shared/infrastructure/ServiceAuthContainer";
import { AuthInvalidCredentialsError } from "../domain/AuthInvalidCredentialsError";

export class ExpressAuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password } = req.body as { username?: string; password?: string };

      if (!username || !password) {
        return res.status(400).json({ message: "username y password son obligatorios" });
      }

      const result = await ServiceAuthContainer.auth.signIn.run(username, password);

      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof AuthInvalidCredentialsError) {
        // Mensaje genérico a propósito: no confirma si el username existe.
        return res.status(401).json({ message: "Usuario o contraseña incorrectos" });
      }

      next(error);
    }
  }
}
