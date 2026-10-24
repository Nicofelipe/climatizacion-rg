require('tsx/cjs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const {parseReceiptText}=require('../../mobile/src/utils/receiptOcrParser.ts');
test('receipt labels distinguish folio from RUT, authorization and payment numbers',()=>{
 const result=parseReceiptText('RUT: 76.123.456-7\nBOLETA ELECTRONICA N° 009988\nAUTORIZACION 1234567\nFecha emisión: 24/10/2026\nSUBTOTAL 10.000\nIVA (19%): $1.900\nTOTAL A PAGAR $11.900\nVUELTO $0');
 assert.equal(result.receiptNumber,'009988');assert.equal(result.expenseDate,'2026-10-24');assert.equal(result.totalAmount,'11900');assert.equal(result.vatAmount,'1900');assert.deepEqual(result.warnings,[]);
});
test('ambiguous document numbers remain empty rather than silently selecting one',()=>{
 const value=parseReceiptText('BOLETA N° 123\nFOLIO: 456\nTOTAL 1.000');assert.equal(value.receiptNumber,'');assert.match(value.warnings.join(' '),/varios valores/);
});
test('missing fields, impossible dates and non-integral CLP remain flagged',()=>{
 const value=parseReceiptText('RESOLUCION 15/01/2020\nFECHA 31/02/2026\nTOTAL $1.000,50\nRUT 12.345.678-9');assert.equal(value.expenseDate,'');assert.equal(value.totalAmount,'');assert.equal(value.receiptNumber,'');assert.equal(value.warnings.length,4);
});
test('labels on separate lines and zero IVA are supported',()=>{
 const value=parseReceiptText('BOLETA ELECTRONICA\n12345\n2026-10-24\nTOTAL\n$2.500\nIVA\n0');assert.equal(value.receiptNumber,'12345');assert.equal(value.totalAmount,'2500');assert.equal(value.vatAmount,'0');
});
test('IVA larger than total must be corrected',()=>{
 const value=parseReceiptText('TOTAL 1.000\nIVA 1.500');assert.equal(value.vatAmount,'');assert.match(value.warnings.join(' '),/supera el total/);
});

test('supermarket heading punctuation, unmarked folio and plural totals are supported',()=>{
 const result=parseReceiptText('RUT 76.123.456-7\nBOLETA. ELECTRONICA 000123456\nFECHA EMISION: 24 / 10 / 2026\n*** TOTALES $11.900 ***\nIVA (19%): 1.900\nTOTAL PRODUCTOS 5');
 assert.equal(result.receiptNumber,'000123456');assert.equal(result.expenseDate,'2026-10-24');assert.equal(result.totalAmount,'11900');assert.equal(result.vatAmount,'1900');
 assert.deepEqual(result.warnings,[]);
});

test('split electronic receipt headings and common Spanish dates are supported',()=>{
 for(const date of ['FECHA: 24 de octubre de 2026','FECHA: 24 OCT. 2026','FECHA 24/10/26','2026 / 10 / 24']){
  const result=parseReceiptText(`BOLETA\nELECTRONICA\nNRO. 123456\n${date}\nTOTAL 1.000\nIVA 160`);
  assert.equal(result.receiptNumber,'123456');assert.equal(result.expenseDate,'2026-10-24');
 }
 assert.equal(parseReceiptText('FECHA 15 SETIEMBRE 2026').expenseDate,'2026-09-15');
});

test('transaction labels, units and negative refunds are not promoted to receipt fields',()=>{
 assert.equal(parseReceiptText('BOLETA ELECTRONICA TRANSACCION 123456').receiptNumber,'');
 assert.equal(parseReceiptText('BOLETA ELECTRONICA 39').receiptNumber,'');
 for(const line of ['TOTAL PRODUCTOS 5','TOTALES DE UNIDADES 8','TOTAL DE IVA 160','TOTAL -1.000','TOTAL − 1.000'])assert.equal(parseReceiptText(line).totalAmount,'');
 assert.equal(parseReceiptText('BOLETA ELECTRONICA\nNRO. 123456').receiptNumber,'123456');
 assert.equal(parseReceiptText('FECHA 31/02/26').expenseDate,'');
});

test('conflicting dates and totals remain editable instead of guessing',()=>{
 const result=parseReceiptText('FECHA 24 OCTUBRE 2026\nFECHA 25/10/2026\nTOTAL 1.000\nTOTALES 2.000');
 assert.equal(result.expenseDate,'');assert.equal(result.totalAmount,'');assert.match(result.warnings.join(' '),/varios valores/);
});

test('Chilean prose VAT, spaced currency and terminal punctuation are read',()=>{
 const value=parseReceiptText('TOTAL: $ 11.900.-\nEl IVA de esta boleta es $ 1.900\nPAGADO 11.900\nTOTAL MINUTOS 45');
 assert.equal(value.totalAmount,'11900');assert.equal(value.vatAmount,'1900');
 const spaced=parseReceiptText('MONTO TOTAL $ 12 345\nIVA INCLUIDO (19%): $ 1 971');
 assert.equal(spaced.totalAmount,'12345');assert.equal(spaced.vatAmount,'1971');
});

test('currency-only line is skipped, subtotal and payment values are not substituted',()=>{
 const value=parseReceiptText('TOTAL\n$\n9.520\nIVA DE ESTA BOLETA ES\n$1.520');
 assert.equal(value.totalAmount,'9520');assert.equal(value.vatAmount,'1520');
 for(const text of ['SUBTOTAL 5.000\nTOTAL PAGADO 6.000','TOTAL\nBOLETA 123','TOTAL NETO 5.000\nTOTAL IVA 950'])assert.equal(parseReceiptText(text).totalAmount,'');
});

test('conflicting totals and non-integral VAT remain blank for manual review',()=>{
 assert.equal(parseReceiptText('TOTAL 1.000\nTOTAL A PAGAR 2.000').totalAmount,'');
 assert.equal(parseReceiptText('TOTAL 1.000\nEL IVA DE ESTA BOLETA ES 159,66').vatAmount,'');
});
test('scan drafts can be consumed once and never cross user or company',()=>{
 const {setScannedReceiptDraft,takeScannedReceiptDraft}=require('../../mobile/src/utils/scannedReceiptDraft.ts');
 setScannedReceiptDraft({userId:1,companyId:3,uri:'file:///private/photo.jpg'});assert.equal(takeScannedReceiptDraft(2,3),null);
 setScannedReceiptDraft({userId:1,companyId:3,uri:'file:///private/photo.jpg'});assert.equal(takeScannedReceiptDraft(1,4),null);
 setScannedReceiptDraft({userId:1,companyId:3,uri:'file:///private/photo.jpg'});assert.equal(takeScannedReceiptDraft(1,3).uri,'file:///private/photo.jpg');assert.equal(takeScannedReceiptDraft(1,3),null);
});

test('tax estimates never overwrite readings, infer zero VAT, or estimate fuel',()=>{
 const {estimateReceiptAmount:estimate}=require('../../mobile/src/utils/receiptEstimate.ts');
 assert.equal(estimate('11900','',1).value,'1900');assert.equal(estimate('','1900',1).value,'11900');
 for(const args of [['11900','1900',1],['','0',1],['11900','',2],['','1900',2],['','999999999',1],['bad','',1]])assert.equal(estimate(...args),null);
 // Rounded IVA does not uniquely determine a receipt total: this is a proposal only.
 assert.equal(estimate('','1',1).value,'6');
});
