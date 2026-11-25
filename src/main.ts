import * as express from "express";
import { Request, Response, NextFunction } from "express";
import { ExpressUserRouter } from "./lib/User/infrastructure/ExpressUserRouter";
import { ExpressEmployeRouter } from "./lib/Employe/infrastructure/ExpressEmployeRouter";
import { ExpressLookupRouter } from "./lib/Shared/infrastructure/ExpressLookupRouter";
import { ExpressInformesRouter } from "./lib/Shared/infrastructure/ExpressInformesRouter";
import { ExpressAuthRouter } from "./lib/auth/infrastructure/ExpressAuthRouter";
import { ExpressProveedorRouter } from "./lib/Proveedor/infrastructure/ExpressProveedorRouter";
import { ExpressMaestroRouter } from "./lib/Shared/infrastructure/ExpressMaestroRouter";
import { ExpressContinenteRouter } from "./lib/Continente/infrastructure/ExpressContinenteRouter";
import { ExpressPaisRouter } from "./lib/Pais/infrastructure/ExpressPaisRouter";

const app = express();

app.use(express.json());

app.use(ExpressUserRouter);
app.use(ExpressEmployeRouter);
app.use(ExpressLookupRouter);
app.use(ExpressInformesRouter);
app.use(ExpressAuthRouter);
app.use(ExpressProveedorRouter);
app.use(ExpressMaestroRouter);
app.use(ExpressContinenteRouter);
app.use(ExpressPaisRouter);

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof Error) {
    console.error(err.stack);
    return res.status(500).json({ message: err.message });
  }
  console.error(err);
  return res.status(500).json({ message: "Something went wrong" });
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
