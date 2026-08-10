import { Employe } from "src/lib/Employe/domain/entities/Employe";
import { randFirstName, randLastName, randNumber } from "@ngneat/falso";

export class EmployeStub {
  static create(): Employe {
    const id = String(randNumber({ min: 1, max: 999999999 }));

    // gdChTipoDocumentoChile / gdDigitoDeVerificacion / gdDocumento son
    // NOT NULL sin default en employee (ver Employe.ts), por eso van siempre.
    return Employe.fromPrimitives({
      id,
      gdChTipoDocumentoChile: "1",
      gdDigitoDeVerificacion: "k",
      gdDocumento: String(randNumber({ min: 10000000, max: 99999999 })),
      firstname: randFirstName(),
      lastname: randLastName(),
      employeecode: `EMP-${id}`,
    });
  }
}
