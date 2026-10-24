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
test('scan drafts can be consumed once and never cross user or company',()=>{
 const {setScannedReceiptDraft,takeScannedReceiptDraft}=require('../../mobile/src/utils/scannedReceiptDraft.ts');
 setScannedReceiptDraft({userId:1,companyId:3,uri:'file:///private/photo.jpg'});assert.equal(takeScannedReceiptDraft(2,3),null);
 setScannedReceiptDraft({userId:1,companyId:3,uri:'file:///private/photo.jpg'});assert.equal(takeScannedReceiptDraft(1,4),null);
 setScannedReceiptDraft({userId:1,companyId:3,uri:'file:///private/photo.jpg'});assert.equal(takeScannedReceiptDraft(1,3).uri,'file:///private/photo.jpg');assert.equal(takeScannedReceiptDraft(1,3),null);
});
