export class EmployeEmailAddressNotif {
  // employee.email_address_notif: bit varying(254) NULL. Se conserva como
  // string tal cual llega; no se le atribuye semántica adicional.
  constructor(public readonly value: string) {}
}
