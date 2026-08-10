import { UserCreatedAt } from "./value-objects/UserCreatedAt";
import { UserEmail } from "./value-objects/UserEmail";
import { UserId } from "./value-objects/UserId";
import { UserName } from "./value-objects/UserName";
import { UserUserName } from "./value-objects/UserUserName";
import { UserExternalid } from "./value-objects/UserExternalid"
import { UserIsinactive } from "./value-objects/UserIsinactive";
import { UserInitials } from "./value-objects/UserInitials"; 
import { UserEntityid } from "./value-objects/UserEntityid";
import { UserFirtsname } from "./value-objects/UserFirstname";
import { UserLastname } from "./value-objects/UserLastname"
import { UserCustentity_gd_documento } from "./value-objects/UserCustentity_gd_documento";
import { UserCustentity_gd_digito_de_verificacion } from "./value-objects/UserCustentity_gd_digito_de_verificacion";

export class User {
  id: UserId;
  name: UserName;
  email: UserEmail;
  externalid: UserExternalid;
  isinactive: UserIsinactive;
  initials: UserInitials;
  entityid: UserEntityid;
  firstname: UserFirtsname;
  lastname: UserLastname;
  custentity_gd_documento: UserCustentity_gd_documento;
  custentity_gd_digito_de_verificacion: UserCustentity_gd_digito_de_verificacion;
  username: UserUserName;
  createdAt: UserCreatedAt;

  constructor(
    id: UserId,
    name: UserName,
    email: UserEmail,
    externalid: UserExternalid,
    isinactive: UserIsinactive,
    initials: UserInitials,
    entityid: UserEntityid,
    firstname: UserFirtsname,
    lastname: UserLastname,
    custentity_gd_documento: UserCustentity_gd_documento,
    custentity_gd_digito_de_verificacion: UserCustentity_gd_digito_de_verificacion,
    username : UserUserName,
    createdAt: UserCreatedAt
  ) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.externalid = externalid;
    this.isinactive = isinactive;
    this.initials = initials;
    this.entityid = entityid;
    this.firstname = firstname;
    this.lastname = lastname;
    this.custentity_gd_documento = custentity_gd_documento;
    this.custentity_gd_digito_de_verificacion = custentity_gd_digito_de_verificacion;
    this.username = username;
    this.createdAt = createdAt;
  }

  public nameAndEmail() {
    return `${this.name} - ${this.email}`;
  }

  
}


      