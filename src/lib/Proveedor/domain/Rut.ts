/**
 * Dígito verificador de un RUT chileno (módulo 11, serie 2..7).
 * Devuelve "0".."9" o "K". Única validación de negocio pedida para el
 * mantenedor (docs/proveedores_mantenedor.md §0 #2), y sólo cuando el
 * país del proveedor es Chile.
 */
export function calcularDvChile(nrorut: string): string {
  let suma = 0;
  let factor = 2;
  for (let i = nrorut.length - 1; i >= 0; i--) {
    suma += Number(nrorut[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const dv = 11 - (suma % 11);
  if (dv === 11) return "0";
  if (dv === 10) return "K";
  return String(dv);
}

export function esRutChileValido(nrorut: string, verificador: string): boolean {
  return /^\d+$/.test(nrorut) && calcularDvChile(nrorut) === verificador.toUpperCase();
}
