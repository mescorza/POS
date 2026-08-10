/**
 * Adaptador de entrada del módulo Employe hacia la API Express existente
 * (ExpressEmployeRouter -> ServiceEmployeContainer.employe), mismo patrón
 * que UserHttpGateway.
 */
export interface EmployeListItem {
  id: string;
  firstname: string | null;
  lastname: string | null;
  employeecode: string | null;
  email: string | null;
  isinactive: boolean;
  gdDocumento: string;
  gdDigitoDeVerificacion: string;
  entityid: string | null;
  departmentid: string | null;
  subsidiaryid: string | null;
  initials: string | null;
  username: string | null;
}

/**
 * Espejo completo de EmployePrimitives (src/lib/Employe/domain/entities/Employe.ts):
 * TODAS las columnas de employee, no un subconjunto. Es a propósito —
 * PostgresEmployeRepository.edit() sobreescribe todas las columnas con lo
 * que reciba, así que cualquier campo que falte acá se borra en silencio
 * al guardar (bug real que esto reemplaza: employeecode/username/externalid/
 * etc. se estaban perdiendo al editar sólo nombre/RUT).
 */
export interface EmployeFullRecord {
  id: string;
  gdChTipoDocumentoChile?: string;
  gdDigitoDeVerificacion?: string;
  gdDocumento?: string;
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
  createdAt?: string;
  updatedAt?: string;
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
  name?: string | null;
  custentityGdDocumento?: string | null;
  custentityGdDigitoDeVerificacion?: string | null;
}

export type EmployeDetail = EmployeFullRecord;
export type SaveEmployeInput = EmployeFullRecord;

// Placeholders sólo para un alta nueva desde cero (EmployeListPage F3), cuando
// el formulario todavía no capturó RUT/DV. "" es un valor NOT NULL válido.
const NETSUITE_REQUIRED_PLACEHOLDERS = {
  gdChTipoDocumentoChile: "1",
  gdDigitoDeVerificacion: "",
  gdDocumento: "",
};

export class EmployeHttpGateway {
  async search(): Promise<EmployeListItem[]> {
    const response = await fetch("/employe");

    if (!response.ok) {
      throw new Error(`No se pudo obtener la lista de empleados (HTTP ${response.status})`);
    }

    return response.json();
  }

  /** GET /employe/:id -> EmployeGetOneById. Trae el registro completo (las 28 columnas). */
  async getById(id: string): Promise<EmployeDetail> {
    const response = await fetch(`/employe/${id}`);

    if (!response.ok) {
      throw new Error(`No se pudo obtener el empleado ${id} (HTTP ${response.status})`);
    }

    return response.json();
  }

  /** POST /employe -> CreateEmploye. */
  async create(input: Partial<SaveEmployeInput> & { id: string }): Promise<EmployeListItem> {
    const response = await fetch("/employe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...NETSUITE_REQUIRED_PLACEHOLDERS, ...input }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.message ?? `No se pudo crear el empleado (HTTP ${response.status})`);
    }

    return response.json();
  }

  /**
   * PUT /employe -> EmployeEdit. El id va en el body (el router no usa :id
   * en PUT). Se espera el registro COMPLETO (ver EmployeFullRecord) —
   * normalmente el resultado de getById() con sólo los campos editados
   * sobreescritos — para no perder columnas que el formulario no muestra.
   */
  async edit(input: SaveEmployeInput): Promise<void> {
    const response = await fetch("/employe", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.message ?? `No se pudo editar el empleado (HTTP ${response.status})`);
    }
  }
}
