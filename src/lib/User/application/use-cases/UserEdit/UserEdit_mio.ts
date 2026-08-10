import { User } from "../../../domain/User_mio";
import { UserCreatedAt } from "../../../domain/value-objects/UserCreatedAt";
import { UserEmail } from "../../../domain/value-objects/UserEmail";
import { UserId } from "../../../domain/value-objects/UserId";
import { UserName } from "../../../domain/value-objects/UserName";
import { UserRepository } from "../../../domain/repositories/UserRepository";
import { UserExternalid } from "../../../domain/value-objects/UserExternalid"
import { UserIsinactive } from "../../../domain/value-objects/UserIsinactive";
import { UserInitials } from "../../../domain/value-objects/UserInitials"; 
import { UserEntityid } from "../../../domain/value-objects/UserEntityid";
import { UserFirtsname } from "../../../domain/value-objects/UserFirstname";
import { UserLastname } from "../../../domain/value-objects/UserLastname"
import { UserCustentity_gd_documento } from "../../../domain/value-objects/UserCustentity_gd_documento";
import { UserCustentity_gd_digito_de_verificacion } from "../../../domain/value-objects/UserCustentity_gd_digito_de_verificacion";
import { UserUserName } from "../../../domain/value-objects/UserUserName";

export class UserEdit {
  constructor(private repository: UserRepository) {}

  async run(
    id: string,
    name: string,
    email: string,
    externalid: string,
    isinactive: string,
    initials: string,
    entityid: string,
    firstname: string,
    lastname: string,
    custentity_gd_documento: string,
    custentity_gd_digito_de_verificacion: string,
    username: string,
    createdAt: Date

  ): Promise<void> {
    const user = new User(
      new UserId(id),
      new UserName(name),
      new UserEmail(email),
      new UserExternalid(externalid),
      new UserIsinactive(isinactive),
      new UserInitials(initials),
      new UserEntityid(entityid),
      new UserFirtsname(firstname),
      new UserLastname(lastname),
      new UserCustentity_gd_documento(custentity_gd_documento),
      new UserCustentity_gd_digito_de_verificacion(custentity_gd_digito_de_verificacion),
      new UserUserName(username),
      new UserCreatedAt(createdAt)

    );

    return this.repository.edit(user);
  }
}
