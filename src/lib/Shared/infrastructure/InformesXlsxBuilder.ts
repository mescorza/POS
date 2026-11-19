import { Workbook } from "exceljs";
import { TableStructure } from "./InformesRepository";

// Tipografía y tamaños del informe "Estructura de tablas": Calibri en toda
// la hoja, 11pt en negrita para el título "Tabla: <nombre>" y 10pt (negrita
// en el encabezado, normal en los datos) para el resto — mismo tamaño de
// letra en todas las columnas, como pide el formato de salida.
const FONT_NAME = "Calibri";
const TITLE_FONT = { name: FONT_NAME, size: 11, bold: true };
const HEADER_FONT = { name: FONT_NAME, size: 10, bold: true };
const DATA_FONT = { name: FONT_NAME, size: 10, bold: false };

const COLUMN_HEADERS = ["Columna", "Descripción", "Tipo Dato", "Longitud", "NOT NULL"];
const COLUMN_WIDTHS = [30, 40, 20, 12, 12];

/**
 * Arma el .xlsx del informe "Estructura de tablas" respetando literalmente
 * el formato entregado: por cada tabla, una fila "Tabla: <nombre>", dos
 * filas en blanco, la fila de encabezados (Columna/Descripción/Tipo
 * Dato/Longitud/NOT NULL) y una fila por columna (NOT NULL = "SI" sólo si
 * la columna no admite nulos; en caso contrario queda en blanco, igual que
 * Longitud para tipos sin longitud aplicable).
 */
export function buildEstructuraTablasWorkbook(structures: TableStructure[]): Workbook {
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet("Estructura");

  sheet.columns = COLUMN_WIDTHS.map((width) => ({ width }));

  structures.forEach((structure, index) => {
    if (index > 0) {
      sheet.addRow([]);
    }

    const titleRow = sheet.addRow([`Tabla: ${structure.tableName}`]);
    titleRow.getCell(1).font = TITLE_FONT;

    sheet.addRow([]);
    sheet.addRow([]);

    const headerRow = sheet.addRow(COLUMN_HEADERS);
    headerRow.eachCell((cell) => {
      cell.font = HEADER_FONT;
    });

    for (const column of structure.columns) {
      const dataRow = sheet.addRow([
        column.columnName,
        column.description ?? "",
        column.dataType,
        column.length ?? "",
        column.notNull ? "SI" : "",
      ]);
      dataRow.eachCell((cell) => {
        cell.font = DATA_FONT;
      });
    }
  });

  return workbook;
}
