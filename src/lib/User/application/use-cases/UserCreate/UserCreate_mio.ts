import { User } from "../../domain/User_mio";
import { UserCreatedAt } from "../../domain/value-objects/UserCreatedAt";
import { UserEmail } from "../../domain/value-objects/UserEmail";
import { UserId } from "../../domain/value-objects/UserId";
import { UserName } from "../../domain/value-objects/UserName";
import { UserRepository } from "../../domain/repositories/UserRepository";
import { UserExternalid } from "../../domain/value-objects/UserExternalid"
import { UserIsinactive } from "../../domain/value-objects/UserIsinactive";
import { UserInitials } from "../../domain/value-objects/UserInitials"; 
import { UserEntityid } from "../../domain/value-objects/UserEntityid";
import { UserFirtsname } from "../../domain/value-objects/UserFirstname";
import { UserLastname } from "../../domain/value-objects/UserLastname"
import { UserCustentity_gd_documento } from "../../domain/value-objects/UserCustentity_gd_documento";
import { UserCustentity_gd_digito_de_verificacion } from "../../domain/value-objects/UserCustentity_gd_digito_de_verificacion";
import { UserUserName } from "../../domain/value-objects/UserUserName";


export class UserCreate {
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
      new UserId(id),                                                       //id del usuario
      new UserName(name),                                                   //nombre de usuario
      new UserEmail(email),                                                 //email
      new UserExternalid(externalid),                                       //externalid de netsuite
      new UserIsinactive(isinactive),                                       //boolean es inactivo de netsuite y afecta al POS...si inactiva netsuite, inactiva en POS
      new UserInitials(initials),
      new UserEntityid(entityid),   
      new UserFirtsname(firstname),                                         //Nombre usuario
      new UserLastname(lastname),                                           //apellido
      new UserCustentity_gd_documento(custentity_gd_documento),             //rut numero
      new UserCustentity_gd_digito_de_verificacion(custentity_gd_digito_de_verificacion), //digito verificador del rut
      new UserUserName(username),                                         //username, para la cuenta...ejemplo mescorza...la cuenta adrizola es mescorza@adriazolarepuesto.com
      new UserCreatedAt(createdAt)                                        //fecha de creación

 
    );

    return this.repository.create(user);
  }
}
