import { receiptNumberCandidates } from './receiptNumber';
import { includedVat, money, repairLine, validDay, validRut } from './receiptText';
import { parseTimbre } from './receiptTimbre';

export type ReadingField = 'receiptNumber' | 'expenseDate' | 'totalAmount' | 'vatAmount' | 'supplierName' | 'supplierRut';
/** exact: del timbre del SII · read: leído y coherente · review: deducido, hay que mirarlo · missing: no se encontró */
export type Confidence = 'exact' | 'read' | 'review' | 'missing';

export interface ReceiptReading {
  receiptNumber: string; expenseDate: string; totalAmount: string; vatAmount: string;
  supplierName: string; supplierRut: string;
  documentType: 'BOLETA' | 'FACTURA';
  /** Cómo corresponde registrar el IVA. null: lo decide el tipo de gasto. */
  vatSource: 'CALCULATED' | 'RECEIPT' | 'EXEMPT' | null;
  suggestedType: number | null;
  confidence: Record<ReadingField, Confidence>;
  fromTimbre: boolean;
  warnings: string[];
}

const clean = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
const trimLine = (line: string) => line.trim().replace(/^[*|=•·\s]+|[*|=•·\s]+$/g, '');
const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const monthDate = /\b(\d{1,2})[\s/.-]+(?:DE\s+)?(ENERO|ENE|FEBRERO|FEB|MARZO|MAR|ABRIL|ABR|MAYO|MAY|JUNIO|JUN|JULIO|JUL|AGOSTO|AGO|SEPTIEMBRE|SETIEMBRE|SEPT|SEP|SET|OCTUBRE|OCT|NOVIEMBRE|NOV|DICIEMBRE|DIC)\.?[\s/.-]+(?:DE(?:L)?\s+)?(20\d{2})\b/g;
const amountPattern = /(?:[-−]\s*)?\d[\d.,]*(?:[ \t]+\d{3}(?!\d))*[.,]?-?/g;

/** Fechas de la boleta. Si hay varias, vale la rotulada como emisión o la que lleva hora. */
function readDates(lines: string[]) {
  const all = new Set<string>(), labelled = new Set<string>(), timed = new Set<string>(), short = new Set<string>();
  lines.forEach((line, index) => {
    if (/VENCIMIENTO|VENCE|VALIDO HASTA|RESOLUCION|\bRES\b|\bSII\b|AUTORIZACION|NACIMIENTO|CAMBIO|GARANTIA/.test(line)) return;
    const found: string[] = [];
    const push = (year: string, month: string, day: string) => {
      const value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      if (validDay(value)) found.push(value);
    };
    for (const m of line.matchAll(/\b(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(20\d{2})\b/g)) push(m[3], m[2], m[1]);
    for (const m of line.matchAll(/\b(20\d{2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{1,2})\b/g)) push(m[1], m[2], m[3]);
    for (const m of line.matchAll(monthDate)) push(m[3], String(m[2].startsWith('SET') ? 9 : months.indexOf(m[2].slice(0, 3)) + 1), m[1]);
    const label = /\bFECHA\b|EMISION/.test(line) || /^(?:FECHA|EMISION)[\s\w]*:?$/.test(lines[index - 1] ?? '');
    const time = /\b([01]?\d|2[0-3]):[0-5]\d\b/.test(line);
    if (label || time) for (const m of line.matchAll(/(?<![\d/.-])(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(2\d)(?![\d/.-]|\s*[/.-]\s*\d)/g)) push(`20${m[3]}`, m[2], m[1]);
    for (const value of found) {
      all.add(value);
      if (label) labelled.add(value);
      if (time) timed.add(value);
    }
  });
  return labelled.size ? labelled : timed.size === 1 ? timed : all.size ? all : short;
}

interface Amounts { totals: Set<string>; vats: Set<string>; net: Set<string>; exempt: Set<string>; cash: Set<string>; change: Set<string>; card: Set<string> }

function readAmounts(lines: string[]): Amounts {
  const result: Amounts = { totals: new Set(), vats: new Set(), net: new Set(), exempt: new Set(), cash: new Set(), change: new Set(), card: new Set() };
  lines.forEach((line, index) => {
    const next = lines[index + 1] ?? '';
    const amount = (label: RegExp) => {
      const match = line.match(label);
      if (!match) return '';
      const part = line.slice((match.index ?? 0) + match[0].length).replace(/\(?\d{1,2}(?:[.,]\d+)?\s*%\)?/g, '').trim();
      // El símbolo y el monto pueden quedar en renglones consecutivos.
      const following = /^\$\s*:?$/.test(next) ? lines[index + 2] ?? '' : next;
      const source = /\d/.test(part) ? part : /^[\d$.,:\s-]+$/.test(following) ? following : '';
      const tokens = [...source.matchAll(amountPattern)].map(item => ({ text: item[0].trim(), value: money(item[0]) })).filter(item => item.value);
      if (new Set(tokens.map(item => item.value)).size === 1) return tokens[0].value;
      // El signo $ a veces se lee como un dígito suelto delante del monto: "7 3.798".
      const grouped = tokens.filter(item => /\d[.,]\d{3}/.test(item.text));
      return grouped.length === 1 && tokens.every(item => item === grouped[0] || item.text.length === 1) ? grouped[0].value : '';
    };
    const keep = (set: Set<string>, value: string) => { if (value) set.add(value); };
    // Subtotales, netos y pagos nunca se toman como el total.
    if (!/SUB\s*-?\s*TOTAL|TOTAL(?:ES)?\s+(?:DE\s+)?(?:NETO|AFECTO|IVA|EXENTO|IMPUESTO|DCTO)|EFECTIVO|VUELTO|PROPINA|TOTAL(?:ES)?\s+(?:DE\s+)?(?:MINUTOS|PAGADO|AHORR[OA]|DESCUENTOS?|ITEMS?|ARTICULOS|PRODUCTOS|PUNTOS|UNIDADES|CANTIDAD|LITROS)/.test(line)) {
      keep(result.totals, amount(/^(?:(?:MONTO|IMPORTE|VALOR)\s+)?TOTAL(?:ES)?\b(?:\s+(?:A\s+PAGAR|BOLETA|FACTURA|COMPRA|VENTA|FINAL|GENERAL|PESOS|CLP|\$))?\s*[:=$]*\s*/) || amount(/^(?:MONTO|VALOR)\s+(?:A\s+PAGAR|COMPRA|VENTA)\s*[:=$]*\s*/) || amount(/^A\s+PAGAR\s*[:=$]*\s*/));
    }
    if (!/\bSIN\s+IVA\b|IVA\s+INCL(?:UIDO|\.)?\s*$|NETO/.test(line)) keep(result.vats, amount(/\b(?:I\.?\s*V\.?\s*A\.?)(?=\s|[:($=]|$)/));
    keep(result.net, amount(/^(?:(?:MONTO|VALOR|TOTAL|SUB\s*TOTAL)\s+)?(?:NETO|AFECTO)\b\s*[:=$]*\s*/));
    keep(result.exempt, amount(/^(?:(?:MONTO|VALOR|TOTAL)\s+)?EXENTO\b\s*[:=$]*\s*/));
    keep(result.cash, amount(/^(?:PAGO\s+)?EFECTIVO\b\s*[:=$]*\s*/));
    keep(result.change, amount(/^(?:SU\s+)?VUELTO\b\s*[:=$]*\s*/));
    keep(result.card, amount(/^(?:PAGO\s+)?(?:TARJETA\s+(?:DE\s+)?)?(?:DEBITO|CREDITO|REDCOMPRA|TRANSBANK)\b\s*[:=$]*\s*/));
  });
  return result;
}

const single = (set: Set<string>) => set.size === 1 ? Number([...set][0]) : null;
const matchesVat = (total: number, vat: number) => Math.abs(includedVat(total) - vat) <= 1;

/** Elige el total apoyándose en la aritmética de la propia boleta; si no cuadra, lo deja para revisar. */
function decideTotal(amounts: Amounts): { total: number | null; confidence: Confidence; ambiguous: boolean } {
  const { net, vats, exempt, totals } = amounts;
  const netValue = single(net), vatValue = single(vats), exemptValue = single(exempt) ?? 0;
  const sum = netValue !== null && vatValue !== null ? netValue + vatValue + exemptValue : null;
  const candidates = [...totals].map(Number).filter(value => value > 0);
  if (candidates.length === 1) return { total: candidates[0], confidence: sum !== null && sum !== candidates[0] && netValue! + vatValue! !== candidates[0] ? 'review' : 'read', ambiguous: false };
  if (candidates.length > 1) {
    const coherent = candidates.filter(value => value === sum || (vatValue !== null && vatValue > 0 && matchesVat(value, vatValue)));
    return coherent.length === 1 ? { total: coherent[0], confidence: 'review', ambiguous: false } : { total: null, confidence: 'missing', ambiguous: true };
  }
  if (sum !== null && Math.abs(Math.round(netValue! * 0.19) - vatValue!) <= 1) return { total: sum, confidence: 'review', ambiguous: false };
  const cash = single(amounts.cash), change = single(amounts.change), card = single(amounts.card);
  if (cash !== null && change !== null && cash > change) return { total: cash - change, confidence: 'review', ambiguous: false };
  if (card !== null && card > 0 && vatValue !== null && matchesVat(card, vatValue)) return { total: card, confidence: 'review', ambiguous: false };
  return { total: null, confidence: 'missing', ambiguous: false };
}

const notSupplier = /\bR\.?U\.?T\b|BOLETA|FACTURA|ELECTRONICA|\bS\.?I\.?I\b|GIRO|CASA MATRIZ|SUCURSAL|DIRECCION|\bAV(?:DA|ENIDA)?\b|\bCALLE\b|PASAJE|COMUNA|SANTIAGO\s*$|FONO|TELEFONO|WWW|\.CL\b|\.COM\b|@|FECHA|HORA|CAJA|CAJERO|VENDEDOR|CLIENTE|TOTAL|TIMBRE|FOLIO|^N[°ºO]?\s*\d|GRACIAS|BIENVENID|COPIA|DUPLICADO|COMPROBANTE|LOCAL\s*:?\s*\d|TERMINAL|\bMESA\b|RESOLUCION/;
const company = /\bS\.?\s?A\.?(?:\s|$)|\bS\.?P\.?A\.?(?:\s|$)|\bLTDA\b|LIMITADA|E\.?I\.?R\.?L|Y CIA|COMERCIAL|FERRETERIA|RESTAURANT|SUPERMERCADO|SERVICENTRO|FARMACIA|MINIMARKET|ESTACIONAMIENTO|DISTRIBUIDORA|IMPORTADORA|PANADERIA|CAFETERIA/;

function readSupplier(lines: string[], raw: string[]) {
  let rut = '', rutLine = -1;
  for (let index = 0; index < lines.length; index++) {
    if (/CLIENTE|RECEPTOR|SENOR|VENDEDOR|CAJER[OA]|COMPRADOR|PAGADOR|GARZON/.test(lines[index])) continue;
    for (const match of lines[index].matchAll(/(?<!\d)(\d{1,2}[.,\s]?\d{3}[.,\s]?\d{3}\s*[-–—−]\s*[\dK])(?![\dA-Z])/g)) {
      const value = validRut(match[1]);
      if (value && !rut) { rut = value; rutLine = index; }
    }
    if (rut) break;
  }
  const limit = Math.min(lines.length, rutLine >= 0 ? Math.max(rutLine + 4, 6) : 8);
  const usable: number[] = [];
  for (let index = 0; index < limit; index++) {
    const letters = lines[index].replace(/[^A-Z]/g, '').length;
    if (letters >= 3 && letters / lines[index].replace(/\s/g, '').length > 0.6 && lines[index].length <= 60 && !notSupplier.test(lines[index])) usable.push(index);
  }
  const chosen = usable.find(index => company.test(lines[index])) ?? usable[0];
  return { rut, name: chosen === undefined ? '' : raw[chosen].replace(/\s+/g, ' ').slice(0, 150) };
}

// Sugerencia por palabras del propio documento; la persona siempre confirma el tipo de gasto.
const typeHints: [number, RegExp][] = [
  [2, /COPEC|\bSHELL\b|PETROBRAS|ARAMCO|GASOLINA|\bDIESEL\b|PETROLEO|SERVICENTRO|\bLITROS?\b|OCTANO/],
  [6, /ESTACIONAMIENTO|PARKING|PARQUEADERO|SABA\b/],
  [1, /RESTAURANT|CAFETERIA|\bCAFE\b|SANDWICH|SANGUCH|COLACION|\bMENU\b|PIZZA|SUSHI|EMPANADA|ALMUERZO|FUENTE DE SODA|MCDONALD|BURGER|GARZON|PROPINA|COMPLETO/],
  [3, /FERRETERIA|SODIMAC|\bEASY\b|CONSTRUMART|\bIMPERIAL\b|\bMTS\b|TORNILLO|CANERIA|TUBERIA|\bCOBRE\b|PINTURA|CEMENTO|\bCABLE\b|SOLDADURA|REFRIGERANTE|\bR-?410A?\b/],
  [4, /GUANTE|MASCARILLA|DETERGENTE|LIBRERIA|\bRESMA\b|\bTONER\b|LIMPIEZA/],
];

export function parseReceiptText(text: string, timbreText?: string | null): ReceiptReading {
  const raw = text.split(/\r?\n/).map(trimLine).filter(Boolean).slice(0, 1000);
  const lines = raw.map(line => repairLine(clean(line)));
  const all = lines.join('\n');
  const warnings: string[] = [];
  const confidence: Record<ReadingField, Confidence> = { receiptNumber: 'missing', expenseDate: 'missing', totalAmount: 'missing', vatAmount: 'missing', supplierName: 'missing', supplierRut: 'missing' };
  const timbre = parseTimbre(timbreText);
  const pick = (set: Set<string>, field: ReadingField, label: string) => {
    if (set.size === 1) { confidence[field] = 'read'; return [...set][0]; }
    warnings.push(set.size > 1 ? `Hay varios valores posibles para ${label}. Confirma el correcto en la foto.` : `No se identificó ${label}. Complétalo manualmente.`);
    return '';
  };

  const supplier = readSupplier(lines, raw);
  const voucher = /TRANSBANK|GETNET|REDCOMPRA|COMPROBANTE DE VENTA|VOUCHER|COPIA CLIENTE/.test(all);
  const validAsReceipt = /VALIDO\s+COMO\s+BOLETA/.test(all);
  let receiptNumber: string, expenseDate: string, total: number | null;

  if (timbre) {
    receiptNumber = timbre.receiptNumber;
    expenseDate = timbre.expenseDate;
    total = Number(timbre.totalAmount);
    for (const field of ['receiptNumber', 'expenseDate', 'totalAmount', 'supplierRut'] as const) confidence[field] = 'exact';
  } else {
    let numbers = receiptNumberCandidates(lines);
    if (!numbers.size && validAsReceipt) {
      numbers = new Set([...all.matchAll(/(?:NUMERO|NRO|N[°º])\s*\.?\s*(?:DE\s+)?(?:BOLETA|OPERACION|COMPROBANTE|UNICO)\s*[:#]?\s*(\d{4,20})\b/g)].map(match => match[1]));
    }
    receiptNumber = pick(numbers, 'receiptNumber', 'el número de boleta');
    expenseDate = pick(readDates(lines), 'expenseDate', 'la fecha');
    total = null;
  }

  const amounts = readAmounts(lines);
  if (!timbre) {
    const decision = decideTotal(amounts);
    total = decision.total;
    confidence.totalAmount = decision.confidence;
    if (total === null) warnings.push(decision.ambiguous ? 'Hay varios valores posibles para el total. Confirma el correcto en la foto.' : 'No se identificó el total. Complétalo manualmente.');
    else if (decision.confidence === 'review') warnings.push('El total se dedujo de otros montos de la boleta. Compáralo con la foto.');
  }

  // IVA: se acepta solo si es posible para el total.
  const fuel = typeHints[0][1].test(`${all}\n${clean(timbre?.firstItem ?? '')}`);
  const exemptDocument = Boolean(timbre?.exempt) || /(?:BOLETA|FACTURA)[^\n]{0,20}EXENTA/.test(all);
  let vat: number | null = null;
  let vatSource: ReceiptReading['vatSource'] = null;
  if (exemptDocument) {
    vat = 0;
    vatSource = 'EXEMPT';
    confidence.vatAmount = timbre ? 'exact' : 'read';
  } else {
    const limit = total === null ? null : includedVat(total) + 1;
    const candidates = [...amounts.vats].map(Number);
    const possible = limit === null ? candidates : candidates.filter(value => value <= limit);
    const exact = total === null ? [] : possible.filter(value => value > 0 && matchesVat(total!, value));
    if (exact.length === 1) vat = exact[0];
    else if (possible.length === 1) vat = possible[0];
    if (vat !== null) confidence.vatAmount = 'read';
    else if (candidates.length && !possible.length) warnings.push('El IVA leído supera el total o no es posible para ese monto. Revísalo.');
    else if (possible.length > 1) warnings.push('Hay varios valores posibles para el IVA. Confirma el correcto en la foto.');
    else warnings.push('No se identificó el IVA. Complétalo manualmente.');
    if (vat === 0) vatSource = 'EXEMPT';
    else if (vat !== null && total !== null) {
      vatSource = vat === includedVat(total) ? 'CALCULATED' : 'RECEIPT';
      // Un IVA menor al 19% es normal en combustible o con exentos; en otro caso, algún monto pudo leerse mal.
      const explained = fuel || [...amounts.exempt].some(value => Number(value) > 0);
      if (!explained && !matchesVat(total, vat)) {
        confidence.vatAmount = 'review';
        if (!timbre) confidence.totalAmount = 'review';
        warnings.push('El IVA no corresponde al 19% del total. Compara ambos montos con la foto.');
      }
    }
  }

  const supplierRut = timbre?.supplierRut ?? supplier.rut;
  if (supplierRut && !timbre) confidence.supplierRut = 'read';
  if (supplier.name) confidence.supplierName = company.test(clean(supplier.name)) ? 'read' : 'review';
  if (voucher && !validAsReceipt && !/BOLETA|FACTURA/.test(all) && !timbre) warnings.push('Parece un comprobante de pago con tarjeta y no una boleta. Pide la boleta al comercio.');

  const suggestion = typeHints.find(([, hint]) => hint.test(`${all}\n${clean(timbre?.firstItem ?? '')}`));
  return {
    receiptNumber, expenseDate, totalAmount: total === null ? '' : String(total), vatAmount: vat === null ? '' : String(vat),
    supplierName: supplier.name, supplierRut,
    documentType: timbre?.documentType ?? (/\bFACTURA\b/.test(all) && !/\bBOLETA/.test(all) ? 'FACTURA' : 'BOLETA'),
    vatSource, suggestedType: suggestion?.[0] ?? null, confidence, fromTimbre: Boolean(timbre), warnings,
  };
}
