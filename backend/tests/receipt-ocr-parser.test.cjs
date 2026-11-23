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

test('receipt labels support reversed order, abbreviations and ordinal circles',()=>{
 for(const label of ['Número de boleta: 001234','Nº de boleta 001234','N° BOLETA: 001234','N˚ BOLETA 001234','N○ BOLETA 001234','Boleta número: 001234','Boleta N.º 001234','Boleta N . º 001234','Boleta Nro. 001234','Boleta No. 001234','Boleta N O 001234','BOL. N° 001234','BOL N° 001234','Boleta electrónica Nº001234','BOLETAELECTRONICAN°001234']){
  assert.equal(parseReceiptText(label).receiptNumber,'001234',label);
 }
 assert.equal(parseReceiptText('BOLETA123456').receiptNumber,'123456');
});
test('explicit receipt heading wins over unrelated numbers without discarding mixed RUT rows',()=>{
 for(const label of ['RUT 76.123.456-7 BOLETA N° 001234','BOLETA N°001234 RUT: 76.123.456-7','BOLETA ELECTRONICA N°001234 AUTORIZACION 987654','TRANSACCION\nN°987654\nN°555555\nBOLETA N°001234'])assert.equal(parseReceiptText(label).receiptNumber,'001234',label);
});
test('split labels retain leading zeros and explicitly marked short folios',()=>{
 for(const label of ['NUMERO DE BOLETA\n001234','BOLETA ELECTRONICA\nN°\n001234','BOLETA\nELECTRONICA\nN.º\n001234','N°\nBOLETA\n001234','FOLIO:001234','N°\n001234'])assert.equal(parseReceiptText(label).receiptNumber,'001234',label);
 assert.equal(parseReceiptText('BOLETA N°7').receiptNumber,'7');
 assert.equal(parseReceiptText('BOLETA N° 1.234.567').receiptNumber,'1234567');
});
test('recovery excludes RUTs, dates, payment labels and conflicting receipt headings',()=>{
 for(const label of ['BOLETA N°76.123.456-7','BOLETA N°24/10/2026','AUTORIZACION\nN°123456','RUT\nN°123456','BOLETA ELECTRONICA TRANSACCION 123456','BOLETA N°123456789012345678901','BOLETA N°123\nBOLETA N°456','BOLETIN 12345','BOLETERIA 12345'])assert.equal(parseReceiptText(label).receiptNumber,'',label);
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
 for(const text of ['SUBTOTAL 5.000\nTOTAL PAGADO 6.000','TOTAL\nBOLETA 123'])assert.equal(parseReceiptText(text).totalAmount,'');
});

test('conflicting totals and non-integral VAT remain blank for manual review',()=>{
 assert.equal(parseReceiptText('TOTAL 1.000\nTOTAL A PAGAR 2.000').totalAmount,'');
 assert.equal(parseReceiptText('TOTAL 1.000\nEL IVA DE ESTA BOLETA ES 159,66').vatAmount,'');
});


test('net plus VAT proposes the total only when they are arithmetically consistent, and asks to review it',()=>{
 const value=parseReceiptText('TOTAL NETO 5.000\nTOTAL IVA 950');assert.equal(value.totalAmount,'5950');assert.equal(value.confidence.totalAmount,'review');assert.match(value.warnings.join(' '),/dedujo/);
 assert.equal(parseReceiptText('TOTAL NETO 5.000\nTOTAL IVA 400').totalAmount,'');
});
test('cash minus change and card payments support the total, never the cash handed over',()=>{
 const cash=parseReceiptText('SUBTOTAL 10.000\nEFECTIVO $20.000\nVUELTO $8.100');assert.equal(cash.totalAmount,'11900');assert.equal(cash.confidence.totalAmount,'review');
 assert.equal(parseReceiptText('EFECTIVO $20.000').totalAmount,'');
 assert.equal(parseReceiptText('TARJETA DE DEBITO $11.900\nIVA $1.900').totalAmount,'11900');
 assert.equal(parseReceiptText('TARJETA DE DEBITO $15.000\nIVA $1.900').totalAmount,'');
});
test('several totals are resolved only by the receipt own VAT',()=>{
 assert.equal(parseReceiptText('TOTAL 15.000\nTOTAL A PAGAR 11.900\nIVA 1.900').totalAmount,'11900');
 assert.equal(parseReceiptText('TOTAL 15.000\nTOTAL A PAGAR 11.900').totalAmount,'');
});
test('camera look-alikes are repaired only inside amounts and known labels',()=>{
 const value=parseReceiptText('B0LETA ELECTRONICA N° 4471\nT0TAL $11.9OO\n1VA $1.9O0');
 assert.deepEqual([value.receiptNumber,value.totalAmount,value.vatAmount],['4471','11900','1900']);
 // Un monto truncado no se convierte en otro más pequeño.
 assert.equal(parseReceiptText('TOTAL $11.9').totalAmount,'');
 assert.equal(parseReceiptText('TOTAL $1.19.00').totalAmount,'');
});
test('supplier name and RUT are read from the header; the customer RUT is ignored',()=>{
 const value=parseReceiptText('FERRETERÍA EL TORNILLO SPA\nGIRO: VENTA DE MATERIALES\nAV. MATTA 123, SANTIAGO\nR.U.T.: 76.086.428-5\nBOLETA ELECTRONICA N° 55\nRUT CLIENTE 12.345.678-5\nTOTAL $1.190\nIVA $190');
 assert.equal(value.supplierName,'FERRETERÍA EL TORNILLO SPA');assert.equal(value.supplierRut,'76086428-5');assert.equal(value.suggestedType,3);assert.equal(value.vatSource,'CALCULATED');
 assert.equal(parseReceiptText('TIENDA\nRUT 76.086.428-9').supplierRut,'','dígito verificador incorrecto');
 assert.equal(parseReceiptText('RUT CLIENTE 12.345.678-5').supplierRut,'');
});
test('VAT is accepted only if it is possible for the total, and tells how it must be recorded',()=>{
 const fuel=parseReceiptText('COPEC S.A.\nGASOLINA 95 25,3 LITROS\nTOTAL $30.000\nIVA $3.215');
 assert.deepEqual([fuel.vatAmount,fuel.vatSource,fuel.suggestedType],['3215','RECEIPT',2]);
 assert.equal(parseReceiptText('TOTAL $1.000\nIVA $500').vatAmount,'');
 const exempt=parseReceiptText('BOLETA EXENTA ELECTRONICA N° 77\nTOTAL $5.000');assert.deepEqual([exempt.receiptNumber,exempt.vatAmount,exempt.vatSource],['77','0','EXEMPT']);
 assert.equal(parseReceiptText('TOTAL $1.000').vatSource,null);
});
test('the issue date wins over resolution, due and exchange dates',()=>{
 assert.equal(parseReceiptText('RES. EX. SII N° 80 DE 22/08/2014\n15/11/2026 13:45\nCAMBIOS HASTA 15/12/2026').expenseDate,'2026-11-15');
 assert.equal(parseReceiptText('FECHA EMISION 15/11/2026\n16/11/2026').expenseDate,'2026-11-15');
 assert.equal(parseReceiptText('15/11/26 13:45').expenseDate,'2026-11-15');
 assert.equal(parseReceiptText('15-NOV-2026').expenseDate,'2026-11-15');
});
test('card vouchers are not mistaken for receipts unless they are valid as one',()=>{
 assert.match(parseReceiptText('TRANSBANK\nCOMPROBANTE DE VENTA\nTOTAL $5.000').warnings.join(' '),/comprobante de pago/);
 const valid=parseReceiptText('TRANSBANK\nCOMPROBANTE DE VENTA\nVALIDO COMO BOLETA\nNUMERO DE OPERACION: 009988\nTOTAL $5.000');
 assert.equal(valid.receiptNumber,'009988');assert.doesNotMatch(valid.warnings.join(' '),/comprobante de pago/);
});
test('invoices are recognised with their number',()=>{
 const value=parseReceiptText('R.U.T.: 76.086.428-5\nFACTURA ELECTRONICA\nN° 10234\nMONTO NETO $10.000\nIVA 19% $1.900\nTOTAL $11.900');
 assert.deepEqual([value.documentType,value.receiptNumber,value.totalAmount,value.vatAmount,value.confidence.totalAmount],['FACTURA','10234','11900','1900','read']);
});
const ted='<TED version="1.0"><DD><RE>76086428-5</RE><TD>39</TD><F>0012345</F><FE>2026-11-15</FE><RR>66666666-6</RR><RSR>CLIENTE</RSR><MNT>11900</MNT><IT1>CAÑERIA COBRE &amp; CODO</IT1><CAF version="1.0"></CAF><TSTED>2026-11-15T13:45:00</TSTED></DD><FRMT>x</FRMT></TED>';
test('the SII stamp overrides misread text and marks the fields as exact',()=>{
 const value=parseReceiptText('FERRETERIA X SPA\nBOLETA N° 99999\nFECHA 01/01/2025\nTOTAL $8.000\nIVA $1.900',ted);
 assert.deepEqual([value.receiptNumber,value.expenseDate,value.totalAmount,value.supplierRut,value.vatAmount,value.vatSource],['12345','2026-11-15','11900','76086428-5','1900','CALCULATED']);
 assert.equal(value.confidence.totalAmount,'exact');assert.equal(value.fromTimbre,true);assert.equal(value.suggestedType,3);assert.deepEqual(value.warnings,[]);
 const exempt=parseReceiptText('',ted.replace('<TD>39','<TD>41'));assert.deepEqual([exempt.vatAmount,exempt.vatSource],['0','EXEMPT']);
});
test('a damaged or foreign barcode is ignored instead of trusted',()=>{
 for(const bad of [null,'','QR https://example.test',ted.replace('76086428-5','76086428-9'),ted.replace('<TD>39','<TD>52'),ted.replace('2026-11-15</FE>','2026-13-45</FE>'),ted.replace('<MNT>11900','<MNT>0'),ted.replace('<F>0012345','<F>abc')]){
  const value=parseReceiptText('BOLETA N° 77\nTOTAL $1.000',bad);assert.equal(value.fromTimbre,false);assert.equal(value.receiptNumber,'77');
 }
});
test('hostile or enormous text neither hangs nor throws',()=>{
 const started=Date.now();
 for(const text of ['9'.repeat(200000),('TOTAL '+'1.'.repeat(5000)+'\n').repeat(50),'RUT '+'1 '.repeat(50000),'\u0000\uFFFF\n'.repeat(5000),'('.repeat(50000)])parseReceiptText(text);
 assert.ok(Date.now()-started<4000,`${Date.now()-started} ms`);
});

test('browser OCR artefacts: degree sign as asterisk and currency sign as a digit',()=>{
 const value=parseReceiptText('BOLETA ELECTRONICA N* 5512\nTOTAL   $ 23.790\nIVA (19%)      7 3.798');
 assert.deepEqual([value.receiptNumber,value.totalAmount,value.vatAmount,value.vatSource],['5512','23790','3798','CALCULATED']);
 assert.equal(parseReceiptText('BOLETA\nN" 77').receiptNumber,'77');
 assert.equal(parseReceiptText('TOTAL 12 3.798').totalAmount,'');
});
test('a VAT that does not match a common receipt asks to check both amounts',()=>{
 const value=parseReceiptText('FERRETERIA X SPA\nTOTAL $23.790\nIVA $379');
 assert.equal(value.confidence.totalAmount,'review');assert.match(value.warnings.join(' '),/no corresponde al 19%/);
 assert.equal(parseReceiptText('COPEC\nTOTAL $30.000\nIVA $3.215').warnings.some(text=>/19%/.test(text)),false);
 assert.equal(parseReceiptText('SUPERMERCADO\nEXENTO $5.000\nTOTAL $16.900\nIVA $1.900').warnings.some(text=>/19%/.test(text)),false);
});
