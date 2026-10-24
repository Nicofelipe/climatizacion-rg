import ExcelJS from 'exceljs';
import {getExpenses} from './expense.service';
type Expense=Awaited<ReturnType<typeof getExpenses>>[number];
const date=(value:Date|string)=>value instanceof Date?value.toISOString().slice(0,10):String(value).slice(0,10);
const timestamp=(value:unknown)=>value instanceof Date?value.toISOString():String(value);
const labels:Record<string,string>={PENDING:'Pendiente',APPROVED:'Aprobada',REJECTED:'Rechazada'};
const navy='FF142D4E',teal='FF0F8277',light='FFE5F5EF',gray='FF64748B';
const moneyKeys=['NetAmount','VatAmount','TotalAmount'] as const;
const totals=(rows:Expense[])=>moneyKeys.map(key=>rows.reduce((sum,row)=>sum+Number(row[key]),0));
function paintRow(row:ExcelJS.Row,last:number,background:string,foreground:string,bold=false){
 for(let col=1;col<=last;col++){const cell=row.getCell(col);cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:background}};cell.font={name:'Aptos',size:11,bold,color:{argb:foreground}};cell.alignment={vertical:'middle',wrapText:true};}
}
export function reportPeriod(year:unknown,month:unknown,now=new Date()){
 const current=Number(new Intl.DateTimeFormat('en',{timeZone:'America/Santiago',year:'numeric'}).format(now));
 if(typeof year!=='string'||!/^20\d{2}$/.test(year)||Number(year)>current)throw new Error('REPORT_PERIOD_INVALID');
 if(month!==undefined&&(typeof month!=='string'||! /^(0[1-9]|1[0-2])$/.test(month)))throw new Error('REPORT_PERIOD_INVALID');
 return {year,month:month as string|undefined,prefix:month?`${year}-${month}`:year};
}
export async function buildExpenseWorkbook(expenses:Expense[],period:ReturnType<typeof reportPeriod>,scope:string,companyName='Empresa'){
 const rows=expenses.filter(row=>date(row.ExpenseDate).startsWith(period.prefix)).sort((a,b)=>date(b.ExpenseDate).localeCompare(date(a.ExpenseDate))||b.Id-a.Id);
 if(rows.length>20000)throw new Error('REPORT_TOO_LARGE');
 const approved=rows.filter(row=>row.Status==='APPROVED'),other=rows.filter(row=>row.Status!=='APPROVED');
 const workbook=new ExcelJS.Workbook();workbook.creator='Clepit';workbook.created=new Date();
 const periodLabel=period.month?new Date(`${period.prefix}-15T12:00:00Z`).toLocaleDateString('es-CL',{month:'long',year:'numeric',timeZone:'America/Santiago'}):`${period.year} · enero a diciembre`;
 const scopeLabel=scope==='company'?'Toda la empresa':'Mis boletas';
 function heading(ws:ExcelJS.Worksheet,title:string,last:number){
  ws.views=[{showGridLines:false,state:'frozen',ySplit:8}];
  ws.mergeCells(1,1,2,last);const cell=ws.getCell(1,1);cell.value=`CLEPIT  /  ${title}`;cell.font={name:'Aptos Display',size:19,bold:true,color:{argb:'FFFFFFFF'}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:navy}};cell.alignment={vertical:'middle',indent:1};ws.getRow(1).height=25;ws.getRow(2).height=16;
  for(const [row,text] of [[4,companyName],[5,`Período: ${periodLabel}   ·   ${scopeLabel}`],[6,'Moneda: CLP · agrupado por fecha de la boleta, no por fecha de registro']] as const){ws.mergeCells(row,1,row,last);ws.getCell(row,1).value=text;ws.getCell(row,1).font={name:'Aptos',size:row===4?14:11,bold:row===4,color:{argb:row===4?navy:gray}};ws.getRow(row).height=23;}
  ws.properties.defaultRowHeight=22;ws.pageSetup={paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0};
 }
 const summary=workbook.addWorksheet('Resumen');summary.columns=[{width:44},{width:15},{width:23},{width:23},{width:25}];heading(summary,'RESUMEN DE RENDICIONES',5);
 summary.getRow(8).values=['Estado','Cantidad','Neto sin IVA','IVA','Total CLP'];
 for(const [index,status] of ['APPROVED','PENDING','REJECTED'].entries()){
  const values=rows.filter(row=>row.Status===status);summary.getRow(9+index).values=[labels[status],values.length,...totals(values)];
 }
 summary.getRow(13).values=['TOTAL APROBADO PARA REVISIÓN CONTABLE',approved.length,...totals(approved)];
 summary.getRow(15).values=['Total registrado (todos los estados)',rows.length,...totals(rows)];
 for(const [n,text] of [[17,'Boletas aprobadas: detalle exclusivo de los registros aprobados.'],[18,'Pendientes y rechazadas: control separado; no forman parte del total aprobado.'],[19,'La aprobación de la empresa no sustituye la revisión de la contadora.']] as const){summary.mergeCells(n,1,n,5);summary.getCell(n,1).value=text;summary.getCell(n,1).font={size:11,color:{argb:gray}};summary.getRow(n).height=24;}
 for(const n of [8,13]){paintRow(summary.getRow(n),5,n===8?navy:teal,'FFFFFFFF',true);summary.getRow(n).height=n===13?42:30;}
 for(const n of [9,10,11,15]){paintRow(summary.getRow(n),5,n%2?'FFF0F6F8':'FFFFFFFF',navy);summary.getRow(n).height=28;}
 for(let col=3;col<=5;col++)summary.getColumn(col).numFmt='#,##0';
 function detail(name:string,values:Expense[],tableName:string){
  const ws=workbook.addWorksheet(name);ws.columns=[12,17,30,24,24,19,19,21,27,17,26,40,45].map(width=>({width}));heading(ws,name.toUpperCase(),13);
  const columns=['ID','Fecha boleta','Integrante','Código boleta','Tipo de gasto','Neto sin IVA','IVA','Total CLP','Fecha registro UTC','Estado','Proveedor','Descripción','Motivo de rechazo'];
  const data=values.map(row=>[row.Id,date(row.ExpenseDate),row.UserName,row.ReceiptNumber,row.ExpenseTypeName,Number(row.NetAmount),Number(row.VatAmount),Number(row.TotalAmount),timestamp(row.CreatedAt),labels[row.Status]??row.Status,row.SupplierName??'',row.Description??'',('RejectionReason' in row?row.RejectionReason:'')??'']);
  ws.addTable({name:tableName,ref:'A8',headerRow:true,totalsRow:false,style:{theme:'TableStyleMedium2',showRowStripes:true},columns:columns.map(name=>({name,filterButton:true})),rows:data});
  ws.getRow(8).height=30;paintRow(ws.getRow(8),13,navy,'FFFFFFFF',true);
  const totalRow=ws.getRow(10+values.length);ws.mergeCells(totalRow.number,1,totalRow.number,5);totalRow.getCell(1).value=name==='Boletas aprobadas'?'TOTAL APROBADO':'TOTAL PENDIENTES Y RECHAZADAS';
  totals(values).forEach((value,index)=>{totalRow.getCell(6+index).value=value;});paintRow(totalRow,13,light,teal,true);totalRow.height=30;
  for(const col of [6,7,8])ws.getColumn(col).numFmt='#,##0';
  ws.pageSetup.printTitlesRow='1:8';
  if(!values.length){ws.mergeCells(9,1,9,5);ws.getCell('A9').value='Sin boletas de este estado en el período.';ws.getCell('A9').font={italic:true,color:{argb:gray}};}
 }
 detail('Boletas aprobadas',approved,'ClepitAprobadas');detail('Pendientes y rechazadas',other,'ClepitPorRevisar');
 return {buffer:Buffer.from(await workbook.xlsx.writeBuffer()),count:rows.length};
}
