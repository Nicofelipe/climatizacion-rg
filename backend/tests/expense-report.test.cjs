require('tsx/cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),ExcelJS=require('exceljs');
const {buildExpenseWorkbook,reportPeriod,reportRange}=require('../src/services/expenseReport.service.ts');
const row=(Id,date,status='APPROVED')=>({Id,UserId:5,UserName:'=HYPERLINK("https://example.invalid")',ReceiptNumber:'=1+1',ExpenseDate:date,ExpenseTypeName:'Materiales',SupplierName:'Proveedor',SupplierRut:'76543210-3',DocumentType:'BOLETA',VatSource:Id===5?'NOT_STATED':'CALCULATED',RejectionReason:status==='REJECTED'?'Foto ilegible':null,NetAmount:100,VatAmount:19,TotalAmount:119,Status:status,CreatedAt:'2026-10-22T00:00:00Z',Description:'Detalle'});
test('Excel uses receipt dates and January–December boundaries, with typed amounts and literal untrusted text',async()=>{
 const rows=[row(1,'2025-12-31'),row(2,'2026-01-01'),row(3,'2026-10-01','PENDING'),row(4,'2026-10-31','REJECTED'),row(5,'2026-12-31'),row(6,'2027-01-01')];
 const annual=await buildExpenseWorkbook(rows,reportPeriod('2026',undefined),'company','Empresa de prueba');assert.equal(annual.count,4);
 const book=new ExcelJS.Workbook();await book.xlsx.load(annual.buffer);
 const sheet=book.getWorksheet('Boletas aprobadas');assert.deepEqual(sheet.getRows(9,2).map(row=>row.getCell(1).value),[5,2]);assert.equal(sheet.getCell('C9').type,ExcelJS.ValueType.String);assert.equal(sheet.getCell('D9').value,'=1+1');assert.equal(sheet.getCell('H9').value,119);
 assert.deepEqual([sheet.getCell('F12').value,sheet.getCell('G12').value,sheet.getCell('H12').value],[200,38,238]);
 const other=book.getWorksheet('Pendientes y rechazadas');assert.deepEqual(other.getRows(9,2).map(row=>row.getCell(1).value),[4,3]);assert.equal(other.getCell('J9').value,'Rechazada');assert.equal(other.getCell('O9').value,'Foto ilegible');assert.equal(sheet.getCell('M9').value,'76543210-3');assert.equal(sheet.getCell('I9').value,'No informado');assert.equal(sheet.getCell('P9').value,'2026-10-21 21:00');
 const summary=book.getWorksheet('Resumen');assert.equal(summary.getCell('A4').value,'Empresa de prueba');assert.equal(summary.getCell('E13').value,238);assert.equal(summary.getCell('E15').value,476);assert.equal(summary.getCell('E11').value,119);
 assert.equal(summary.getImages().length,1);assert.match(summary.getCell('A19').value,/1 boleta\(s\) aprobada\(s\) sin IVA informado/);assert.equal(summary.getCell('A21').value,'Aprobado por tipo de gasto');assert.deepEqual([summary.getCell('A22').value,summary.getCell('E22').value],['Materiales',238]);
 assert.notEqual(summary.getCell('F8').fill?.fgColor?.argb,'FF142D4E');
 assert.notEqual(sheet.getCell('Q8').fill?.fgColor?.argb,'FF142D4E');
 const month=await buildExpenseWorkbook(rows,reportPeriod('2026','10'),'company');assert.equal(month.count,2);
 const empty=await buildExpenseWorkbook([],reportPeriod('2026','10'),'personal');assert.equal(empty.count,0);
});
test('the report only reads the dates of its period',()=>{
 assert.deepEqual(reportRange(reportPeriod('2024','02')),{from:'2024-02-01',to:'2024-02-29'});
 assert.deepEqual(reportRange(reportPeriod('2026',undefined)),{from:'2026-01-01',to:'2026-12-31'});
});
test('export rejects malformed and future years',()=>{
 for(const year of ['2026 OR 1=1','1999','2099',['2026']])assert.throws(()=>reportPeriod(year,undefined),/REPORT_PERIOD_INVALID/);
 for(const month of ['00','13','1',['10']])assert.throws(()=>reportPeriod('2026',month),/REPORT_PERIOD_INVALID/);
});
