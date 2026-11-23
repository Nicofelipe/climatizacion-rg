import ExcelJS from 'exceljs';
import path from 'node:path';
import { getExpenses } from './expense.service';

type Expense = Awaited<ReturnType<typeof getExpenses>>[number];
const date = (value: Date | string) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
/** Fecha y hora de Chile, legible y ordenable. */
const registered = (value: unknown) => {
  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Santiago', dateStyle: 'short', timeStyle: 'short' }).format(parsed) : '';
};
const labels: Record<string, string> = { PENDING: 'Pendiente', APPROVED: 'Aprobada', REJECTED: 'Rechazada' };
const vatLabels: Record<string, string> = { CALCULATED: 'Calculado 19%', RECEIPT: 'Impreso en documento', EXEMPT: 'Exento', NOT_STATED: 'No informado' };
const navy = 'FF0A4F4D', teal = 'FF0B7F7C', light = 'FFDDF5F4', gray = 'FF4A5963', stripe = 'FFF4F8F8';
const moneyKeys = ['NetAmount', 'VatAmount', 'TotalAmount'] as const;
const totals = (rows: Expense[]) => moneyKeys.map(key => rows.reduce((sum, row) => sum + Number(row[key]), 0));

function paintRow(row: ExcelJS.Row, last: number, background: string, foreground: string, bold = false) {
  for (let col = 1; col <= last; col++) {
    const cell = row.getCell(col);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: background } };
    cell.font = { name: 'Aptos', size: 11, bold, color: { argb: foreground } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  }
}

export function reportPeriod(year: unknown, month: unknown, now = new Date()) {
  const current = Number(new Intl.DateTimeFormat('en', { timeZone: 'America/Santiago', year: 'numeric' }).format(now));
  if (typeof year !== 'string' || !/^20\d{2}$/.test(year) || Number(year) > current) throw new Error('REPORT_PERIOD_INVALID');
  if (month !== undefined && (typeof month !== 'string' || !/^(0[1-9]|1[0-2])$/.test(month))) throw new Error('REPORT_PERIOD_INVALID');
  return { year, month: month as string | undefined, prefix: month ? `${year}-${month}` : year };
}
/** Rango de fechas del período, para no leer todo el historial de la empresa. */
export function reportRange(period: ReturnType<typeof reportPeriod>) {
  const last = period.month ? new Date(Date.UTC(Number(period.year), Number(period.month), 0)).getUTCDate() : 31;
  return { from: `${period.year}-${period.month ?? '01'}-01`, to: `${period.year}-${period.month ?? '12'}-${String(last).padStart(2, '0')}` };
}

export async function buildExpenseWorkbook(expenses: Expense[], period: ReturnType<typeof reportPeriod>, scope: string, companyName = 'Empresa') {
  const rows = expenses.filter(row => date(row.ExpenseDate).startsWith(period.prefix))
    .sort((a, b) => date(b.ExpenseDate).localeCompare(date(a.ExpenseDate)) || b.Id - a.Id);
  if (rows.length > 20000) throw new Error('REPORT_TOO_LARGE');
  const approved = rows.filter(row => row.Status === 'APPROVED'), other = rows.filter(row => row.Status !== 'APPROVED');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Clepit Gestión de Boletas';
  workbook.created = new Date();
  const logo = workbook.addImage({ filename: path.resolve(__dirname, '../../assets/clepit-logo.png'), extension: 'png' });
  const periodLabel = period.month ? new Date(`${period.prefix}-15T12:00:00Z`).toLocaleDateString('es-CL', { month: 'long', year: 'numeric', timeZone: 'America/Santiago' }) : `${period.year} · enero a diciembre`;
  const scopeLabel = scope === 'company' ? 'Toda la empresa' : 'Mis boletas';

  function heading(ws: ExcelJS.Worksheet, title: string, last: number) {
    ws.views = [{ showGridLines: false, state: 'frozen', ySplit: 8 }];
    ws.mergeCells(1, 3, 3, last);
    const cell = ws.getCell(1, 3);
    cell.value = title;
    cell.font = { name: 'Aptos Display', size: 16, bold: true, color: { argb: navy } };
    cell.alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
    ws.addImage(logo, { tl: { col: 0, row: 0 }, ext: { width: 200, height: 76 }, editAs: 'oneCell' });
    for (const n of [1, 2, 3]) ws.getRow(n).height = 21;
    for (const [row, text] of [[4, companyName], [5, `Período: ${periodLabel}   ·   ${scopeLabel}`], [6, 'Moneda: CLP · agrupado por fecha de la boleta, no por fecha de registro']] as const) {
      ws.mergeCells(row, 1, row, last);
      ws.getCell(row, 1).value = text;
      ws.getCell(row, 1).font = { name: 'Aptos', size: row === 4 ? 14 : 11, bold: row === 4, color: { argb: row === 4 ? navy : gray } };
      ws.getRow(row).height = 23;
    }
    ws.properties.defaultRowHeight = 22;
    ws.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  }

  const summary = workbook.addWorksheet('Resumen');
  summary.columns = [{ width: 44 }, { width: 15 }, { width: 23 }, { width: 23 }, { width: 25 }];
  heading(summary, 'RESUMEN DE RENDICIONES', 5);
  summary.getRow(8).values = ['Estado', 'Cantidad', 'Total sin IVA', 'IVA', 'Total CLP'];
  for (const [index, status] of ['APPROVED', 'PENDING', 'REJECTED'].entries()) {
    const values = rows.filter(row => row.Status === status);
    summary.getRow(9 + index).values = [labels[status], values.length, ...totals(values)];
  }
  summary.getRow(13).values = ['TOTAL APROBADO PARA REVISIÓN CONTABLE', approved.length, ...totals(approved)];
  summary.getRow(15).values = ['Total registrado (todos los estados)', rows.length, ...totals(rows)];
  const unstated = approved.filter(row => row.VatSource === 'NOT_STATED').length;
  const notes = [
    'Boletas aprobadas: detalle exclusivo de los registros aprobados. Pendientes y rechazadas van en una hoja aparte.',
    'Total sin IVA incluye montos exentos e impuestos específicos (por ejemplo, combustible).',
    unstated ? `${unstated} boleta(s) aprobada(s) sin IVA informado: su IVA figura en 0 y debe revisarse con el documento.` : 'La aprobación de la empresa no sustituye la revisión de la contadora.',
  ];
  notes.forEach((text, index) => {
    const n = 17 + index;
    summary.mergeCells(n, 1, n, 5);
    summary.getCell(n, 1).value = text;
    summary.getCell(n, 1).font = { size: 11, color: { argb: gray } };
    summary.getRow(n).height = 24;
  });
  for (const n of [8, 13]) { paintRow(summary.getRow(n), 5, n === 8 ? navy : teal, 'FFFFFFFF', true); summary.getRow(n).height = n === 13 ? 42 : 30; }
  for (const n of [9, 10, 11, 15]) { paintRow(summary.getRow(n), 5, n % 2 ? stripe : 'FFFFFFFF', navy); summary.getRow(n).height = 28; }

  // Gasto aprobado por tipo e integrante, listo para la contadora.
  let next = 21;
  for (const [title, key] of [['Aprobado por tipo de gasto', 'ExpenseTypeName'], ['Aprobado por integrante', 'UserName']] as const) {
    const groups = new Map<string, Expense[]>();
    for (const row of approved) groups.set(row[key], [...(groups.get(row[key]) ?? []), row]);
    if (!groups.size) continue;
    summary.getRow(next).values = [title, 'Cantidad', 'Total sin IVA', 'IVA', 'Total CLP'];
    paintRow(summary.getRow(next), 5, navy, 'FFFFFFFF', true);
    for (const [name, values] of [...groups].sort((a, b) => totals(b[1])[2] - totals(a[1])[2])) {
      next++;
      summary.getRow(next).values = [name, values.length, ...totals(values)];
      paintRow(summary.getRow(next), 5, 'FFFFFFFF', navy);
    }
    next += 2;
  }
  for (let col = 3; col <= 5; col++) summary.getColumn(col).numFmt = '#,##0';
  summary.pageSetup.printArea = `A1:E${Math.max(19, next - 2)}`;

  const columns = ['ID', 'Fecha boleta', 'Integrante', 'Código boleta', 'Tipo de gasto', 'Total sin IVA', 'IVA', 'Total CLP', 'Origen del IVA', 'Estado',
    'Documento', 'Proveedor', 'RUT proveedor', 'Descripción', 'Motivo de rechazo', 'Registrada (hora Chile)'];
  function detail(name: string, values: Expense[], tableName: string) {
    const ws = workbook.addWorksheet(name);
    ws.columns = [10, 15, 28, 20, 20, 17, 15, 17, 22, 14, 14, 28, 17, 40, 40, 22].map(width => ({ width }));
    heading(ws, name.toUpperCase(), columns.length);
    const data = values.map(row => [row.Id, date(row.ExpenseDate), row.UserName, row.ReceiptNumber, row.ExpenseTypeName,
      Number(row.NetAmount), Number(row.VatAmount), Number(row.TotalAmount), vatLabels[row.VatSource] ?? 'Calculado 19%', labels[row.Status] ?? row.Status,
      row.DocumentType === 'FACTURA' ? 'Factura' : 'Boleta', row.SupplierName ?? '', row.SupplierRut ?? '', row.Description ?? '', row.RejectionReason ?? '', registered(row.CreatedAt)]);
    ws.addTable({ name: tableName, ref: 'A8', headerRow: true, totalsRow: false, style: { theme: 'TableStyleMedium2', showRowStripes: true }, columns: columns.map(column => ({ name: column, filterButton: true })), rows: data });
    ws.getRow(8).height = 30;
    paintRow(ws.getRow(8), columns.length, navy, 'FFFFFFFF', true);
    const totalRow = ws.getRow(10 + values.length);
    ws.mergeCells(totalRow.number, 1, totalRow.number, 5);
    totalRow.getCell(1).value = name === 'Boletas aprobadas' ? 'TOTAL APROBADO' : 'TOTAL PENDIENTES Y RECHAZADAS';
    totals(values).forEach((value, index) => { totalRow.getCell(6 + index).value = value; });
    paintRow(totalRow, columns.length, light, teal, true);
    totalRow.height = 30;
    for (const col of [6, 7, 8]) ws.getColumn(col).numFmt = '#,##0';
    ws.pageSetup.printTitlesRow = '1:8';
    ws.pageSetup.printArea = `A1:P${totalRow.number}`;
    if (!values.length) { ws.mergeCells(9, 1, 9, 5); ws.getCell('A9').value = 'Sin boletas de este estado en el período.'; ws.getCell('A9').font = { italic: true, color: { argb: gray } }; }
  }
  detail('Boletas aprobadas', approved, 'ClepitAprobadas');
  detail('Pendientes y rechazadas', other, 'ClepitPorRevisar');
  return { buffer: Buffer.from(await workbook.xlsx.writeBuffer()), count: rows.length };
}
