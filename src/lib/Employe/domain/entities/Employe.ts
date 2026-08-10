import { EmployeId } from '../value-objects/EmployeId';
import { EmployeName } from '../value-objects/EmployeName';
import { EmployeExternalid } from '../value-objects/EmployeExternalid';
import { EmployeIsinactive } from '../value-objects/EmployeIsinactive';
import { EmployeInitials } from '../value-objects/EmployeInitials';
import { EmployeEntityid } from '../value-objects/EmployeEntityid';
import { EmployeFirstname } from '../value-objects/EmployeFirstname';
import { EmployeLastname } from '../value-objects/EmployeLastname';
import { EmployeEmail } from '../value-objects/EmployeEmail';
import { EmployeCustentityGdDocumento } from '../value-objects/EmployeCustentityGdDocumento';
import { EmployeCustentityGdDigitoDeVerificacion } from '../value-objects/EmployeCustentityGdDigitoDeVerificacion';
import { EmployeUsername } from '../value-objects/EmployeUsername';
import { EmployeCode } from '../value-objects/EmployeCode';
import { EmployeSupervisorid } from '../value-objects/EmployeSupervisorid';
import { EmployeDepartmentid } from '../value-objects/EmployeDepartmentid';
import { EmployeLocationexternalid } from '../value-objects/EmployeLocationexternalid';
import { EmployeSubsidiaryid } from '../value-objects/EmployeSubsidiaryid';
import { EmployeCreatedAt } from '../value-objects/EmployeCreatedAt';
import { EmployeUpdatedAt } from '../value-objects/EmployeUpdatedAt';
import { EmployeGdChTipoDocumentoChile } from '../value-objects/EmployeGdChTipoDocumentoChile';
import { EmployeGdDigitoDeVerificacion } from '../value-objects/EmployeGdDigitoDeVerificacion';
import { EmployeGdDocumento } from '../value-objects/EmployeGdDocumento';
import { EmployeEmailAddressNotif } from '../value-objects/EmployeEmailAddressNotif';
import { EmployeArIdEmpleado } from '../value-objects/EmployeArIdEmpleado';
import { EmployeTitle } from '../value-objects/EmployeTitle';
import { EmployeSalesrole } from '../value-objects/EmployeSalesrole';
import { EmployePhone } from '../value-objects/EmployePhone';
import { EmployeOfficephone } from '../value-objects/EmployeOfficephone';
import { EmployeMobilephone } from '../value-objects/EmployeMobilephone';
import { EmployeMiddlename } from '../value-objects/EmployeMiddlename';
import { EmployeEmployeestatus } from '../value-objects/EmployeEmployeestatus';

/**
 * Entidad de dominio del bounded context Employe.
 *
 * Mapea 1:1 contra la tabla public.employee REAL de la base "POS"
 * (verificada por introspección: information_schema.columns, y confirmada
 * contra el DDL exportado en POS_..._USUARIOS_V2.docx), que trae varias
 * columnas de sincronización NetSuite que _v_datos/modelo_usuarios.sql no
 * documenta: email_address_notif, gd_ch_tipo_documento_chile,
 * gd_digito_de_verificacion, ar_id_empleado, title, salesrole, phone,
 * gd_documento, officephone, mobilephone, middlename, initials,
 * employeestatus, username. `gd_ch_tipo_documento_chile`,
 * `gd_digito_de_verificacion` y `gd_documento` son NOT NULL sin default:
 * toda creación vía Postgres debe proveerlos. Estas tres, junto con
 * `email_address_notif/ar_id_empleado/title/phone/officephone/mobilephone`,
 * son ESCALARES (varchar/bit varying simples) — se modelaron como arreglo
 * en una primera pasada por lectura incorrecta del esquema; se corrigió
 * tras verificar el DDL real (V2).
 *
 * `name, custentityGdDocumento, custentityGdDigitoDeVerificacion` se
 * mantienen desde antes de esta introspección aunque no tengan columna
 * propia (name nunca la tuvo; custentityGdDocumento/DigitoDeVerificacion
 * son variantes heredadas del mismo dato que ahora exponen gd_documento/
 * gd_digito_de_verificacion). No se persisten en Postgres;
 * InMemoryEmployeRepository sí los conserva.
 */
export interface EmployePrimitives {
  id: string;
  gdChTipoDocumentoChile: string;
  gdDigitoDeVerificacion: string;
  gdDocumento: string;
  isinactive?: boolean;
  externalid?: string | null;
  entityid?: string | null;
  employeecode?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  email?: string | null;
  supervisorid?: string | null;
  departmentid?: string | null;
  locationexternalid?: string | null;
  subsidiaryid?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  emailAddressNotif?: string | null;
  arIdEmpleado?: string | null;
  title?: string | null;
  salesrole?: string | null;
  phone?: string | null;
  officephone?: string | null;
  mobilephone?: string | null;
  middlename?: string | null;
  initials?: string | null;
  employeestatus?: string | null;
  username?: string | null;
  // Campos heredados sin columna propia confirmada (ver nota arriba).
  name?: string | null;
  custentityGdDocumento?: string | null;
  custentityGdDigitoDeVerificacion?: string | null;
}

export interface EmployeProps {
  id: EmployeId;
  isinactive: EmployeIsinactive;
  gdChTipoDocumentoChile: EmployeGdChTipoDocumentoChile;
  gdDigitoDeVerificacion: EmployeGdDigitoDeVerificacion;
  gdDocumento: EmployeGdDocumento;
  externalid?: EmployeExternalid | null;
  entityid?: EmployeEntityid | null;
  employeecode?: EmployeCode | null;
  firstname?: EmployeFirstname | null;
  lastname?: EmployeLastname | null;
  email?: EmployeEmail | null;
  supervisorid?: EmployeSupervisorid | null;
  departmentid?: EmployeDepartmentid | null;
  locationexternalid?: EmployeLocationexternalid | null;
  subsidiaryid?: EmployeSubsidiaryid | null;
  createdAt?: EmployeCreatedAt;
  updatedAt?: EmployeUpdatedAt;
  emailAddressNotif?: EmployeEmailAddressNotif | null;
  arIdEmpleado?: EmployeArIdEmpleado | null;
  title?: EmployeTitle | null;
  salesrole?: EmployeSalesrole | null;
  phone?: EmployePhone | null;
  officephone?: EmployeOfficephone | null;
  mobilephone?: EmployeMobilephone | null;
  middlename?: EmployeMiddlename | null;
  initials?: EmployeInitials | null;
  employeestatus?: EmployeEmployeestatus | null;
  username?: EmployeUsername | null;
  name?: EmployeName | null;
  custentityGdDocumento?: EmployeCustentityGdDocumento | null;
  custentityGdDigitoDeVerificacion?: EmployeCustentityGdDigitoDeVerificacion | null;
}

export class Employe {
  public readonly id: EmployeId;
  public readonly isinactive: EmployeIsinactive;
  public readonly gdChTipoDocumentoChile: EmployeGdChTipoDocumentoChile;
  public readonly gdDigitoDeVerificacion: EmployeGdDigitoDeVerificacion;
  public readonly gdDocumento: EmployeGdDocumento;
  public readonly externalid: EmployeExternalid | null;
  public readonly entityid: EmployeEntityid | null;
  public readonly employeecode: EmployeCode | null;
  public readonly firstname: EmployeFirstname | null;
  public readonly lastname: EmployeLastname | null;
  public readonly email: EmployeEmail | null;
  public readonly supervisorid: EmployeSupervisorid | null;
  public readonly departmentid: EmployeDepartmentid | null;
  public readonly locationexternalid: EmployeLocationexternalid | null;
  public readonly subsidiaryid: EmployeSubsidiaryid | null;
  public readonly createdAt: EmployeCreatedAt;
  public readonly updatedAt: EmployeUpdatedAt;
  public readonly emailAddressNotif: EmployeEmailAddressNotif | null;
  public readonly arIdEmpleado: EmployeArIdEmpleado | null;
  public readonly title: EmployeTitle | null;
  public readonly salesrole: EmployeSalesrole | null;
  public readonly phone: EmployePhone | null;
  public readonly officephone: EmployeOfficephone | null;
  public readonly mobilephone: EmployeMobilephone | null;
  public readonly middlename: EmployeMiddlename | null;
  public readonly initials: EmployeInitials | null;
  public readonly employeestatus: EmployeEmployeestatus | null;
  public readonly username: EmployeUsername | null;
  public readonly name: EmployeName | null;
  public readonly custentityGdDocumento: EmployeCustentityGdDocumento | null;
  public readonly custentityGdDigitoDeVerificacion: EmployeCustentityGdDigitoDeVerificacion | null;

  constructor(props: EmployeProps) {
    this.id = props.id;
    this.isinactive = props.isinactive;
    this.gdChTipoDocumentoChile = props.gdChTipoDocumentoChile;
    this.gdDigitoDeVerificacion = props.gdDigitoDeVerificacion;
    this.gdDocumento = props.gdDocumento;
    this.externalid = props.externalid ?? null;
    this.entityid = props.entityid ?? null;
    this.employeecode = props.employeecode ?? null;
    this.firstname = props.firstname ?? null;
    this.lastname = props.lastname ?? null;
    this.email = props.email ?? null;
    this.supervisorid = props.supervisorid ?? null;
    this.departmentid = props.departmentid ?? null;
    this.locationexternalid = props.locationexternalid ?? null;
    this.subsidiaryid = props.subsidiaryid ?? null;
    this.createdAt = props.createdAt ?? new EmployeCreatedAt(new Date());
    this.updatedAt = props.updatedAt ?? new EmployeUpdatedAt(new Date());
    this.emailAddressNotif = props.emailAddressNotif ?? null;
    this.arIdEmpleado = props.arIdEmpleado ?? null;
    this.title = props.title ?? null;
    this.salesrole = props.salesrole ?? null;
    this.phone = props.phone ?? null;
    this.officephone = props.officephone ?? null;
    this.mobilephone = props.mobilephone ?? null;
    this.middlename = props.middlename ?? null;
    this.initials = props.initials ?? null;
    this.employeestatus = props.employeestatus ?? null;
    this.username = props.username ?? null;
    this.name = props.name ?? null;
    this.custentityGdDocumento = props.custentityGdDocumento ?? null;
    this.custentityGdDigitoDeVerificacion = props.custentityGdDigitoDeVerificacion ?? null;
  }

  static fromPrimitives(data: EmployePrimitives): Employe {
    return new Employe({
      id: new EmployeId(data.id),
      isinactive: new EmployeIsinactive(data.isinactive ?? false),
      gdChTipoDocumentoChile: new EmployeGdChTipoDocumentoChile(data.gdChTipoDocumentoChile),
      gdDigitoDeVerificacion: new EmployeGdDigitoDeVerificacion(data.gdDigitoDeVerificacion),
      gdDocumento: new EmployeGdDocumento(data.gdDocumento),
      externalid: data.externalid ? new EmployeExternalid(data.externalid) : null,
      entityid: data.entityid ? new EmployeEntityid(data.entityid) : null,
      employeecode: data.employeecode ? new EmployeCode(data.employeecode) : null,
      firstname: data.firstname ? new EmployeFirstname(data.firstname) : null,
      lastname: data.lastname ? new EmployeLastname(data.lastname) : null,
      email: data.email ? new EmployeEmail(data.email) : null,
      supervisorid: data.supervisorid ? new EmployeSupervisorid(data.supervisorid) : null,
      departmentid: data.departmentid ? new EmployeDepartmentid(data.departmentid) : null,
      locationexternalid: data.locationexternalid
        ? new EmployeLocationexternalid(data.locationexternalid)
        : null,
      subsidiaryid: data.subsidiaryid ? new EmployeSubsidiaryid(data.subsidiaryid) : null,
      createdAt: data.createdAt ? new EmployeCreatedAt(data.createdAt) : undefined,
      updatedAt: data.updatedAt ? new EmployeUpdatedAt(data.updatedAt) : undefined,
      emailAddressNotif: data.emailAddressNotif ? new EmployeEmailAddressNotif(data.emailAddressNotif) : null,
      arIdEmpleado: data.arIdEmpleado ? new EmployeArIdEmpleado(data.arIdEmpleado) : null,
      title: data.title ? new EmployeTitle(data.title) : null,
      salesrole: data.salesrole ? new EmployeSalesrole(data.salesrole) : null,
      phone: data.phone ? new EmployePhone(data.phone) : null,
      officephone: data.officephone ? new EmployeOfficephone(data.officephone) : null,
      mobilephone: data.mobilephone ? new EmployeMobilephone(data.mobilephone) : null,
      middlename: data.middlename ? new EmployeMiddlename(data.middlename) : null,
      initials: data.initials ? new EmployeInitials(data.initials) : null,
      employeestatus: data.employeestatus ? new EmployeEmployeestatus(data.employeestatus) : null,
      username: data.username ? new EmployeUsername(data.username) : null,
      name: data.name ? new EmployeName(data.name) : null,
      custentityGdDocumento: data.custentityGdDocumento
        ? new EmployeCustentityGdDocumento(data.custentityGdDocumento)
        : null,
      custentityGdDigitoDeVerificacion: data.custentityGdDigitoDeVerificacion
        ? new EmployeCustentityGdDigitoDeVerificacion(data.custentityGdDigitoDeVerificacion)
        : null,
    });
  }

  public mapToPrimitives(): EmployePrimitives {
    return {
      id: this.id.value,
      isinactive: this.isinactive.value,
      gdChTipoDocumentoChile: this.gdChTipoDocumentoChile.value,
      gdDigitoDeVerificacion: this.gdDigitoDeVerificacion.value,
      gdDocumento: this.gdDocumento.value,
      externalid: this.externalid?.value ?? null,
      entityid: this.entityid?.value ?? null,
      employeecode: this.employeecode?.value ?? null,
      firstname: this.firstname?.value ?? null,
      lastname: this.lastname?.value ?? null,
      email: this.email?.value ?? null,
      supervisorid: this.supervisorid?.value ?? null,
      departmentid: this.departmentid?.value ?? null,
      locationexternalid: this.locationexternalid?.value ?? null,
      subsidiaryid: this.subsidiaryid?.value ?? null,
      createdAt: this.createdAt.value,
      updatedAt: this.updatedAt.value,
      emailAddressNotif: this.emailAddressNotif?.value ?? null,
      arIdEmpleado: this.arIdEmpleado?.value ?? null,
      title: this.title?.value ?? null,
      salesrole: this.salesrole?.value ?? null,
      phone: this.phone?.value ?? null,
      officephone: this.officephone?.value ?? null,
      mobilephone: this.mobilephone?.value ?? null,
      middlename: this.middlename?.value ?? null,
      initials: this.initials?.value ?? null,
      employeestatus: this.employeestatus?.value ?? null,
      username: this.username?.value ?? null,
      name: this.name?.value ?? null,
      custentityGdDocumento: this.custentityGdDocumento?.value ?? null,
      custentityGdDigitoDeVerificacion: this.custentityGdDigitoDeVerificacion?.value ?? null,
    };
  }
}
