import { Pool } from "pg";
import { EmployeRepository } from "../../domain/repositories/EmployeRepository";
import { Employe } from "../../domain/entities/Employe";
import { EmployeId } from "../../domain/value-objects/EmployeId";

type PostgresEmployeeRow = {
  id: string;
  externalid: string | null;
  entityid: string | null;
  employeecode: string | null;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  supervisorid: string | null;
  departmentid: string | null;
  locationexternalid: string | null;
  subsidiaryid: string | null;
  isinactive: boolean;
  createdat: Date;
  updatedat: Date;
  email_address_notif: string | null;
  gd_ch_tipo_documento_chile: string;
  gd_digito_de_verificacion: string;
  ar_id_empleado: string | null;
  title: string | null;
  salesrole: string | null;
  phone: string | null;
  gd_documento: string;
  officephone: string | null;
  mobilephone: string | null;
  middlename: string | null;
  initials: string | null;
  employeestatus: string | null;
  username: string | null;
};

/**
 * Adaptador Postgres del bounded context Employe, contra public.employee
 * REAL (28 columnas, verificadas por introspección — ver comentario en
 * Employe.ts). `name`, `custentityGdDocumento` y
 * `custentityGdDigitoDeVerificacion` no tienen columna propia: se ignoran
 * al escribir y vuelven en null al leer.
 */
export class PostgresEmployeRepository implements EmployeRepository {
  client: Pool;

  constructor(databaseUrl: string) {
    this.client = new Pool({
      connectionString: databaseUrl,
    });
  }

  async create(employe: Employe): Promise<void> {
    const query = {
      text: `INSERT INTO employee
        (id, externalid, entityid, employeecode, firstname, lastname, email,
         supervisorid, departmentid, locationexternalid, subsidiaryid, isinactive,
         createdat, updatedat, email_address_notif, gd_ch_tipo_documento_chile,
         gd_digito_de_verificacion, ar_id_empleado, title, salesrole, phone,
         gd_documento, officephone, mobilephone, middlename, initials,
         employeestatus, username)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
                $19,$20,$21,$22,$23,$24,$25,$26,$27,$28)`,
      values: [
        employe.id.value,
        employe.externalid?.value ?? null,
        employe.entityid?.value ?? null,
        employe.employeecode?.value ?? null,
        employe.firstname?.value ?? null,
        employe.lastname?.value ?? null,
        employe.email?.value ?? null,
        employe.supervisorid?.value ?? null,
        employe.departmentid?.value ?? null,
        employe.locationexternalid?.value ?? null,
        employe.subsidiaryid?.value ?? null,
        employe.isinactive.value,
        employe.createdAt.value,
        employe.updatedAt.value,
        employe.emailAddressNotif?.value ?? null,
        employe.gdChTipoDocumentoChile.value,
        employe.gdDigitoDeVerificacion.value,
        employe.arIdEmpleado?.value ?? null,
        employe.title?.value ?? null,
        employe.salesrole?.value ?? null,
        employe.phone?.value ?? null,
        employe.gdDocumento.value,
        employe.officephone?.value ?? null,
        employe.mobilephone?.value ?? null,
        employe.middlename?.value ?? null,
        employe.initials?.value ?? null,
        employe.employeestatus?.value ?? null,
        employe.username?.value ?? null,
      ],
    };

    await this.client.query(query);
  }

  async getAll(): Promise<Employe[]> {
    const result = await this.client.query<PostgresEmployeeRow>({
      text: "SELECT * FROM employee",
    });

    return result.rows.map((row) => this.mapToDomain(row));
  }

  async getOneById(id: EmployeId): Promise<Employe | null> {
    const result = await this.client.query<PostgresEmployeeRow>({
      text: "SELECT * FROM employee WHERE id = $1",
      values: [id.value],
    });

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToDomain(result.rows[0]);
  }

  async edit(employe: Employe): Promise<void> {
    const query = {
      text: `UPDATE employee SET
        externalid = $1, entityid = $2, employeecode = $3, firstname = $4, lastname = $5,
        email = $6, supervisorid = $7, departmentid = $8, locationexternalid = $9,
        subsidiaryid = $10, isinactive = $11, email_address_notif = $12,
        gd_ch_tipo_documento_chile = $13, gd_digito_de_verificacion = $14,
        ar_id_empleado = $15, title = $16, salesrole = $17, phone = $18,
        gd_documento = $19, officephone = $20, mobilephone = $21, middlename = $22,
        initials = $23, employeestatus = $24, username = $25
        WHERE id = $26`,
      values: [
        employe.externalid?.value ?? null,
        employe.entityid?.value ?? null,
        employe.employeecode?.value ?? null,
        employe.firstname?.value ?? null,
        employe.lastname?.value ?? null,
        employe.email?.value ?? null,
        employe.supervisorid?.value ?? null,
        employe.departmentid?.value ?? null,
        employe.locationexternalid?.value ?? null,
        employe.subsidiaryid?.value ?? null,
        employe.isinactive.value,
        employe.emailAddressNotif?.value ?? null,
        employe.gdChTipoDocumentoChile.value,
        employe.gdDigitoDeVerificacion.value,
        employe.arIdEmpleado?.value ?? null,
        employe.title?.value ?? null,
        employe.salesrole?.value ?? null,
        employe.phone?.value ?? null,
        employe.gdDocumento.value,
        employe.officephone?.value ?? null,
        employe.mobilephone?.value ?? null,
        employe.middlename?.value ?? null,
        employe.initials?.value ?? null,
        employe.employeestatus?.value ?? null,
        employe.username?.value ?? null,
        employe.id.value,
      ],
    };

    await this.client.query(query);
  }

  async delete(id: EmployeId): Promise<void> {
    const query = {
      text: "DELETE FROM employee WHERE id = $1",
      values: [id.value],
    };

    await this.client.query(query);
  }

  private mapToDomain(row: PostgresEmployeeRow): Employe {
    return Employe.fromPrimitives({
      id: String(row.id),
      isinactive: row.isinactive,
      gdChTipoDocumentoChile: String(row.gd_ch_tipo_documento_chile),
      gdDigitoDeVerificacion: row.gd_digito_de_verificacion,
      gdDocumento: row.gd_documento,
      externalid: row.externalid !== null ? String(row.externalid) : null,
      entityid: row.entityid !== null ? String(row.entityid) : null,
      employeecode: row.employeecode,
      firstname: row.firstname,
      lastname: row.lastname,
      email: row.email,
      supervisorid: row.supervisorid !== null ? String(row.supervisorid) : null,
      departmentid: row.departmentid !== null ? String(row.departmentid) : null,
      locationexternalid: row.locationexternalid !== null ? String(row.locationexternalid) : null,
      subsidiaryid: row.subsidiaryid !== null ? String(row.subsidiaryid) : null,
      createdAt: row.createdat,
      updatedAt: row.updatedat,
      emailAddressNotif: row.email_address_notif,
      arIdEmpleado: row.ar_id_empleado,
      title: row.title,
      salesrole: row.salesrole !== null ? String(row.salesrole) : null,
      phone: row.phone,
      officephone: row.officephone,
      mobilephone: row.mobilephone,
      middlename: row.middlename,
      initials: row.initials,
      employeestatus: row.employeestatus !== null ? String(row.employeestatus) : null,
      username: row.username,
      // name, custentityGdDocumento, custentityGdDigitoDeVerificacion:
      // sin columna propia -> se omiten (quedan null).
    });
  }
}
