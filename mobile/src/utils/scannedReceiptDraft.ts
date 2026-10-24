export interface ScannedReceiptDraft{userId:number;companyId:number;uri:string;mimeType:string;receiptNumber:string;expenseDate:string;totalAmount:string;vatAmount:string;expenseTypeId:number}
let draft:ScannedReceiptDraft|null=null;
export function setScannedReceiptDraft(value:ScannedReceiptDraft){draft=value;}
export function takeScannedReceiptDraft(userId:number,companyId:number){const value=draft;draft=null;return value?.userId===userId&&value.companyId===companyId?value:null;}
